import React, { useEffect } from 'react'
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

export default function App() {
  useWebSocket()   // connects to backend WS (no-ops when demoMode=true)
  useGMTReset()    // resets daily counter at UTC midnight
  useDemoMode()    // auto-generates attacks when demoMode=true

  const {
    leftPanelOpen, rightPanelOpen, statsPanelOpen, countryDetailOpen,
    setTopTargetCountries, setTopSourceCountries, setLast24hHistory,
    setAttackTypeDistribution, setProtocolDistribution, addAttack,
    setDailyCount,
  } = useStore()

  // Seed initial data so the globe looks populated on first load
  useEffect(() => {
    setTopTargetCountries(generateTopCountries(true))
    setTopSourceCountries(generateTopCountries(false))
    setLast24hHistory(generateLast24hHistory())
    setAttackTypeDistribution(generateAttackTypeDistribution())
    setProtocolDistribution(generateProtocolDistribution())
    // 40 initial arcs — gives the globe a busy, live feel immediately
    generateDemoAttacks(40).forEach(a => addAttack(a))
    // Realistic-looking daily counter (resets at UTC midnight via useGMTReset)
    setDailyCount(Math.floor(Math.random() * 90000) + 90000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen w-screen bg-space-950 overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel — Country Rankings */}
        <div className={`transition-all duration-300 z-10 flex-shrink-0 overflow-hidden ${
          leftPanelOpen ? 'w-64' : 'w-0'
        }`}>
          {leftPanelOpen && <CountryRankingPanel />}
        </div>

        {/* Main Globe */}
        <div className="flex-1 relative overflow-hidden">
          <GlobeView />
          <ControlBar />
          <ArcTooltip />
        </div>

        {/* Right Panel — Live Feed */}
        <div className={`transition-all duration-300 z-10 flex-shrink-0 overflow-hidden ${
          rightPanelOpen ? 'w-72' : 'w-0'
        }`}>
          {rightPanelOpen && <AttackListPanel />}
        </div>
      </div>

      {/* Stats Panel — collapsible bottom */}
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
