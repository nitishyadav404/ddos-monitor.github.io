/**
 * GlobeView.jsx — Pure Three.js globe (no globe.gl / three-globe dependency).
 * Removes the three/webgpu + three/tsl import errors entirely.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useStore from '../../store/useStore.js'
import { COUNTRIES } from '../../utils/constants.js'

const R = 1.0 // globe radius

// lat/lng → 3D point on unit sphere
function ll2v(lat, lng, r = R) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

// =====================================================================
// FLAT 2D MAP FALLBACK (canvas)
// =====================================================================
function FlatMapView({ attacks, filteredArcs }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)

  const project = useCallback((lat, lng, w, h) => ({
    x: ((lng + 180) / 360) * w,
    y: ((90 - lat) / 180) * h,
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#030a05'
      ctx.fillRect(0, 0, w, h)

      // grid lines
      ctx.strokeStyle = 'rgba(0,255,136,0.04)'
      ctx.lineWidth   = 0.5
      for (let la = -80; la <= 80; la += 20) {
        const y = ((90 - la) / 180) * h
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
      for (let lo = -180; lo <= 180; lo += 30) {
        const x = ((lo + 180) / 360) * w
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }

      // country dots
      Object.values(COUNTRIES).forEach((c) => {
        const p = project(c.lat, c.lng, w, h)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,255,136,0.25)'
        ctx.fill()
      })

      // arcs
      filteredArcs.slice(0, 40).forEach((arc) => {
        const s  = project(arc.sourceLat, arc.sourceLng, w, h)
        const t  = project(arc.targetLat, arc.targetLng, w, h)
        const mx = (s.x + t.x) / 2
        const my = (s.y + t.y) / 2 - 28
        const grd = ctx.createLinearGradient(s.x, s.y, t.x, t.y)
        grd.addColorStop(0, (arc.typeColor || '#00ff88') + 'bb')
        grd.addColorStop(1, (arc.typeColor || '#00ff88') + '22')
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.quadraticCurveTo(mx, my, t.x, t.y)
        ctx.strokeStyle = grd
        ctx.lineWidth   = arc.severity === 'critical' ? 2 : 1.2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = arc.typeColor || '#00ff88'
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    draw()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [filteredArcs, project])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ background: '#030a05' }}
    />
  )
}

// =====================================================================
// 3D GLOBE — pure Three.js
// =====================================================================
function ThreeGlobe({ filteredArcs, colorMode, isRotating }) {
  const mountRef = useRef(null)
  const refs     = useRef({})   // holds scene refs across renders

  // ----- ONE-TIME scene setup -----
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth || 800
    const H = el.clientHeight || 600

    // Core
    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    // Orbit controls
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

    // ----- Earth sphere -----
    const globeGeo = new THREE.SphereGeometry(R, 64, 64)
    const loader   = new THREE.TextureLoader()
    const tex      = loader.load(
      'https://unpkg.com/three-globe@2.27.3/example/img/earth-night.jpg',
    )
    const globeMat = new THREE.MeshPhongMaterial({
      map: tex, specular: 0x111111, shininess: 6,
    })
    scene.add(new THREE.Mesh(globeGeo, globeMat))

    // ----- Atmosphere glow (hacker green) -----
    const atmGeo = new THREE.SphereGeometry(R * 1.14, 64, 64)
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x00ff88) } },
      vertexShader: /* glsl */`
        varying float vI;
        void main() {
          vec3 n = normalize(normalMatrix * normal);
          vec3 v = normalize(-(modelViewMatrix * vec4(position,1.0)).xyz);
          vI = pow(max(0.0, 1.0 - dot(n, v)), 4.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 glowColor;
        varying float vI;
        void main() { gl_FragColor = vec4(glowColor, vI * 0.38); }`,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    scene.add(new THREE.Mesh(atmGeo, atmMat))

    // ----- Groups for dynamic objects -----
    const arcsGrp  = new THREE.Group()
    const ringsGrp = new THREE.Group()
    const ptsGrp   = new THREE.Group()
    scene.add(arcsGrp, ringsGrp, ptsGrp)

    // ----- Resize -----
    const onResize = () => {
      const W2 = el.clientWidth, H2 = el.clientHeight
      camera.aspect = W2 / H2
      camera.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    // ----- Animation loop -----
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      ringsGrp.children.forEach((ring) => {
        ring.userData.t = ((ring.userData.t ?? Math.random()) + 0.016) % 1
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

  // Rebuild arcs / rings / points when data changes
  useEffect(() => {
    const { arcsGrp, ringsGrp, ptsGrp } = refs.current
    if (!arcsGrp) return

    const flush = (g) => {
      g.children.forEach((c) => { c.geometry?.dispose(); c.material?.dispose() })
      g.clear()
    }
    flush(arcsGrp); flush(ringsGrp); flush(ptsGrp)

    filteredArcs.slice(0, 60).forEach((arc, i) => {
      const col    = new THREE.Color(arc.typeColor || '#00ff88')
      const isCrit = arc.severity === 'critical'
      const src    = ll2v(arc.sourceLat, arc.sourceLng)
      const tgt    = ll2v(arc.targetLat, arc.targetLng)

      // Arc bezier
      const alt  = isCrit ? 0.55 : 0.38
      const mid  = src.clone().add(tgt).normalize().multiplyScalar(R * (1 + alt))
      const pts  = new THREE.QuadraticBezierCurve3(src, mid, tgt).getPoints(64)
      const aGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const aMat = new THREE.LineBasicMaterial({
        color: col, transparent: true,
        opacity: isCrit ? 0.95 : 0.6,
      })
      arcsGrp.add(new THREE.Line(aGeo, aMat))

      // Ring at target
      if (i < 20) {
        const rPos  = ll2v(arc.targetLat, arc.targetLng, R + 0.003)
        const segs  = 32
        const rPts  = Array.from({ length: segs + 1 }, (_, j) => {
          const a = (j / segs) * Math.PI * 2
          return new THREE.Vector3(Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0)
        })
        const rGeo  = new THREE.BufferGeometry().setFromPoints(rPts)
        const rMat  = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 })
        const ring  = new THREE.Line(rGeo, rMat)
        ring.position.copy(rPos)
        // Orient ring tangent to sphere surface: align local +Z with radial direction
        const outward = rPos.clone().normalize()
        ring.setRotationFromQuaternion(
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward)
        )
        ring.userData.t = Math.random()
        ringsGrp.add(ring)
      }

      // Point at source
      if (i < 30) {
        const pPos = ll2v(arc.sourceLat, arc.sourceLng, R + 0.01)
        const pGeo = new THREE.SphereGeometry(0.007, 4, 4)
        const pMat = new THREE.MeshBasicMaterial({ color: col })
        const pt   = new THREE.Mesh(pGeo, pMat)
        pt.position.copy(pPos)
        ptsGrp.add(pt)
      }
    })
  }, [filteredArcs])

  return <div ref={mountRef} className="w-full h-full globe-container" />
}

// =====================================================================
// MAIN EXPORT
// =====================================================================
export default function GlobeView() {
  const {
    globeView, colorMode, heatmapActive, attacks, isRotating,
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
    .filter((a) => selectedTypes.includes(a.type) && selectedSeverities.includes(a.severity))
    .slice(0, 60)

  if (globeView === 'flat' || !webglOk) {
    return (
      <div className="w-full h-full relative">
        <FlatMapView attacks={attacks} filteredArcs={filteredArcs} />
        {!webglOk && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 border
            border-yellow-500/40 text-yellow-300 text-xs px-3 py-1.5 rounded-lg">
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
        colorMode={colorMode}
        isRotating={isRotating}
      />
      {heatmapActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 30% 40%, rgba(0,255,136,0.07) 0%, transparent 60%),' +
              'radial-gradient(ellipse at 70% 60%, rgba(191,95,255,0.05) 0%, transparent 50%)',
          }}
        />
      )}
    </div>
  )
}
