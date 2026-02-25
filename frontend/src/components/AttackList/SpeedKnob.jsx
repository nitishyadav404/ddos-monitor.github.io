import React from 'react'
import useStore from '../../store/useStore.js'
import { SPEED_SETTINGS } from '../../utils/constants.js'

const KNOB_RADIUS = 30
const STROKE_WIDTH = 6
const TOTAL_ARC = 270 // degrees
const START_ANGLE = 135 // bottom-left

const SPEEDS = ['slow', 'medium', 'fast', 'realtime']

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function SpeedKnob() {
  const { feedSpeed, setFeedSpeed } = useStore()
  const speedIdx = SPEEDS.indexOf(feedSpeed)
  const setting = SPEED_SETTINGS[feedSpeed]

  const cx = 40; const cy = 40
  const r = KNOB_RADIUS
  const circ = 2 * Math.PI * r

  // Progress: 0 to 1
  const progress = speedIdx / (SPEEDS.length - 1)
  const arcLen = (progress * TOTAL_ARC / 360) * circ
  const dashArray = `${arcLen} ${circ}`
  const dashOffset = -((START_ANGLE / 360) * circ)

  const colors = ['#00ff88', '#ffd700', '#ff6b35', '#ff3366']
  const currentColor = colors[speedIdx] || '#00d4ff'

  const rotate = (dir) => {
    const next = Math.max(0, Math.min(SPEEDS.length - 1, speedIdx + dir))
    setFeedSpeed(SPEEDS[next])
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 80, height: 80 }}>
        <svg width={80} height={80} viewBox="0 0 80 80">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r}
            fill="none" stroke="#ffffff15" strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${(TOTAL_ARC / 360) * circ} ${circ}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(0 ${cx} ${cy})`}
          />
          {/* Progress */}
          <circle cx={cx} cy={cy} r={r}
            fill="none" stroke={currentColor} strokeWidth={STROKE_WIDTH}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="knob-ring"
            style={{ filter: `drop-shadow(0 0 6px ${currentColor})` }}
          />
          {/* Center label */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={currentColor} fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
            {setting.label.slice(0, 4).toUpperCase()}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fill="#ffffff44" fontSize="7" fontFamily="monospace">
            {speedIdx + 1}/{SPEEDS.length}
          </text>
        </svg>
        {/* Notch buttons */}
        <button
          onClick={() => rotate(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white text-xs"
        >−</button>
        <button
          onClick={() => rotate(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white text-xs"
        >+</button>
      </div>
      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Feed Speed</div>
      <div className="flex gap-1">
        {SPEEDS.map((s, i) => (
          <button
            key={s}
            onClick={() => setFeedSpeed(s)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${ feedSpeed === s ? 'scale-125' : 'opacity-30' }`}
            style={{ background: colors[i] }}
            title={SPEED_SETTINGS[s].label}
          />
        ))}
      </div>
    </div>
  )
}
