/**
 * Utilidades para verificar el tier premium del usuario.
 * Usar estas funciones en lugar de comparar strings directamente.
 */

export type PremiumTier = 'free' | 'pro' | 'elite'

export function getPremiumTier(obj: unknown): PremiumTier {
  const tier = (obj as Record<string, unknown>)?.premium_tier
  if (tier === 'elite') return 'elite'
  if (tier === 'pro') return 'pro'
  return 'free'
}

export function isPremium(tier: unknown): boolean {
  return tier === 'pro' || tier === 'elite'
}

export function isElite(tier: unknown): boolean {
  return tier === 'elite'
}

export function getMaxChars(tier: unknown): number {
  return isPremium(tier) ? 500 : 280
}

export function canCreateTournament(tier: unknown): boolean {
  return isPremium(tier)
}

export function canUseNameColor(tier: unknown): boolean {
  return isElite(tier)
}
