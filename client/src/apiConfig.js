const RENDER_API = 'https://komsuas-api.onrender.com'

function trimSlash(value) {
  return String(value).replace(/\/$/, '')
}

/** VITE_API_URL varsa onu kullan. Geliştirmede boşsa Vite proxy (/api). Canlıda Render. */
export function resolveApiOrigin() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && String(fromEnv).trim()) {
    return trimSlash(String(fromEnv).trim())
  }
  if (import.meta.env.DEV) return ''
  return RENDER_API
}

export const apiOrigin = resolveApiOrigin()
export const apiBaseUrl = apiOrigin ? `${apiOrigin}/api` : '/api'
