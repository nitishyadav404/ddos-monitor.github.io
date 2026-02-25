import React, { useRef, useCallback } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES, SEVERITY_LEVELS, SPEED_SETTINGS } from '../../utils/constants.js'
import { timeAgo, formatNumber } from '../../utils/formatters.js'
import SpeedKnob from './SpeedKnob.jsx'
import { Activity, Pause, Play, Download } from 'lucide-react'

function AttackRow({ attack }) {
  const sev = SEVERITY_LEVELS[attack.severity] || SEVERITY_LEVELS.medium
  const type = ATTACK_TYPES[attack.type] || ATTACK_TYPES.volumetric

  return (
    <div className="flex flex-col gap-1 py-2 px-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group animate-slide-in">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{attack.sourceFlag}</span>
        <span className="text-gray-400 text-xs truncate max-w-20">{attack.sourceName}</span>
        <span className="text-gray-600 text-xs">→</span>
        <span className="text-sm">{attack.targetFlag}</span>
        <span className="text-white text-xs truncate max-w-20 font-medium">{attack.targetName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="attack-badge"
          style={{ color: type.color, background: type.color + '22', borderColor: type.color + '55' }}
        >
          {type.icon} {type.label}
        </span>
        <span
          className="attack-badge ml-auto"
          style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
        >
          {sev.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
        <span>{formatNumber(attack.volume || 0)} pps</span>
        <span className="ml-auto">{timeAgo(attack.timestamp)}</span>
      </div>
    </div>
  )
}

export default function AttackListPanel() {
  const { attacks, feedPaused, setFeedPaused, feedSpeed, setFeedSpeed, selectedTypes, selectedSeverities } = useStore()
  const listRef = useRef(null)
  const isHovered = useRef(false)

  const filtered = attacks.filter(
    (a) => selectedTypes.includes(a.type) && selectedSeverities.includes(a.severity)
  )

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `ddos-attacks-${Date.now()}.json`; a.click()
  }

  return (
    <div className="flex flex-col h-full bg-space-700/60 border-l border-white/10">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 flex-shrink-0">
        <Activity size={13} className="text-cyber-cyan" />
        <span className="text-xs font-semibold text-white">Live Attack Feed</span>
        <span className="ml-auto text-[10px] font-mono bg-cyber-cyan/10 text-cyber-cyan px-1.5 py-0.5 rounded">
          {filtered.length}
        </span>
      </div>

      {/* Speed Knob */}
      <div className="flex items-center justify-center py-3 border-b border-white/10 flex-shrink-0">
        <SpeedKnob />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 flex-shrink-0">
        <button
          onClick={() => setFeedPaused(!feedPaused)}
          className={`btn-cyber flex items-center gap-1.5 flex-1 justify-center ${ feedPaused ? 'text-green-400 border-green-400/40 bg-green-400/10' : '' }`}
        >
          {feedPaused ? <Play size={11} /> : <Pause size={11} />}
          {feedPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={exportJSON} className="btn-cyber" title="Export JSON">
          <Download size={11} />
        </button>
      </div>

      {/* Attack List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-cyber"
        onMouseEnter={() => { isHovered.current = true }}
        onMouseLeave={() => { isHovered.current = false }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs">
            <Activity size={24} className="mb-2 opacity-30" />
            Waiting for attacks…
          </div>
        ) : (
          filtered.map((attack) => <AttackRow key={attack.id} attack={attack} />)
        )}
      </div>

      {feedPaused && (
        <div className="flex-shrink-0 text-center py-1.5 bg-green-500/10 border-t border-green-500/20 text-green-400 text-[10px] font-mono">
          Feed paused — hover to read
        </div>
      )}
    </div>
  )
}
