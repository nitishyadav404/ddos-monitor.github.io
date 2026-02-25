import React, { useState } from 'react'
import { X, Target, Crosshair } from 'lucide-react'
import useStore from '../../store/useStore.js'
import { formatCount } from '../../utils/formatters.js'
import { ATTACK_TYPE_COLORS } from '../../utils/constants.js'

export default function CountryRankingPanel() {
  const {
    topTargetCountries, topSourceCountries,
    setSelectedCountry, toggleLeftPanel,
  } = useStore()

  const [tab, setTab] = useState('target') // 'target' | 'source'
  const list = tab === 'target' ? topTargetCountries : topSourceCountries

  return (
    <div className="h-full flex flex-col panel-card border-r border-cyber-green/15">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyber-green/10 flex-shrink-0">
        <span className="font-mono text-xs font-semibold text-cyber-green uppercase tracking-wider">Rankings</span>
        <button onClick={toggleLeftPanel} className="text-cyber-green/30 hover:text-cyber-green transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyber-green/10 flex-shrink-0">
        {[['target', 'Most Targeted', Target], ['source', 'Top Sources', Crosshair]].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 font-mono text-xs transition-all ${
              tab === id
                ? 'text-cyber-green border-b-2 border-cyber-green'
                : 'text-cyber-green/30 hover:text-cyber-green/60'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto">
        {list.map((c, i) => (
          <CountryRow key={c.country_code} country={c} rank={i + 1}
            onClick={() => setSelectedCountry(c)} />
        ))}
        {list.length === 0 && (
          <div className="flex items-center justify-center h-20 font-mono text-xs text-cyber-green/20">
            Loading…
          </div>
        )}
      </div>
    </div>
  )
}

function CountryRow({ country, rank, onClick }) {
  const color = ATTACK_TYPE_COLORS[country.primary_attack_type] || '#00ff88'
  const maxCount = 3000
  const pct = Math.min((country.count / maxCount) * 100, 100)

  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 border-b border-cyber-green/5 hover:bg-cyber-green/5 transition-colors text-left group"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-xs text-cyber-green/30 w-4">{rank}</span>
        <span className="font-mono text-xs font-semibold text-cyber-green group-hover:text-glow-green">
          {country.country_code}
        </span>
        <span className="font-mono text-xs text-cyber-green/50 truncate flex-1">{country.country_name}</span>
        <span className="font-mono text-xs text-cyber-green">{formatCount(country.count)}</span>
      </div>
      {/* Progress bar */}
      <div className="ml-6 h-0.5 bg-cyber-green/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {/* Attack type badge */}
      {country.primary_attack_type && (
        <div className="ml-6 mt-0.5">
          <span className="font-mono text-xs" style={{ color: color + 'aa' }}>
            {country.primary_attack_type}
          </span>
        </div>
      )}
    </button>
  )
}
