/** Génère un slug URL à partir d'un nom (« Famille Müller-Dupont » → « famille-muller-dupont »). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/** Slugs réservés (collision avec les routes de l'application). */
export const RESERVED_SLUGS = new Set(['auth', 'invite', 'setup', 'api', 'admin', 'login', 'profil'])

/** Initiales pour l'avatar. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Normalise un numéro suisse en format E.164 (`079 123 45 67` → `+41791234567`). Retourne null si invalide. */
export function normalizeSwissPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '')
  if (!digits) return null
  let e164 = digits
  if (e164.startsWith('00')) e164 = `+${e164.slice(2)}`
  else if (e164.startsWith('0')) e164 = `+41${e164.slice(1)}`
  if (!/^\+\d{9,15}$/.test(e164)) return null
  return e164
}

/** Affiche un numéro E.164 suisse lisiblement : `+41 79 123 45 67`. */
export function formatSwissPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = /^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164)
  return m ? `+41 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Jeton aléatoire cryptographiquement sûr (hexadécimal). */
export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}
