import React, { useState, useEffect } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES } from '../../utils/constants.js'

export default function StatusBar() {
  const { attacks, wsStatus, demoMode, selectedTypes } = useStore()
  const [gmtTime, setGmtTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setGmtTime(
        now.toUTCString().replace('GMT', '').trim() + ' UTC'
      )
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const lastAttack = attacks[0]

  return (
    <div className="flex-shrink-0 bg-space-950/90 border-t border-white/10 px-4 py-1 flex items-center gap-4 text-[10px] font-mono text-gray-500">
      <span className="text-cyber-cyan">{gmtTime}</span>
      <span className="w-px h-3 bg-white/10" />
      {lastAttack && (
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: lastAttack.typeColor }} />
          Last: {lastAttack.sourceFlag} {lastAttack.sourceName} → {lastAttack.targetFlag} {lastAttack.targetName} [{lastAttack.typeName}]
        </span>
      )}
      <span className="ml-auto">
        {demoMode && <span className="text-yellow-400 mr-3">[DEMO MODE]</span>}
        Filters: {selectedTypes.length}/{Object.keys(ATTACK_TYPES).length} types active
      </span>
    </div>
  )
}
