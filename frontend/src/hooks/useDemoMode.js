import { useEffect, useRef } from 'react'
import useStore from '../store/useStore.js'
import { generateDemoAttack } from '../utils/mockData.js'
import { SPEED_LEVELS } from '../utils/constants.js'

/**
 * When demo mode is active, generates fake attack events at
 * the selected speed level so the globe always looks alive
 * during presentations (WRD: demo mode feature).
 */
export function useDemoMode() {
  const { demoMode, speedLevel, addAttack } = useStore()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!demoMode) {
      clearInterval(intervalRef.current)
      return
    }

    const speed = SPEED_LEVELS[speedLevel]
    const ms    = speed.ms === 0 ? 100 : speed.ms

    intervalRef.current = setInterval(() => {
      addAttack(generateDemoAttack())
    }, ms)

    return () => clearInterval(intervalRef.current)
  }, [demoMode, speedLevel, addAttack])
}
