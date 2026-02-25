import { useEffect, useRef, useCallback } from 'react'
import useStore from '../store/useStore.js'
import { generateAttack } from '../utils/mockData.js'
import { SPEED_SETTINGS } from '../utils/constants.js'

const WS_URL = import.meta.env.VITE_WS_URL || null

export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const demoTimer = useRef(null)
  const {
    addAttack, setWsStatus, demoMode, feedSpeed, feedPaused,
    setDailyCount, setTopTargetCountries, setTopSourceCountries,
    setLast24hHistory, setAttackTypeDistribution, setProtocolDistribution,
  } = useStore()

  // Demo mode: generate synthetic attacks
  const startDemo = useCallback(() => {
    if (demoTimer.current) clearInterval(demoTimer.current)
    const interval = SPEED_SETTINGS[feedSpeed]?.interval || 1000
    demoTimer.current = setInterval(() => {
      if (!feedPaused) {
        const count = feedSpeed === 'realtime' ? 3 : feedSpeed === 'fast' ? 2 : 1
        for (let i = 0; i < count; i++) addAttack(generateAttack())
      }
    }, interval)
  }, [feedSpeed, feedPaused, addAttack])

  const stopDemo = useCallback(() => {
    if (demoTimer.current) { clearInterval(demoTimer.current); demoTimer.current = null }
  }, [])

  // Real WebSocket connection
  const connectWS = useCallback(() => {
    if (!WS_URL) return
    setWsStatus('connecting')
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setWsStatus('connected')
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'attack') addAttack(msg.data)
          else if (msg.type === 'stats') {
            if (msg.data.dailyCount) setDailyCount(msg.data.dailyCount)
            if (msg.data.topTargets) setTopTargetCountries(msg.data.topTargets)
            if (msg.data.topSources) setTopSourceCountries(msg.data.topSources)
            if (msg.data.history) setLast24hHistory(msg.data.history)
            if (msg.data.typeDistribution) setAttackTypeDistribution(msg.data.typeDistribution)
            if (msg.data.protocolDistribution) setProtocolDistribution(msg.data.protocolDistribution)
          }
        } catch (_) {}
      }
      ws.onerror = () => setWsStatus('disconnected')
      ws.onclose = () => {
        setWsStatus('disconnected')
        reconnectTimer.current = setTimeout(connectWS, 3000)
      }
    } catch (_) { setWsStatus('disconnected') }
  }, [addAttack, setWsStatus, setDailyCount, setTopTargetCountries, setTopSourceCountries, setLast24hHistory, setAttackTypeDistribution, setProtocolDistribution])

  useEffect(() => {
    if (demoMode || !WS_URL) {
      startDemo()
      setWsStatus('demo')
    } else {
      stopDemo()
      connectWS()
    }
    return () => {
      stopDemo()
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [demoMode, WS_URL, connectWS, startDemo, stopDemo, setWsStatus])

  useEffect(() => {
    if (demoMode || !WS_URL) startDemo()
  }, [feedSpeed, feedPaused])

  return null
}
