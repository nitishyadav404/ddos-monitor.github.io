/**
 * GlobeView.jsx — Pure Three.js globe with animated missile-comet arcs.
 * Zero globe.gl / three-globe dependency.
 */
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useStore from '../../store/useStore.js'
import { COUNTRIES } from '../../utils/constants.js'

const R = 1.0

// lat/lng → 3D point on globe surface
function ll2v(lat, lng, r = R) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

// Speed: units subtracted from dashOffset per frame
const ARC_SPEEDS = [0.004, 0.012, 0.026, 0.06]
// Speed for flat-map comet advancement per frame
const MAP_SPEEDS = [0.005, 0.015, 0.030, 0.065]

// ====================================================================
// FLAT 2-D MAP (canvas with animated missile comets)
// ====================================================================
function FlatMapView({ filteredArcs, speedLevel }) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)
  const animRef      = useRef(0)      // persists across filteredArcs / speedLevel changes
  const speedRef     = useRef(speedLevel)
  const rafRef       = useRef(null)

  useEffect(() => { speedRef.current = speedLevel }, [speedLevel])

  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')

    // Reliable sizing via ResizeObserver
    const setSize = () => {
      canvas.width  = container.offsetWidth  || 800
      canvas.height = container.offsetHeight || 600
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(container)

    const draw = () => {
      animRef.current += MAP_SPEEDS[speedRef.current] ?? MAP_SPEEDS[1]
      const W = canvas.width, H = canvas.height
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return }

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#030a05'
      ctx.fillRect(0, 0, W, H)

      // Grid lines
      ctx.strokeStyle = 'rgba(0,255,136,0.05)'
      ctx.lineWidth   = 0.5
      for (let la = -80; la <= 80; la += 20) {
        const y = ((90 - la) / 180) * H
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }
      for (let lo = -180; lo <= 180; lo += 30) {
        const x = ((lo + 180) / 360) * W
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }

      // Country dots
      Object.values(COUNTRIES).forEach(({ lat, lng }) => {
        const px = ((lng + 180) / 360) * W
        const py = ((90 - lat) / 180) * H
        ctx.beginPath()
        ctx.arc(px, py, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,255,136,0.18)'
        ctx.fill()
      })

      // Missile comets along bezier arcs
      const COMET = 0.14 // comet length in parametric space (0–1)
      filteredArcs.slice(0, 50).forEach((arc, i) => {
        if (arc.sourceLat === arc.targetLat && arc.sourceLng === arc.targetLng) return

        const sx = ((arc.sourceLng + 180) / 360) * W
        const sy = ((90 - arc.sourceLat) / 180) * H
        const tx = ((arc.targetLng + 180) / 360) * W
        const ty = ((90 - arc.targetLat) / 180) * H
        const mx = (sx + tx) / 2
        const my = (sy + ty) / 2 - Math.min(H * 0.12, 55)
        const col = arc.typeColor || '#00ff88'

        // Bezier evaluator
        const bez = (t) => ({
          x: (1-t)**2*sx + 2*(1-t)*t*mx + t**2*tx,
          y: (1-t)**2*sy + 2*(1-t)*t*my + t**2*ty,
        })

        // Head position: stagger arcs by index so they don’t all sync
        const head   = (animRef.current * 0.8 + i * 0.31) % 1
        const tail   = Math.max(0, head - COMET)
        const steps  = 24

        // Draw comet from tail→head, fading at tail end
        ctx.beginPath()
        let moved = false
        for (let k = 0; k <= steps; k++) {
          const t_ = tail + (k / steps) * (head - tail)
          if (t_ < 0 || t_ > 1) continue
          const p = bez(t_)
          if (!moved) { ctx.moveTo(p.x, p.y); moved = true }
          else          ctx.lineTo(p.x, p.y)
        }
        if (moved) {
          ctx.strokeStyle = col + 'cc'
          ctx.lineWidth   = arc.severity === 'critical' ? 2.5 : 1.6
          ctx.stroke()
        }

        // Bright dot at comet head
        if (head > 0 && head < 1) {
          const hp = bez(head)
          ctx.beginPath()
          ctx.arc(hp.x, hp.y, arc.severity === 'critical' ? 3.5 : 2.2, 0, Math.PI * 2)
          ctx.fillStyle = col
          ctx.shadowBlur  = 8
          ctx.shadowColor = col
          ctx.fill()
          ctx.shadowBlur  = 0
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [filteredArcs]) // re-bind when arc list changes; animRef persists

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: '#030a05' }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}

// ====================================================================
// 3-D GLOBE (Three.js + animated LineDashedMaterial comets)
// ====================================================================
function ThreeGlobe({ filteredArcs, isRotating, speedLevel }) {
  const mountRef  = useRef(null)
  const refs      = useRef({})
  const speedRef  = useRef(speedLevel)

  // Keep speedRef hot so the animation loop always reads the latest value
  useEffect(() => { speedRef.current = speedLevel }, [speedLevel])

  // ---- One-time scene setup ----
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth || 800
    const H = el.clientHeight || 600

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.05
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.3
    controls.enableZoom      = true
    controls.minDistance     = 1.5
    controls.maxDistance     = 5

    // Lights
    scene.add(new THREE.AmbientLight(0x1a2e1a, 1.2))
    const sun = new THREE.DirectionalLight(0xffffff, 0.7)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    // Earth
    const globeGeo = new THREE.SphereGeometry(R, 64, 64)
    const loader   = new THREE.TextureLoader()
    const tex      = loader.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-night.jpg')
    const globeMat = new THREE.MeshPhongMaterial({ map: tex, specular: 0x111111, shininess: 6 })
    scene.add(new THREE.Mesh(globeGeo, globeMat))

    // Atmosphere glow (hacker green)
    const atmGeo = new THREE.SphereGeometry(R * 1.14, 64, 64)
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x00ff88) } },
      vertexShader: `
        varying float vI;
        void main(){
          vec3 n=normalize(normalMatrix*normal);
          vec3 v=normalize(-(modelViewMatrix*vec4(position,1.0)).xyz);
          vI=pow(max(0.0,1.0-dot(n,v)),4.5);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float vI;
        void main(){gl_FragColor=vec4(glowColor,vI*0.38);}`,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    scene.add(new THREE.Mesh(atmGeo, atmMat))

    // Dynamic object groups
    const arcsGrp  = new THREE.Group()
    const ringsGrp = new THREE.Group()
    const ptsGrp   = new THREE.Group()
    scene.add(arcsGrp, ringsGrp, ptsGrp)

    // Resize handler
    const onResize = () => {
      const W2 = el.clientWidth, H2 = el.clientHeight
      camera.aspect = W2 / H2
      camera.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()

      // --- Advance missile comets ---
      const spd = ARC_SPEEDS[speedRef.current] ?? ARC_SPEEDS[1]
      arcsGrp.children.forEach((arc) => {
        arc.material.dashOffset -= spd
        // Loop comet back to source once it reaches the target
        if (arc.material.dashOffset < -(arc.userData.totalDist + 0.3)) {
          arc.material.dashOffset = 0.05
        }
      })

      // --- Pulse rings at targets ---
      ringsGrp.children.forEach((ring) => {
        ring.userData.t = ((ring.userData.t ?? Math.random()) + 0.018) % 1
        const s = 1 + ring.userData.t * 3.5
        ring.scale.set(s, s, s)
        ring.material.opacity = (1 - ring.userData.t) * 0.75
      })

      renderer.render(scene, camera)
    }
    animate()

    refs.current = { arcsGrp, ringsGrp, ptsGrp, controls, renderer, el }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  // Sync auto-rotate
  useEffect(() => {
    const { controls } = refs.current
    if (controls) controls.autoRotate = isRotating
  }, [isRotating])

  // Rebuild arcs / rings / points when filtered attacks change
  useEffect(() => {
    const { arcsGrp, ringsGrp, ptsGrp } = refs.current
    if (!arcsGrp) return

    const flush = (g) => {
      g.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose() })
      g.clear()
    }
    flush(arcsGrp); flush(ringsGrp); flush(ptsGrp)

    filteredArcs.slice(0, 60).forEach((arc, i) => {
      const col    = new THREE.Color(arc.typeColor || '#00ff88')
      const isCrit = arc.severity === 'critical'
      const isHigh = arc.severity === 'high'

      const src = ll2v(arc.sourceLat, arc.sourceLng)
      const tgt = ll2v(arc.targetLat, arc.targetLng)

      // Bezier arc height depends on severity
      const alt = isCrit ? 0.55 : isHigh ? 0.45 : 0.38
      const mid = src.clone().add(tgt).normalize().multiplyScalar(R * (1 + alt))
      const pts = new THREE.QuadraticBezierCurve3(src, mid, tgt).getPoints(80)

      // LineDashedMaterial: tiny dash (comet head) + huge gap = missile dot
      const arcGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const arcMat = new THREE.LineDashedMaterial({
        color:       col,
        transparent: true,
        opacity:     isCrit ? 0.95 : 0.75,
        dashSize:    0.18,  // visible comet length
        gapSize:     100,   // huge gap → only one dot visible
      })
      const arcLine = new THREE.Line(arcGeo, arcMat)
      arcLine.computeLineDistances()

      const dists = arcLine.geometry.getAttribute('lineDistance')
      arcLine.userData.totalDist = dists.array[dists.count - 1]
      // Stagger start position so arcs don’t all begin at the source simultaneously
      arcLine.material.dashOffset = -Math.random() * arcLine.userData.totalDist
      arcsGrp.add(arcLine)

      // Pulsing ring at target (up to 20)
      if (i < 20) {
        const rPos = ll2v(arc.targetLat, arc.targetLng, R + 0.003)
        const rPts = Array.from({ length: 33 }, (_, j) => {
          const a = (j / 32) * Math.PI * 2
          return new THREE.Vector3(Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0)
        })
        const rGeo = new THREE.BufferGeometry().setFromPoints(rPts)
        const rMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 })
        const ring = new THREE.Line(rGeo, rMat)
        ring.position.copy(rPos)
        // Orient ring tangent to sphere: align local +Z with outward normal
        ring.setRotationFromQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), rPos.clone().normalize()
          )
        )
        ring.userData.t = Math.random() // random phase so rings pulse out of sync
        ringsGrp.add(ring)
      }

      // Source point dot (up to 30)
      if (i < 30) {
        const pPos = ll2v(arc.sourceLat, arc.sourceLng, R + 0.01)
        const pt   = new THREE.Mesh(
          new THREE.SphereGeometry(0.007, 4, 4),
          new THREE.MeshBasicMaterial({ color: col }),
        )
        pt.position.copy(pPos)
        ptsGrp.add(pt)
      }
    })
  }, [filteredArcs])

  return <div ref={mountRef} className="w-full h-full globe-container" />
}

