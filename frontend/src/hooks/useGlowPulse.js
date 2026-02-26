/**
 * useGlowPulse.js
 * ─────────────────────────────────────────────────────────────────────────
 * React hook that:
 *  1. Watches the live attacks list from the Zustand store.
 *  2. Determines the worst active severity every 1 s.
 *  3. Returns { multipliers, worstSeverity } so GlobeView can update
 *     Fresnel shell strengths without remounting the scene.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect } from 'react'
import useStore from '../store/useStore.js'
import { getActiveMultiplier, ATTACK_GLOW_MULTIPLIERS } from '../utils/glowConfig.js'

export default function useGlowPulse() {
  const attacks = useStore(s => s.attacks)

  const [state, setState] = useState(() => ({
    multipliers:   ATTACK_GLOW_MULTIPLIERS.none,
    worstSeverity: 'none',
  }))

  useEffect(() => {
    const ORDER = ['critical', 'high', 'medium', 'low']
    const worst = ORDER.find(sev => attacks.some(a => a.severity === sev)) ?? 'none'
    setState({
      multipliers:   getActiveMultiplier(attacks),
      worstSeverity: worst,
    })
  }, [attacks])

  return state
}
