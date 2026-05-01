import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/user/delete
 * Borra la cuenta del usuario autenticado:
 *  1. Verifica que la sesión activa corresponda al userId
 *  2. Borra el perfil (cascade en DB hace el resto)
 *  3. Borra el usuario de Supabase Auth con el service role
 */
export async function DELETE() {
  try {
    // Verificar sesión
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    // Admin client con service role (solo en server)
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Borrar perfil primero (cascade borra posts, follows, etc. según RLS/FK)
    const { error: profileErr } = await admin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileErr) {
      console.error('[user/delete] Error borrando perfil:', profileErr)
      return NextResponse.json({ error: 'No se pudo borrar el perfil.' }, { status: 500 })
    }

    // Borrar de Supabase Auth — libera el email para futuro uso
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)

    if (deleteErr) {
      console.error('[user/delete] Error borrando auth user:', deleteErr)
      return NextResponse.json({ error: 'No se pudo borrar la cuenta de auth.' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error('[user/delete] Error inesperado:', e)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