// ====================================================================
// MAIN EXPORT
// ====================================================================
export default function GlobeView() {
  const {
    globeView, colorMode, heatmapActive, attacks, isRotating, speedLevel,
    selectedTypes, selectedSeverities,
  } = useStore()

  const [webglOk] = useState(() => {
    try {
      const c = document.createElement('canvas')
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')))
    } catch { return false }
  })

  const filteredArcs = attacks
    .filter(a => selectedTypes.includes(a.type) && selectedSeverities.includes(a.severity))
    .slice(0, 60)

  if (globeView === 'flat' || !webglOk) {
    return (
      <div className="w-full h-full relative">
        <FlatMapView filteredArcs={filteredArcs} speedLevel={speedLevel} />
        {!webglOk && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2
            bg-yellow-500/20 border border-yellow-500/40 text-yellow-300
            text-xs px-3 py-1.5 rounded-lg">
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
        isRotating={isRotating}
        speedLevel={speedLevel}
      />
      {heatmapActive && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background:
            'radial-gradient(ellipse at 30% 40%,rgba(0,255,136,.07) 0%,transparent 60%),' +
            'radial-gradient(ellipse at 70% 60%,rgba(191,95,255,.05) 0%,transparent 50%)',
        }} />
      )}
    </div>
  )
}
