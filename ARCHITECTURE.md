# ARCHITECTURE — Respawn Social

---

## Stack completo y justificación

### Por qué Next.js 15 (App Router)

| Criterio | Decisión | Razón |
|----------|---------|-------|
| Framework | Next.js 15 | SSR/SSG para SEO, API Routes para lógica servidor, ecosistema React enorme |
| Routing | App Router | Server Components por defecto, layouts anidados, mejor performance |
| Lenguaje | TypeScript | Escala mucho mejor que JS a medida que el proyecto crece |
| Backend | Supabase | PostgreSQL managed, Auth, Realtime, Storage, Edge Functions — sin servidor propio |
| API compleja | Route Handlers | Pagos, webhooks externos, brackets, lógica que no va en cliente |
| UI components | shadcn/ui | Componentes accesibles, headless, 100% customizables al design system |
| Estilos | TailwindCSS | Utilidades + los CSS custom properties del design system existente |
| Estado global | Zustand | Simple, sin boilerplate, perfecto para solo dev |
| Estado servidor | TanStack Query | Cache, loading states, revalidación automática |
| Pagos | Stripe | Estándar de industria, excelente SDK |
| Video | Mux | CDN global, player, clips, thumbnails automáticos |
| Email | Resend + React Email | Templates en React, deliverability alta |
| Deploy | Vercel | Zero-config con Next.js, edge network, analytics |
| Monitoring | Sentry + Vercel Analytics | Errores + métricas de uso |

---

## Estructura de directorios (Next.js App Router)

```
respawnsocial/
│
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Route group — sin layout principal
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   │
│   ├── (main)/                       # Route group — con layout + navbar
│   │   ├── layout.tsx                # Layout principal (navbar, sidebar)
│   │   ├── feed/
│   │   │   ├── page.tsx              # Server Component (initial load)
│   │   │   └── loading.tsx           # Skeleton
│   │   ├── profile/
│   │   │   └── [username]/
│   │   │       ├── page.tsx
│   │   │       └── loading.tsx
│   │   ├── post/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx
│   │   │   └── [userId]/
│   │   │       └── page.tsx
│   │   ├── explore/
│   │   │   └── page.tsx
│   │   ├── tournaments/
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── bracket/
│   │   │           └── page.tsx
│   │   ├── arcade/
│   │   │   ├── page.tsx              # Game map
│   │   │   └── [game]/
│   │   │       └── page.tsx
│   │   ├── creators/                 # NUEVO
│   │   │   ├── page.tsx
│   │   │   └── [username]/
│   │   │       └── page.tsx
│   │   ├── store/                    # NUEVO — Marketplace
│   │   │   ├── page.tsx
│   │   │   └── item/[id]/
│   │   │       └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── notifications/            # NUEVO
│   │       └── page.tsx
│   │
│   ├── api/                          # Route Handlers (server-only)
│   │   ├── webhooks/
│   │   │   ├── stripe/
│   │   │   │   └── route.ts          # Stripe webhook handler
│   │   │   └── mux/
│   │   │       └── route.ts          # Mux video webhook
│   │   ├── tournaments/
│   │   │   └── [id]/
│   │   │       ├── bracket/
│   │   │       │   └── route.ts      # Calcular/actualizar bracket
│   │   │       └── results/
│   │   │           └── route.ts
│   │   ├── integrations/
│   │   │   ├── steam/route.ts        # Steam API proxy
│   │   │   ├── discord/route.ts      # Discord OAuth
│   │   │   └── twitch/route.ts       # Twitch API
│   │   ├── upload/
│   │   │   └── video/route.ts        # Mux upload URL generation
│   │   └── admin/                    # Moderación
│   │       └── reports/route.ts
│   │
│   ├── layout.tsx                    # Root layout (fuentes, providers)
│   ├── error.tsx                     # Global error boundary
│   └── not-found.tsx
│
├── components/                       # Componentes reutilizables
│   ├── ui/                           # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── avatar.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   ├── social/
│   │   ├── PostCard.tsx
│   │   ├── PostComposer.tsx
│   │   ├── CommentThread.tsx
│   │   ├── UserCard.tsx
│   │   └── FeedList.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── AchievementBadge.tsx
│   │   └── XPBar.tsx
│   ├── tournaments/
│   │   ├── TournamentCard.tsx
│   │   ├── BracketView.tsx
│   │   └── TournamentForm.tsx
│   ├── arcade/
│   │   ├── GameCard.tsx
│   │   ├── GameCanvas.tsx            # Canvas wrapper
│   │   └── Leaderboard.tsx
│   ├── creators/
│   │   ├── VideoPlayer.tsx           # Mux player
│   │   ├── ClipCard.tsx
│   │   └── StreamBadge.tsx
│   └── store/
│       ├── ItemCard.tsx
│       └── CartDrawer.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client (cookies)
│   │   ├── middleware.ts             # Auth middleware helper
│   │   └── queries/                  # Funciones tipadas por dominio
│   │       ├── posts.ts
│   │       ├── profiles.ts
│   │       ├── tournaments.ts
│   │       ├── messages.ts
│   │       └── scores.ts
│   ├── stripe/
│   │   ├── client.ts
│   │   └── products.ts               # Definición de planes/items
│   ├── mux/
│   │   └── client.ts
│   ├── stores/                       # Zustand stores
│   │   ├── authStore.ts
│   │   ├── notificationsStore.ts
│   │   └── cartStore.ts
│   ├── hooks/                        # React hooks custom
│   │   ├── useRealtimeFeed.ts
│   │   ├── useMessages.ts
│   │   └── useGameScore.ts
│   ├── utils/
│   │   ├── xp.ts                     # XP / level calculation
│   │   ├── achievements.ts           # 34 achievements logic
│   │   ├── formatters.ts             # Fechas, números, etc.
│   │   └── brackets.ts               # Tournament bracket logic
│   └── types/
│       ├── database.ts               # Auto-generado: supabase gen types
│       └── index.ts                  # Tipos de dominio custom
│
├── games/                            # Motores de juego (Canvas puro, sin React)
│   ├── snake.ts
│   ├── pong.ts
│   ├── breakout.ts
│   ├── asteroids.ts
│   ├── flappy.ts
│   ├── tetris.ts
│   ├── spaceinvaders.ts
│   └── dino.ts
│
├── middleware.ts                      # Auth guard global de Next.js
├── supabase/
│   └── migrations/                   # SQL migrations versionadas
│       └── 20260413000000_initial.sql
│
├── public/
│   ├── images/
│   ├── manifest.webmanifest
│   └── icons/
│
└── tests/
    ├── unit/                         # Vitest
    └── e2e/                          # Playwright
```

