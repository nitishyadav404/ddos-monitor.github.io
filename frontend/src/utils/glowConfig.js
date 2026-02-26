/**
 * glowConfig.js
 * ─────────────────────────────────────────────────────────────────────────
 * Derived from: Name-Radius-Power-Strength.csv
 *
 * CSV columns map to Fresnel shell parameters:
 *   Name     → shell label / identifier
 *   Radius   → sphere scale factor (CSV value / 100 * maxRadius)
 *   Power    → Fresnel pow() exponent  (CSV value mapped 50→90 → 5.0→1.8)
 *   Strength → peak opacity/intensity   (CSV value / 100)
 *
 * The 4 shells used on the globe are the four highest-Power entries
 * (tightest rim first → widest halo last), matching the original
 * Kaspersky-style layering:
 *
 *   Shell A (Inner Rim)   ← highest Power  → tightest Fresnel lobe
 *   Shell B (Corona)      ← second
 *   Shell C (Atmosphere)  ← third
 *   Shell D (Deep Haze)   ← lowest Power   → widest soft halo
 *
 * At runtime, ATTACK_GLOW_MULTIPLIERS scales shell strengths
 * according to the worst active attack severity.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Raw CSV data ────────────────────────────────────────────────────────────
export const CSV_ATTACKS = [
  { name: 'Syn Flood',        radius: 35, power: 85, strength: 90 },
  { name: 'UDP Flood',        radius: 30, power: 75, strength: 80 },
  { name: 'HTTP Flood',       radius: 25, power: 70, strength: 75 },
  { name: 'ICMP Flood',       radius: 20, power: 60, strength: 65 },
  { name: 'DNS Amplification',radius: 40, power: 95, strength: 92 },
  { name: 'NTP Amplification',radius: 38, power: 90, strength: 88 },
  { name: 'Slowloris',        radius: 15, power: 50, strength: 55 },
  { name: 'Ping of Death',    radius: 28, power: 65, strength: 70 },
  { name: 'Smurf Attack',     radius: 32, power: 78, strength: 82 },
  { name: 'Teardrop',         radius: 22, power: 55, strength: 60 },
]

// ── Normalisation helpers ────────────────────────────────────────────────────
// CSV Radius  0-100  → THREE sphere radius  1.08 – 2.20
const RADIUS_MIN = 1.08
const RADIUS_MAX = 2.20
const normRadius = r => RADIUS_MIN + (r / 100) * (RADIUS_MAX - RADIUS_MIN)

// CSV Power   0-100  → Fresnel exponent     5.0  – 1.8
// (higher CSV power  =  tighter lobe  =  higher exponent)
const POWER_MAX_EXP = 5.0
const POWER_MIN_EXP = 1.8
const normPower = p => POWER_MIN_EXP + ((100 - p) / 100) * (POWER_MAX_EXP - POWER_MIN_EXP)

// CSV Strength 0-100 → Fresnel strength  0.0 – 1.0
const normStrength = s => s / 100

// ── Build the 4 active shells ─────────────────────────────────────────────────
// Sort descending by Power (tightest lobe first) → pick top 4
const SORTED = [...CSV_ATTACKS].sort((a, b) => b.power - a.power)

/**
 * GLOW_SHELLS[0..3] → shells A, B, C, D
 * Each entry: { name, sphereRadius, fresnelPower, fresnelStrength, csvRadius }
 */
export const GLOW_SHELLS = SORTED.slice(0, 4).map(row => ({
  name:            row.name,
  csvRadius:       row.radius,
  csvPower:        row.power,
  csvStrength:     row.strength,
  sphereRadius:    normRadius(row.radius),
  fresnelPower:    normPower(row.power),
  fresnelStrength: normStrength(row.strength),
}))

// ── Kaspersky teal palette (unchanged) ───────────────────────────────────────
export const SHELL_COLORS = [
  { r: 0.00, g: 0.72, b: 0.58 },   // Shell A – #00B894  inner teal
  { r: 0.00, g: 0.72, b: 0.58 },   // Shell B – #00B894  inner teal
  { r: 0.00, g: 0.55, b: 0.38 },   // Shell C – softer green
  { r: 0.00, g: 0.38, b: 0.27 },   // Shell D – deep haze
]

/**
 * ATTACK_GLOW_MULTIPLIERS
 * Multiplies fresnelStrength per-shell when an attack is active.
 * Values are [shellA, shellB, shellC, shellD].
 */
export const ATTACK_GLOW_MULTIPLIERS = {
  none:     [1.00, 1.00, 1.00, 1.00],
  low:      [1.15, 1.10, 1.05, 1.02],
  medium:   [1.40, 1.30, 1.15, 1.08],
  high:     [1.75, 1.55, 1.30, 1.15],
  critical: [2.20, 1.90, 1.55, 1.30],
}

/**
 * getActiveMultiplier(attacks)
 * Returns the multiplier array for the worst current severity.
 */
export function getActiveMultiplier(attacks = []) {
  const ORDER = ['critical', 'high', 'medium', 'low']
  for (const sev of ORDER) {
    if (attacks.some(a => a.severity === sev)) return ATTACK_GLOW_MULTIPLIERS[sev]
  }
  return ATTACK_GLOW_MULTIPLIERS.none
}
