import { useEffect } from 'react'
import useStore from '../store/useStore.js'

/**
 * Watches for UTC midnight and resets the daily counter.
 * WRD FR-13: 24-hour counter resets at exactly 00:00:00 UTC.
 * Also shows 'yesterday' count for 30 minutes after reset to
 * prevent users thinking the site is broken at 00:01 UTC.
 */
export function useGMTReset() {
  const { setDailyCount, yesterdayCount } = useStore()

  useEffect(() => {
    const scheduleReset = () => {
      const now    = new Date()
      const nextMidnightUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      )
      const msUntilMidnight = nextMidnightUTC.getTime() - now.getTime()

      const timer = setTimeout(() => {
        // Save today's count as yesterday before reset
        const { dailyCount, setYesterdayCount, setDailyCount } = useStore.getState()
        setYesterdayCount(dailyCount)
        setDailyCount(0)
        console.log('[GMT Reset] Counter reset at UTC midnight. Yesterday:', dailyCount)
        // Re-schedule for next midnight
        scheduleReset()
      }, msUntilMidnight)

      return () => clearTimeout(timer)
    }

    const cleanup = scheduleReset()
    return cleanup
  }, [])
}
