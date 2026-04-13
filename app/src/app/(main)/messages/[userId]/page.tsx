'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Profile {
  id: string
  username: string
  avatar: string | null
  bio: string | null
}

interface Message {
  id: number
  from_id: string
  to_id: string
  content: string
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const otherId = params.userId as string
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!user || !otherId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, otherId])

  async function loadData() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('id, username, avatar, bio')
      .eq('id', otherId)
      .single()
    setOtherProfile(profile)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: msgs } = await (supabase as any)
      .from('messages')
      .select('*')
      .or(`and(from_id.eq.${user!.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${user!.id})`)
      .order('created_at', { ascending: true })

    setMessages(msgs ?? [])
    setLoading(false)
  }

  // Realtime subscription
  useEffect(() => {
    if (!user || !otherId) return

    const channel = supabase
      .channel(`chat:${[user.id, otherId].sort().join('-')}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: { new: Message }) => {
        const msg = payload.new
        const belongs =
          (msg.from_id === user.id && msg.to_id === otherId) ||
          (msg.from_id === otherId && msg.to_id === user.id)
        if (belongs) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, otherId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !user) return
    setSending(true)
    setInput('')

    // Optimistic
    const optimistic: Message = {
      id: Date.now(),
      from_id: user.id,
      to_id: otherId,
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('messages')
        .insert({ from_id: user.id, to_id: otherId, content: text })
        .select()
        .single()
      if (error) throw error
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data : m)))
    } catch {
      // Revert
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Group messages by date + consecutive sender
  type Group = { date: string; sender: string; msgs: Message[] }
  const grouped: Group[] = []
  let lastDate = ''
  let lastSender = ''

  for (const m of messages) {
    const date = formatDate(m.created_at)
    if (date !== lastDate || m.from_id !== lastSender) {
      grouped.push({ date, sender: m.from_id, msgs: [m] })
      lastDate = date
      lastSender = m.from_id
    } else {
      grouped[grouped.length - 1].msgs.push(m)
    }
  }

  // Inject date separators
  const rendered: Array<{ type: 'date'; label: string } | { type: 'group'; group: Group }> = []
  let lastRenderedDate = ''
  for (const g of grouped) {
    if (g.date !== lastRenderedDate) {
      rendered.push({ type: 'date', label: g.date })
      lastRenderedDate = g.date
    }
    rendered.push({ type: 'group', group: g })
  }

  const isMe = (senderId: string) => senderId === user?.id

  return (
    <div style={{
      maxWidth: '680px', margin: '0 auto',
      height: 'calc(100vh - 60px)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', borderBottom: '1px solid var(--border)',
        background: 'var(--void)', flexShrink: 0,
      }}>
        <button onClick={() => router.push('/messages')} style={{
          background: 'transparent', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '18px',
          padding: '0 8px 0 0', lineHeight: 1,
        }}>
          ←
        </button>
        {otherProfile ? (
          <Link href={`/profile/${otherProfile.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <UserAvatar avatar={otherProfile.avatar} username={otherProfile.username} size={38} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                @{otherProfile.username}
              </div>
              {otherProfile.bio && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {otherProfile.bio.slice(0, 40)}
                </div>
              )}
            </div>
          </Link>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Cargando...
          </div>
        )}
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '2px',
      }}>
        {loading ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
            Cargando mensajes...
          </p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>👾</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Empezá la conversación.
            </p>
          </div>
        ) : (
          rendered.map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${i}`} style={{
                  textAlign: 'center', padding: '12px 0 6px',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
                  letterSpacing: '1px',
                }}>
                  — {item.label} —
                </div>
              )
            }
            const { group } = item
            const mine = isMe(group.sender)
            return (
              <div key={`group-${i}`} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: mine ? 'flex-end' : 'flex-start',
                gap: '2px', marginBottom: '6px',
              }}>
                {/* Avatar only for first bubble of group (other person) */}
                {!mine && otherProfile && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <UserAvatar avatar={otherProfile.avatar} username={otherProfile.username} size={24} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      @{otherProfile.username}
                    </span>
                  </div>
                )}
                {group.msgs.map((m, mi) => (
                  <div key={m.id} style={{
                    maxWidth: '72%',
                    background: mine ? 'var(--cyan-glow)' : 'var(--card)',
                    border: `1px solid ${mine ? 'var(--cyan-border)' : 'var(--border)'}`,
                    borderRadius: mi === 0
                      ? (mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px')
                      : mi === group.msgs.length - 1
                        ? (mine ? '4px 18px 4px 18px' : '4px 18px 18px 4px')
                        : '4px 18px 4px 4px',
                    padding: '8px 12px',
                    color: mine ? 'var(--cyan)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)', fontSize: '14px',
                    lineHeight: '1.5', wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                ))}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)',
                  paddingLeft: mine ? 0 : '4px', paddingRight: mine ? '4px' : 0,
                }}>
                  {formatTime(group.msgs[group.msgs.length - 1].created_at)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        background: 'var(--void)', flexShrink: 0,
        display: 'flex', gap: '10px', alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje... (Enter para enviar)"
          rows={1}
          style={{
            flex: 1,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
            fontSize: '14px', outline: 'none', resize: 'none',
            lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto',
          }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
            borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '1px', padding: '10px 16px', cursor: 'pointer',
            opacity: (!input.trim() || sending) ? 0.4 : 1,
            transition: 'all var(--transition)', flexShrink: 0,
            alignSelf: 'flex-end',
          }}>
          {sending ? '...' : 'ENVIAR'}
        </button>
      </div>
    </div>
  )
}
