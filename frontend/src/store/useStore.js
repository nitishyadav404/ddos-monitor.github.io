import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { ATTACK_TYPES, SEVERITY_LEVELS, SPEED_SETTINGS } from '../utils/constants.js'

const useStore = create(
  subscribeWithSelector((set, get) => ({
    // --- Globe state ---
    globeView: 'globe',       // 'globe' | 'flat'
    colorMode: 'color',       // 'color' | 'mono'
    heatmapActive: false,
    demoMode: false,
    zoomLevel: 1.5,
    selectedCountry: null,
    hoveredArc: null,

    // --- Attacks ---
    attacks: [],              // live attack queue (max 100)
    dailyCount: 0,
    dailyCountByType: {},
    last24hHistory: [],       // [{time, count}]
    topTargetCountries: [],
    topSourceCountries: [],
    attackTypeDistribution: {},
    protocolDistribution: {},
    countryDetails: {},       // cache: countryCode -> details

    // --- Filters ---
    selectedTypes: Object.keys(ATTACK_TYPES),   // all selected by default
    selectedSeverities: Object.keys(SEVERITY_LEVELS),

    // --- Feed control ---
    feedSpeed: 'realtime',    // 'slow'|'medium'|'fast'|'realtime'
    feedPaused: false,

    // --- WebSocket ---
    wsStatus: 'disconnected', // 'connected'|'connecting'|'disconnected'

    // --- Panels ---
    leftPanelOpen: true,
    rightPanelOpen: true,
    statsPanelOpen: false,
    countryDetailOpen: false,

    // ACTIONS
    setGlobeView: (v) => set({ globeView: v }),
    setColorMode: (m) => set({ colorMode: m }),
    toggleHeatmap: () => set((s) => ({ heatmapActive: !s.heatmapActive })),
    toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),
    setZoomLevel: (z) => set({ zoomLevel: z }),
    setSelectedCountry: (c) => set({ selectedCountry: c, countryDetailOpen: !!c }),
    setHoveredArc: (a) => set({ hoveredArc: a }),

    addAttack: (attack) => set((s) => {
      const newAttacks = [attack, ...s.attacks].slice(0, 100)
      const newCount = s.dailyCount + 1
      const byType = { ...s.dailyCountByType }
      byType[attack.type] = (byType[attack.type] || 0) + 1
      return { attacks: newAttacks, dailyCount: newCount, dailyCountByType: byType }
    }),

    setDailyCount: (n) => set({ dailyCount: n }),
    setDailyCountByType: (d) => set({ dailyCountByType: d }),
    setLast24hHistory: (h) => set({ last24hHistory: h }),
    setTopTargetCountries: (t) => set({ topTargetCountries: t }),
    setTopSourceCountries: (s) => set({ topSourceCountries: s }),
    setAttackTypeDistribution: (d) => set({ attackTypeDistribution: d }),
    setProtocolDistribution: (d) => set({ protocolDistribution: d }),
    setCountryDetails: (code, details) =>
      set((s) => ({ countryDetails: { ...s.countryDetails, [code]: details } })),

    setSelectedTypes: (types) => set({ selectedTypes: types }),
    toggleType: (type) => set((s) => {
      const types = s.selectedTypes.includes(type)
        ? s.selectedTypes.filter((t) => t !== type)
        : [...s.selectedTypes, type]
      return { selectedTypes: types }
    }),
    setSelectedSeverities: (sev) => set({ selectedSeverities: sev }),
    toggleSeverity: (sev) => set((s) => {
      const sevs = s.selectedSeverities.includes(sev)
        ? s.selectedSeverities.filter((v) => v !== sev)
        : [...s.selectedSeverities, sev]
      return { selectedSeverities: sevs }
    }),
    selectAllTypes: () => set({ selectedTypes: Object.keys(ATTACK_TYPES) }),
    clearAllTypes: () => set({ selectedTypes: [] }),

    setFeedSpeed: (spd) => set({ feedSpeed: spd }),
    setFeedPaused: (p) => set({ feedPaused: p }),
    setWsStatus: (st) => set({ wsStatus: st }),

    toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
    toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
    toggleStatsPanel: () => set((s) => ({ statsPanelOpen: !s.statsPanelOpen })),
    closeCountryDetail: () => set({ countryDetailOpen: false, selectedCountry: null }),

    resetDailyCount: () => set({ dailyCount: 0, dailyCountByType: {} }),
  }))
)

export default useStore
