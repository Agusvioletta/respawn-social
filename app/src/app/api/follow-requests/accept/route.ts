import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client uses SERVICE_ROLE_KEY — bypasses RLS
// This is safe because we do our own auth check below
function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json()
    if (!requestId) return NextResponse.json({ error: 'requestId requerido' }, { status: 400 })

    // Verify the caller is authenticated
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const admin = adminClient()

    // Fetch the request — verify it actually belongs to this user
    const { data: request, error: fetchErr } = await admin
      .from('follow_requests')
      .select('id, from_id, to_id')
      .eq('id', requestId)
      .eq('to_id', user.id)   // ← only the recipient can accept
      .single()

    if (fetchErr || !request) {
      return NextResponse.json({ error: 'Solicitud no encontrada o sin permiso' }, { status: 404 })
    }

    // Insert into follows (admin bypasses RLS so follower_id != auth.uid() is OK)
    const { error: followErr } = await admin
      .from('follows')
      .insert({ follower_id: request.from_id, following_id: request.to_id })

    if (followErr && followErr.code !== '23505') {
      // 23505 = unique_violation (already following) — treat as success
      console.error('[accept-follow] insert error:', followErr)
      return NextResponse.json({ error: 'Error al crear seguimiento' }, { status: 500 })
    }

    // Delete the request
    await admin.from('follow_requests').delete().eq('id', request.id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[accept-follow]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
