/**
 * GlobeView.jsx
 *
 * 3D Globe  — each attack fires a missile that travels source→target once,
 *             triggers an expanding ring ON LANDING, then fades out.
 *             No loops. New attacks from demo/live mode continuously fire new ones.
 *
 * 2D Flat Map — canvas-based with the same one-shot missile + landing ring.
 *
 * Data: purely demo-mode generated (see bottom of this file for explanation).
 */
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useStore from '../../store/useStore.js'
import { COUNTRIES } from '../../utils/constants.js'

const R        = 1.0   // globe radius
const SEGMENTS = 80    // bezier resolution

// lat/lng → 3-D point on globe surface
function ll2v(lat, lng, r = R) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

// Build bezier arc points for one attack
function arcPoints(arc) {
  const src = ll2v(arc.sourceLat, arc.sourceLng)
  const tgt = ll2v(arc.targetLat, arc.targetLng)
  const alt = arc.severity === 'critical' ? 0.55
            : arc.severity === 'high'     ? 0.45
            :                               0.36
  const mid = src.clone().add(tgt).normalize().multiplyScalar(R * (1 + alt))
  return new THREE.QuadraticBezierCurve3(src, mid, tgt).getPoints(SEGMENTS)
}

// t-increment per animation frame at each speed level
const SPD3D = [0.003, 0.008, 0.018, 0.042]
const SPD2D = [0.003, 0.008, 0.018, 0.042]

// ======================================================================
// FLAT 2-D MAP  (canvas, one-shot missiles with landing rings)
// ======================================================================
function FlatMapView({ filteredArcs, speedLevel }) {
  const containerRef    = useRef(null)
  const canvasRef       = useRef(null)
  const speedRef        = useRef(speedLevel)
  const filteredArcsRef = useRef(filteredArcs)   // always current
  const arcStates       = useRef({})             // id → {t,impacted,alpha,ringR}
  const rafRef          = useRef(null)

  useEffect(() => { speedRef.current      = speedLevel  }, [speedLevel])
  useEffect(() => { filteredArcsRef.current = filteredArcs }, [filteredArcs])

  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')

    const setSize = () => {
      const r = container.getBoundingClientRect()
      canvas.width  = r.width  || container.offsetWidth  || 800
      canvas.height = r.height || container.offsetHeight || 600
    }
    // Small delay on first call so layout is complete
    setTimeout(setSize, 0)
    const ro = new ResizeObserver(setSize)
    ro.observe(container)

    const draw = () => {
      const W = canvas.width, H = canvas.height
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return }

      const spd  = SPD2D[speedRef.current] ?? SPD2D[1]
      const arcs = filteredArcsRef.current

      // Sync state map with current arcs
      const ids = new Set(arcs.map(a => a.id))
      Object.keys(arcStates.current).forEach(id => { if (!ids.has(id)) delete arcStates.current[id] })
      arcs.forEach(arc => {
        if (!arcStates.current[arc.id])
          arcStates.current[arc.id] = { t: 0, impacted: false, alpha: 1, ringR: 0 }
      })

      // Background
      ctx.fillStyle = '#030a05'
      ctx.fillRect(0, 0, W, H)

      // Grid
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
        ctx.beginPath()
        ctx.arc(((lng + 180) / 360) * W, ((90 - lat) / 180) * H, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,255,136,0.18)'
        ctx.fill()
      })

      // Missiles
      arcs.slice(0, 50).forEach(arc => {
        const st = arcStates.current[arc.id]
        if (!st || st.alpha <= 0) return

        const col = arc.typeColor || '#00ff88'
        const sx  = ((arc.sourceLng + 180) / 360) * W
        const sy  = ((90 - arc.sourceLat) / 180) * H
        const tx  = ((arc.targetLng + 180) / 360) * W
        const ty  = ((90 - arc.targetLat) / 180) * H
        const mx  = (sx + tx) / 2
        const my  = (sy + ty) / 2 - Math.min(H * 0.12, 55)

        const bez = (t) => ({
          x: (1-t)**2*sx + 2*(1-t)*t*mx + t**2*tx,
          y: (1-t)**2*sy + 2*(1-t)*t*my + t**2*ty,
        })

        // --- advance state ---
        if (!st.impacted) {
          st.t = Math.min(st.t + spd, 1)
          if (st.t >= 1) st.impacted = true
        } else {
          st.ringR  += 1.5           // expand ring after impact
          st.alpha   = Math.max(0, st.alpha - 0.025)
        }

        // faint trajectory ghost
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, tx, ty)
        ctx.strokeStyle = col + '18'
        ctx.lineWidth   = 1
        ctx.stroke()

        if (!st.impacted || st.alpha > 0.6) {
          // comet tail
          const COMET = 0.14
          const tailT = Math.max(0, st.t - COMET)
          ctx.beginPath()
          let moved = false
          for (let k = 0; k <= 20; k++) {
            const t_ = tailT + (k / 20) * (st.t - tailT)
            const p  = bez(t_)
            if (!moved) { ctx.moveTo(p.x, p.y); moved = true }
            else          ctx.lineTo(p.x, p.y)
          }
          if (moved) {
            ctx.strokeStyle = col + 'cc'
            ctx.lineWidth   = arc.severity === 'critical' ? 2.5 : 1.6
            ctx.stroke()
          }

          // head dot
          const hp = bez(st.t)
          ctx.beginPath()
          ctx.arc(hp.x, hp.y, arc.severity === 'critical' ? 3.5 : 2.5, 0, Math.PI * 2)
          ctx.fillStyle   = col
          ctx.shadowBlur  = 10
          ctx.shadowColor = col
          ctx.fill()
          ctx.shadowBlur  = 0
        }

        // landing ring (only after impact)
        if (st.impacted && st.ringR > 0) {
          const tp = bez(1)
          const alpha16 = Math.round(st.alpha * 180).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.arc(tp.x, tp.y, st.ringR, 0, Math.PI * 2)
          ctx.strokeStyle = col + alpha16
          ctx.lineWidth   = 1.5
          ctx.stroke()
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, []) // mount once; refs carry live data

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, background: '#030a05' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}

