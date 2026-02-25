import React, { useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket.js'
import { useGMTReset } from './hooks/useGMTReset.js'
import Header from './components/Layout/Header.jsx'
import GlobeView from './components/Globe/GlobeView.jsx'
import AttackListPanel from './components/AttackList/AttackListPanel.jsx'
import CountryRankingPanel from './components/CountryPanel/CountryRankingPanel.jsx'
import CountryDetailModal from './components/CountryPanel/CountryDetailModal.jsx'
import StatsPanel from './components/StatsPanel/StatsPanel.jsx'
import ControlBar from './components/Controls/ControlBar.jsx'
import StatusBar from './components/Layout/StatusBar.jsx'
import ArcTooltip from './components/Globe/ArcTooltip.jsx'
import useStore from './store/useStore.js'
import {
  generateTopCountries,
  generateLast24hHistory,
  generateAttackTypeDistribution,
  generateProtocolDistribution,
  generateDemoAttacks,
} from './utils/mockData.js'

export default function App() {
  useWebSocket()
  useGMTReset()

  const {
    leftPanelOpen, rightPanelOpen, statsPanelOpen, countryDetailOpen,
    setTopTargetCountries, setTopSourceCountries, setLast24hHistory,
    setAttackTypeDistribution, setProtocolDistribution, addAttack,
    setDailyCount,
  } = useStore()

  // Seed initial data
  useEffect(() => {
    setTopTargetCountries(generateTopCountries(true))
    setTopSourceCountries(generateTopCountries(false))
    setLast24hHistory(generateLast24hHistory())
    setAttackTypeDistribution(generateAttackTypeDistribution())
    setProtocolDistribution(generateProtocolDistribution())
    const initial = generateDemoAttacks(15)
    initial.forEach((a) => addAttack(a))
    setDailyCount(Math.floor(Math.random() * 40000) + 15000)
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen bg-space-900 overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel */}
        <div className={`
          transition-all duration-300 z-10
          ${ leftPanelOpen ? 'w-64' : 'w-0' }
          flex-shrink-0 overflow-hidden
        `}>
          {leftPanelOpen && <CountryRankingPanel />}
        </div>

        {/* Main Globe Area */}
        <div className="flex-1 relative overflow-hidden">
          <GlobeView />
          <ControlBar />
          <ArcTooltip />
        </div>

        {/* Right Panel */}
        <div className={`
          transition-all duration-300 z-10
          ${ rightPanelOpen ? 'w-72' : 'w-0' }
          flex-shrink-0 overflow-hidden
        `}>
          {rightPanelOpen && <AttackListPanel />}
        </div>
      </div>

      {/* Stats Panel (collapsible bottom) */}
      <div className={`
        transition-all duration-500 ease-in-out flex-shrink-0
        ${ statsPanelOpen ? 'h-72' : 'h-0' } overflow-hidden
      `}>
        {statsPanelOpen && <StatsPanel />}
      </div>

      <StatusBar />

      {/* Country Detail Modal */}
      {countryDetailOpen && <CountryDetailModal />}
    </div>
  )
}
