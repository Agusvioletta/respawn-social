-- Conexiones externas en perfiles
-- Ejecutar en Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS steam_id          TEXT,
  ADD COLUMN IF NOT EXISTS discord_username  TEXT,
  ADD COLUMN IF NOT EXISTS twitch_username   TEXT;
