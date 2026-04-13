# ROADMAP — Respawn Social
# "El lugar donde siempre volvés"

Última actualización: 2026-04-13

---

## Visión del producto

Respawn Social es una plataforma integral de gaming en español que unifica:
- Red social nativa para gamers
- Torneos profesionales con brackets y premios
- Marketplace de items/avatares y suscripciones premium
- Plataforma de contenido para creadores (clips, streams)
- Arcade integrado con progresión y leaderboards
- API pública + integraciones (Steam, Discord, Twitch)

---

## Estado actual

MVP funcional en Vanilla JS + Supabase con:
- Auth, feed, perfiles, mensajes, explorar, torneos básicos, 8 juegos arcade, PWA

---

## Fase 0 — Kickoff (Actual)

> Establecer bases antes de escribir código nuevo.

- [x] Exploración del proyecto existente
- [x] `CLAUDE.md` — contexto para Claude Code
- [x] `ROADMAP.md` — plan de desarrollo
- [x] `ARCHITECTURE.md` — decisiones de stack
- [x] `DEVELOPMENT.md` — convenciones y workflow
- [ ] `git init` + primer commit del legacy + docs
- [ ] Crear repositorio en GitHub (private)
- [ ] Setup proyecto Next.js 15 en `/app`
- [ ] Configurar Supabase client en Next.js
- [ ] Deploy staging en Vercel (branch `dev`)

---

## Fase 1 — Base Next.js (Sprint 1-2)

> El nuevo proyecto corriendo con autenticación y layout.

### Setup
- [ ] `npx create-next-app@latest app --typescript --tailwind --eslint --app`
- [ ] Instalar: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `@tanstack/react-query`
- [ ] Instalar shadcn/ui y configurar con design system existente
- [ ] Variables de entorno (`.env.local`, `.env.example`)
- [ ] Middleware de auth (`middleware.ts`)
- [ ] Generar tipos de Supabase (`lib/types/database.ts`)

### Auth
- [ ] Página `/login` (migrar `index.html`)
- [ ] Página `/signup` (migrar `signup.html`)
- [ ] Zustand `authStore` con sesión global
- [ ] Redirect post-login a `/feed`

### Layout
- [ ] `Navbar` (desktop sidebar + mobile bottom nav)
- [ ] `Avatar` component con fallback pixel art
- [ ] Root layout con fuentes (Orbitron, Share Tech Mono, Rajdhani)
- [ ] Design tokens del CSS legacy → Tailwind config

---

## Fase 2 — Red social core (Sprint 3-4)

> Feed, perfiles y mensajes funcionando en Next.js.

### Feed
- [ ] Página `/feed` — Server Component con carga inicial
- [ ] `PostCard` con likes, comentarios, imágenes
- [ ] `PostComposer` — crear post con imagen (Supabase Storage)
- [ ] Infinite scroll (reemplaza carga fija de 60)
- [ ] Real-time updates (Supabase Realtime)
- [ ] Hashtags clickeables → `/explore?tag=...`
- [ ] Menciones → `/profile/[username]`

### Perfiles
- [ ] Página `/profile/[username]`
- [ ] `ProfileHeader` — avatar, stats, XP bar, nivel
- [ ] Upload de avatar personalizado (Supabase Storage)
- [ ] Edit profile modal
- [ ] `AchievementBadge` — 34 logros
- [ ] Feed de posts del usuario
- [ ] Follow/unfollow

### Post individual
- [ ] Página `/post/[id]`
- [ ] `CommentThread` con replies anidadas
- [ ] Editar/eliminar propio post

### Mensajes
- [ ] Página `/messages`
- [ ] Página `/messages/[userId]`
- [ ] Real-time con Supabase Realtime
- [ ] Emoji picker
- [ ] Privacy settings (quién puede escribirte)

---

## Fase 3 — Descubrimiento y notificaciones (Sprint 5)

> Explorar, torneos básicos y notificaciones.

### Explorar
- [ ] Página `/explore`
- [ ] Búsqueda con debounce (usuarios + posts)
- [ ] Filtro por juego/hashtag
- [ ] Trending users

### Notificaciones
- [ ] Tabla `notifications` en Supabase
- [ ] Triggers de BD: nuevo follower, like, comentario, mención
- [ ] `NotificationBell` con badge real-time
- [ ] Página `/notifications`

### Torneos (base)
- [ ] Página `/tournaments` — lista con filtros
- [ ] Página `/tournaments/[id]` — detalle
- [ ] Crear torneo con validación completa
- [ ] Join/leave torneo

---

## Fase 4 — Torneos pro (Sprint 6-7)

> Sistema de torneos profesional completo.

### Brackets y resultados
- [ ] `BracketView` — componente visual de bracket (eliminación simple)
- [ ] Route Handler `/api/tournaments/[id]/bracket` — calcular bracket
- [ ] Registrar resultados de partidas
- [ ] Round Robin y suizo (formatos adicionales)
- [ ] Rankings por torneo

### Equipos
- [ ] Tabla `teams` en Supabase
- [ ] Crear/unirse a equipo
- [ ] Perfil de equipo
- [ ] Torneos por equipos

