/**
 * GlobeView.jsx
 *
 * Visual overhaul:
 *  • Dark navy globe + lat/lng grid lines + country node dots  (no earth texture)
 *  • 8 000-star particle field with custom circular-point shader
 *  • 3 procedural nebula sprites (purple, blue, amber) for galaxy feel
 *  • 3-layer animated blue-white smoke atmosphere (replaces green glow)
 *  • One-shot missile lifecycle preserved from previous version
 */
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useStore from '../../store/useStore.js'
import { COUNTRIES } from '../../utils/constants.js'

const R        = 1.0
const SEGMENTS = 80

function ll2v(lat, lng, r = R) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

function arcPoints(arc) {
  const src = ll2v(arc.sourceLat, arc.sourceLng)
  const tgt = ll2v(arc.targetLat, arc.targetLng)
  const alt = arc.severity === 'critical' ? 0.55
            : arc.severity === 'high'     ? 0.45 : 0.36
  const mid = src.clone().add(tgt).normalize().multiplyScalar(R * (1 + alt))
  return new THREE.QuadraticBezierCurve3(src, mid, tgt).getPoints(SEGMENTS)
}

const SPD3D = [0.003, 0.008, 0.018, 0.042]
const SPD2D = [0.003, 0.008, 0.018, 0.042]

// =====================================================================
// SCENE BUILDERS  (called once at scene init)
// =====================================================================

