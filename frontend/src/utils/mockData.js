import { ATTACK_TYPES, SEVERITY_LEVELS, COUNTRIES, COUNTRY_CODES } from './constants.js'

const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const pickTwo = (arr) => {
  const a = pick(arr)
  let b = pick(arr)
  while (b === a) b = pick(arr)
  return [a, b]
}

let attackIdCounter = 1

export function generateAttack() {
  const [srcCode, tgtCode] = pickTwo(COUNTRY_CODES)
  const src = COUNTRIES[srcCode]
  const tgt = COUNTRIES[tgtCode]
  const typeKey = pick(Object.keys(ATTACK_TYPES))
  const sevKey = pick(['critical', 'critical', 'high', 'high', 'medium', 'medium', 'low'])
  const type = ATTACK_TYPES[typeKey]
  const sev = SEVERITY_LEVELS[sevKey]

  return {
    id: `atk-${Date.now()}-${attackIdCounter++}`,
    sourceCountry: srcCode,
    targetCountry: tgtCode,
    sourceName: src.name,
    targetName: tgt.name,
    sourceFlag: src.flag,
    targetFlag: tgt.flag,
    sourceLat: src.lat + (Math.random() - 0.5) * 3,
    sourceLng: src.lng + (Math.random() - 0.5) * 3,
    targetLat: tgt.lat + (Math.random() - 0.5) * 3,
    targetLng: tgt.lng + (Math.random() - 0.5) * 3,
    type: typeKey,
    typeName: type.label,
    typeColor: type.color,
    severity: sevKey,
    severityLabel: sev.label,
    severityColor: sev.color,
    volume: rng(100, 500000),
    timestamp: new Date().toISOString(),
    confidence: rng(60, 99),
  }
}

export function generateDemoAttacks(count = 20) {
  return Array.from({ length: count }, generateAttack)
}

export function generateTopCountries(isTarget = true) {
  return COUNTRY_CODES.slice(0, 10).map((code, i) => ({
    code,
    name: COUNTRIES[code].name,
    flag: COUNTRIES[code].flag,
    count: rng(5000, 80000) - i * 3000,
    primaryType: pick(Object.keys(ATTACK_TYPES)),
    trend: pick(['up', 'down', 'up', 'stable']),
  })).sort((a, b) => b.count - a.count)
}

export function generateLast24hHistory() {
  const now = new Date()
  return Array.from({ length: 48 }, (_, i) => {
    const t = new Date(now.getTime() - (47 - i) * 30 * 60 * 1000)
    return {
      time: t.toISOString(),
      label: `${t.getUTCHours().toString().padStart(2, '0')}:${t.getUTCMinutes().toString().padStart(2, '0')}`,
      count: rng(200, 2500),
    }
  })
}

export function generateAttackTypeDistribution() {
  const dist = {}
  Object.keys(ATTACK_TYPES).forEach((k) => { dist[k] = rng(500, 20000) })
  return dist
}

export function generateProtocolDistribution() {
  return {
    TCP: rng(10000, 50000),
    UDP: rng(8000, 40000),
    HTTP: rng(5000, 25000),
    DNS: rng(3000, 15000),
    NTP: rng(2000, 10000),
    ICMP: rng(1000, 8000),
    Other: rng(500, 3000),
  }
}

export function generateCountryDetail(code) {
  const country = COUNTRIES[code]
  if (!country) return null
  const history = generateLast24hHistory()
  const total = rng(5000, 80000)
  return {
    code, ...country,
    totalAttacks: total,
    incoming: Math.floor(total * 0.65),
    outgoing: Math.floor(total * 0.35),
    topAttackTypes: Object.keys(ATTACK_TYPES).slice(0, 3).map((k) => ({
      type: k, label: ATTACK_TYPES[k].label, count: rng(500, 15000),
      color: ATTACK_TYPES[k].color,
    })),
    topSources: COUNTRY_CODES.filter((c) => c !== code).slice(0, 5).map((c) => ({
      code: c, name: COUNTRIES[c].name, flag: COUNTRIES[c].flag, count: rng(200, 8000),
    })),
    vulnerabilityLevel: pick(['critical', 'high', 'medium', 'low']),
    history,
  }
}
