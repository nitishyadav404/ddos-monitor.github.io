import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'
import useStore from '../../store/useStore.js'
import { shortTime, formatBps } from '../../utils/formatters.js'
import { ATTACK_TYPE_COLORS } from '../../utils/constants.js'

export default function AttackListPanel() {
  const { attacks, selectedTypes, selectedSeverities, toggleRightPanel } = useStore()
  const listRef = useRef(null)

  const visible = attacks
    .filter((a) => selectedTypes.includes(a.type) && selectedSeverities.includes(a.severity))
    .slice(0, 80)

  // Auto-scroll to top on new attack
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [attacks.length])

  return (
    <div className="h-full flex flex-col panel-card border-l border-cyber-green/15">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyber-green/10 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyber-green" />
          <span className="font-mono text-xs font-semibold text-cyber-green uppercase tracking-wider">Live Feed</span>
          <span className="font-mono text-xs text-cyber-green/40">({visible.length})</span>
        </div>
        <button onClick={toggleRightPanel} className="text-cyber-green/30 hover:text-cyber-green transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {visible.map((attack) => (
            <AttackRow key={attack.id} attack={attack} />
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-cyber-green/20">
            <Zap className="w-6 h-6 mb-2" />
            <span className="font-mono text-xs">Waiting for attacks…</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AttackRow({ attack }) {
  const color = ATTACK_TYPE_COLORS[attack.type] || '#00ff88'
  const sevClass = `badge-${attack.severity}`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      className="px-3 py-2 border-b border-cyber-green/5 hover:bg-cyber-green/3 transition-colors cursor-default"
    >
      {/* Row 1: time + severity + source→target */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="font-mono text-xs text-cyber-green/40">{shortTime(attack.timestamp)}</span>
        <span className={`font-mono text-xs px-1 rounded ${sevClass}`}>
          {attack.severity.toUpperCase()}
        </span>
        <span className="font-mono text-xs text-cyber-green/70 ml-auto">
          {attack.source_country || '??'} → {attack.target_country || '??'}
        </span>
      </div>
      {/* Row 2: type chip + confidence */}
      <div className="flex items-center gap-1.5">
        <span
          className="font-mono text-xs px-1.5 py-0.5 rounded"
          style={{ color, background: color + '18', border: `1px solid ${color}40` }}
        >
          {attack.type}
        </span>
        {attack.confidence > 0 && (
          <span className="font-mono text-xs text-cyber-green/30 ml-auto">
            {Math.round(attack.confidence)}% conf
          </span>
        )}
        {attack.volume_bps && (
          <span className="font-mono text-xs text-cyber-orange/60">{formatBps(attack.volume_bps)}</span>
        )}
      </div>
    </motion.div>
  )
}