### Sponsors y premios
- [ ] Campo `prize_pool` con distribución
- [ ] Logo de sponsor en torneo
- [ ] Historial de torneos ganados en perfil

---

## Fase 5 — Arcade reimaginado (Sprint 8)

> Juegos con scoring, leaderboards y progresión real.

- [ ] Tabla `game_scores` en Supabase
- [ ] Página `/arcade` — game map con estado de progresión
- [ ] Página `/arcade/[game]` — cada juego como ruta
- [ ] `GameCanvas` wrapper (React + Canvas game engine)
- [ ] onWin → save score → actualizar max_level
- [ ] Leaderboard global por juego (`/arcade/leaderboard`)
- [ ] Filtros: hoy / semana / all-time

---

## Fase 6 — Monetización (Sprint 9-10)

> Suscripciones premium y marketplace.

### Stripe setup
- [ ] Configurar Stripe (productos, precios)
- [ ] Tabla `subscriptions` en Supabase
- [ ] Route Handler `/api/webhooks/stripe`
- [ ] Checkout session API

### Planes premium
- [ ] Plan **Pro** — sin ads, badge premium, más almacenamiento
- [ ] Plan **Creator** — analytics, video clips largo, monetización
- [ ] Plan **Org** — torneos privados, branding propio

### Marketplace
- [ ] Tabla `store_items` + `user_inventory`
- [ ] Página `/store` — grid de items
- [ ] Items: avatares, badges, bordes de perfil
- [ ] Raridades: common, rare, epic, legendary
- [ ] Compra con Stripe
- [ ] Equipar items desde perfil/settings

---

## Fase 7 — Contenido de creadores (Sprint 11-12)

> Clips, streams y monetización de creadores.

### Video clips (Mux)
- [ ] Tabla `video_clips` en Supabase
- [ ] Upload de clips vía Mux (Route Handler genera signed URL)
- [ ] `VideoPlayer` con Mux player
- [ ] Feed de clips en perfiles y explore
- [ ] Webhook Mux → marcar video como listo

### Streams
- [ ] Integración Twitch: detectar stream en vivo
- [ ] Badge "EN VIVO" en perfil y feed
- [ ] Player embebido de Twitch en perfil

### Creator monetización
- [ ] Tips/donaciones via Stripe
- [ ] Revenue share (futuro)

---

## Fase 8 — Integraciones externas (Sprint 13)

> Steam, Discord, Twitch API.

- [ ] Tabla `user_integrations`
- [ ] Steam: OAuth + mostrar juegos recientes + horas jugadas
- [ ] Discord: OAuth + bot para notificar torneos en servers
- [ ] Twitch: OAuth + stats de streaming
- [ ] Badges de integración en perfil
- [ ] Página `/settings/integrations`

---

## Fase 9 — Moderación y seguridad (Sprint 14)

> Plataforma sana.

- [ ] RLS en todas las tablas de Supabase
- [ ] Sistema de reportes (posts, comentarios, usuarios)
- [ ] Panel de moderación básico (`/admin`)
- [ ] Rate limiting en Route Handlers
- [ ] Validación de imágenes (tipo MIME, tamaño)
- [ ] Verificación de email en signup
- [ ] Delete account con cascada

---

## Fase 10 — API pública (Sprint 15)

> Para integradores externos y la comunidad.

- [ ] API REST pública (Route Handlers)
  - `GET /api/v1/profiles/[username]`
  - `GET /api/v1/tournaments`
  - `GET /api/v1/leaderboards/[game]`
- [ ] Autenticación por API key
- [ ] Rate limiting por key
- [ ] Documentación en `/docs/api`
- [ ] SDK TypeScript publicado en npm

---

## Fase 11 — Polish y producción (Sprint 16)

> App de producción de verdad.

- [ ] SEO: meta tags dinámicos, Open Graph por ruta, sitemap
- [ ] Accesibilidad: ARIA, navegación teclado, contraste WCAG AA
- [ ] Skeleton loaders en todos los componentes async
- [ ] Error boundaries por sección
- [ ] Tests E2E con Playwright (flujos críticos)
- [ ] Tests unitarios con Vitest (utils, hooks)
- [ ] CI/CD con GitHub Actions
- [ ] Sentry para errores de producción
- [ ] Lighthouse: Performance >90, PWA 100, A11y >90

---

## Backlog (sin fecha)

- [ ] App móvil nativa (Capacitor)
- [ ] Modo luz (light mode toggle)
- [ ] Stories / posts efímeros (24h)
- [ ] Grupos/comunidades por juego
- [ ] Chat de voz en torneos (WebRTC)
- [ ] Juegos multijugador en tiempo real
- [ ] Clanes y guerras de clanes
- [ ] Integración con consolas (PSN, Xbox)
- [ ] Modo streaming (overlay para OBS)

---

## Métricas de éxito (Fase 11)

| Métrica | Objetivo |
|---------|---------|
| LCP | < 2.5s |
| Lighthouse Performance | > 90 |
| Lighthouse PWA | 100 |
| Lighthouse Accessibility | > 90 |
| Cobertura de tests | > 70% |
| Uptime | > 99.5% |
