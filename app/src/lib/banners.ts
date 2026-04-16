export interface BannerPreset {
  id: string
  name: string
  emoji: string
  gradient: string
  accent: string
  gridColor: string
  category: string
  image?: string
  heroImage?: string
}

const steam = (appId: number) => ({
  image:     `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
  heroImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
})

export const BANNER_CATALOG: BannerPreset[] = [
  // ── Acción / Aventura ────────────────────────────────────────────────────────
  {
    id: 'god_of_war',
    name: 'God of War',
    emoji: '⚔️',
    gradient: 'linear-gradient(135deg, #0d0100 0%, #1e0300 40%, #0a0100 100%)',
    accent: '#C9502A',
    gridColor: 'rgba(201,80,42,0.06)',
    category: 'Acción / Aventura',
    ...steam(1593500),
  },
  {
    id: 'tlou2',
    name: 'The Last of Us',
    emoji: '🍄',
    gradient: 'linear-gradient(135deg, #020800 0%, #041000 50%, #020600 100%)',
    accent: '#5C8A3A',
    gridColor: 'rgba(92,138,58,0.06)',
    category: 'Acción / Aventura',
    ...steam(2531310),
  },
  {
    id: 'ghost_tsushima',
    name: 'Ghost of Tsushima',
    emoji: '⛩️',
    gradient: 'linear-gradient(135deg, #050008 0%, #0a0015 50%, #040008 100%)',
    accent: '#D4A853',
    gridColor: 'rgba(212,168,83,0.06)',
    category: 'Acción / Aventura',
    ...steam(2215430),
  },
  {
    id: 'spiderman',
    name: 'Spider-Man',
    emoji: '🕷️',
    gradient: 'linear-gradient(135deg, #08000f 0%, #140020 50%, #08000f 100%)',
    accent: '#E82020',
    gridColor: 'rgba(232,32,32,0.06)',
    category: 'Acción / Aventura',
    ...steam(1817070),
  },
  {
    id: 'rdr2',
    name: 'Red Dead 2',
    emoji: '🤠',
    gradient: 'linear-gradient(135deg, #0a0400 0%, #150700 50%, #090300 100%)',
    accent: '#C8792A',
    gridColor: 'rgba(200,121,42,0.06)',
    category: 'Acción / Aventura',
    ...steam(1174180),
  },
  {
    id: 'batman',
    name: 'Batman Arkham',
    emoji: '🦇',
    gradient: 'linear-gradient(135deg, #040408 0%, #07070f 50%, #030308 100%)',
    accent: '#9060C0',
    gridColor: 'rgba(144,96,192,0.06)',
    category: 'Acción / Aventura',
    ...steam(208650),
  },

  // ── Shooter / FPS ────────────────────────────────────────────────────────────
  {
    id: 'valorant',
    name: 'Valorant',
    emoji: '🔺',
    gradient: 'linear-gradient(135deg, #0a0000 0%, #160404 50%, #0a0202 100%)',
    accent: '#FF4655',
    gridColor: 'rgba(255,70,85,0.06)',
    category: 'Shooter / FPS',
    // NOT on Steam — no image
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    emoji: '💣',
    gradient: 'linear-gradient(135deg, #050810 0%, #080f1a 50%, #050810 100%)',
    accent: '#F0A000',
    gridColor: 'rgba(240,160,0,0.06)',
    category: 'Shooter / FPS',
    ...steam(730),
  },
  {
    id: 'overwatch2',
    name: 'Overwatch 2',
    emoji: '🎯',
    gradient: 'linear-gradient(135deg, #000510 0%, #000a1a 50%, #000510 100%)',
    accent: '#FA9C1E',
    gridColor: 'rgba(250,156,30,0.06)',
    category: 'Shooter / FPS',
    // NOT on Steam — no image
  },
  {
    id: 'cod',
    name: 'Call of Duty',
    emoji: '🪖',
    gradient: 'linear-gradient(135deg, #040600 0%, #070a00 50%, #040600 100%)',
    accent: '#62A62A',
    gridColor: 'rgba(98,166,42,0.06)',
    category: 'Shooter / FPS',
    ...steam(1962663),
  },
  {
    id: 'halo',
    name: 'Halo',
    emoji: '🛸',
    gradient: 'linear-gradient(135deg, #000a10 0%, #001020 50%, #000810 100%)',
    accent: '#00B8FF',
    gridColor: 'rgba(0,184,255,0.06)',
    category: 'Shooter / FPS',
    ...steam(1240440),
  },

  // ── Battle Royale ────────────────────────────────────────────────────────────
  {
    id: 'fortnite',
    name: 'Fortnite',
    emoji: '⛏️',
    gradient: 'linear-gradient(135deg, #0a0015 0%, #120022 50%, #0a0018 100%)',
    accent: '#7B3FEB',
    gridColor: 'rgba(123,63,235,0.06)',
    category: 'Battle Royale',
    // NOT on Steam — no image
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    emoji: '🔴',
    gradient: 'linear-gradient(135deg, #0d0300 0%, #180400 50%, #0a0200 100%)',
    accent: '#CD4320',
    gridColor: 'rgba(205,67,32,0.06)',
    category: 'Battle Royale',
    ...steam(1172470),
  },
  {
    id: 'pubg',
    name: 'PUBG',
    emoji: '🪂',
    gradient: 'linear-gradient(135deg, #0a0800 0%, #130f00 50%, #0a0800 100%)',
    accent: '#C8A040',
    gridColor: 'rgba(200,160,64,0.06)',
    category: 'Battle Royale',
    ...steam(578080),
  },

  // ── RPG ──────────────────────────────────────────────────────────────────────
  {
    id: 'elden_ring',
    name: 'Elden Ring',
    emoji: '🌑',
    gradient: 'linear-gradient(135deg, #0a0600 0%, #130a00 50%, #080500 100%)',
    accent: '#C5A028',
    gridColor: 'rgba(197,160,40,0.05)',
    category: 'RPG',
    ...steam(1245620),
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    emoji: '🤖',
    gradient: 'linear-gradient(135deg, #050500 0%, #0c0c00 50%, #050500 100%)',
    accent: '#F9E900',
    gridColor: 'rgba(249,233,0,0.05)',
    category: 'RPG',
    ...steam(1091500),
  },
  {
    id: 'witcher3',
    name: 'The Witcher 3',
    emoji: '🐺',
    gradient: 'linear-gradient(135deg, #020608 0%, #030a0e 50%, #020608 100%)',
    accent: '#A0C0A0',
    gridColor: 'rgba(160,192,160,0.05)',
    category: 'RPG',
    ...steam(292030),
  },
  {
    id: 'hades',
    name: 'Hades',
    emoji: '💀',
    gradient: 'linear-gradient(135deg, #100000 0%, #1c0000 50%, #0c0000 100%)',
    accent: '#E8562A',
    gridColor: 'rgba(232,86,42,0.06)',
    category: 'RPG',
    ...steam(1145360),
  },
  {
    id: 'skyrim',
    name: 'Skyrim',
    emoji: '🐉',
    gradient: 'linear-gradient(135deg, #05070a 0%, #080c12 50%, #05070a 100%)',
    accent: '#A0A8C0',
    gridColor: 'rgba(160,168,192,0.05)',
    category: 'RPG',
    ...steam(489830),
  },
  {
    id: 'lol',
    name: 'League of Legends',
    emoji: '🏆',
    gradient: 'linear-gradient(135deg, #000510 0%, #00081c 50%, #00040f 100%)',
    accent: '#C89B3C',
    gridColor: 'rgba(200,155,60,0.05)',
    category: 'RPG',
    // NOT on Steam — no image
  },

  // ── Indie ────────────────────────────────────────────────────────────────────
  {
    id: 'hollow_knight',
    name: 'Hollow Knight',
    emoji: '🦋',
    gradient: 'linear-gradient(135deg, #040008 0%, #070012 50%, #030008 100%)',
    accent: '#A0A0FF',
    gridColor: 'rgba(160,160,255,0.05)',
    category: 'Indie',
    ...steam(367520),
  },
  {
    id: 'celeste',
    name: 'Celeste',
    emoji: '🍓',
    gradient: 'linear-gradient(135deg, #070010 0%, #0d0020 50%, #070010 100%)',
    accent: '#E840A0',
    gridColor: 'rgba(232,64,160,0.05)',
    category: 'Indie',
    ...steam(504230),
  },
  {
    id: 'stardew',
    name: 'Stardew Valley',
    emoji: '🌾',
    gradient: 'linear-gradient(135deg, #020600 0%, #040c00 50%, #020600 100%)',
    accent: '#90CC50',
    gridColor: 'rgba(144,204,80,0.05)',
    category: 'Indie',
    ...steam(413150),
  },
  {
    id: 'among_us',
    name: 'Among Us',
    emoji: '🔪',
    gradient: 'linear-gradient(135deg, #000008 0%, #000010 50%, #000008 100%)',
    accent: '#C83030',
    gridColor: 'rgba(200,48,48,0.05)',
    category: 'Indie',
    ...steam(945360),
  },
  {
    id: 'terraria',
    name: 'Terraria',
    emoji: '⛏️',
    gradient: 'linear-gradient(135deg, #030600 0%, #050a00 50%, #030600 100%)',
    accent: '#60A840',
    gridColor: 'rgba(96,168,64,0.05)',
    category: 'Indie',
    ...steam(105600),
  },

  // ── Sandbox ──────────────────────────────────────────────────────────────────
  {
    id: 'minecraft',
    name: 'Minecraft',
    emoji: '🟩',
    gradient: 'linear-gradient(135deg, #010800 0%, #020e00 50%, #010600 100%)',
    accent: '#7AB000',
    gridColor: 'rgba(122,176,0,0.05)',
    category: 'Sandbox',
    // NOT on Steam — no image
  },
  {
    id: 'gta5',
    name: 'GTA V',
    emoji: '🚗',
    gradient: 'linear-gradient(135deg, #000508 0%, #000a10 50%, #000508 100%)',
    accent: '#00E5FF',
    gridColor: 'rgba(0,229,255,0.05)',
    category: 'Sandbox',
    ...steam(271590),
  },
  {
    id: 'nms',
    name: "No Man's Sky",
    emoji: '🪐',
    gradient: 'linear-gradient(135deg, #000308 0%, #00050f 50%, #000308 100%)',
    accent: '#00D4B0',
    gridColor: 'rgba(0,212,176,0.05)',
    category: 'Sandbox',
    ...steam(275850),
  },

  // ── Deportes / Racing ────────────────────────────────────────────────────────
  {
    id: 'rocket_league',
    name: 'Rocket League',
    emoji: '🚀',
    gradient: 'linear-gradient(135deg, #000510 0%, #000a1a 50%, #000510 100%)',
    accent: '#00AAFF',
    gridColor: 'rgba(0,170,255,0.05)',
    category: 'Deportes / Racing',
    ...steam(252950),
  },
  {
    id: 'fc25',
    name: 'EA Sports FC',
    emoji: '⚽',
    gradient: 'linear-gradient(135deg, #000800 0%, #001000 50%, #000800 100%)',
    accent: '#40CC60',
    gridColor: 'rgba(64,204,96,0.05)',
    category: 'Deportes / Racing',
    // NOT on Steam — no image
  },

  // ── Clásicos / Abstractos ────────────────────────────────────────────────────
  {
    id: 'default',
    name: 'Cyber',
    emoji: '💠',
    gradient: 'linear-gradient(135deg, #07070F 0%, #0d0a1e 45%, #080814 100%)',
    accent: '#00FFF7',
    gridColor: 'rgba(0,255,247,0.05)',
    category: 'Abstractos',
  },
  {
    id: 'void',
    name: 'Void',
    emoji: '🌀',
    gradient: 'linear-gradient(135deg, #050308 0%, #0a0514 100%)',
    accent: '#C084FC',
    gridColor: 'rgba(192,132,252,0.05)',
    category: 'Abstractos',
  },
  {
    id: 'fire',
    name: 'Fire',
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #0f0500 0%, #1a0600 50%, #0a0200 100%)',
    accent: '#FF6B00',
    gridColor: 'rgba(255,107,0,0.05)',
    category: 'Abstractos',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #00080f 0%, #001020 100%)',
    accent: '#00B4D8',
    gridColor: 'rgba(0,180,216,0.05)',
    category: 'Abstractos',
  },
  {
    id: 'forest',
    name: 'Bosque',
    emoji: '🌲',
    gradient: 'linear-gradient(135deg, #020a02 0%, #040e04 100%)',
    accent: '#4ade80',
    gridColor: 'rgba(74,222,128,0.05)',
    category: 'Abstractos',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    gradient: 'linear-gradient(135deg, #0f0007 0%, #1a0010 100%)',
    accent: '#FF4F7B',
    gridColor: 'rgba(255,79,123,0.05)',
    category: 'Abstractos',
  },
]

// Lookup rápido por id
export const BANNER_MAP: Record<string, BannerPreset> = Object.fromEntries(
  BANNER_CATALOG.map(b => [b.id, b])
)

// Categorías en orden
export const BANNER_CATEGORIES = [
  'Acción / Aventura',
  'Shooter / FPS',
  'Battle Royale',
  'RPG',
  'Indie',
  'Sandbox',
  'Deportes / Racing',
  'Abstractos',
]

export const getBanner = (id?: string | null): BannerPreset =>
  BANNER_MAP[id ?? 'default'] ?? BANNER_MAP['default']
