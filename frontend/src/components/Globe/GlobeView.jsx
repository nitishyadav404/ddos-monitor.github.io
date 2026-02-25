/**
 * GlobeView.jsx — Kaspersky CyberMap-inspired globe
 *
 * Visual design:
 *  • earth-dark.jpg texture  — dark political map, country shapes visible
 *  • earth-water.png specular — oceans slightly reflective
 *  • earth-topology bump map  — subtle terrain relief
 *  • BackSide glow sphere     — wide soft green halo (Kaspersky look)
 *  • Large glow sprite        — green radial gradient behind the globe
 *  • 8 000-star particle field
 *  • Country name sprites     — always face camera, monospace green text
 *  • Impact SPIKES on landing — rise, pulse, fade (not rings)
 *  • One-shot missile lifecycle
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
  const alt = arc.severity === 'critical' ? 0.55 : arc.severity === 'high' ? 0.45 : 0.36
  const mid = src.clone().add(tgt).normalize().multiplyScalar(R * (1 + alt))
  return new THREE.QuadraticBezierCurve3(src, mid, tgt).getPoints(SEGMENTS)
}

const SPD3D = [0.003, 0.008, 0.018, 0.042]
const SPD2D = [0.003, 0.008, 0.018, 0.042]

// Major countries with centroid positions for labels
const COUNTRY_LABELS = [
  { name: 'USA',         lat: 38,  lng: -97  },
  { name: 'CANADA',      lat: 57,  lng: -96  },
  { name: 'BRAZIL',      lat: -10, lng: -53  },
  { name: 'RUSSIA',      lat: 62,  lng: 100  },
  { name: 'CHINA',       lat: 35,  lng: 103  },
  { name: 'INDIA',       lat: 22,  lng: 78   },
  { name: 'AUSTRALIA',   lat: -25, lng: 133  },
  { name: 'UK',          lat: 54,  lng: -2   },
  { name: 'GERMANY',     lat: 51,  lng: 10   },
  { name: 'FRANCE',      lat: 46,  lng: 2    },
  { name: 'JAPAN',       lat: 36,  lng: 138  },
  { name: 'S. KOREA',    lat: 36,  lng: 128  },
  { name: 'INDONESIA',   lat: -5,  lng: 117  },
  { name: 'NIGERIA',     lat: 9,   lng: 8    },
  { name: 'S. AFRICA',   lat: -29, lng: 25   },
  { name: 'MEXICO',      lat: 24,  lng: -102 },
  { name: 'ARGENTINA',   lat: -35, lng: -65  },
  { name: 'UKRAINE',     lat: 49,  lng: 32   },
  { name: 'IRAN',        lat: 32,  lng: 53   },
  { name: 'TURKEY',      lat: 39,  lng: 35   },
  { name: 'PAKISTAN',    lat: 30,  lng: 69   },
  { name: 'SAUDI ARABIA',lat: 24,  lng: 45   },
  { name: 'EGYPT',       lat: 27,  lng: 30   },
  { name: 'COLOMBIA',    lat: 4,   lng: -74  },
  { name: 'SPAIN',       lat: 40,  lng: -4   },
  { name: 'ITALY',       lat: 42,  lng: 13   },
  { name: 'POLAND',      lat: 52,  lng: 20   },
  { name: 'VIETNAM',     lat: 16,  lng: 108  },
  { name: 'THAILAND',    lat: 15,  lng: 101  },
  { name: 'MALAYSIA',    lat: 4,   lng: 109  },
]

// =====================================================================
// STARS
// =====================================================================
function buildStars(scene) {
  const N = 8000
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
    sz[i]      = Math.random() < 0.07 ? 2.0 : Math.random() < 0.2 ? 1.1 : 0.5
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('aSize',    new THREE.Float32BufferAttribute(sz,  1))
  scene.add(new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      void main(){
        vec4 mv = modelViewMatrix*vec4(position,1.);
        gl_PointSize = aSize*(280./-mv.z);
        gl_Position  = projectionMatrix*mv;
      }`,
    fragmentShader: `
      void main(){
        float d = length(gl_PointCoord-.5)*2.;
        if(d>1.) discard;
        float a = 1.-smoothstep(0.,1.,d);
        gl_FragColor = vec4(1.,1.,1.,a*.82);
      }`,
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
  })))
}

// =====================================================================
// GLOBE  (dark political map + specular water + bump terrain)
// =====================================================================
function buildGlobe(scene) {
  const L = new THREE.TextureLoader()
  const earthTex = L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-dark.jpg')
  const waterTex = L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-water.png')
  const bumpTex  = L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-topology.png')

  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshPhongMaterial({
      map:         earthTex,
      specularMap: waterTex,
      bumpMap:     bumpTex,
      bumpScale:   0.012,
      specular:    new THREE.Color(0x1a3344),
      shininess:   8,
    }),
  ))
}

// =====================================================================
// ATMOSPHERE  — Kaspersky-style green halo
// =====================================================================
function buildAtmosphere(scene) {
  // 1. Tight inner rim on globe surface
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.015, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(0x22ee66) } },
      vertexShader: `
        varying float vI;
        void main(){
          vec3 n=normalize(normalMatrix*normal);
          vec3 v=normalize(-(modelViewMatrix*vec4(position,1.)).xyz);
          vI=pow(max(0.,1.-dot(n,v)),4.2);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        }`,
      fragmentShader: `uniform vec3 c;varying float vI;void main(){gl_FragColor=vec4(c,vI*.22);}`,
      side:THREE.FrontSide, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false,
    }),
  ))

  // 2. Wide BackSide halo — the characteristic Kaspersky green glow ring visible AROUND the globe
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.45, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(0x00cc44) } },
      vertexShader: `
        varying float vI;
        void main(){
          vec3 n=normalize(normalMatrix*normal);
          vec3 v=normalize((modelViewMatrix*vec4(position,1.)).xyz);
          vI=pow(max(0.,1.-dot(n,-v)),1.6);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        }`,
      fragmentShader: `uniform vec3 c;varying float vI;void main(){gl_FragColor=vec4(c,vI*.48);}`,
      side:THREE.BackSide, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false,
    }),
  ))

  // 3. Soft glow sprite behind globe (large radial gradient, always additive)
  const gc = document.createElement('canvas')
  gc.width = gc.height = 512
  const gx = gc.getContext('2d')
  const gg = gx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gg.addColorStop(0,    'rgba(0,220,80,0.20)')
  gg.addColorStop(0.3,  'rgba(0,180,55,0.10)')
  gg.addColorStop(0.65, 'rgba(0,100,30,0.04)')
  gg.addColorStop(1,    'rgba(0,0,0,0)')
  gx.fillStyle = gg
  gx.fillRect(0, 0, 512, 512)
  const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(gc),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,  // renders through globe so glow wraps everywhere
  }))
  glowSpr.scale.set(8, 8, 1)
  glowSpr.renderOrder = -1
  scene.add(glowSpr)
}

// =====================================================================
// COUNTRY LABELS  — always face camera, monospace text sprites
// =====================================================================
function buildLabels(scene) {
  COUNTRY_LABELS.forEach(({ name, lat, lng }) => {
    const canvas = document.createElement('canvas')
    const W = 160, H = 28
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // subtle glow
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur  = 4
    ctx.fillStyle = 'rgba(120,200,140,0.75)'
    ctx.fillText(name, W / 2, H / 2)

    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map:         new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite:  false,
      sizeAttenuation: true,
    }))
    spr.position.copy(ll2v(lat, lng, R + 0.05))
    spr.scale.set(0.38, 0.067, 1)
    scene.add(spr)
  })
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
      const W = canvas.width, H = canvas.height
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return }
      const spd  = SPD2D[speedRef.current] ?? SPD2D[1]
      const arcs = filteredArcsRef.current

      const ids = new Set(arcs.map(a => a.id))
      Object.keys(arcStates.current).forEach(id => { if (!ids.has(id)) delete arcStates.current[id] })
      arcs.forEach(arc => {
        if (!arcStates.current[arc.id])
          arcStates.current[arc.id] = { t: 0, impacted: false, alpha: 1, ringR: 0 }
      })

      ctx.fillStyle = '#03080e'
      ctx.fillRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = 'rgba(26,58,92,0.4)'
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
        ctx.fillStyle = 'rgba(0,180,80,0.4)'
        ctx.fill()
      })

      // Missiles + landing rings
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
        const bez = t => ({ x:(1-t)**2*sx+2*(1-t)*t*mx+t**2*tx, y:(1-t)**2*sy+2*(1-t)*t*my+t**2*ty })

        if (!st.impacted) {
          st.t = Math.min(st.t + spd, 1)
          if (st.t >= 1) st.impacted = true
        } else { st.ringR += 1.8; st.alpha = Math.max(0, st.alpha - 0.025) }

        ctx.beginPath(); ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, tx, ty)
        ctx.strokeStyle = col + '14'; ctx.lineWidth = 1; ctx.stroke()

        if (!st.impacted || st.alpha > 0.5) {
          const COMET = 0.14
          const tailT = Math.max(0, st.t - COMET)
          ctx.beginPath(); let mv = false
          for (let k = 0; k <= 20; k++) {
            const t_ = tailT + (k/20)*(st.t-tailT)
            const p  = bez(t_)
            if(!mv){ctx.moveTo(p.x,p.y);mv=true}else ctx.lineTo(p.x,p.y)
          }
          if(mv){ctx.strokeStyle=col+'cc';ctx.lineWidth=arc.severity==='critical'?2.5:1.5;ctx.stroke()}
          const hp=bez(st.t)
          ctx.beginPath();ctx.arc(hp.x,hp.y,arc.severity==='critical'?3.5:2.5,0,Math.PI*2)
          ctx.fillStyle=col;ctx.shadowBlur=10;ctx.shadowColor=col;ctx.fill();ctx.shadowBlur=0
        }
        if(st.impacted&&st.ringR>0){
          const tp=bez(1)
          ctx.beginPath();ctx.arc(tp.x,tp.y,st.ringR,0,Math.PI*2)
          ctx.strokeStyle=col+Math.round(st.alpha*160).toString(16).padStart(2,'0')
          ctx.lineWidth=1.5;ctx.stroke()
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return (
    <div ref={containerRef} style={{ position:'absolute', inset:0, background:'#03080e' }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
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
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.05
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.25
    controls.enableZoom      = true
    controls.minDistance     = 1.4
    controls.maxDistance     = 5

    // Lighting: high ambient so dark side of globe is still visible
    scene.add(new THREE.AmbientLight(0x445566, 2.2))
    const sun = new THREE.DirectionalLight(0x88aacc, 0.5)
    sun.position.set(4, 2, 4)
    scene.add(sun)

    // Scene elements
    buildStars(scene)
    buildGlobe(scene)
    buildAtmosphere(scene)
    buildLabels(scene)

    // Missile + spike groups
    const missilesGrp = new THREE.Group()
    const trailsGrp   = new THREE.Group()
    const spikesGrp   = new THREE.Group()
    scene.add(missilesGrp, trailsGrp, spikesGrp)

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      const spd = SPD3D[speedRef.current] ?? SPD3D[1]

      // --- Advance missiles ---
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
            // ---- Spawn impact SPIKES (not rings) ----
            const norm = ud.targetPos.clone().normalize()
            const numSpikes = ud.isCrit ? 5 : 3  // more spikes for critical attacks
            for (let i = 0; i < numSpikes; i++) {
              // Slightly randomise position within ~0.02 radius of target for cluster effect
              const jitterLat = (Math.random() - 0.5) * 4
              const jitterLng = (Math.random() - 0.5) * 4
              const jitterRaw = ud.targetPos.clone()
              const basePos   = ll2v(
                Math.asin(Math.max(-1, Math.min(1, ud.targetPos.y))) * 180 / Math.PI + jitterLat,
                Math.atan2(ud.targetPos.z, -ud.targetPos.x) * 180 / Math.PI + jitterLng,
                R,
              )
              const sNorm = basePos.clone().normalize()
              const maxH  = 0.04 + Math.random() * 0.06  // random height 0.04–0.10
              const spk   = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([basePos.clone(), basePos.clone()]),
                new THREE.LineBasicMaterial({ color: ud.color, transparent: true, opacity: 0 }),
              )
              spk.userData = {
                base:   basePos.clone(),
                norm:   sNorm,
                maxH,
                age:    0,
                delay:  i * 5,          // stagger appearance
                maxAge: 140 + i * 20,   // different lifespans
                done:   false,
              }
              spikesGrp.add(spk)
            }
          }
        } else if (ud.state === 'impact') {
          m.material.opacity = Math.max(0, m.material.opacity - 0.08)
          if (ud.trail) ud.trail.material.opacity = Math.max(0, ud.trail.material.opacity - 0.05)
          if (ud.ghost) ud.ghost.material.opacity = Math.max(0, ud.ghost.material.opacity - 0.02)
          if (m.material.opacity <= 0) ud.state = 'done'
        }
      })

      // --- Animate impact spikes ---
      spikesGrp.children.forEach(spk => {
        const ud = spk.userData
        if (ud.delay > 0) { ud.delay -= 1; return }
        ud.age += 1
        const t = ud.age / ud.maxAge
        let h, op
        if      (t < 0.15) { h = (t / 0.15) * ud.maxH; op = t / 0.15 }  // rise
        else if (t < 0.72) { const pulse = 1 + 0.09 * Math.sin(ud.age * 0.35); h = ud.maxH * pulse; op = 1 } // pulse at peak
        else               { const f = (t - 0.72) / 0.28; h = ud.maxH * (1 - f * 0.4); op = 1 - f }  // fade
        const tip = ud.base.clone().add(ud.norm.clone().multiplyScalar(h))
        spk.geometry.setFromPoints([ud.base.clone(), tip])
        spk.material.opacity = Math.max(0, op)
        if (ud.age >= ud.maxAge) ud.done = true
      })

      // --- Cleanup ---
      const dm = missilesGrp.children.filter(m => m.userData.state === 'done')
      dm.forEach(m => {
        m.geometry.dispose(); m.material.dispose()
        if (m.userData.trail) { m.userData.trail.geometry.dispose(); m.userData.trail.material.dispose(); trailsGrp.remove(m.userData.trail) }
        if (m.userData.ghost) { m.userData.ghost.geometry.dispose(); m.userData.ghost.material.dispose(); trailsGrp.remove(m.userData.ghost) }
        missilesGrp.remove(m)
      })
      const ds = spikesGrp.children.filter(s => s.userData.done)
      ds.forEach(s => { s.geometry.dispose(); s.material.dispose(); spikesGrp.remove(s) })

      if (renderedRef.current.size > 600) renderedRef.current.clear()
      renderer.render(scene, camera)
    }
    animate()

    refs.current = { scene, missilesGrp, trailsGrp, spikesGrp, controls, renderer, el }
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

  // Fire missiles for new arcs only
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
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.06 }),
      )
      const trail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([pts[0].clone(), pts[0].clone()]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: isCrit ? 0.95 : 0.72 }),
      )
      const missile = new THREE.Mesh(
        new THREE.SphereGeometry(isCrit ? 0.013 : 0.009, 6, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 }),
      )
      missile.position.copy(pts[0])
      missile.userData = {
        points: pts, t: 0, state: 'flying',
        color: col, isCrit,
        targetPos: pts[pts.length - 1].clone(),
        trail, ghost,
      }
      trailsGrp.add(ghost)
      trailsGrp.add(trail)
      missilesGrp.add(missile)
    })
  }, [filteredArcs])

  return <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
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
      <div style={{ position:'relative', width:'100%', height:'100%' }}>
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
    <div style={{
      position:'relative', width:'100%', height:'100%',
      // Deep space: pure black bg so the green glow really pops
      background:'#000000',
    }}>
      <ThreeGlobe filteredArcs={filteredArcs} isRotating={isRotating} speedLevel={speedLevel} />
      {heatmapActive && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background:
            'radial-gradient(ellipse at 35% 45%,rgba(0,60,200,.05) 0%,transparent 55%),' +
            'radial-gradient(ellipse at 65% 55%,rgba(100,0,200,.04) 0%,transparent 50%)',
        }} />
      )}
    </div>
  )
}
