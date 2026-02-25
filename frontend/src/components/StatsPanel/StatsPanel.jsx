import React from 'react'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from 'chart.js'
import { X } from 'lucide-react'
import useStore from '../../store/useStore.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

export default function StatsPanel() {
  const {
    attackTypeDistribution, last24hHistory, protocolDistribution,
    toggleStatsPanel,
  } = useStore()

  // Doughnut: attack type
  const doughnutData = {
    labels: attackTypeDistribution.map((d) => d.attack_type),
    datasets: [{
      data: attackTypeDistribution.map((d) => d.count),
      backgroundColor: attackTypeDistribution.map((d) => (d.color || '#00ff88') + 'cc'),
      borderColor:     attackTypeDistribution.map((d) => d.color || '#00ff88'),
      borderWidth: 1,
    }],
  }

  // Line: 24h history
  const lineLabels = last24hHistory
    .filter((_, i) => i % 12 === 0)
    .map((p) => new Date(p.timestamp_utc).getUTCHours() + ':00')
  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: 'Attacks',
      data: last24hHistory.filter((_, i) => i % 12 === 0).map((p) => p.count),
      borderColor: '#00ff88',
      backgroundColor: 'rgba(0,255,136,0.08)',
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      borderWidth: 1.5,
    }],
  }

  const chartOptions = (isLine = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !isLine,
        position: 'right',
        labels: { color: '#00ff8888', font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 10, padding: 6 },
      },
      tooltip: {
        backgroundColor: 'rgba(6,15,8,0.95)',
        titleColor: '#00ff88',
        bodyColor: '#00ff8888',
        borderColor: 'rgba(0,255,136,0.2)',
        borderWidth: 1,
        titleFont: { family: 'JetBrains Mono', size: 11 },
        bodyFont:  { family: 'JetBrains Mono', size: 10 },
      },
    },
    scales: isLine ? {
      x: { ticks: { color: '#00ff8855', font: { family: 'JetBrains Mono', size: 9 } }, grid: { color: 'rgba(0,255,136,0.04)' } },
      y: { ticks: { color: '#00ff8855', font: { family: 'JetBrains Mono', size: 9 } }, grid: { color: 'rgba(0,255,136,0.04)' } },
    } : undefined,
  })

  return (
    <div className="h-full flex panel-card border-t border-cyber-green/15 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col justify-between py-3 px-3 border-r border-cyber-green/10">
        <span className="font-mono text-xs text-cyber-green/60 uppercase tracking-wider [writing-mode:vertical-lr] rotate-180">
          Stats Panel
        </span>
        <button onClick={toggleStatsPanel} className="text-cyber-green/30 hover:text-cyber-green transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Charts */}
      <div className="flex flex-1 gap-4 px-4 py-3 overflow-x-auto">
        {/* Doughnut */}
        <div className="flex flex-col flex-shrink-0" style={{ width: 220 }}>
          <p className="font-mono text-xs text-cyber-green/40 uppercase mb-1">Attack Types</p>
          <div className="flex-1" style={{ minHeight: 180 }}>
            {attackTypeDistribution.length > 0 && <Doughnut data={doughnutData} options={chartOptions(false)} />}
          </div>
        </div>

        {/* 24h Line */}
        <div className="flex flex-col flex-1" style={{ minWidth: 280 }}>
          <p className="font-mono text-xs text-cyber-green/40 uppercase mb-1">24h Activity</p>
          <div className="flex-1" style={{ minHeight: 180 }}>
            {last24hHistory.length > 0 && <Line data={lineData} options={chartOptions(true)} />}
          </div>
        </div>

        {/* Protocol breakdown */}
        <div className="flex flex-col flex-shrink-0" style={{ width: 180 }}>
          <p className="font-mono text-xs text-cyber-green/40 uppercase mb-1">Protocols</p>
          <div className="space-y-2 mt-1">
            {protocolDistribution.map((p) => (
              <div key={p.protocol} className="flex items-center gap-2">
                <span className="font-mono text-xs w-10" style={{ color: p.color }}>{p.protocol}</span>
                <div className="flex-1 h-1 bg-cyber-green/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width:`${p.percentage}%`, background: p.color }} />
                </div>
                <span className="font-mono text-xs text-cyber-green/40">{p.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
