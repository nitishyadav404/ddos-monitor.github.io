import React, { useState } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES } from '../../utils/constants.js'
import { formatNumber } from '../../utils/formatters.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const CHART_FONT = { family: 'JetBrains Mono, monospace', size: 10 }
const GRID_COLOR = 'rgba(255,255,255,0.05)'
const TEXT_COLOR = '#6b7280'

function TopCountriesChart({ data, title }) {
  if (!data?.length) return null
  const chartData = {
    labels: data.slice(0, 8).map((c) => c.name.slice(0, 10)),
    datasets: [{ data: data.slice(0, 8).map((c) => c.count), backgroundColor: '#00d4ff33', borderColor: '#00d4ff', borderWidth: 1, borderRadius: 3 }]
  }
  return (
    <div className="h-full">
      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{title}</div>
      <Bar data={chartData} options={{
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${formatNumber(c.raw)}` } } },
        scales: {
          x: { grid: { color: GRID_COLOR }, ticks: { color: TEXT_COLOR, font: CHART_FONT, callback: (v) => formatNumber(v) } },
          y: { grid: { display: false }, ticks: { color: '#9ca3af', font: CHART_FONT } }
        }
      }} />
    </div>
  )
}

function AttackTypeDonut({ data }) {
  const entries = Object.entries(data)
  if (!entries.length) return null
  const chartData = {
    labels: entries.map(([k]) => ATTACK_TYPES[k]?.label || k),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: entries.map(([k]) => (ATTACK_TYPES[k]?.color || '#00d4ff') + 'aa'),
      borderColor: entries.map(([k]) => ATTACK_TYPES[k]?.color || '#00d4ff'),
      borderWidth: 1,
    }]
  }
  return (
    <div className="h-full">
      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Attack Types</div>
      <Doughnut data={chartData} options={{
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', font: CHART_FONT, boxWidth: 8, padding: 6 } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatNumber(c.raw)}` } }
        },
        cutout: '65%'
      }} />
    </div>
  )
}

function TimelineChart({ data }) {
  if (!data?.length) return null
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [{
      data: data.map((d) => d.count),
      borderColor: '#00d4ff',
      backgroundColor: '#00d4ff11',
      fill: true, tension: 0.4, pointRadius: 0,
    }]
  }
  return (
    <div className="h-full">
      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">24h Attack Timeline (GMT)</div>
      <Line data={chartData} options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: GRID_COLOR }, ticks: { color: TEXT_COLOR, font: CHART_FONT, maxTicksLimit: 12 } },
          y: { grid: { color: GRID_COLOR }, ticks: { color: TEXT_COLOR, font: CHART_FONT, callback: (v) => formatNumber(v) } }
        }
      }} />
    </div>
  )
}

const TABS = [
  { key: 'timeline',  label: '24h Timeline' },
  { key: 'types',     label: 'Attack Types' },
  { key: 'targets',   label: 'Top Targets' },
  { key: 'sources',   label: 'Top Sources' },
]

export default function StatsPanel() {
  const {
    last24hHistory, attackTypeDistribution, topTargetCountries, topSourceCountries
  } = useStore()
  const [tab, setTab] = useState('timeline')

  return (
    <div className="flex flex-col h-full bg-space-800/90 border-t border-white/10">
      {/* Tabs */}
      <div className="flex border-b border-white/10 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest transition-colors
              ${ tab === t.key ? 'text-cyber-cyan border-b-2 border-cyber-cyan' : 'text-gray-500 hover:text-gray-300' }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className="flex-1 px-6 py-3 overflow-hidden">
        {tab === 'timeline' && <TimelineChart data={last24hHistory} />}
        {tab === 'types'    && <AttackTypeDonut data={attackTypeDistribution} />}
        {tab === 'targets'  && <TopCountriesChart data={topTargetCountries} title="Top 8 Targeted Countries" />}
        {tab === 'sources'  && <TopCountriesChart data={topSourceCountries} title="Top 8 Source Countries" />}
      </div>
    </div>
  )
}
