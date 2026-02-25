import React, { useRef, useEffect, useState, useCallback } from 'react'
import useStore from '../../store/useStore.js'
import { ATTACK_TYPES, COUNTRIES } from '../../utils/constants.js'

// Flat 2D map fallback using Canvas
function FlatMapView({ attacks, filteredArcs }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  const project = useCallback((lat, lng, w, h) => {
    const x = ((lng + 180) / 360) * w
    const y = ((90 - lat) / 180) * h
    return { x, y }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = '#050812'
      ctx.fillRect(0, 0, w, h)

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 0.5
      for (let lat = -80; lat <= 80; lat += 20) {
        const y = ((90 - lat) / 180) * h
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
      for (let lng = -180; lng <= 180; lng += 30) {
        const x = ((lng + 180) / 360) * w
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }

      // Country dots
      Object.entries(COUNTRIES).forEach(([, c]) => {
        const p = project(c.lat, c.lng, w, h)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 212, 255, 0.3)'
        ctx.fill()
      })

      // Attack arcs
      filteredArcs.slice(0, 40).forEach((arc) => {
        const src = project(arc.sourceLat, arc.sourceLng, w, h)
        const tgt = project(arc.targetLat, arc.targetLng, w, h)
        const mx = (src.x + tgt.x) / 2
        const my = (src.y + tgt.y) / 2 - 30

        const grd = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y)
        grd.addColorStop(0, arc.typeColor + 'aa')
        grd.addColorStop(1, arc.typeColor + '22')

        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.quadraticCurveTo(mx, my, tgt.x, tgt.y)
        ctx.strokeStyle = grd
        ctx.lineWidth = arc.severity === 'critical' ? 2 : 1.5
        ctx.stroke()

        // Source dot
        ctx.beginPath()
        ctx.arc(src.x, src.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = arc.typeColor
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    draw()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [filteredArcs, project])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ background: '#050812' }}
    />
  )
}

// 3D Globe using Globe.gl
function ThreeGlobe({ filteredArcs, onArcHover, onCountryClick, colorMode, heatmapActive }) {
  const containerRef = useRef(null)
  const globeRef = useRef(null)
  const rotationRef = useRef(null)

  useEffect(() => {
    let GlobeGL
    let globe
    const container = containerRef.current
    if (!container) return

    const initGlobe = async () => {
      try {
        const mod = await import('globe.gl')
        GlobeGL = mod.default

        globe = GlobeGL()(container)
          .width(container.offsetWidth)
          .height(container.offsetHeight)
          .backgroundColor('#050812')
          .globeImageUrl(
            colorMode === 'mono'
              ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
              : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
          )
          .atmosphereColor('#00d4ff')
          .atmosphereAltitude(0.15)

        globeRef.current = globe

        // Arcs
        globe
          .arcsData(filteredArcs)
          .arcStartLat((d) => d.sourceLat)
          .arcStartLng((d) => d.sourceLng)
          .arcEndLat((d) => d.targetLat)
          .arcEndLng((d) => d.targetLng)
          .arcColor((d) => [d.typeColor + 'cc', d.typeColor + '11'])
          .arcAltitudeAutoScale(0.4)
          .arcStroke((d) => d.severity === 'critical' ? 1.2 : d.severity === 'high' ? 0.9 : 0.6)
          .arcDashLength(0.5)
          .arcDashGap(0.5)
          .arcDashAnimateTime(2000)
          .arcsTransitionDuration(0)
          .onArcHover((arc, prev, ev) => {
            if (arc && ev) onArcHover({ ...arc, x: ev.clientX, y: ev.clientY })
            else onArcHover(null)
          })

        // Rings at targets
        globe
          .ringsData(filteredArcs.slice(0, 20))
          .ringLat((d) => d.targetLat)
          .ringLng((d) => d.targetLng)
          .ringColor((d) => (t) => d.typeColor + Math.round((1 - t) * 255).toString(16).padStart(2, '0'))
          .ringMaxRadius(3)
          .ringPropagationSpeed(2)
          .ringRepeatPeriod(600)

        // Points at sources
        globe
          .pointsData(filteredArcs.slice(0, 30))
          .pointLat((d) => d.sourceLat)
          .pointLng((d) => d.sourceLng)
          .pointColor((d) => d.typeColor)
          .pointAltitude(0.01)
          .pointRadius(0.3)

        // Auto-rotate
        globe.controls().autoRotate = true
        globe.controls().autoRotateSpeed = 0.3
        globe.controls().enableZoom = true

        // Window resize
        const onResize = () => {
          globe.width(container.offsetWidth).height(container.offsetHeight)
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      } catch (err) {
        console.warn('Globe.gl failed, using fallback', err)
      }
    }

    initGlobe()
    return () => {
      if (globeRef.current) {
        try { globeRef.current._destructor?.() } catch (_) {}
      }
    }
  }, [])

  // Update arcs when data changes
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.arcsData(filteredArcs)
    globeRef.current.ringsData(filteredArcs.slice(0, 20))
    globeRef.current.pointsData(filteredArcs.slice(0, 30))
  }, [filteredArcs])

  return (
    <div ref={containerRef} className="w-full h-full globe-container" />
  )
}

export default function GlobeView() {
  const {
    globeView, colorMode, heatmapActive, attacks,
    selectedTypes, selectedSeverities, setHoveredArc, setSelectedCountry,
  } = useStore()

  const [webglSupported] = useState(() => {
    try {
      const c = document.createElement('canvas')
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
    } catch (_) { return false }
  })

  const filteredArcs = attacks.filter((a) =>
    selectedTypes.includes(a.type) && selectedSeverities.includes(a.severity)
  ).slice(0, 60)

  const handleArcHover = useCallback((arc) => {
    setHoveredArc(arc)
  }, [setHoveredArc])

  const handleCountryClick = useCallback((country) => {
    setSelectedCountry(country)
  }, [setSelectedCountry])

  if (globeView === 'flat' || !webglSupported) {
    return (
      <div className="w-full h-full relative">
        <FlatMapView attacks={attacks} filteredArcs={filteredArcs} />
        {!webglSupported && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-3 py-1.5 rounded-lg">
            WebGL not supported — showing 2D flat map
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ThreeGlobe
        filteredArcs={filteredArcs}
        onArcHover={handleArcHover}
        onCountryClick={handleCountryClick}
        colorMode={colorMode}
        heatmapActive={heatmapActive}
      />
      {/* Heatmap overlay placeholder */}
      {heatmapActive && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 40%, rgba(255,51,51,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(255,107,53,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.04) 0%, transparent 40%)'
        }} />
      )}
    </div>
  )
}
