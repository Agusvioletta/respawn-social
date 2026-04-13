# DEVELOPMENT — Respawn Social

Guía de desarrollo, convenciones y workflow.

---

## Setup inicial

### Prerequisitos
- Node.js 20+
- Git
- Cuenta Supabase (proyecto ya creado)
- Cuenta Vercel (deploy)
- Cuenta Stripe (pagos — Fase 6)
- Cuenta Mux (video — Fase 7)

### Clonar e iniciar el proyecto Next.js

```bash
git clone <repo>
cd respawnsocial/app

npm install
cp .env.example .env.local
# Completar variables en .env.local

npm run dev
# http://localhost:3000
```

### Crear el proyecto Next.js desde cero (Fase 0)

```bash
npx create-next-app@latest app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd app
npm install @supabase/supabase-js @supabase/ssr
npm install zustand @tanstack/react-query @tanstack/react-query-devtools
npm install -D vitest @vitejs/plugin-react playwright

# shadcn/ui
npx shadcn@latest init

# Tipos de Supabase
npx supabase gen types typescript \
  --project-id ajegcbzvviukuewqhqqb \
  > src/lib/types/database.ts
```

---

## Variables de entorno

```bash
# .env.local — NO commitear
NEXT_PUBLIC_SUPABASE_URL=https://ajegcbzvviukuewqhqqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Nqo7KTTik0nnWidf04yuGw_hDOP28Eq
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (Fase 6)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Mux (Fase 7)
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=

# Resend (email)
RESEND_API_KEY=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
```

```bash
# .env.example — SÍ commitear (sin valores reales)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Convenciones de código

### Nombrado

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes React | PascalCase | `PostCard.tsx` |
| Archivos TS (no componentes) | camelCase | `authStore.ts` |
| Rutas Next.js | kebab-case | `/arcade/space-invaders` |
| Variables/funciones | camelCase | `toggleLike()` |
| Constantes globales | UPPER_SNAKE | `MAX_POST_LENGTH` |
| Tipos/interfaces | PascalCase | `type UserProfile` |
| Hooks | `use` prefix | `useRealtimeFeed` |

### Estructura de componente React

```tsx
// components/social/PostCard.tsx
import type { Post } from '@/lib/types/database'

interface PostCardProps {
  post: Post
  showActions?: boolean
}

export function PostCard({ post, showActions = true }: PostCardProps) {
  // 1. Hooks
  // 2. Handlers
  // 3. Derived state
  // 4. Render
  return (
    <article className="...">
      {/* ... */}
    </article>
  )
}
```

### Queries a Supabase (patrón)

```typescript
// lib/supabase/queries/posts.ts
import { createClient } from '@/lib/supabase/server'
import type { Post } from '@/lib/types/database'

export async function getPosts(limit = 20, offset = 0): Promise<Post[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, avatar)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data
}
```

### Server Component con data fetching

```tsx
// app/(main)/feed/page.tsx
import { getPosts } from '@/lib/supabase/queries/posts'
import { FeedList } from '@/components/social/FeedList'

export default async function FeedPage() {
  const initialPosts = await getPosts()
  return <FeedList initialPosts={initialPosts} />
}
```

### Client Component con real-time

```tsx
// components/social/FeedList.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function FeedList({ initialPosts }) {
  const [posts, setPosts] = useState(initialPosts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => setPosts(prev => [payload.new, ...prev])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (/* ... */)
}
```

### Route Handler (API)

```typescript
// app/api/tournaments/[id]/bracket/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ... lógica de bracket
  return NextResponse.json({ bracket })
}
```

---

## Git workflow

### Ramas

```
main     → producción (Vercel prod)
dev      → staging (Vercel preview — base para todos los PRs)
feature/xxx   → nueva feature
fix/xxx       → bug fix
refactor/xxx  → migración/refactor
```

### Commits (Conventional Commits)

```
feat: agregar leaderboard en arcade
fix: corregir scroll en mensajes mobile
refactor: migrar feed.js a Next.js
chore: actualizar supabase gen types
style: ajustar spacing en PostCard
test: tests para xp.ts
docs: actualizar ROADMAP Fase 3
```

### Flujo diario

```bash
git checkout dev && git pull
git checkout -b feature/notifications
# ... trabajar ...
git add -p
git commit -m "feat: agregar bell de notificaciones con badge"
git push -u origin feature/notifications
# PR hacia dev
```

---

## Testing

### Unit tests (Vitest)

```bash
npm run test          # watch
npm run test:run      # single run
npm run coverage
```

```typescript
// src/lib/utils/xp.test.ts
import { describe, it, expect } from 'vitest'
import { calculateXP, getLevel, LEVEL_NAMES } from './xp'

describe('XP', () => {
  it('calcula XP por posts', () => {
    expect(calculateXP({ posts: 1 })).toBe(10)
  })
  it('nivel 1 = Novato', () => {
    expect(LEVEL_NAMES[getLevel(0) - 1]).toBe('Novato')
  })
})
```

### E2E (Playwright)

```bash
npm run test:e2e
npm run test:e2e -- --ui
```

```typescript
// tests/e2e/auth.test.ts
import { test, expect } from '@playwright/test'

test('login exitoso', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('[type="submit"]')
  await expect(page).toHaveURL('/feed')
})
```

---

## Migraciones de Supabase

```bash
# Nueva migración
supabase migration new add_notifications_table

# Aplicar
supabase db push

# Regenerar tipos después de migrar
npx supabase gen types typescript \
  --project-id ajegcbzvviukuewqhqqb \
  > src/lib/types/database.ts
```

Formato de archivo:
```sql
-- supabase/migrations/20260413000001_add_notifications.sql
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus notificaciones" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Checklist antes de PR

- [ ] `npm run type-check` sin errores
- [ ] `npm run lint` sin warnings
- [ ] Tests unitarios pasando
- [ ] Probado en mobile (375px) y desktop (1440px)
- [ ] Sin `console.log` de debug
- [ ] Sin secrets en código (`process.env` para todo)
- [ ] UI en español
- [ ] Auth guard funciona para rutas protegidas
- [ ] Si hay nueva tabla → RLS habilitado

---

## Comandos de referencia

```bash
# Dev
npm run dev                    # localhost:3000

# Build
npm run build
npm run start

# Calidad
npm run type-check             # tsc --noEmit
npm run lint                   # eslint
npm run format                 # prettier

# Tests
npm run test                   # Vitest watch
npm run test:run               # Vitest single
npm run test:e2e               # Playwright
npm run coverage               # Cobertura

# Supabase
npx supabase gen types typescript --project-id ajegcbzvviukuewqhqqb > src/lib/types/database.ts
supabase db push               # Aplicar migraciones
```

---

## Trabajando con Claude Code

El archivo `CLAUDE.md` en la raíz le da a Claude el contexto completo del proyecto. Para aprovechar al máximo las sesiones:

```
# Ejemplos de prompts efectivos

✅ "Crea el componente PostCard en components/social/PostCard.tsx
    que reciba `post: Post` y muestre contenido, avatar, likes y comentarios.
    Respetar el design system (colores --cyan, --pink, --card de style.css)"

✅ "Migra la función sbGetPosts() de supabase.js al nuevo módulo
    lib/supabase/queries/posts.ts con TypeScript y manejo de errores"

✅ "Agrega la tabla game_scores según el schema en ARCHITECTURE.md
    y regenera los tipos de Supabase"

❌ "Haz un componente de post"
❌ "Agrega una tabla nueva"
```
