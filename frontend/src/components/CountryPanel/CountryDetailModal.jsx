import React, { useEffect, useState } from 'react'
import { X, ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store/useStore.js'
import { formatCount } from '../../utils/formatters.js'
import { ATTACK_TYPE_COLORS, SEVERITY_COLORS } from '../../utils/constants.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function CountryDetailModal() {
  const { selectedCountry, setCountryDetailOpen } = useStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCountry?.country_code) return
    setLoading(true)
    fetch(`${API_URL}/api/country/${selectedCountry.country_code}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedCountry?.country_code])

  const close = () => setCountryDetailOpen(false)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="panel-card-purple rounded-xl w-full max-w-md border-pulse-purple"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-cyber-purple/20">
            <div>
              <h2 className="font-mono text-lg font-bold text-cyber-purple text-glow-purple">
                {selectedCountry?.country_code}
              </h2>
              <p className="font-mono text-xs text-cyber-purple/60">
                {data?.country_name || selectedCountry?.country_name || 'Loading…'}
              </p>
            </div>
            <button onClick={close} className="text-cyber-purple/40 hover:text-cyber-purple transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 font-mono text-xs text-cyber-purple/40">
              Fetching data…
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {/* Incoming / Outgoing */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={ArrowDownLeft} label="Incoming" value={formatCount(data?.incoming_today ?? 0)} color="#ff3366" />
                <StatCard icon={ArrowUpRight}  label="Outgoing" value={formatCount(data?.outgoing_today ?? 0)} color="#00ff88" />
              </div>

              {/* Severity */}
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: SEVERITY_COLORS[data?.severity_level] || '#00ff88' }} />
                <span className="font-mono text-xs text-cyber-purple/60">Severity Level:</span>
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: SEVERITY_COLORS[data?.severity_level] || '#00ff88' }}
                >
                  {data?.severity_level || 'Low'}
                </span>
              </div>

              {/* Top Attack Types */}
              {data?.top_attack_types?.length > 0 && (
                <div>
                  <p className="font-mono text-xs text-cyber-purple/40 uppercase mb-2">Top Attack Types</p>
                  <div className="space-y-1.5">
                    {data.top_attack_types.map((t) => (
                      <div key={t.attack_type} className="flex items-center gap-2">
                        <span className="font-mono text-xs w-32 truncate" style={{ color: ATTACK_TYPE_COLORS[t.attack_type] || '#00ff88' }}>
                          {t.attack_type}
                        </span>
                        <div className="flex-1 h-1 bg-cyber-purple/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${t.percentage}%`, background: ATTACK_TYPE_COLORS[t.attack_type] || '#00ff88' }} />
                        </div>
                        <span className="font-mono text-xs text-cyber-purple/50">{t.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-lg p-3" style={{ background: color + '10', border: `1px solid ${color}30` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="font-mono text-xs" style={{ color: color + 'aa' }}>{label}</span>
      </div>
      <span className="font-mono text-lg font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