// ======================================================================
// 3-D GLOBE  (Three.js, one-shot missiles)
// ======================================================================
function ThreeGlobe({ filteredArcs, isRotating, speedLevel }) {
  const mountRef    = useRef(null)
  const refs        = useRef({})          // scene objects
  const speedRef    = useRef(speedLevel)  // hot ref for animation loop
  const renderedRef = useRef(new Set())   // attack IDs already fired

  useEffect(() => { speedRef.current = speedLevel }, [speedLevel])

  // One-time scene init
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth || 800, H = el.clientHeight || 600

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.05
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.3
    controls.enableZoom      = true
    controls.minDistance     = 1.5
    controls.maxDistance     = 5

    scene.add(new THREE.AmbientLight(0x1a2e1a, 1.2))
    const sun = new THREE.DirectionalLight(0xffffff, 0.7)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    // Earth globe
    const loader = new THREE.TextureLoader()
    const tex    = loader.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-night.jpg')
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ map: tex, specular: 0x111111, shininess: 6 }),
    ))

    // Atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.14, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: { g: { value: new THREE.Color(0x00ff88) } },
        vertexShader: `
          varying float vI;
          void main(){
            vec3 n=normalize(normalMatrix*normal);
            vec3 v=normalize(-(modelViewMatrix*vec4(position,1.)).xyz);
            vI=pow(max(0.,1.-dot(n,v)),4.5);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
          }`,
        fragmentShader: `
          uniform vec3 g; varying float vI;
          void main(){gl_FragColor=vec4(g,vI*.38);}`,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false,
      }),
    ))

    // Groups
    const missilesGrp = new THREE.Group()
    const trailsGrp   = new THREE.Group()
    const ringsGrp    = new THREE.Group()
    scene.add(missilesGrp, trailsGrp, ringsGrp)

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ---- Animation loop ----
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      const spd = SPD3D[speedRef.current] ?? SPD3D[1]

      // Advance missiles
      missilesGrp.children.forEach(m => {
        const ud = m.userData
        if (ud.state === 'flying') {
          ud.t = Math.min(ud.t + spd, 1)
          const pts = ud.points
          const idx = Math.min(Math.floor(ud.t * pts.length), pts.length - 1)
          m.position.copy(pts[idx])

          // Update short bright trail behind missile
          const tail = ud.trail
          if (tail) {
            const tIdx = Math.max(0, idx - Math.floor(pts.length * 0.12))
            const vis  = pts.slice(tIdx, idx + 1)
            if (vis.length >= 2) tail.geometry.setFromPoints(vis)
          }

          if (ud.t >= 1) {
            ud.state = 'impact'
            // Spawn 3 staggered expanding rings at target
            for (let i = 0; i < 3; i++) {
              const rPts = Array.from({ length: 33 }, (_, j) => {
                const a = (j / 32) * Math.PI * 2
                return new THREE.Vector3(Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0)
              })
              const ring = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(rPts),
                new THREE.LineBasicMaterial({ color: ud.color, transparent: true, opacity: 0 }),
              )
              ring.position.copy(ud.targetPos)
              ring.setRotationFromQuaternion(
                new THREE.Quaternion().setFromUnitVectors(
                  new THREE.Vector3(0, 0, 1), ud.targetPos.clone().normalize()
                )
              )
              ring.userData = { t: 0, delay: i * 10, done: false }
              ringsGrp.add(ring)
            }
          }
        } else if (ud.state === 'impact') {
          m.material.opacity      = Math.max(0, m.material.opacity - 0.06)
          if (ud.trail) ud.trail.material.opacity = Math.max(0, ud.trail.material.opacity - 0.04)
          if (ud.ghost) ud.ghost.material.opacity = Math.max(0, ud.ghost.material.opacity - 0.01)
          if (m.material.opacity <= 0) ud.state = 'done'
        }
      })

      // Expand impact rings
      ringsGrp.children.forEach(ring => {
        const ud = ring.userData
        if (ud.delay > 0) { ud.delay -= 1; return }
        ud.t += 0.028
        if (ud.t > 1) { ud.done = true; return }
        const s = 1 + ud.t * 5.5
        ring.scale.set(s, s, s)
        ring.material.opacity = (1 - ud.t) * 0.85
      })

      // Remove finished objects
      const doneMissiles = missilesGrp.children.filter(m => m.userData.state === 'done')
      doneMissiles.forEach(m => {
        m.geometry.dispose(); m.material.dispose()
        if (m.userData.trail) {
          m.userData.trail.geometry.dispose()
          m.userData.trail.material.dispose()
          trailsGrp.remove(m.userData.trail)
        }
        if (m.userData.ghost) {
          m.userData.ghost.geometry.dispose()
          m.userData.ghost.material.dispose()
          trailsGrp.remove(m.userData.ghost)
        }
        missilesGrp.remove(m)
      })
      const doneRings = ringsGrp.children.filter(r => r.userData.done)
      doneRings.forEach(r => { r.geometry.dispose(); r.material.dispose(); ringsGrp.remove(r) })

      // Prevent renderedRef from growing forever
      if (renderedRef.current.size > 600) renderedRef.current.clear()

      renderer.render(scene, camera)
    }
    animate()

    refs.current = { scene, missilesGrp, trailsGrp, ringsGrp, controls, renderer, el }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      controls.dispose(); renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const { controls } = refs.current
    if (controls) controls.autoRotate = isRotating
  }, [isRotating])

  // Fire missiles for NEW arcs only (each attack fires exactly once)
  useEffect(() => {
    const { scene, missilesGrp, trailsGrp } = refs.current
    if (!missilesGrp) return

    filteredArcs.slice(0, 60).forEach(arc => {
      if (renderedRef.current.has(arc.id)) return // already fired
      renderedRef.current.add(arc.id)

      const pts    = arcPoints(arc)
      const col    = new THREE.Color(arc.typeColor || '#00ff88')
      const isCrit = arc.severity === 'critical'

      // Faint ghost showing the full trajectory
      const ghost = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.07 }),
      )

      // Short bright trail (updates every frame)
      const trail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([pts[0].clone(), pts[0].clone()]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: isCrit ? 0.95 : 0.7 }),
      )

      // Missile head
      const missile = new THREE.Mesh(
        new THREE.SphereGeometry(isCrit ? 0.014 : 0.01, 6, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 }),
      )
      missile.position.copy(pts[0])
      missile.userData = {
        points:    pts,
        t:         0,
        state:    'flying',
        color:     col,
        targetPos: pts[pts.length - 1].clone(),
        trail,
        ghost,
      }

      trailsGrp.add(ghost)
      trailsGrp.add(trail)
      missilesGrp.add(missile)
    })
  }, [filteredArcs])

  return <div ref={mountRef} className="w-full h-full globe-container" />
}

// ======================================================================
// MAIN EXPORT
// ======================================================================
export default function GlobeView() {
  const {
    globeView, heatmapActive, attacks, isRotating, speedLevel,
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

  // ---- 2D flat map ----
  if (globeView === 'flat' || !webglOk) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <FlatMapView filteredArcs={filteredArcs} speedLevel={speedLevel} />
        {!webglOk && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2
            bg-yellow-500/20 border border-yellow-500/40 text-yellow-300
            text-xs px-3 py-1.5 rounded-lg">
            WebGL not available — 2D flat map
          </div>
        )}
      </div>
    )
  }

  // ---- 3D globe ----
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
