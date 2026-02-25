import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPE_COLORS, SEVERITY_COLORS } from '../../utils/constants.js'
import { shortTime, formatBps } from '../../utils/formatters.js'

export default function ArcTooltip() {
  const { hoveredArc } = useStore()

  if (!hoveredArc) return null

  const typeColor = ATTACK_TYPE_COLORS[hoveredArc.type] || '#00ff88'
  const sevColor  = SEVERITY_COLORS[hoveredArc.severity] ||
    SEVERITY_COLORS[hoveredArc.severity?.charAt(0).toUpperCase() + hoveredArc.severity?.slice(1)] ||
    '#00ff88'

  // Position near cursor but avoid screen edges
  const x = Math.min(hoveredArc.x + 12, window.innerWidth  - 220)
  const y = Math.min(hoveredArc.y + 12, window.innerHeight - 140)

  return (
    <AnimatePresence>
      <motion.div
        key="arc-tooltip"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.12 }}
        className="fixed z-50 pointer-events-none panel-card rounded-lg px-3 py-2.5"
        style={{ left: x, top: y, minWidth: 190 }}
      >
        {/* Route */}
        <div className="font-mono text-xs font-semibold text-cyber-green mb-1.5">
          {hoveredArc.source_country || '??'} → {hoveredArc.target_country || '??'}
        </div>

        {/* Type */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="font-mono text-xs px-1.5 py-0.5 rounded"
            style={{ color: typeColor, background: typeColor + '18', border: `1px solid ${typeColor}40` }}
          >
            {hoveredArc.type}
          </span>
        </div>

        {/* Severity */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-mono text-xs text-cyber-green/40">Severity:</span>
          <span className="font-mono text-xs font-semibold" style={{ color: sevColor }}>
            {(hoveredArc.severity || 'low').toUpperCase()}
          </span>
        </div>

        {/* Confidence */}
        {hoveredArc.confidence > 0 && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono text-xs text-cyber-green/40">Confidence:</span>
            <span className="font-mono text-xs text-cyber-green">{Math.round(hoveredArc.confidence)}%</span>
          </div>
        )}

        {/* Volume */}
        {hoveredArc.volume_bps && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono text-xs text-cyber-green/40">Volume:</span>
            <span className="font-mono text-xs text-cyber-orange">{formatBps(hoveredArc.volume_bps)}</span>
          </div>
        )}

        {/* Time */}
        <div className="font-mono text-xs text-cyber-green/25 mt-1">
          {shortTime(hoveredArc.timestamp)}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
