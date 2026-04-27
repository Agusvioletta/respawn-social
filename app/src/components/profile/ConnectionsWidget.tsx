'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SteamData } from '@/app/api/steam/[steamId]/route'

interface Connections {
  steam_id?: string | null
  discord_username?: string | null
  twitch_username?: string | null
}

interface ConnectionsWidgetProps {
  connections: Connections
}

const PERSONA_STATE: Record<number, { label: string; color: string }> = {
  0: { label: 'Offline',  color: '#555570' },
  1: { label: 'Online',   color: '#4ade80' },
  2: { label: 'Ocupado',  color: '#FF4F7B' },
  3: { label: 'Ausente',  color: '#FBB040' },
  4: { label: 'Snooze',   color: '#FBB040' },
  5: { label: 'Buscando', color: '#00FFF7' },
  6: { label: 'Jugando',  color: '#C084FC' },
}

function fmtHours(mins: number): string {
  const h = Math.round(mins / 60)
  if (h < 1)    return `${mins}m`
  if (h < 1000) return `${h}h`
  return `${(h / 1000).toFixed(1)}k h`
}

export function ConnectionsWidget({ connections }: ConnectionsWidgetProps) {
  const { steam_id, discord_username, twitch_username } = connections

  const [steamData, setSteamData] = useState<SteamData | null>(null)
  const [steamError, setSteamError] = useState<string | null>(null)
  const [steamLoading, setSteamLoading] = useState(false)
  const [discordCopied, setDiscordCopied] = useState(false)

  const handleCopyDiscord = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!discord_username) return
    navigator.clipboard.writeText(discord_username).catch(() => {})
    setDiscordCopied(true)
    setTimeout(() => setDiscordCopied(false), 2000)
  }, [discord_username])

  useEffect(() => {
    if (!steam_id) return
    setSteamLoading(true)
    fetch(`/api/steam/${encodeURIComponent(steam_id)}`)
      .then(r => r.json())
      .then((data: SteamData & { error?: string }) => {
        if (data.error) {
          setSteamError(data.error)
        } else {
          setSteamData(data)
        }
      })
      .catch(() => setSteamError('fetch_error'))
      .finally(() => setSteamLoading(false))
  }, [steam_id])

  const hasAny = steam_id || discord_username || twitch_username
  if (!hasAny) return null

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px',
      marginBottom: '16px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
        letterSpacing: '3px', color: 'var(--text-muted)', marginBottom: '14px',
      }}>
        CONEXIONES
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* ── Steam ─────────────────────────────────────────────────────────── */}
        {steam_id && (
          <a
            href={steamData?.profile.profileurl ?? `https://steamcommunity.com/id/${steam_id}`}
            target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'rgba(23,26,33,0.6)',
              border: '1px solid rgba(102,192,244,0.2)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              transition: 'all var(--transition)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(102,192,244,0.5)'
                e.currentTarget.style.background = 'rgba(102,192,244,0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(102,192,244,0.2)'
                e.currentTarget.style.background = 'rgba(23,26,33,0.6)'
              }}
            >
              {/* Steam logo */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#66C0F4" style={{ flexShrink: 0 }}>
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.003.187.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
              </svg>

              <div style={{ flex: 1, minWidth: 0 }}>
                {steamLoading ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Cargando Steam...
                  </div>
                ) : steamData ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {steamData.profile.avatarfull && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={steamData.profile.avatarfull}
                          alt="" width={22} height={22}
                          style={{ borderRadius: '3px', flexShrink: 0 }}
                        />
                      )}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: '#66C0F4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {steamData.profile.personaname}
                      </span>
                      {/* Status dot */}
                      {(() => {
                        const state = steamData.profile.gameextrainfo
                          ? PERSONA_STATE[6]
                          : PERSONA_STATE[steamData.profile.personastate] ?? PERSONA_STATE[0]
                        return (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '9px',
                            color: state.color, flexShrink: 0,
                          }}>
                            ● {steamData.profile.gameextrainfo
                              ? `Jugando ${steamData.profile.gameextrainfo}`
                              : state.label}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '5px', flexWrap: 'wrap' }}>
                      {steamData.level > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                          Nv. <span style={{ color: '#66C0F4' }}>{steamData.level}</span>
                        </span>
                      )}
                      {steamData.totalGames > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span style={{ color: '#66C0F4' }}>{steamData.totalGames}</span> juegos
                        </span>
                      )}
                      {steamData.recentGames.length > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                          Reciente: <span style={{ color: 'var(--text-secondary)' }}>
                            {steamData.recentGames[0].name}
                          </span>
                          {' '}
                          <span style={{ color: 'var(--text-muted)' }}>
                            ({fmtHours(steamData.recentGames[0].playtime_forever)})
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Recent games mini-icons */}
                    {steamData.recentGames.length > 1 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                        {steamData.recentGames.slice(0, 5).map(g => (
                          g.img_icon_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={g.appid}
                              src={g.img_icon_url}
                              alt={g.name}
                              title={`${g.name} — ${fmtHours(g.playtime_forever)}`}
                              width={24} height={24}
                              style={{ borderRadius: '3px', border: '1px solid rgba(102,192,244,0.15)' }}
                            />
                          ) : null
                        ))}
                      </div>
                    )}
                  </>
                ) : steamError === 'no_key' ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Steam: <span style={{ color: '#66C0F4' }}>{steam_id}</span>
                  </div>
                ) : steamError === 'profile_private' ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Steam: perfil privado
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Steam: <span style={{ color: '#66C0F4' }}>{steam_id}</span>
                  </div>
                )}
              </div>

              <span style={{ fontSize: '10px', color: 'rgba(102,192,244,0.5)', flexShrink: 0 }}>↗</span>
            </div>
          </a>
        )}

        {/* ── Discord ───────────────────────────────────────────────────────── */}
        {discord_username && (
          <div
            onClick={handleCopyDiscord}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: discordCopied ? 'rgba(88,101,242,0.15)' : 'rgba(88,101,242,0.08)',
              border: `1px solid ${discordCopied ? 'rgba(88,101,242,0.6)' : 'rgba(88,101,242,0.25)'}`,
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              cursor: 'pointer', transition: 'all var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(88,101,242,0.5)'
              e.currentTarget.style.background = 'rgba(88,101,242,0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = discordCopied ? 'rgba(88,101,242,0.6)' : 'rgba(88,101,242,0.25)'
              e.currentTarget.style.background = discordCopied ? 'rgba(88,101,242,0.15)' : 'rgba(88,101,242,0.08)'
            }}
          >
            {/* Discord logo */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2" style={{ flexShrink: 0 }}>
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: '#5865F2' }}>
                {discord_username}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {discordCopied ? '✓ usuario copiado' : 'Click para copiar usuario'}
              </div>
            </div>
          </div>
        )}

        {/* ── Twitch ────────────────────────────────────────────────────────── */}
        {twitch_username && (
          <a
            href={`https://twitch.tv/${twitch_username}`}
            target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'rgba(145,70,255,0.08)',
              border: '1px solid rgba(145,70,255,0.25)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              transition: 'all var(--transition)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(145,70,255,0.5)'
                e.currentTarget.style.background = 'rgba(145,70,255,0.12)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(145,70,255,0.25)'
                e.currentTarget.style.background = 'rgba(145,70,255,0.08)'
              }}
            >
              {/* Twitch logo */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#9146FF" style={{ flexShrink: 0 }}>
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: '#9146FF' }}>
                  {twitch_username}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  twitch.tv/{twitch_username}
                </div>
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(145,70,255,0.5)', flexShrink: 0 }}>↗</span>
            </div>
          </a>
        )}

      </div>
    </div>
  )
}
