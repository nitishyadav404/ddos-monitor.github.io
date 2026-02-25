import { create } from 'zustand'
import { ATTACK_TYPES, SEVERITY_LEVELS, MAX_ATTACKS_IN_STORE } from '../utils/constants.js'

const useStore = create((set, get) => ({
  // ---- Globe state ----
  globeView:     '3d',
  colorMode:     'color',
  heatmapActive: false,
  isRotating:    true,

  // ---- Panel visibility ----
  leftPanelOpen:     true,
  rightPanelOpen:    true,
  statsPanelOpen:    false,
  countryDetailOpen: false,

  // ---- Live attacks ----
  attacks:        [],
  dailyCount:     0,
  yesterdayCount: null,
  percentChange:  null,

  // ---- Filters ----
  selectedTypes:      [...ATTACK_TYPES],
  selectedSeverities: SEVERITY_LEVELS.map(s => s.toLowerCase()),
  speedLevel:         1,   // 0=SLOW 1=NORMAL 2=FAST 3=LIVE
  demoMode:           true, // auto-on until real backend is connected

  // ---- Country panel ----
  topTargetCountries: [],
  topSourceCountries: [],
  selectedCountry:    null,

  // ---- Stats panel ----
  last24hHistory:         [],
  attackTypeDistribution: [],
  protocolDistribution:   [],

  // ---- Tooltip ----
  hoveredArc: null,

  // ---- WebSocket ----
  wsStatus: 'connecting',

  // ================================================================
  // ACTIONS
  // ================================================================
  addAttack: (attack) => set((state) => ({
    attacks:    [attack, ...state.attacks].slice(0, MAX_ATTACKS_IN_STORE),
    dailyCount: state.dailyCount + 1,
  })),

  addAttacks: (batch) => set((state) => ({
    attacks: [...batch, ...state.attacks].slice(0, MAX_ATTACKS_IN_STORE),
  })),

  setDailyCount:     (n) => set({ dailyCount: n }),
  setYesterdayCount: (n) => set({ yesterdayCount: n }),
  setPercentChange:  (n) => set({ percentChange: n }),

  setGlobeView:   (v) => set({ globeView: v }),
  setColorMode:   (m) => set({ colorMode: m }),
  toggleHeatmap:  ()  => set((s) => ({ heatmapActive: !s.heatmapActive })),
  toggleRotation: ()  => set((s) => ({ isRotating: !s.isRotating })),

  toggleLeftPanel:  () => set((s) => ({ leftPanelOpen:  !s.leftPanelOpen  })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleStatsPanel: () => set((s) => ({ statsPanelOpen: !s.statsPanelOpen })),

  setCountryDetailOpen: (v) => set({ countryDetailOpen: v }),
  setSelectedCountry:   (c) => set({ selectedCountry: c, countryDetailOpen: !!c }),

  setTopTargetCountries:    (d) => set({ topTargetCountries: d }),
  setTopSourceCountries:    (d) => set({ topSourceCountries: d }),
  setLast24hHistory:        (d) => set({ last24hHistory: d }),
  setAttackTypeDistribution:(d) => set({ attackTypeDistribution: d }),
  setProtocolDistribution:  (d) => set({ protocolDistribution: d }),

  setHoveredArc: (arc) => set({ hoveredArc: arc }),
  setWsStatus:   (s)   => set({ wsStatus: s }),

  toggleType: (type) => set((state) => {
    const has = state.selectedTypes.includes(type)
    return { selectedTypes: has ? state.selectedTypes.filter(t => t !== type) : [...state.selectedTypes, type] }
  }),

  toggleSeverity: (sev) => set((state) => {
    const key = sev.toLowerCase()
    const has = state.selectedSeverities.includes(key)
    return { selectedSeverities: has ? state.selectedSeverities.filter(s => s !== key) : [...state.selectedSeverities, key] }
  }),

  setSpeedLevel: (i) => set({ speedLevel: i }),
  setDemoMode:   (v) => set({ demoMode: v }),

  selectAllTypes:      () => set({ selectedTypes: [...ATTACK_TYPES] }),
  clearAllTypes:       () => set({ selectedTypes: [] }),
  selectAllSeverities: () => set({ selectedSeverities: SEVERITY_LEVELS.map(s => s.toLowerCase()) }),
}))

export default useStore
