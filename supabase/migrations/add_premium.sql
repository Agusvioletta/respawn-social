-- Premium / Stripe
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS premium_tier         TEXT    DEFAULT 'free' CHECK (premium_tier IN ('free','pro','elite')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_since        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_until        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name_color           TEXT;   -- solo elite, ej: '#FF4F7B'
