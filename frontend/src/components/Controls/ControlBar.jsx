import React from 'react'
import {
  Globe2, Map, Thermometer, RefreshCw, BarChart2,
  PanelLeftOpen, PanelRightOpen, SlidersHorizontal,
} from 'lucide-react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES, SEVERITY_LEVELS, ATTACK_TYPE_COLORS, SEVERITY_COLORS, SPEED_LEVELS } from '../../utils/constants.js'

export default function ControlBar() {
  const {
    globeView, setGlobeView, colorMode, setColorMode,
    heatmapActive, toggleHeatmap, isRotating, toggleRotation,
    toggleLeftPanel, toggleRightPanel, toggleStatsPanel, statsPanelOpen,
    selectedTypes, toggleType, selectAllTypes, clearAllTypes,
    selectedSeverities, toggleSeverity,
    speedLevel, setSpeedLevel,
    demoMode,
  } = useStore()

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
      {/* Main toolbar */}
      <div className="flex items-center gap-1 panel-card rounded-xl px-3 py-2 pointer-events-auto shadow-panel">

        {/* Panel toggles */}
        <CtrlBtn icon={PanelLeftOpen}  title="Country Rankings" onClick={toggleLeftPanel} />
        <CtrlBtn icon={PanelRightOpen} title="Attack Feed"     onClick={toggleRightPanel} />
        <Sep />

        {/* Globe view */}
        <CtrlBtn icon={Globe2} title="3D Globe" onClick={() => setGlobeView('3d')}
          active={globeView === '3d'} />
        <CtrlBtn icon={Map} title="Flat Map" onClick={() => setGlobeView('flat')}
          active={globeView === 'flat'} />
        <Sep />

        {/* Options */}
        <CtrlBtn icon={Thermometer}    title="Heatmap" onClick={toggleHeatmap} active={heatmapActive} />
        <CtrlBtn icon={RefreshCw}      title={isRotating ? 'Pause rotation' : 'Resume rotation'}
          onClick={toggleRotation} active={isRotating} />
        <CtrlBtn icon={SlidersHorizontal} title="Color mode"
          onClick={() => setColorMode(colorMode === 'color' ? 'mono' : 'color')}
          active={colorMode === 'mono'} />
        <Sep />

        {/* Stats panel */}
        <CtrlBtn icon={BarChart2} title="Stats" onClick={toggleStatsPanel} active={statsPanelOpen} />

        {/* Speed control */}
        <Sep />
        <div className="flex items-center gap-0.5">
          {SPEED_LEVELS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeedLevel(i)}
              className={`font-mono text-xs px-2 py-0.5 rounded transition-all ${
                speedLevel === i
                  ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                  : 'text-cyber-green/40 hover:text-cyber-green/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attack type filter chips */}
      <div className="flex items-center gap-1 pointer-events-auto flex-wrap justify-center max-w-2xl">
        <button
          onClick={() => selectedTypes.length === ATTACK_TYPES.length ? clearAllTypes() : selectAllTypes()}
          className="font-mono text-xs px-2 py-0.5 rounded border border-cyber-green/30 text-cyber-green/60 hover:text-cyber-green transition-colors"
        >
          {selectedTypes.length === ATTACK_TYPES.length ? 'ALL ✔' : 'ALL'}
        </button>
        {ATTACK_TYPES.map((type) => {
          const active = selectedTypes.includes(type)
          const color  = ATTACK_TYPE_COLORS[type]
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`font-mono text-xs px-2 py-0.5 rounded border transition-all ${
                active ? 'opacity-100' : 'opacity-30'
              }`}
              style={{
                borderColor: color + '66',
                color:       active ? color : color + '88',
                background:  active ? color + '15' : 'transparent',
              }}
            >
              {type.split(' ')[0]}
            </button>
          )
        })}
        <Sep />
        {SEVERITY_LEVELS.map((sev) => {
          const key    = sev.toLowerCase()
          const active = selectedSeverities.includes(key)
          const color  = SEVERITY_COLORS[sev]
          return (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              className={`font-mono text-xs px-2 py-0.5 rounded transition-all ${
                active ? `badge-${key}` : 'opacity-30 text-gray-500 border border-gray-700'
              }`}
            >
              {sev}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CtrlBtn({ icon: Icon, title, onClick, active }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-all ${
        active
          ? 'text-cyber-green bg-cyber-green/15 shadow-green-sm'
          : 'text-cyber-green/40 hover:text-cyber-green/80 hover:bg-cyber-green/5'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-cyber-green/15 mx-1" />
}