---

## Flujo de autenticación

```
middleware.ts
  └── supabase.auth.getUser()
        ├── Autenticado → continuar
        └── No autenticado → redirect /login (excepto rutas públicas)

Rutas públicas: /login, /signup, /api/webhooks/*, /profile/* (lectura)
```

---

## Patrones de Server vs Client Components

```typescript
// Server Component (por defecto en App Router) — usa para:
// - Fetching inicial de datos
// - Páginas con SEO importante
// - Contenido que no cambia en tiempo real
// app/feed/page.tsx
export default async function FeedPage() {
  const posts = await getPosts() // Directo, sin useEffect
  return <FeedList initialPosts={posts} />
}

// Client Component — usa para:
// - Interactividad (click, hover, form)
// - Supabase Realtime subscriptions
// - Estado local (useState, useEffect)
// components/social/FeedList.tsx
'use client'
export function FeedList({ initialPosts }) {
  const [posts, setPosts] = useState(initialPosts)
  useEffect(() => {
    const channel = supabase.channel('feed')
      .on('postgres_changes', { event: 'INSERT', table: 'posts' }, (payload) => {
        setPosts(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => channel.unsubscribe()
  }, [])
}
```

---

## Schema de Supabase — Tablas nuevas planeadas

```sql
-- Scores persistentes por juego
CREATE TABLE game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notificaciones
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like','comment','follow','mention','tournament','achievement')),
  from_user_id uuid REFERENCES profiles(id),
  post_id uuid REFERENCES posts(id),
  metadata jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reportes / moderación
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  target_type text NOT NULL CHECK (target_type IN ('post','comment','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Suscripciones premium
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL CHECK (plan IN ('pro','creator','org')),
  status text NOT NULL,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Items del marketplace
CREATE TABLE store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('avatar','badge','border','item')),
  price_cents integer NOT NULL,
  image_url text,
  rarity text CHECK (rarity IN ('common','rare','epic','legendary')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inventario de usuarios
CREATE TABLE user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES store_items(id),
  equipped boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now()
);

-- Clips de video
CREATE TABLE video_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mux_asset_id text NOT NULL,
  mux_playback_id text NOT NULL,
  title text NOT NULL,
  description text,
  game text,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Integrations externas
CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('steam','discord','twitch')),
  provider_user_id text NOT NULL,
  provider_username text,
  access_token text,
  metadata jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
```

---

## Monetización — Arquitectura

```
Usuario → /store o /premium
  └── Stripe Checkout (via API Route)
        └── Stripe Webhook → /api/webhooks/stripe
              ├── payment.succeeded → actualizar subscriptions / user_inventory
              ├── subscription.updated → sincronizar estado
              └── subscription.deleted → downgrade plan
```

---

## Integraciones externas — Arquitectura

```
Steam:   /api/integrations/steam  → Steam OpenID + Web API
Discord: /api/integrations/discord → OAuth2 + Bot para notificar torneos
Twitch:  /api/integrations/twitch → OAuth2 + EventSub para stream live detection
```

---

## Principios de arquitectura

1. **Server Components por defecto** — Client Component solo cuando hay interactividad real.
2. **Supabase como backend principal** — Route Handlers solo para lógica que no puede ir en cliente.
3. **RLS en todas las tablas** — El frontend nunca es la única barrera de seguridad.
4. **Tipos generados** — `supabase gen types typescript` después de cada migración.
5. **Realtime selectivo** — Suscribir por ruta, desuscribir en cleanup.
6. **Games aislados** — Los Canvas engines son módulos TS puros, cero dependencias de React.
7. **Secrets server-only** — Service role key, Stripe secret, Mux secret: solo en Route Handlers/server.
8. **Edge-ready** — Middleware y Route Handlers compatibles con Vercel Edge Runtime.
