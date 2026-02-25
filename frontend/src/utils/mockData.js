import { ATTACK_TYPES, ATTACK_TYPE_COLORS, COUNTRIES, SEVERITY_LEVELS } from './constants.js'

const COUNTRY_CODES = Object.keys(COUNTRIES)

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

let _id = 1

export function generateDemoAttack() {
  const srcCode = randomItem(COUNTRY_CODES)
  let tgtCode   = randomItem(COUNTRY_CODES)
  while (tgtCode === srcCode) tgtCode = randomItem(COUNTRY_CODES)

  const src = COUNTRIES[srcCode]
  const tgt = COUNTRIES[tgtCode]
  const type     = randomItem(ATTACK_TYPES)
  const severity = randomItem(SEVERITY_LEVELS)

  return {
    id:            `demo-${_id++}`,
    source_country: srcCode,
    sourceLat:     src.lat + (Math.random() - 0.5) * 4,
    sourceLng:     src.lng + (Math.random() - 0.5) * 4,
    target_country: tgtCode,
    targetLat:     tgt.lat + (Math.random() - 0.5) * 4,
    targetLng:     tgt.lng + (Math.random() - 0.5) * 4,
    type,
    typeColor:     ATTACK_TYPE_COLORS[type],
    severity:      severity.toLowerCase(),
    confidence:    randomInt(65, 99),
    timestamp:     new Date().toISOString(),
    data_source:   'demo',
  }
}

export function generateDemoAttacks(n = 20) {
  return Array.from({ length: n }, generateDemoAttack)
}

export function generateTopCountries(asTarget = true) {
  const shuffled = [...COUNTRY_CODES].sort(() => Math.random() - 0.5).slice(0, 10)
  return shuffled.map((code, i) => ({
    rank: i + 1,
    country_code: code,
    country_name: COUNTRIES[code].name,
    count: randomInt(1200 - i * 100, 3000 - i * 150),
    primary_attack_type: randomItem(ATTACK_TYPES),
    lat: COUNTRIES[code].lat,
    lng: COUNTRIES[code].lng,
  }))
}

export function generateLast24hHistory() {
  const now = Date.now()
  return Array.from({ length: 288 }, (_, i) => ({
    timestamp_utc: new Date(now - (287 - i) * 5 * 60 * 1000).toISOString(),
    count: randomInt(50, 400) + (i > 240 ? randomInt(0, 200) : 0),
  }))
}

export function generateAttackTypeDistribution() {
  const total = 10000
  let remaining = total
  return ATTACK_TYPES.map((type, i) => {
    const count = i === ATTACK_TYPES.length - 1
      ? remaining
      : randomInt(200, Math.floor(remaining / (ATTACK_TYPES.length - i)))
    remaining -= count
    return {
      attack_type: type,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
      color: ATTACK_TYPE_COLORS[type],
    }
  })
}

export function generateProtocolDistribution() {
  return [
    { protocol: 'SYN',  count: 3200, percentage: 32.0, color: '#bf5fff' },
    { protocol: 'UDP',  count: 2800, percentage: 28.0, color: '#00ff88' },
    { protocol: 'HTTP', count: 1900, percentage: 19.0, color: '#00d4ff' },
    { protocol: 'DNS',  count: 1200, percentage: 12.0, color: '#ffd700' },
    { protocol: 'ICMP', count:  900, percentage:  9.0, color: '#39ff14' },
  ]
}
