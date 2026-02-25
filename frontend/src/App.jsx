import React, { useEffect, useState } from 'react'
import { useWebSocket }  from './hooks/useWebSocket.js'
import { useGMTReset }   from './hooks/useGMTReset.js'
import { useDemoMode }   from './hooks/useDemoMode.js'
import Header            from './components/Layout/Header.jsx'
import GlobeView         from './components/Globe/GlobeView.jsx'
import AttackListPanel   from './components/AttackList/AttackListPanel.jsx'
import CountryRankingPanel  from './components/CountryPanel/CountryRankingPanel.jsx'
import CountryDetailModal   from './components/CountryPanel/CountryDetailModal.jsx'
import StatsPanel        from './components/StatsPanel/StatsPanel.jsx'
import ControlBar        from './components/Controls/ControlBar.jsx'
import StatusBar         from './components/Layout/StatusBar.jsx'
import ArcTooltip        from './components/Globe/ArcTooltip.jsx'
import useStore          from './store/useStore.js'
import {
  generateTopCountries,
  generateLast24hHistory,
  generateAttackTypeDistribution,
  generateProtocolDistribution,
  generateDemoAttacks,
} from './utils/mockData.js'

// Responsive breakpoint hook
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

export default function App() {
  useWebSocket()
  useGMTReset()
  useDemoMode()

  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState('map')  // map | rank | feed | stats

  const {
    leftPanelOpen, rightPanelOpen, statsPanelOpen, countryDetailOpen,
    setTopTargetCountries, setTopSourceCountries, setLast24hHistory,
    setAttackTypeDistribution, setProtocolDistribution, addAttack,
    setDailyCount,
  } = useStore()

  useEffect(() => {
    setTopTargetCountries(generateTopCountries(true))
    setTopSourceCountries(generateTopCountries(false))
    setLast24hHistory(generateLast24hHistory())
    setAttackTypeDistribution(generateAttackTypeDistribution())
    setProtocolDistribution(generateProtocolDistribution())
    generateDemoAttacks(40).forEach(a => addAttack(a))
    setDailyCount(Math.floor(Math.random() * 90000) + 90000)
  }, []) // eslint-disable-line

  // ----------------------------------------------------------------
  // MOBILE LAYOUT
  // ----------------------------------------------------------------
  if (isMobile) {
    const TABS = [
      { id: 'map',   icon: '\uD83C\uDF0D', label: 'Map'   },
      { id: 'rank',  icon: '\uD83D\uDCCB', label: 'Rank'  },
      { id: 'feed',  icon: '\uD83D\uDCE1', label: 'Feed'  },
      { id: 'stats', icon: '\uD83D\uDCCA', label: 'Stats' },
    ]

    return (
      <div className="flex flex-col h-[100dvh] w-screen bg-black overflow-hidden">
        {/* Compact mobile header */}
        <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-green-900/60 flex-shrink-0">
          <span className="font-mono font-bold text-green-400 text-sm tracking-widest">&#9632; DDOS MONITOR</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-green-600 border border-green-800 px-1.5 py-0.5 rounded">DEMO</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        </div>

        {/* Globe — fills remaining height above panels */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
          <GlobeView />
          <ArcTooltip />

          {/* Floating control bar — centered at bottom of globe */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center z-20 px-2">
            <div className="bg-black/80 border border-green-900/70 rounded-xl px-2 py-1 backdrop-blur-sm">
              <ControlBar compact />
            </div>
          </div>
        </div>

        {/* Sliding panel drawers */}
        {mobileTab === 'rank' && (
          <div className="h-64 flex-shrink-0 overflow-y-auto border-t border-green-900/70 bg-black/95">
            <CountryRankingPanel />
          </div>
        )}
        {mobileTab === 'feed' && (
          <div className="h-64 flex-shrink-0 overflow-y-auto border-t border-green-900/70 bg-black/95">
            <AttackListPanel />
          </div>
        )}
        {mobileTab === 'stats' && (
          <div className="h-72 flex-shrink-0 overflow-y-auto border-t border-green-900/70 bg-black/95">
            <StatsPanel />
          </div>
        )}

        {/* Bottom tab bar */}
        <div className="flex flex-shrink-0 bg-black border-t border-green-900/70">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(mobileTab === tab.id && tab.id !== 'map' ? 'map' : tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5
                font-mono text-[10px] uppercase tracking-widest transition-colors
                ${ mobileTab === tab.id
                  ? 'text-green-400 bg-green-950/50'
                  : 'text-green-800 active:bg-green-950/30'
                }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Live attacks counter pill */}
        <div className="absolute top-12 right-2 z-30 pointer-events-none">
        </div>

        {countryDetailOpen && <CountryDetailModal />}
      </div>
    )
  }

  // ----------------------------------------------------------------
  // DESKTOP LAYOUT
  // ----------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-screen bg-space-950 overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel */}
        <div className={`transition-all duration-300 z-10 flex-shrink-0 overflow-hidden ${
          leftPanelOpen ? 'w-64' : 'w-0'
        }`}>
          {leftPanelOpen && <CountryRankingPanel />}
        </div>

        {/* Globe */}
        <div className="flex-1 relative overflow-hidden">
          <GlobeView />
          <ControlBar />
          <ArcTooltip />
        </div>

        {/* Right panel */}
        <div className={`transition-all duration-300 z-10 flex-shrink-0 overflow-hidden ${
          rightPanelOpen ? 'w-72' : 'w-0'
        }`}>
          {rightPanelOpen && <AttackListPanel />}
        </div>
      </div>

      {/* Stats panel */}
      <div className={`transition-all duration-500 ease-in-out flex-shrink-0 overflow-hidden ${
        statsPanelOpen ? 'h-72' : 'h-0'
      }`}>
        {statsPanelOpen && <StatsPanel />}
      </div>

      <StatusBar />
      {countryDetailOpen && <CountryDetailModal />}
    </div>
  )
}
