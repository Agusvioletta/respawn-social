# CLAUDE.md — Respawn Social

Context file para Claude Code. Leer antes de cualquier cambio al proyecto.

---

## Qué es este proyecto

**Respawn Social** — "El lugar donde siempre volvés."

Una plataforma integral de gaming en español (es-AR) que combina:
- **Red social** para gamers (posts, perfiles, feed, mensajes, explorar)
- **Plataforma de torneos** profesional (brackets, equipos, rankings, premios, sponsors)
- **Marketplace / monetización** (suscripciones premium, tienda de avatares/items, torneos de pago)
- **Contenido de creadores** (clips de video, streams, monetización)
- **Arcade integrado** (8 juegos retro con progresión y leaderboards)
- **API pública** (integraciones: Steam, Discord, Twitch, estadísticas externas)

**Escala objetivo:** Plataforma de producción completa, no un MVP.
**Equipo:** Desarrollo individual.
**Idioma:** Todo el UI en español (es-AR).

---

## Stack

### Actual (legacy — NO agregar páginas nuevas aquí)
- Vanilla JS (ES6+), HTML5, CSS3
- Supabase JS SDK via CDN
- Sin build step — Live Server en puerto 5501

### Target (todo el desarrollo nuevo va aquí)
```
Framework:     Next.js 15 (App Router) + TypeScript
Database:      Supabase (PostgreSQL + Auth + Realtime + Storage)
API layer:     Next.js Route Handlers (lógica compleja de negocio)
Styling:       TailwindCSS + shadcn/ui + CSS custom properties del diseño existente
State:         Zustand (estado global) + TanStack Query (estado del servidor)
Payments:      Stripe (suscripciones, marketplace, torneos de pago)
Video:         Mux (upload, streaming, clips)
Email:         Resend + React Email
Real-time:     Supabase Realtime + Channels
Search:        Supabase Full-Text Search → Algolia/Typesense (cuando escale)
Deploy:        Vercel
CI/CD:         GitHub Actions
Monitoring:    Vercel Analytics + Sentry
```

---

## Design system (CSS variables — mantener siempre)

```css
/* Fondos */
--void: #07070F
--deep: #0B0B14
--surface: #111120
--card: #161628

/* Neón primario */
--cyan: #00FFF7
--pink: #FF4F7B
--purple: #C084FC

/* Texto */
--text-primary: #E8E8F0
--text-secondary: #9090B0
--text-muted: #555570
```

Fuentes: Orbitron (display/headings), Share Tech Mono (mono/labels), Rajdhani (body)

---

## Supabase schema actual

| Tabla | Columnas clave |
|-------|---------------|
| `profiles` | id, username, avatar, bio, games[], max_level, created_at |
| `posts` | id, user_id, username, avatar, content, image_url, created_at |
| `comments` | id, post_id, user_id, username, avatar, content, parent_id, image_url, created_at |
| `likes` | id, post_id, user_id |
| `comment_likes` | comment_id, user_id |
| `follows` | follower_id, following_id, created_at |
| `messages` | id, from_id, to_id, content, created_at |
| `tournaments` | id, creator_id, name, game, format, max_players, prize, description, date, status |
| `tournament_players` | tournament_id, user_id, created_at |

Storage bucket: `post-images`

---

## Reglas de negocio clave

### XP / Niveles
- **Fórmula:** posts×10 + followers×8 + following×5 + likes×3 + comments×4 + game_levels×50
- **Niveles (1-8):** Novato → Aprendiz → Jugador → Veterano → Elite → Leyenda → Máster → Campeón
- **Juegos:** 8 juegos desbloqueados secuencialmente via `profiles.max_level`
- **Logros:** 34 en total, definidos en `settings.js` (migrar a `lib/achievements.ts`)

### Torneos
- Estados: `upcoming` | `live` | `finished`
- Formatos: eliminación simple, round robin, suizo (a implementar)
- Participantes limitados por `max_players`

---

## Convenciones

- **UI:** Todo en español (es-AR). Nunca Lorem Ipsum. Siempre contexto gamer.
- **Auth guard:** Middleware de Next.js en `/middleware.ts` protege todas las rutas excepto `/login` y `/signup`
- **Sesión:** `@supabase/auth-helpers-nextjs` maneja cookies server-side
- **Funciones Supabase:** Prefijo `get*`, `create*`, `update*`, `delete*` (NO `sb*` en el nuevo código)
- **No mock data:** Siempre Supabase real
- **Mobile-first:** Breakpoints: 375px base → 768px → 1024px → 1440px
- **Canvas games:** Módulos TS puros, sin dependencias de Next.js/React

---

## Lo que NO hacer

- No crear páginas en el directorio legacy (Vanilla JS)
- No usar Pages Router de Next.js — solo App Router
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en código cliente (solo en Route Handlers/server)
- No eliminar los CSS custom properties — son la base del design system
- No agregar React, Vue, Angular, Svelte — solo Next.js
- No diseñar para servidor propio — todo va por Vercel + Supabase
- No escribir in English en la UI — el producto es en español

---

## Variables de entorno

```bash
# Público (cliente)
NEXT_PUBLIC_SUPABASE_URL=https://ajegcbzvviukuewqhqqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Nqo7KTTik0nnWidf04yuGw_hDOP28Eq

# Privado (solo Route Handlers / server)
SUPABASE_SERVICE_ROLE_KEY=<nunca en cliente>
STRIPE_SECRET_KEY=<nunca en cliente>
MUX_TOKEN_ID=<nunca en cliente>
MUX_TOKEN_SECRET=<nunca en cliente>
RESEND_API_KEY=<nunca en cliente>

# Público (cliente, seguro)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

---

## Corriendo el proyecto

### Legacy (Vanilla JS)
```bash
npx serve . -p 5501
```

### New (Next.js app)
```bash
cd app/
npm run dev        # http://localhost:3000
npm run build
npm run start
npm run lint
npm run type-check
```
