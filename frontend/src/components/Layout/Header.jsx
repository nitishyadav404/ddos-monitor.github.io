import React from 'react'
import useStore from '../../store/useStore.js'
import { formatNumber, gmtTimeUntilReset } from '../../utils/formatters.js'
import { ATTACK_TYPES } from '../../utils/constants.js'
import {
  Globe, Map, Activity, BarChart2, ChevronLeft, ChevronRight,
  Radio, Layers, Eye, EyeOff, Play, Square, Wifi, WifiOff
} from 'lucide-react'

export default function Header() {
  const {
    globeView, setGlobeView, colorMode, setColorMode,
    demoMode, toggleDemoMode, heatmapActive, toggleHeatmap,
    dailyCount, dailyCountByType, wsStatus,
    leftPanelOpen, toggleLeftPanel, rightPanelOpen, toggleRightPanel,
    statsPanelOpen, toggleStatsPanel,
  } = useStore()

  const statusColor = wsStatus === 'connected' ? 'text-green-400' :
                      wsStatus === 'demo' ? 'text-cyber-cyan' :
                      wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
  const statusLabel = wsStatus === 'connected' ? 'LIVE' :
                      wsStatus === 'demo' ? 'DEMO' :
                      wsStatus === 'connecting' ? 'CONN…' : 'OFFLINE'

  return (
    <header className="flex-shrink-0 bg-space-800/95 backdrop-blur border-b border-white/10 px-4 py-2 flex items-center gap-3 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center">
          <Radio size={14} className="text-cyber-cyan" />
        </div>
        <div>
          <div className="text-xs font-bold text-white leading-none">DDoS Monitor</div>
          <div className="text-[9px] text-gray-500 font-mono">LIVE THREAT MAP</div>
        </div>
      </div>

      {/* Daily Counter */}
      <div className="flex-1 flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyber-cyan font-mono text-glow-cyan leading-none">
            {formatNumber(dailyCount)}
          </div>
          <div className="text-[9px] text-gray-500 uppercase tracking-widest">Attacks Today</div>
        </div>

        {/* Sub-counters */}
        <div className="hidden xl:flex gap-2 flex-wrap">
          {Object.entries(ATTACK_TYPES).slice(0, 4).map(([key, info]) => (
            <div key={key} className="text-center">
              <div className="text-xs font-mono font-semibold" style={{ color: info.color }}>
                {formatNumber(dailyCountByType[key] || 0)}
              </div>
              <div className="text-[8px] text-gray-600">{info.label}</div>
            </div>
          ))}
        </div>

        <div className="text-[9px] text-gray-600 hidden lg:block">
          Resets in <span className="text-cyber-cyan font-mono">{gmtTimeUntilReset()}</span> GMT
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setGlobeView(globeView === 'globe' ? 'flat' : 'globe')}
          className={`btn-cyber flex items-center gap-1.5 ${ globeView === 'globe' ? 'btn-cyber-active' : '' }`}
          title="Toggle Globe/Map view"
        >
          {globeView === 'globe' ? <Globe size={12} /> : <Map size={12} />}
          <span className="hidden sm:inline">{globeView === 'globe' ? 'Globe' : 'Map'}</span>
        </button>

        <button
          onClick={() => setColorMode(colorMode === 'color' ? 'mono' : 'color')}
          className={`btn-cyber flex items-center gap-1.5 ${ colorMode === 'mono' ? 'btn-cyber-active' : '' }`}
          title="Toggle Color/Monochrome"
        >
          {colorMode === 'color' ? <Eye size={12} /> : <EyeOff size={12} />}
          <span className="hidden sm:inline">Mono</span>
        </button>

        <button
          onClick={toggleHeatmap}
          className={`btn-cyber flex items-center gap-1.5 ${ heatmapActive ? 'btn-cyber-active' : '' }`}
          title="Toggle heat map"
        >
          <Layers size={12} />
          <span className="hidden sm:inline">Heatmap</span>
        </button>

        <button
          onClick={toggleDemoMode}
          className={`btn-cyber flex items-center gap-1.5 ${ demoMode ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' : '' }`}
          title="Toggle Demo Mode"
        >
          {demoMode ? <Square size={12} /> : <Play size={12} />}
          <span className="hidden sm:inline">Demo</span>
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button
          onClick={toggleLeftPanel}
          className="btn-cyber" title="Toggle Country Rankings"
        >
          <ChevronLeft size={12} className={leftPanelOpen ? '' : 'rotate-180'} />
        </button>

        <button
          onClick={toggleStatsPanel}
          className={`btn-cyber flex items-center gap-1.5 ${ statsPanelOpen ? 'btn-cyber-active' : '' }`}
          title="Toggle Stats Panel"
        >
          <BarChart2 size={12} />
          <span className="hidden sm:inline">Stats</span>
        </button>

        <button
          onClick={toggleRightPanel}
          className="btn-cyber" title="Toggle Attack Feed"
        >
          <ChevronRight size={12} className={rightPanelOpen ? '' : 'rotate-180'} />
        </button>

        {/* Connection status */}
        <div className={`flex items-center gap-1.5 ml-2 text-xs font-mono font-bold ${statusColor}`}>
          {wsStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
          {statusLabel}
        </div>
      </div>
    </header>
  )
}
