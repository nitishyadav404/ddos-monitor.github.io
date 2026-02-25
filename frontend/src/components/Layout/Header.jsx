import React from 'react'
import { Shield, Wifi, WifiOff, Activity } from 'lucide-react'
import useStore from '../../store/useStore.js'
import { formatCount } from '../../utils/formatters.js'

export default function Header() {
  const { dailyCount, yesterdayCount, wsStatus, demoMode, setDemoMode } = useStore()

  const statusConfig = {
    live:         { icon: Wifi,    color: 'text-cyber-green',  label: 'LIVE',        dot: 'bg-cyber-green'  },
    connecting:   { icon: Activity, color: 'text-cyber-yellow', label: 'CONNECTING',  dot: 'bg-cyber-yellow' },
    reconnecting: { icon: Activity, color: 'text-cyber-orange', label: 'RECONNECTING',dot: 'bg-cyber-orange' },
    offline:      { icon: WifiOff, color: 'text-gray-500',     label: 'OFFLINE',     dot: 'bg-gray-500'     },
  }
  const st = statusConfig[wsStatus] || statusConfig.offline
  const StatusIcon = st.icon

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-cyber-green/20 bg-space-950 flex-shrink-0 scan-effect" style={{ minHeight: 48 }}>
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <Shield className="w-5 h-5 text-cyber-green animate-pulse-slow" />
        <span className="font-mono text-sm font-bold text-cyber-green text-glow-green tracking-widest uppercase">
          DDoS Monitor
        </span>
        <span className="font-mono text-xs text-cyber-green/40 hidden sm:block">v1.0</span>
      </div>

      {/* Centre: Counter */}
      <div className="flex flex-col items-center">
        <span className="font-mono text-2xl font-bold text-cyber-green text-glow-green count-flip">
          {formatCount(dailyCount)}
        </span>
        <span className="font-mono text-xs text-cyber-green/50 uppercase tracking-wider">
          attacks today (UTC)
        </span>
        {yesterdayCount != null && (
          <span className="font-mono text-xs text-cyber-green/35">
            Yesterday: {formatCount(yesterdayCount)}
          </span>
        )}
      </div>

      {/* Right: Status + Demo toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`font-mono text-xs px-2 py-1 rounded border transition-all ${
            demoMode
              ? 'border-cyber-purple/60 text-cyber-purple bg-cyber-purple/10'
              : 'border-cyber-green/20 text-cyber-green/40 hover:border-cyber-green/40'
          }`}
        >
          {demoMode ? '● DEMO' : 'DEMO'}
        </button>

        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse`} />
          <StatusIcon className={`w-3.5 h-3.5 ${st.color}`} />
          <span className={`font-mono text-xs ${st.color} hidden sm:block`}>{st.label}</span>
        </div>
      </div>
    </header>
  )
}
