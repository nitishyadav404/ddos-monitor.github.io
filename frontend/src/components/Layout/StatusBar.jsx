import React, { useState, useEffect } from 'react'
import { Clock, Globe, Zap } from 'lucide-react'
import useStore from '../../store/useStore.js'

export default function StatusBar() {
  const { attacks, wsStatus } = useStore()
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setUtcTime(
        now.toUTCString().replace('GMT', 'UTC').split(' ').slice(1).join(' ')
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const recentRate = attacks.length
    ? `${Math.min(attacks.length, 100)} in buffer`
    : 'No data'

  return (
    <footer className="flex items-center justify-between px-4 py-1 border-t border-cyber-green/10 bg-space-950 flex-shrink-0" style={{ minHeight: 28 }}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-cyber-green/40" />
          <span className="font-mono text-xs text-cyber-green/40">{utcTime}</span>
        </div>
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-cyber-green/40" />
          <span className="font-mono text-xs text-cyber-green/40">
            {wsStatus === 'live' ? '🟢 Live feed' : wsStatus === 'connecting' ? '🟡 Connecting…' : '🔴 Offline'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-cyber-purple/50" />
        <span className="font-mono text-xs text-cyber-purple/50">{recentRate}</span>
      </div>
    </footer>
  )
}
