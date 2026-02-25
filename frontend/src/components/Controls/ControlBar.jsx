import React, { useState } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES, SEVERITY_LEVELS } from '../../utils/constants.js'
import { Filter, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'

export default function ControlBar() {
  const {
    selectedTypes, toggleType, selectAllTypes, clearAllTypes,
    selectedSeverities, toggleSeverity,
  } = useStore()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
      {/* Attack type filter chips */}
      {expanded && (
        <div className="panel-glass px-3 py-2 flex flex-wrap gap-1.5 max-w-2xl justify-center animate-fade-in">
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">Attack Types</span>
            <div className="flex gap-1">
              <button onClick={selectAllTypes} className="text-[9px] text-cyber-cyan hover:underline">All</button>
              <span className="text-gray-600">/</span>
              <button onClick={clearAllTypes} className="text-[9px] text-gray-500 hover:underline">None</button>
            </div>
          </div>
          {Object.entries(ATTACK_TYPES).map(([key, info]) => (
            <button
              key={key}
              onClick={() => toggleType(key)}
              className={`attack-badge transition-all duration-150 ${ selectedTypes.includes(key) ? 'opacity-100' : 'opacity-30 grayscale' }`}
              style={selectedTypes.includes(key)
                ? { color: info.color, background: info.color + '22', borderColor: info.color + '55' }
                : { color: '#666', background: '#ffffff08', borderColor: '#ffffff15' }
              }
            >
              {info.icon} {info.label}
            </button>
          ))}

          <div className="w-full border-t border-white/10 pt-1.5 mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 font-mono">Severity</span>
            {Object.entries(SEVERITY_LEVELS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => toggleSeverity(key)}
                className={`attack-badge transition-all duration-150 ${ selectedSeverities.includes(key) ? 'opacity-100' : 'opacity-30' }`}
                style={selectedSeverities.includes(key)
                  ? { color: info.color, background: info.bg, borderColor: info.border }
                  : { color: '#666', background: '#ffffff08', borderColor: '#ffffff15' }
                }
              >
                {info.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main control row */}
      <div className="panel-glass px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`btn-cyber flex items-center gap-1.5 ${ expanded ? 'btn-cyber-active' : '' }`}
        >
          <Filter size={12} />
          <span className="text-xs">Filters</span>
          {selectedTypes.length < Object.keys(ATTACK_TYPES).length && (
            <span className="bg-cyber-cyan text-space-900 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {Object.keys(ATTACK_TYPES).length - selectedTypes.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
