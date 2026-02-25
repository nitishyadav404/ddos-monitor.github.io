import React from 'react'
import useStore from '../../store/useStore.js'
import { formatNumber, timeAgo } from '../../utils/formatters.js'
import { SEVERITY_LEVELS } from '../../utils/constants.js'

export default function ArcTooltip() {
  const hoveredArc = useStore((s) => s.hoveredArc)
  if (!hoveredArc) return null

  const sev = SEVERITY_LEVELS[hoveredArc.severity] || SEVERITY_LEVELS.medium

  return (
    <div
      className="fixed z-50 pointer-events-none animate-fade-in"
      style={{ left: (hoveredArc.x || 0) + 16, top: (hoveredArc.y || 0) - 10 }}
    >
      <div className="panel-glass p-3 min-w-48 max-w-64 text-xs shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{hoveredArc.typeColor ? '⚡' : ''}</span>
          <span className="font-bold text-white">{hoveredArc.typeName}</span>
          <span
            className="ml-auto attack-badge text-[10px]"
            style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
          >
            {hoveredArc.severityLabel}
          </span>
        </div>
        <div className="space-y-1 text-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-500">Source</span>
            <span>{hoveredArc.sourceFlag} {hoveredArc.sourceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Target</span>
            <span>{hoveredArc.targetFlag} {hoveredArc.targetName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Volume</span>
            <span className="font-mono">{formatNumber(hoveredArc.volume || 0)} pps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Confidence</span>
            <span className="font-mono">{hoveredArc.confidence || 0}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Detected</span>
            <span>{timeAgo(hoveredArc.timestamp)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ID</span>
            <span className="font-mono text-[9px] text-gray-600">{hoveredArc.id?.slice(0, 16)}…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
