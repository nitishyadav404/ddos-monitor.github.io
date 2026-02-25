// ============================================================
// ATTACK TYPES — matches backend schema exactly
// ============================================================
export const ATTACK_TYPES = [
  'SYN Flood',
  'UDP Flood',
  'HTTP Flood',
  'DNS Amplification',
  'NTP Amplification',
  'ICMP Flood',
  'Volumetric',
  'Botnet-Driven',
]

export const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low']

// Arc color per attack type (hacker green/purple palette)
export const ATTACK_TYPE_COLORS = {
  'SYN Flood':         '#bf5fff',  // purple
  'UDP Flood':         '#00ff88',  // green
  'HTTP Flood':        '#00d4ff',  // cyan
  'DNS Amplification': '#ffd700',  // yellow
  'NTP Amplification': '#ff6b35',  // orange
  'ICMP Flood':        '#39ff14',  // neon green
  'Volumetric':        '#ff3366',  // red
  'Botnet-Driven':     '#bf5fff',  // purple
}

export const SEVERITY_COLORS = {
  Critical: '#ff3366',
  High:     '#ff6b35',
  Medium:   '#ffd700',
  Low:      '#00ff88',
}

// Default arc color fallback
export const DEFAULT_ARC_COLOR = '#00ff88'

// ============================================================
// COUNTRIES centroid lookup (mirrors backend/data/country_coords.json)
// Used for arc endpoints and flat map rendering.
// ============================================================
export const COUNTRIES = {
  US: { name:'United States',    lat: 37.09,  lng: -95.71 },
  CN: { name:'China',            lat: 35.86,  lng: 104.20 },
  RU: { name:'Russia',           lat: 61.52,  lng: 105.32 },
  DE: { name:'Germany',          lat: 51.17,  lng: 10.45  },
  IN: { name:'India',            lat: 20.59,  lng: 78.96  },
  GB: { name:'United Kingdom',   lat: 55.38,  lng: -3.44  },
  FR: { name:'France',           lat: 46.23,  lng: 2.21   },
  BR: { name:'Brazil',           lat: -14.24, lng: -51.93 },
  KR: { name:'South Korea',      lat: 35.91,  lng: 127.77 },
  JP: { name:'Japan',            lat: 36.20,  lng: 138.25 },
  UA: { name:'Ukraine',          lat: 48.38,  lng: 31.17  },
  NL: { name:'Netherlands',      lat: 52.13,  lng: 5.29   },
  CA: { name:'Canada',           lat: 56.13,  lng:-106.35 },
  AU: { name:'Australia',        lat: -25.27, lng: 133.78 },
  SG: { name:'Singapore',        lat: 1.35,   lng: 103.82 },
  TR: { name:'Turkey',           lat: 38.96,  lng: 35.24  },
  IR: { name:'Iran',             lat: 32.43,  lng: 53.69  },
  ID: { name:'Indonesia',        lat: -0.79,  lng: 113.92 },
  VN: { name:'Vietnam',          lat: 14.06,  lng: 108.28 },
  PL: { name:'Poland',           lat: 51.92,  lng: 19.15  },
  IT: { name:'Italy',            lat: 41.87,  lng: 12.57  },
  ES: { name:'Spain',            lat: 40.46,  lng: -3.75  },
  MX: { name:'Mexico',           lat: 23.63,  lng:-102.55 },
  ZA: { name:'South Africa',     lat: -30.56, lng: 22.94  },
  UA: { name:'Ukraine',          lat: 48.38,  lng: 31.17  },
  PK: { name:'Pakistan',         lat: 30.38,  lng: 69.35  },
  AR: { name:'Argentina',        lat: -38.42, lng: -63.62 },
  HK: { name:'Hong Kong',        lat: 22.32,  lng: 114.17 },
  TW: { name:'Taiwan',           lat: 23.70,  lng: 120.96 },
  RO: { name:'Romania',          lat: 45.94,  lng: 24.97  },
  SA: { name:'Saudi Arabia',     lat: 23.89,  lng: 45.08  },
  AE: { name:'United Arab Emirates', lat: 23.42, lng: 53.85 },
}

// ============================================================
// WebSocket message types
// ============================================================
export const WS_MSG = {
  CONNECTED:     'connected',
  INITIAL_BATCH: 'initial_batch',
  ATTACK:        'attack',
  PONG:          'pong',
}

// Max attacks kept in store (older ones dropped)
export const MAX_ATTACKS_IN_STORE = 200

// Speed control values (ms between visual renders of incoming attacks)
export const SPEED_LEVELS = [
  { label: 'SLOW',   ms: 2000 },
  { label: 'NORMAL', ms: 800  },
  { label: 'FAST',   ms: 200  },
  { label: 'LIVE',   ms: 0    },
]
