import { formatDistanceToNow, format } from 'date-fns'

/**
 * Format a number with comma separators: 1234567 → '1,234,567'
 */
export function formatCount(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString('en-US')
}

/**
 * Relative time: '2 minutes ago'
 */
export function timeAgo(isoString) {
  try {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true })
  } catch {
    return ''
  }
}

/**
 * Short time: '23:45:02'
 */
export function shortTime(isoString) {
  try {
    return format(new Date(isoString), 'HH:mm:ss')
  } catch {
    return '--:--:--'
  }
}

/**
 * Format bytes per second: 1500000 → '1.5 Mbps'
 */
export function formatBps(bps) {
  if (!bps) return 'N/A'
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} Kbps`
  return `${bps} bps`
}

/**
 * Capitalise first letter
 */
export function cap(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Normalize a backend attack event into the frontend arc shape.
 * Maps backend field names → frontend expected field names.
 */
export function normalizeAttack(raw) {
  const { ATTACK_TYPE_COLORS, COUNTRIES } = require('./constants.js')
  const type  = raw.attack_type  || raw.type  || 'Volumetric'
  const color = ATTACK_TYPE_COLORS[type] || '#00ff88'

  // Fallback coordinates from COUNTRIES table if lat/lng missing
  const srcCountry = (raw.source_country || '').toUpperCase()
  const tgtCountry = (raw.target_country || '').toUpperCase()
  const srcRef = COUNTRIES[srcCountry] || {}
  const tgtRef = COUNTRIES[tgtCountry] || {}

  return {
    id:             raw.id || `live-${Date.now()}`,
    source_country: srcCountry,
    sourceLat:      raw.source_lat  ?? srcRef.lat ?? 0,
    sourceLng:      raw.source_lng  ?? srcRef.lng ?? 0,
    target_country: tgtCountry,
    targetLat:      raw.target_lat  ?? tgtRef.lat ?? 0,
    targetLng:      raw.target_lng  ?? tgtRef.lng ?? 0,
    type,
    typeColor:      color,
    severity:       (raw.severity || 'low').toLowerCase(),
    confidence:     raw.confidence_score ?? 0,
    volume_bps:     raw.volume_bps ?? null,
    timestamp:      raw.timestamp  || new Date().toISOString(),
    data_source:    raw.data_source || 'live',
  }
}
