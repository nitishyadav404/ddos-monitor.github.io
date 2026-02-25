import { useEffect, useRef, useCallback } from 'react'
import useStore from '../store/useStore.js'
import { normalizeAttack } from '../utils/formatters.js'
import { WS_MSG } from '../utils/constants.js'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/attacks'
const RECONNECT_BASE_MS = 2000
const RECONNECT_MAX_MS  = 30000

export function useWebSocket() {
  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const backoffRef = useRef(RECONNECT_BASE_MS)
  const mountedRef = useRef(true)

  const {
    addAttack, addAttacks, setDailyCount, setYesterdayCount,
    setPercentChange, setWsStatus, demoMode,
  } = useStore()

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (demoMode) { setWsStatus('offline'); return }

    setWsStatus('connecting')

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        backoffRef.current = RECONNECT_BASE_MS
        setWsStatus('live')
        console.log('[WS] Connected to', WS_URL)
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(event.data)

          switch (msg.type) {
            case WS_MSG.CONNECTED:
              // Hello frame — backend confirms connection
              break

            case WS_MSG.INITIAL_BATCH: {
              // Last 100 attacks for fast page load
              const attacks = (msg.attacks || []).map(normalizeAttack)
              addAttacks(attacks)
              break
            }

            case WS_MSG.ATTACK: {
              // Single live attack event
              const attack = normalizeAttack(msg.data || msg)
              addAttack(attack)
              break
            }

            default:
              break
          }
        } catch (err) {
          console.warn('[WS] Parse error:', err)
        }
      }

      ws.onerror = () => {
        setWsStatus('reconnecting')
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setWsStatus('reconnecting')
        console.log(
          `[WS] Disconnected. Reconnecting in ${backoffRef.current}ms…`
        )
        retryRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, RECONNECT_MAX_MS)
          connect()
        }, backoffRef.current)
      }
    } catch (err) {
      console.error('[WS] Connection failed:', err)
      setWsStatus('offline')
    }
  }, [demoMode, addAttack, addAttacks, setWsStatus])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  // Send a ping every 25s to keep WS alive through load balancers
  useEffect(() => {
    const id = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 25000)
    return () => clearInterval(id)
  }, [])
}