/** 8 000-star field using a circular-point shader for smooth, sized stars */
function buildStars(scene) {
  const N   = 8000
  const pos = new Float32Array(N * 3)
  const sz  = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const u = Math.random(), v = Math.random()
    const t = 2 * Math.PI * u
    const p = Math.acos(2 * v - 1)
    const r = 14 + Math.random() * 36
    pos[i*3]   = r * Math.sin(p) * Math.cos(t)
    pos[i*3+1] = r * Math.sin(p) * Math.sin(t)
    pos[i*3+2] = r * Math.cos(p)
    sz[i]      = Math.random() < 0.08 ? 2.4 : (Math.random() < 0.25 ? 1.4 : 0.7)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('aSize',    new THREE.Float32BufferAttribute(sz,  1))

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize  = aSize * (280.0 / -mv.z);
        gl_Position   = projectionMatrix * mv;
      }`,
    fragmentShader: `
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        // slight blue-white tint
        gl_FragColor  = vec4(0.88, 0.92, 1.0, a * 0.85);
      }`,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  })
  scene.add(new THREE.Points(geo, mat))
}

/** Radial-gradient canvas → Sprite for nebula patches */
function nebulaTex(inner, outer) {
  const c   = document.createElement('canvas')
  c.width   = c.height = 256
  const ctx = c.getContext('2d')
  const g   = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0,   inner)
  g.addColorStop(0.5, outer)
  g.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

function buildNebulae(scene) {
  const specs = [
    // [position, scale, inner-rgba, outer-rgba]
    [[-9,  4, -16], 28, 'rgba(70,0,130,0.28)', 'rgba(25,0,55,0.10)'],  // purple
    [[ 11, -3, -14], 22, 'rgba(0,40,110,0.22)', 'rgba(0,15,50,0.08)'],  // deep blue
    [[-4, -7, -18], 18, 'rgba(90,50,0,0.18)',   'rgba(35,20,0,0.07)'],  // amber
  ]
  specs.forEach(([pos, scale, inner, outer]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map:         nebulaTex(inner, outer),
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    }))
    s.scale.set(scale, scale, 1)
    s.position.set(...pos)
    scene.add(s)
  })
}

/** Dark globe + lat/lng grid + country node dots */
function buildGlobe(scene) {
  // Core sphere (dark navy)
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshPhongMaterial({
      color:    0x0a1628,
      emissive: 0x07101e,
      specular: 0x1a3a5c,
      shininess: 18,
    }),
  ))

  // Lat lines
  const gridMat = new THREE.LineBasicMaterial({ color: 0x1a3a5c, transparent: true, opacity: 0.35 })
  for (let la = -80; la <= 80; la += 20) {
    const pts = []
    for (let lo = 0; lo <= 360; lo += 2) pts.push(ll2v(la, lo - 180, R * 1.001))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat))
  }
  // Lng lines
  for (let lo = 0; lo < 360; lo += 30) {
    const pts = []
    for (let la = -90; la <= 90; la += 2) pts.push(ll2v(la, lo - 180, R * 1.001))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat))
  }

  // Country node dots (small glowing points at each country capital)
  const dotGeo = new THREE.SphereGeometry(0.006, 4, 4)
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x3388ff })
  Object.values(COUNTRIES).forEach(({ lat, lng }) => {
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.copy(ll2v(lat, lng, R + 0.006))
    scene.add(dot)
  })
}

/**
 * 3-layer animated blue-white smoke atmosphere.
 * A time uniform drives a gentle sine-wave turbulence so the edge
 * looks wispy / evaporating rather than a solid ring.
 */
const smokeVert = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vV = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const smokeFrag = /* glsl */`
  uniform vec3  glowColor;
  uniform float opacity;
  uniform float time;
  uniform float power;
  varying vec3  vN;
  varying vec3  vV;
  void main() {
    float rim = pow(max(0.0, 1.0 - dot(vN, vV)), power);
    // turbulence: layered sines in normal-space give wispy variation
    float turb = 1.0
               + 0.12 * sin(vN.x * 9.0 + time * 0.4)
               * cos(vN.y * 7.0 + time * 0.3)
               * sin(vN.z * 8.0 + time * 0.35);
    gl_FragColor = vec4(glowColor, rim * opacity * clamp(turb, 0.6, 1.4));
  }`

function buildAtmosphere(scene) {
  const layers = [
    { r: R * 1.03, color: 0x66aaff, opacity: 0.28, power: 5.5 },  // tight blue rim
    { r: R * 1.10, color: 0xaaccff, opacity: 0.16, power: 4.0 },  // mid haze
    { r: R * 1.20, color: 0xddeeff, opacity: 0.08, power: 3.0 },  // soft outer smoke
  ]
  const meshes = layers.map(({ r, color, opacity, power }) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(color) },
          opacity:   { value: opacity },
          time:      { value: 0 },
          power:     { value: power },
        },
        vertexShader:   smokeVert,
        fragmentShader: smokeFrag,
        side:        THREE.FrontSide,
        blending:    THREE.AdditiveBlending,
        transparent: true,
        depthWrite:  false,
      }),
    )
    scene.add(m)
    return m
  })
  return meshes  // returned so the animation loop can tick `time`
}

// =====================================================================
// FLAT 2-D MAP
// =====================================================================
function FlatMapView({ filteredArcs, speedLevel }) {
  const containerRef    = useRef(null)
  const canvasRef       = useRef(null)
  const speedRef        = useRef(speedLevel)
  const filteredArcsRef = useRef(filteredArcs)
  const arcStates       = useRef({})
  const rafRef          = useRef(null)

  useEffect(() => { speedRef.current       = speedLevel   }, [speedLevel])
  useEffect(() => { filteredArcsRef.current = filteredArcs }, [filteredArcs])

  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')

    const setSize = () => {
      const r = container.getBoundingClientRect()
      const w = r.width  || container.offsetWidth  || 800
      const h = r.height || container.offsetHeight || 600
      if (w > 0 && h > 0) { canvas.width = w; canvas.height = h }
    }
    setTimeout(setSize, 0)
    const ro = new ResizeObserver(setSize)
    ro.observe(container)

    const draw = () => {
      const W   = canvas.width, H = canvas.height
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return }
      const spd  = SPD2D[speedRef.current] ?? SPD2D[1]
      const arcs = filteredArcsRef.current

      // Sync state map
      const ids = new Set(arcs.map(a => a.id))
      Object.keys(arcStates.current).forEach(id => { if (!ids.has(id)) delete arcStates.current[id] })
      arcs.forEach(arc => {
        if (!arcStates.current[arc.id])
          arcStates.current[arc.id] = { t: 0, impacted: false, alpha: 1, ringR: 0 }
      })

      // Background + stars (simple dots for 2D)
      ctx.fillStyle = '#03060f'
      ctx.fillRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = 'rgba(26,58,92,0.5)'
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
        ctx.arc(((lng + 180) / 360) * W, ((90 - lat) / 180) * H, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(50,136,255,0.5)'
        ctx.fill()
      })

      // Missiles
      arcs.slice(0, 50).forEach(arc => {
        const st  = arcStates.current[arc.id]
        if (!st || st.alpha <= 0) return
        const col = arc.typeColor || '#00ff88'
        const sx  = ((arc.sourceLng + 180) / 360) * W
        const sy  = ((90 - arc.sourceLat) / 180) * H
        const tx  = ((arc.targetLng + 180) / 360) * W
        const ty  = ((90 - arc.targetLat) / 180) * H
        const mx  = (sx + tx) / 2
        const my  = (sy + ty) / 2 - Math.min(H * 0.12, 55)
        const bez = t => ({
          x: (1-t)**2*sx + 2*(1-t)*t*mx + t**2*tx,
          y: (1-t)**2*sy + 2*(1-t)*t*my + t**2*ty,
        })

        if (!st.impacted) {
          st.t = Math.min(st.t + spd, 1)
          if (st.t >= 1) st.impacted = true
        } else {
          st.ringR += 1.8
          st.alpha  = Math.max(0, st.alpha - 0.025)
        }

        // faint ghost arc
        ctx.beginPath(); ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, tx, ty)
        ctx.strokeStyle = col + '14'; ctx.lineWidth = 1; ctx.stroke()

        if (!st.impacted || st.alpha > 0.5) {
          const COMET = 0.13
          const tailT = Math.max(0, st.t - COMET)
          ctx.beginPath()
          let moved = false
          for (let k = 0; k <= 20; k++) {
            const t_ = tailT + (k / 20) * (st.t - tailT)
            const p  = bez(t_)
            if (!moved) { ctx.moveTo(p.x, p.y); moved = true } else ctx.lineTo(p.x, p.y)
          }
          if (moved) {
            ctx.strokeStyle = col + 'cc'
            ctx.lineWidth   = arc.severity === 'critical' ? 2.5 : 1.5
            ctx.stroke()
          }
          const hp = bez(st.t)
          ctx.beginPath(); ctx.arc(hp.x, hp.y, arc.severity === 'critical' ? 3.5 : 2.5, 0, Math.PI*2)
          ctx.fillStyle = col; ctx.shadowBlur = 10; ctx.shadowColor = col
          ctx.fill(); ctx.shadowBlur = 0
        }

        if (st.impacted && st.ringR > 0) {
          const tp  = bez(1)
          const a16 = Math.round(st.alpha * 160).toString(16).padStart(2,'0')
          ctx.beginPath(); ctx.arc(tp.x, tp.y, st.ringR, 0, Math.PI*2)
          ctx.strokeStyle = col + a16; ctx.lineWidth = 1.5; ctx.stroke()
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, background: '#03060f' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

// =====================================================================
// 3-D GLOBE
// =====================================================================
function ThreeGlobe({ filteredArcs, isRotating, speedLevel }) {
  const mountRef    = useRef(null)
  const refs        = useRef({})
  const speedRef    = useRef(speedLevel)
  const renderedRef = useRef(new Set())

  useEffect(() => { speedRef.current = speedLevel }, [speedLevel])

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
    renderer.setClearColor(0x000000, 0)  // transparent bg so CSS handles space colour
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.05
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.3
    controls.enableZoom      = true
    controls.minDistance     = 1.5
    controls.maxDistance     = 5

    scene.add(new THREE.AmbientLight(0x1a2e4a, 1.5))
    const sun = new THREE.DirectionalLight(0x6699ff, 0.5)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    // Build scene elements
    buildStars(scene)
    buildNebulae(scene)
    buildGlobe(scene)
    const atmMeshes = buildAtmosphere(scene)

    // Missile groups
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

    const clock = new THREE.Clock()
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      const t   = clock.getElapsedTime()
      const spd = SPD3D[speedRef.current] ?? SPD3D[1]

      // Tick atmosphere smoke
      atmMeshes.forEach(m => { m.material.uniforms.time.value = t })

      // Advance missiles
      missilesGrp.children.forEach(m => {
        const ud = m.userData
        if (ud.state === 'flying') {
          ud.t = Math.min(ud.t + spd, 1)
          const idx = Math.min(Math.floor(ud.t * ud.points.length), ud.points.length - 1)
          m.position.copy(ud.points[idx])

          if (ud.trail) {
            const tIdx = Math.max(0, idx - Math.floor(ud.points.length * 0.12))
            const vis  = ud.points.slice(tIdx, idx + 1)
            if (vis.length >= 2) ud.trail.geometry.setFromPoints(vis)
          }

          if (ud.t >= 1) {
            ud.state = 'impact'
            // Spawn 3 staggered rings on landing
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
          m.material.opacity = Math.max(0, m.material.opacity - 0.06)
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

      // Cleanup
      const dm = missilesGrp.children.filter(m => m.userData.state === 'done')
      dm.forEach(m => {
        m.geometry.dispose(); m.material.dispose()
        if (m.userData.trail) { m.userData.trail.geometry.dispose(); m.userData.trail.material.dispose(); trailsGrp.remove(m.userData.trail) }
        if (m.userData.ghost) { m.userData.ghost.geometry.dispose(); m.userData.ghost.material.dispose(); trailsGrp.remove(m.userData.ghost) }
        missilesGrp.remove(m)
      })
      const dr = ringsGrp.children.filter(r => r.userData.done)
      dr.forEach(r => { r.geometry.dispose(); r.material.dispose(); ringsGrp.remove(r) })

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

  useEffect(() => {
    const { missilesGrp, trailsGrp } = refs.current
    if (!missilesGrp) return

    filteredArcs.slice(0, 60).forEach(arc => {
      if (renderedRef.current.has(arc.id)) return
      renderedRef.current.add(arc.id)

      const pts    = arcPoints(arc)
      const col    = new THREE.Color(arc.typeColor || '#00ff88')
      const isCrit = arc.severity === 'critical'

      const ghost = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.07 }),
      )
      const trail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([pts[0].clone(), pts[0].clone()]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: isCrit ? 0.95 : 0.7 }),
      )
      const missile = new THREE.Mesh(
        new THREE.SphereGeometry(isCrit ? 0.014 : 0.01, 6, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 }),
      )
      missile.position.copy(pts[0])
      missile.userData = { points: pts, t: 0, state: 'flying', color: col,
                           targetPos: pts[pts.length - 1].clone(), trail, ghost }
      trailsGrp.add(ghost)
      trailsGrp.add(trail)
      missilesGrp.add(missile)
    })
  }, [filteredArcs])

  return <div ref={mountRef} className="w-full h-full globe-container" />
}

// =====================================================================
// MAIN EXPORT
// =====================================================================
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

  if (globeView === 'flat' || !webglOk) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <FlatMapView filteredArcs={filteredArcs} speedLevel={speedLevel} />
        {!webglOk && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2
            bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-3 py-1.5 rounded-lg">
            WebGL not available — 2D flat map
          </div>
        )}
      </div>
    )
  }

  return (
    // Deep space background — dark blue-black radial gradient behind the Three.js canvas
    <div
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'radial-gradient(ellipse at 50% 50%, #050d1a 0%, #02060e 60%, #000305 100%)',
      }}
    >
      <ThreeGlobe filteredArcs={filteredArcs} isRotating={isRotating} speedLevel={speedLevel} />
      {heatmapActive && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background:
            'radial-gradient(ellipse at 30% 40%,rgba(0,80,255,.06) 0%,transparent 60%),' +
            'radial-gradient(ellipse at 70% 60%,rgba(150,0,255,.04) 0%,transparent 50%)',
        }} />
      )}
    </div>
  )
}
