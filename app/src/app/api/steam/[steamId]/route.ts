import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

// Steam data fetcher — dos modos:
// 1. Con STEAM_API_KEY  → Web API completa (perfil + juegos recientes + nivel + total)
// 2. Sin clave          → Perfil XML público de Steam (sin clave, datos básicos)

const STEAM_KEY = process.env.STEAM_API_KEY ?? ''

export interface SteamProfile {
  steamid: string
  personaname: string
  avatarfull: string
  profileurl: string
  personastate: number   // 0=Offline 1=Online 2=Busy 3=Away
  gameextrainfo?: string // Juego actual si está jugando
  gameid?: string
}

export interface SteamGame {
  appid: number
  name: string
  playtime_forever: number // minutos
  img_icon_url: string
}

export interface SteamData {
  profile: SteamProfile
  recentGames: SteamGame[]
  totalGames: number
  level: number
  source: 'api' | 'xml'  // para saber qué datos están disponibles
}

// ── Fallback: perfil XML público (sin API key) ────────────────────────────────
// https://steamcommunity.com/id/{vanity}?xml=1
// https://steamcommunity.com/profiles/{steamid64}?xml=1
async function fetchSteamXML(steamId: string): Promise<SteamData | null> {
  const isNumeric = /^\d+$/.test(steamId)
  const url = isNumeric
    ? `https://steamcommunity.com/profiles/${steamId}?xml=1`
    : `https://steamcommunity.com/id/${encodeURIComponent(steamId)}?xml=1`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RespawnSocial/1.0' },
    next: { revalidate: 300 },
  })
  if (!res.ok) return null

  const xml = await res.text()

  // Parseo manual básico — no queremos una dependencia de xml-parser
  function extract(tag: string): string {
    const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([^<]*)<\\/${tag}>`))
    return (m?.[1] ?? m?.[2] ?? '').trim()
  }

  const steamid    = extract('steamID64')
  const personaname = extract('steamID')
  if (!steamid || !personaname) return null  // perfil privado o no encontrado

  const avatarfull   = extract('avatarFull') || extract('avatarMedium') || extract('avatarIcon')
  const profileurl   = extract('customURL')
    ? `https://steamcommunity.com/id/${extract('customURL')}/`
    : `https://steamcommunity.com/profiles/${steamid}/`
  const onlineState  = extract('onlineState')   // 'online' | 'offline' | 'ingame'
  const currentGame  = extract('inGameInfo') ? extract('gameName') : extract('mostPlayedGames') ? '' : ''
  const inGameName   = xml.match(/<gameName><!\[CDATA\[([\s\S]*?)\]\]><\/gameName>/)?.[1]?.trim() ?? ''

  // onlineState → personastate numérico
  const stateMap: Record<string, number> = { online: 1, offline: 0, ingame: 1 }
  const personastate = stateMap[onlineState] ?? 0

  const profile: SteamProfile = {
    steamid,
    personaname,
    avatarfull,
    profileurl,
    personastate,
    gameextrainfo: onlineState === 'ingame' && inGameName ? inGameName : undefined,
  }

  return {
    profile,
    recentGames: [],
    totalGames: 0,
    level: 0,
    source: 'xml',
  }
}

// ── Full Web API (con clave) ──────────────────────────────────────────────────
async function fetchSteamAPI(steamId: string): Promise<SteamData | null> {
  // Resolver vanity → SteamID64
  let resolvedId = steamId
  if (!/^\d+$/.test(steamId)) {
    const vanityRes = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_KEY}&vanityurl=${encodeURIComponent(steamId)}`
    )
    const vanityData = await vanityRes.json()
    if (vanityData?.response?.success === 1) {
      resolvedId = vanityData.response.steamid
    } else {
      return null
    }
  }

  const [profileRes, recentRes, levelRes, totalRes] = await Promise.allSettled([
    fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${resolvedId}`),
    fetch(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_KEY}&steamid=${resolvedId}&count=5`),
    fetch(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${STEAM_KEY}&steamid=${resolvedId}`),
    fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_KEY}&steamid=${resolvedId}&include_appinfo=false`),
  ])

  const profileData = profileRes.status === 'fulfilled' ? await profileRes.value.json() : null
  const recentData  = recentRes.status  === 'fulfilled' ? await recentRes.value.json()  : null
  const levelData   = levelRes.status   === 'fulfilled' ? await levelRes.value.json()   : null
  const totalData   = totalRes.status   === 'fulfilled' ? await totalRes.value.json()   : null

  const profile: SteamProfile | null = profileData?.response?.players?.[0] ?? null
  if (!profile) return null

  const recentGames: SteamGame[] = (recentData?.response?.games ?? []).map((g: SteamGame) => ({
    appid: g.appid,
    name: g.name,
    playtime_forever: g.playtime_forever,
    img_icon_url: g.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
      : '',
  }))

  return {
    profile,
    recentGames,
    totalGames: totalData?.response?.game_count ?? 0,
    level: levelData?.response?.player_level ?? 0,
    source: 'api',
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ steamId: string }> }
) {
  // Rate limit: 30 lookups por IP por minuto
  const ip = getClientIp(req)
  const rl = rateLimit(`steam:${ip}`, { limit: 30, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { steamId } = await params

  if (!steamId || steamId.length < 2) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  try {
    const data = STEAM_KEY
      ? await fetchSteamAPI(steamId)
      : await fetchSteamXML(steamId)

    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 200 })
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    })
  } catch (e) {
    console.error('[Steam API]', e)
    // Intentar XML como último recurso si falló el API
    if (STEAM_KEY) {
      try {
        const xmlData = await fetchSteamXML(steamId)
        if (xmlData) return NextResponse.json(xmlData)
      } catch { /* ignore */ }
    }
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 })
  }
}
