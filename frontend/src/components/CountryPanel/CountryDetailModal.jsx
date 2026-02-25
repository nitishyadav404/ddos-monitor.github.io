import React, { useEffect, useState } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES, SEVERITY_LEVELS } from '../../utils/constants.js'
import { formatNumber } from '../../utils/formatters.js'
import { generateCountryDetail } from '../../utils/mockData.js'
import { X, Shield, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export default function CountryDetailModal() {
  const { selectedCountry, closeCountryDetail } = useStore()
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (selectedCountry?.code) {
      setDetail(generateCountryDetail(selectedCountry.code))
    } else if (selectedCountry) {
      setDetail(generateCountryDetail(Object.keys(require('../../utils/constants.js').COUNTRIES)[0]))
    }
  }, [selectedCountry])

  if (!detail) return null
  const sev = SEVERITY_LEVELS[detail.vulnerabilityLevel] || SEVERITY_LEVELS.medium

  const chartData = {
    labels: detail.history.map((h) => h.label),
    datasets: [{
      data: detail.history.map((h) => h.count),
      borderColor: '#00d4ff',
      backgroundColor: '#00d4ff11',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }]
  }
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false, grid: { display: false } }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeCountryDetail}>
      <div className="panel-glass w-full max-w-md mx-4 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <span className="text-3xl">{detail.flag}</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{detail.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{detail.code}</span>
              <span
                className="attack-badge text-[10px]"
                style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
              >
                <Shield size={9} className="inline mr-0.5" />{sev.label} Risk
              </span>
            </div>
          </div>
          <button onClick={closeCountryDetail} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Attack counts */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-cyber-cyan font-mono">{formatNumber(detail.totalAttacks)}</div>
              <div className="text-[10px] text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400 font-mono">{formatNumber(detail.incoming)}</div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                <ArrowDownLeft size={10} />Incoming
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-400 font-mono">{formatNumber(detail.outgoing)}</div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                <ArrowUpRight size={10} />Outgoing
              </div>
            </div>
          </div>

          {/* 24h mini chart */}
          <div className="h-16">
            <Line data={chartData} options={chartOpts} />
          </div>

          {/* Top attack types */}
          <div>
            <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Top Attack Types</div>
            {detail.topAttackTypes.map((t) => (
              <div key={t.type} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono" style={{ color: t.color }}>{t.label}</span>
                <div className="flex-1 bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (t.count / detail.incoming) * 100)}%`, background: t.color }} />
                </div>
                <span className="text-[10px] font-mono text-gray-400">{formatNumber(t.count)}</span>
              </div>
            ))}
          </div>

          {/* Top sources */}
          <div>
            <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Top Attacking Sources</div>
            <div className="space-y-1">
              {detail.topSources.map((s) => (
                <div key={s.code} className="flex items-center gap-2 text-xs">
                  <span>{s.flag}</span>
                  <span className="text-gray-300 flex-1">{s.name}</span>
                  <span className="font-mono text-red-400">{formatNumber(s.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
