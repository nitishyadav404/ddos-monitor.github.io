export const ATTACK_TYPES = {
  syn_flood:       { label: 'SYN Flood',       color: '#ff3366', icon: '🔴', desc: 'TCP SYN packet flood' },
  udp_flood:       { label: 'UDP Flood',       color: '#ff6b35', icon: '🟠', desc: 'UDP packet flood' },
  http_flood:      { label: 'HTTP Flood',      color: '#ffd700', icon: '🟡', desc: 'Application layer flood' },
  dns_amp:         { label: 'DNS Amplification', color: '#00d4ff', icon: '🔵', desc: 'DNS reflection/amplification' },
  ntp_amp:         { label: 'NTP Amplification', color: '#7928ca', icon: '🟣', desc: 'NTP reflection/amplification' },
  icmp_flood:      { label: 'ICMP Flood',      color: '#00ff88', icon: '🟢', desc: 'Ping flood attack' },
  volumetric:      { label: 'Volumetric',      color: '#ff9f43', icon: '🟤', desc: 'Bandwidth exhaustion' },
  botnet:          { label: 'Botnet DDoS',     color: '#ee5a24', icon: '⚫', desc: 'Botnet-driven attack' },
}

export const SEVERITY_LEVELS = {
  critical: { label: 'Critical', color: '#ff3366', bg: 'rgba(255,51,102,0.15)', border: 'rgba(255,51,102,0.4)' },
  high:     { label: 'High',     color: '#ff6b35', bg: 'rgba(255,107,53,0.15)',  border: 'rgba(255,107,53,0.4)' },
  medium:   { label: 'Medium',   color: '#ffd700', bg: 'rgba(255,215,0,0.15)',   border: 'rgba(255,215,0,0.4)' },
  low:      { label: 'Low',      color: '#00ff88', bg: 'rgba(0,255,136,0.15)',   border: 'rgba(0,255,136,0.4)' },
}

export const SPEED_SETTINGS = {
  slow:     { label: 'Slow',      interval: 30000,  degrees: 45  },
  medium:   { label: 'Medium',    interval: 10000,  degrees: 135 },
  fast:     { label: 'Fast',      interval: 3000,   degrees: 225 },
  realtime: { label: 'Real-Time', interval: 1000,   degrees: 315 },
}

export const COUNTRIES = {
  US: { name: 'United States', lat: 37.09, lng: -95.71, flag: '🇺🇸' },
  CN: { name: 'China',         lat: 35.86, lng: 104.20, flag: '🇨🇳' },
  RU: { name: 'Russia',        lat: 61.52, lng: 105.32, flag: '🇷🇺' },
  DE: { name: 'Germany',       lat: 51.17, lng: 10.45,  flag: '🇩🇪' },
  GB: { name: 'United Kingdom',lat: 55.38, lng: -3.44,  flag: '🇬🇧' },
  IN: { name: 'India',         lat: 20.59, lng: 78.96,  flag: '🇮🇳' },
  BR: { name: 'Brazil',        lat: -14.24,lng: -51.93, flag: '🇧🇷' },
  FR: { name: 'France',        lat: 46.23, lng: 2.21,   flag: '🇫🇷' },
  JP: { name: 'Japan',         lat: 36.20, lng: 138.25, flag: '🇯🇵' },
  KR: { name: 'South Korea',   lat: 35.91, lng: 127.77, flag: '🇰🇷' },
  AU: { name: 'Australia',     lat: -25.27,lng: 133.78, flag: '🇦🇺' },
  CA: { name: 'Canada',        lat: 56.13, lng: -106.35,flag: '🇨🇦' },
  NL: { name: 'Netherlands',   lat: 52.13, lng: 5.29,   flag: '🇳🇱' },
  UA: { name: 'Ukraine',       lat: 48.38, lng: 31.17,  flag: '🇺🇦' },
  SG: { name: 'Singapore',     lat: 1.35,  lng: 103.82, flag: '🇸🇬' },
  TR: { name: 'Turkey',        lat: 38.96, lng: 35.24,  flag: '🇹🇷' },
  PK: { name: 'Pakistan',      lat: 30.38, lng: 69.35,  flag: '🇵🇰' },
  IR: { name: 'Iran',          lat: 32.43, lng: 53.69,  flag: '🇮🇷' },
  MX: { name: 'Mexico',        lat: 23.63, lng: -102.55,flag: '🇲🇽' },
  ZA: { name: 'South Africa',  lat: -30.56,lng: 22.94,  flag: '🇿🇦' },
  NG: { name: 'Nigeria',       lat: 9.08,  lng: 8.68,   flag: '🇳🇬' },
  ID: { name: 'Indonesia',     lat: -0.79, lng: 113.92, flag: '🇮🇩' },
  AR: { name: 'Argentina',     lat: -38.42,lng: -63.62, flag: '🇦🇷' },
  IT: { name: 'Italy',         lat: 41.87, lng: 12.57,  flag: '🇮🇹' },
  ES: { name: 'Spain',         lat: 40.46, lng: -3.75,  flag: '🇪🇸' },
}

export const COUNTRY_CODES = Object.keys(COUNTRIES)
