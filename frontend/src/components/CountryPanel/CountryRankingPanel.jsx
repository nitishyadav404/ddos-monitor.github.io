import React, { useState } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES } from '../../utils/constants.js'
import { formatNumber } from '../../utils/formatters.js'
import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react'

function TrendIcon({ trend }) {
  if (trend === 'up') return <TrendingUp size={10} className="text-red-400" />
  if (trend === 'down') return <TrendingDown size={10} className="text-green-400" />
  return <Minus size={10} className="text-gray-500" />
}

export default function CountryRankingPanel() {
  const { topTargetCountries, topSourceCountries, setSelectedCountry } = useStore()
  const [tab, setTab] = useState('target')
  const list = tab === 'target' ? topTargetCountries : topSourceCountries

  return (
    <div className="flex flex-col h-full bg-space-700/60 border-r border-white/10">
      <div className="flex items-center gap-1 px-2 py-2 border-b border-white/10 flex-shrink-0">
        <MapPin size={12} className="text-cyber-cyan" />
        <span className="text-xs font-semibold text-white">Country Rankings</span>
      </div>
      <div className="flex border-b border-white/10 flex-shrink-0">
        <button
          className={`flex-1 text-[10px] py-1.5 transition-colors ${ tab === 'target' ? 'text-cyber-cyan border-b-2 border-cyber-cyan' : 'text-gray-500' }`}
          onClick={() => setTab('target')}
        >
          ★ Targeted
        </button>
        <button
          className={`flex-1 text-[10px] py-1.5 transition-colors ${ tab === 'source' ? 'text-cyber-cyan border-b-2 border-cyber-cyan' : 'text-gray-500' }`}
          onClick={() => setTab('source')}
        >
          ⚡ Source
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-cyber">
        {list.map((country, i) => {
          const typeInfo = ATTACK_TYPES[country.primaryType] || ATTACK_TYPES.volumetric
          return (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country)}
              className="w-full flex items-center gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/5 text-left transition-colors"
            >
              <span className="text-[10px] font-mono text-gray-600 w-5">{i + 1}</span>
              <span className="text-sm">{country.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{country.name}</div>
                <div className="text-[9px] font-mono" style={{ color: typeInfo.color }}>
                  {typeInfo.label}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-mono text-cyber-cyan">{formatNumber(country.count)}</div>
                <TrendIcon trend={country.trend} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
