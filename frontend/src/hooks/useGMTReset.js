import { useEffect } from 'react'
import useStore from '../store/useStore.js'

export function useGMTReset() {
  const resetDailyCount = useStore((s) => s.resetDailyCount)
  useEffect(() => {
    const scheduleReset = () => {
      const now = new Date()
      const nextMidnightGMT = new Date()
      nextMidnightGMT.setUTCHours(24, 0, 0, 0)
      const msUntilReset = nextMidnightGMT.getTime() - now.getTime()
      return setTimeout(() => {
        resetDailyCount()
        scheduleReset()
      }, msUntilReset)
    }
    const timer = scheduleReset()
    return () => clearTimeout(timer)
  }, [resetDailyCount])
}
