/**
 * GlobeView.jsx — 3D Globe + 2D Flat Map
 *
 * Atmosphere: ONE BackSide sphere at 1.5R.
 * Single shader blends:
 *   • A wide soft Fresnel halo (glow) that bleeds into space
 *   • Animated noise wisps confined to the outermost rim band
 * Result: Kaspersky-style single atmospheric haze — no double ring.
 */
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import useStore from '../../store/useStore.js'
import { COUNTRIES } from '../../utils/constants.js'

const R        = 1.0
const SEGMENTS = 80
const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const MIN_ZOOM = {
  US:1.0,CN:1.0,RU:1.0,CA:1.0,BR:1.0,AU:1.0,IN:1.0,
  DZ:1.0,KZ:1.0,SA:1.0,AR:1.0,MX:1.0,ID:1.0,LY:1.0,
  IR:1.0,MN:1.0,PE:1.0,CD:1.0,SD:1.0,AO:1.0,ML:1.0,
  ZA:1.5,CO:1.5,ET:1.5,MZ:1.5,BO:1.5,MG:1.5,TZ:1.5,
  NG:1.5,VE:1.5,PK:1.5,AF:1.5,SO:1.5,CL:1.5,ZM:1.5,
  MM:1.5,TD:1.5,CF:1.5,NA:1.5,MR:1.5,EG:1.5,TR:1.5,
  NE:1.5,UA:1.5,GB:1.5,FR:1.5,DE:1.5,JP:1.5,PH:1.5,
  SE:1.5,NO:1.5,FI:1.5,PG:1.5,MY:1.5,VN:1.5,TH:1.5,
  TM:1.5,KE:1.5,UZ:1.5,BY:1.5,KR:1.5,IT:1.5,ES:1.5,
  PL:1.5,ZW:1.5,CM:1.5,SS:1.5,BF:1.5,MK:1.5,
  UG:2.5,GH:2.5,RO:2.5,IQ:2.5,MA:2.5,UY:2.5,SY:2.5,
  KH:2.5,TN:2.5,YE:2.5,PT:2.5,AZ:2.5,GE:2.5,AT:2.5,
  GR:2.5,BG:2.5,HU:2.5,CZ:2.5,RS:2.5,KG:2.5,TJ:2.5,
  PY:2.5,NZ:2.5,EC:2.5,CG:2.5,GN:2.5,NP:2.5,BD:2.5,
  GA:2.5,MW:2.5,ER:2.5,SL:2.5,GY:2.5,SR:2.5,
  LA:2.5,HN:2.5,GT:2.5,GW:2.5,BJ:2.5,TG:2.5,BI:2.5,
  RW:2.5,LK:2.5,KW:2.5,OM:2.5,AM:2.5,LR:2.5,NI:2.5,
  DK:3.5,SK:3.5,FJ:3.5,TL:3.5,CR:3.5,PA:3.5,BT:3.5,
  SZ:3.5,LS:3.5,GQ:3.5,DJ:3.5,DO:3.5,HT:3.5,JM:3.5,
  CU:3.5,AE:3.5,JO:3.5,LB:3.5,IL:3.5,PS:3.5,CY:3.5,
  AL:3.5,BA:3.5,HR:3.5,SI:3.5,BE:3.5,NL:3.5,
  CH:3.5,IE:3.5,LT:3.5,LV:3.5,EE:3.5,MD:3.5,ME:3.5,
  BW:3.5,SG:3.5,TW:3.5,HK:3.5,BN:3.5,MV:3.5,
  BH:3.5,QA:3.5,IS:3.5,CV:3.5,KM:3.5,TT:3.5,
  LU:5.0,MT:5.0,BZ:5.0,SV:5.0,GM:5.0,
  NYC:6.0,LAX:6.0,LON:6.0,PAR:6.0,BER:6.0,MOW:6.0,PEK:6.0,
  SHA:6.0,TYO:6.0,BOM:6.0,DEL:6.0,KHI:6.0,CGK:6.0,GRU:6.0,
  MEX:6.0,KTM:6.0,HAV:6.0,ISB:6.0,IEV:6.0,TLV:6.0,BKK:6.0,
  TPE:6.0,AMS:6.0,WAW:6.0,ORD:6.0,YYZ:6.0,DXB:6.0,SYD:6.0,
  CAI:6.0,LOS:6.0,ICN:6.0,SGN:6.0,MNL:6.0,NBO:6.0,ADD:6.0,
  LHR:6.0,FRA:6.0,CDG:6.0,
}

const CITY_KEYS = new Set(Object.keys(MIN_ZOOM).filter(k => MIN_ZOOM[k] >= 6.0))

function maxDistFor(mz) {
  if (mz <= 1.0) return Infinity
  if (mz <= 1.5) return 2.4
  if (mz <= 2.5) return 1.9
  if (mz <= 3.5) return 1.58
  if (mz <= 5.0) return 1.40
  return 1.28
}

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

let _topoCache = null
async function getTopoFeatures() {
  if (_topoCache) return _topoCache
  const res   = await fetch(TOPO_URL)
  const world = await res.json()
  _topoCache  = topojson.feature(world, world.objects.countries).features
  return _topoCache
}

// ─────────────────────────────────────────────────────────────────────────
function buildStars(scene) {
  const N = 8000, pos = new Float32Array(N * 3), sz = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const t = 2 * Math.PI * Math.random(), p = Math.acos(2 * Math.random() - 1), r = 14 + Math.random() * 36
    pos[i*3]   = r * Math.sin(p) * Math.cos(t)
    pos[i*3+1] = r * Math.sin(p) * Math.sin(t)
    pos[i*3+2] = r * Math.cos(p)
    sz[i] = Math.random() < .07 ? 2 : Math.random() < .2 ? 1.1 : .5
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aSize',    new THREE.Float32BufferAttribute(sz,  1))
  scene.add(new THREE.Points(g, new THREE.ShaderMaterial({
    vertexShader:   `attribute float aSize;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*(280./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(1.,1.,1.,(1.-smoothstep(0.,1.,d))*.82);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })))
}

function buildGlobe(scene) {
  const L = new THREE.TextureLoader()
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshPhongMaterial({
      map:         L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-dark.jpg'),
      specularMap: L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-water.png'),
      bumpMap:     L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-topology.png'),
      bumpScale: .01, specular: new THREE.Color(0x1a3344), shininess: 6,
    })
  ))
}

async function buildCountryBorders(scene) {
  try {
    const features = await getTopoFeatures()
    const mat = new THREE.LineBasicMaterial({ color: 0x3a6045, transparent: true, opacity: .7 })
    features.forEach(f => {
      if (!f.geometry) return
      const drawRing = ring => {
        if (ring.length < 2) return
        const pts = ring.map(([lng, lat]) => ll2v(lat, lng, R + .0015))
        if (!pts[0].equals(pts[pts.length - 1])) pts.push(pts[0].clone())
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
      }
      if (f.geometry.type === 'Polygon')      f.geometry.coordinates.forEach(drawRing)
      else if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach(p => p.forEach(drawRing))
    })
  } catch(e) { console.warn('3D borders:', e) }
}

// ═══════════════════════════════════════════════════════════════════════
// UNIFIED ATMOSPHERE — single BackSide shell at 1.5R
// One shader = one ring around the globe silhouette.
// Combines:
//   • Wide soft Fresnel halo (glow) decaying into space
//   • Subtle animated noise wisps only in the outermost rim band
// NO second sphere. No double bubble.
// ═══════════════════════════════════════════════════════════════════════
const ATMO_VERT = /* glsl */`
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 wp     = modelMatrix * vec4(position, 1.0);
    vWorldPos   = wp.xyz;
    vNormal     = normalize(normalMatrix * normal);
    vec4 mv     = modelViewMatrix * vec4(position, 1.0);
    vViewDir    = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const ATMO_FRAG = /* glsl */`
  uniform float uTime;
  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  // ── compact hash noise ──────────────────────────────────────────
  float hash31(vec3 p) {
    p  = fract(p * vec3(127.1, 311.7, 74.7));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    vec3 u = f*f*(3.0-2.0*f);
    float a=hash31(i),b=hash31(i+vec3(1,0,0)),
          c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),
          e=hash31(i+vec3(0,0,1)),g=hash31(i+vec3(1,0,1)),
          h=hash31(i+vec3(0,1,1)),k=hash31(i+vec3(1,1,1));
    return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),
               mix(mix(e,g,u.x),mix(h,k,u.x),u.y),u.z);
  }
  float fbm(vec3 p) {
    float v=0.,amp=0.5,freq=1.;
    for(int i=0;i<3;i++){v+=amp*vnoise(p*freq);freq*=2.1;amp*=0.48;}
    return v;
  }

  void main() {
    // rim = 0 face-on, 1 at grazing edge
    float rim = 1.0 - abs(dot(vNormal, vViewDir));
    rim = clamp(rim, 0.0, 1.0);

    // ── BASE GLOW ─────────────────────────────────────────────────
    // Soft wide Fresnel that fans into space (low power = wide band)
    float glowBase  = pow(rim, 2.2);
    // Exponential density: dense at limb, zero toward centre of disc
    float density   = exp(-2.8 * (1.0 - rim));
    float glowAlpha = glowBase * density * 0.68;

    // ── WISPY MIST — only in outermost rim band ───────────────────
    // rimGate kills anything below the horizon (rim < 0.60)
    // so mist NEVER touches the globe face
    float rimGate = smoothstep(0.60, 0.80, rim);
    vec3  p1 = vWorldPos * 2.6 + vec3( uTime*0.055, uTime*0.040, -uTime*0.030);
    vec3  p2 = vWorldPos * 5.0 + vec3(-uTime*0.095, uTime*0.075,  uTime*0.050);
    float n  = fbm(p1) + fbm(p2) * 0.45;
    float mist = smoothstep(0.52, 1.0, n) * rimGate * 0.30;

    // ── COMBINE ───────────────────────────────────────────────────
    float alpha = glowAlpha + mist;
    if (alpha < 0.005) discard;
    alpha = min(alpha, 0.92); // never fully opaque

    // Colour: deep green at base, bright cyber-green at edge wisps
    vec3 baseCol = mix(vec3(0.0, 0.45, 0.18), vec3(0.0, 1.0, 0.4), glowBase);
    vec3 mistCol = vec3(0.0, 1.0, 0.45);
    vec3 col     = mix(baseCol, mistCol, mist / max(alpha, 0.001));

    gl_FragColor = vec4(col, alpha);
  }
`

/**
 * buildAtmosphere — single shell, returns mat so animate loop ticks uTime.
 */
function buildAtmosphere(scene) {
  const mat = new THREE.ShaderMaterial({
    uniforms:      { uTime: { value: 0.0 } },
    vertexShader:   ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    side:        THREE.BackSide,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    depthWrite:  false,
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.5, 64, 64), mat))
  return mat
}

// ─────────────────────────────────────────────────────────────────────────
function buildLabels3D(scene) {
  const labelObjects = []
  Object.entries(COUNTRIES).forEach(([code, { name, lat, lng }]) => {
    const mz     = MIN_ZOOM[code] ?? 3.5
    const isCity = CITY_KEYS.has(code)
    const fs     = mz <= 1.0 ? 15 : mz <= 1.5 ? 13.5 : mz <= 2.5 ? 12 : 11
    const div = document.createElement('div')
    div.textContent = name
    div.style.cssText = [
      `font-family: 'Courier New', monospace`,
      `font-size: ${fs}px`,
      `font-weight: ${mz <= 1.5 ? '700' : '500'}`,
      `color: ${isCity ? 'rgba(55,195,230,0.92)' : 'rgba(60,230,130,0.90)'}`,
      `text-shadow: 0 0 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,1)`,
      `letter-spacing: 0.06em`,
      `pointer-events: none`,
      `white-space: nowrap`,
      `user-select: none`,
      `transform: translate(-50%, -50%)`,
    ].join(';')
    const obj = new CSS2DObject(div)
    obj.position.copy(ll2v(lat, lng, R + 0.01))
    obj.userData = { mz, maxDist: maxDistFor(mz), div }
    obj.visible = false
    scene.add(obj)
    labelObjects.push(obj)
  })
  return labelObjects
}

// ═══════════════════════════════════════════════════════════════════════
// FLAT 2-D MAP
// ═══════════════════════════════════════════════════════════════════════
function FlatMapView({ filteredArcs, speedLevel }) {
  const containerRef    = useRef(null)
  const canvasRef       = useRef(null)
  const speedRef        = useRef(speedLevel)
  const filteredArcsRef = useRef(filteredArcs)
  const arcStates       = useRef({})
  const rafRef          = useRef(null)
  const countriesRef    = useRef(null)
  const xfRef           = useRef({ scale: 1, tx: 0, ty: 0 })
  const dragRef         = useRef(null)
  const pinchRef        = useRef(null)
  const dimRef          = useRef({ W: 0, H: 0 })

  useEffect(() => { speedRef.current = speedLevel }, [speedLevel])
  useEffect(() => { filteredArcsRef.current = filteredArcs }, [filteredArcs])
  useEffect(() => { getTopoFeatures().then(f => { countriesRef.current = f }).catch(console.warn) }, [])

  const clampXf = (xf, W, H) => {
    const s = Math.max(1, Math.min(14, xf.scale))
    return { scale: s, tx: Math.max(-(W*(s-1)), Math.min(0, xf.tx)), ty: Math.max(-(H*(s-1)), Math.min(0, xf.ty)) }
  }
  const zoomAt = (cx, cy, factor) => {
    const { W, H } = dimRef.current
    const xf = xfRef.current
    const ns = Math.max(1, Math.min(14, xf.scale * factor))
    const r  = ns / xf.scale
    xfRef.current = clampXf({ scale: ns, tx: cx - r*(cx - xf.tx), ty: cy - r*(cy - xf.ty) }, W, H)
  }

  useEffect(() => {
    const container = containerRef.current, canvas = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')

    const setSize = () => {
      const r  = container.getBoundingClientRect()
      const nw = Math.floor(r.width)  || 800
      const nh = Math.floor(r.height) || 600
      const { W, H } = dimRef.current
      if (nw === W && nh === H) return
      dimRef.current = { W: nw, H: nh }
      canvas.width  = nw
      canvas.height = nh
      xfRef.current = clampXf(xfRef.current, nw, nh)
    }
    setTimeout(setSize, 0)
    const ro = new ResizeObserver(setSize); ro.observe(container)

    const getXY   = e => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
    const getRect = () => canvas.getBoundingClientRect()

    const onDown = e => {
      if (e.touches?.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const r  = getRect()
        pinchRef.current = { dist0: Math.hypot(dx, dy), scale0: xfRef.current.scale,
          cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
          cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top }
        return
      }
      const { x, y } = getXY(e)
      dragRef.current = { sx: x, sy: y, tx0: xfRef.current.tx, ty0: xfRef.current.ty }
    }
    const onMove = e => {
      e.preventDefault()
      if (e.touches?.length === 2 && pinchRef.current) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX
        const dy   = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const { W, H } = dimRef.current
        const f  = dist / pinchRef.current.dist0
        const ns = Math.max(1, Math.min(14, pinchRef.current.scale0 * f))
        const rv = ns / pinchRef.current.scale0
        xfRef.current = clampXf({ scale: ns,
          tx: pinchRef.current.cx - rv * (pinchRef.current.cx - xfRef.current.tx),
          ty: pinchRef.current.cy - rv * (pinchRef.current.cy - xfRef.current.ty) }, W, H)
        return
      }
      if (!dragRef.current) return
      const { x, y } = getXY(e)
      const { W, H } = dimRef.current
      xfRef.current = clampXf({ ...xfRef.current,
        tx: dragRef.current.tx0 + (x - dragRef.current.sx),
        ty: dragRef.current.ty0 + (y - dragRef.current.sy) }, W, H)
    }
    const onUp    = () => { dragRef.current = null; pinchRef.current = null }
    const onWheel = e => {
      e.preventDefault()
      const r = getRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.18 : 1 / 1.18)
    }
    canvas.addEventListener('mousedown',  onDown)
    canvas.addEventListener('mousemove',  onMove)
    canvas.addEventListener('mouseup',    onUp)
    canvas.addEventListener('mouseleave', onUp)
    canvas.addEventListener('wheel',      onWheel, { passive: false })
    canvas.addEventListener('touchstart', onDown,  { passive: true })
    canvas.addEventListener('touchmove',  onMove,  { passive: false })
    canvas.addEventListener('touchend',   onUp)

    const ringPath = (ring, wx, wy) => {
      let first = true
      ring.forEach(([lng, lat]) => {
        const px = wx(lng), py = wy(lat)
        if (first) { ctx.moveTo(px, py); first = false } else ctx.lineTo(px, py)
      })
      ctx.closePath()
    }
    const overlaps = (boxes, x, y, w, h) => {
      const pad = 3
      for (const b of boxes) {
        if (x-w/2-pad < b.x+b.w/2 && x+w/2+pad > b.x-b.w/2 &&
            y-h/2-pad < b.y+b.h/2 && y+h/2+pad > b.y-b.h/2) return true
      }
      return false
    }

    const draw = () => {
      const { W, H } = dimRef.current
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return }
      const spd  = SPD2D[speedRef.current] ?? SPD2D[1]
      const arcs = filteredArcsRef.current
      const { scale: s, tx, ty } = xfRef.current
      const wx = lng => ((lng + 180) / 360) * W * s + tx
      const wy = lat => ((90  - lat) / 180) * H * s + ty
      const ids = new Set(arcs.map(a => a.id))
      Object.keys(arcStates.current).forEach(id => { if (!ids.has(id)) delete arcStates.current[id] })
      arcs.forEach(arc => { if (!arcStates.current[arc.id]) arcStates.current[arc.id] = { t: 0, impacted: false, alpha: 1, ringR: 0 } })
      ctx.fillStyle = '#030d07'
      ctx.fillRect(0, 0, W, H)
      if (countriesRef.current) {
        ctx.beginPath()
        countriesRef.current.forEach(f => {
          if (!f.geometry) return
          if (f.geometry.type === 'Polygon')           f.geometry.coordinates.forEach(r => ringPath(r, wx, wy))
          else if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach(poly => poly.forEach(r => ringPath(r, wx, wy)))
        })
        ctx.fillStyle = '#0d2016'; ctx.fill('evenodd')
        ctx.strokeStyle = 'rgba(50,130,70,0.75)'
        ctx.lineWidth   = Math.max(0.25, 0.6 / s)
        countriesRef.current.forEach(f => {
          if (!f.geometry) return
          ctx.beginPath()
          if (f.geometry.type === 'Polygon')           f.geometry.coordinates.forEach(r => ringPath(r, wx, wy))
          else if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach(poly => poly.forEach(r => ringPath(r, wx, wy)))
          ctx.stroke()
        })
      }
      const entries = Object.entries(COUNTRIES)
      const sorted  = entries.slice().sort((a, b) => (MIN_ZOOM[a[0]] ?? 3.5) - (MIN_ZOOM[b[0]] ?? 3.5))
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const boxes = []
      sorted.forEach(([code, { name, lat, lng }]) => {
        const mz = MIN_ZOOM[code] ?? 3.5
        if (s < mz) return
        const px = wx(lng), py = wy(lat)
        if (px < -100 || px > W+100 || py < -30 || py > H+30) return
        const base = CITY_KEYS.has(code) ? 7 : 8
        const fs   = Math.min(11, base + (s - mz) * 0.9)
        if (fs < 6.5) return
        ctx.font = `500 ${fs.toFixed(1)}px monospace`
        const metrics = ctx.measureText(name)
        const lw = metrics.width + 4, lh = fs + 3
        if (overlaps(boxes, px, py, lw, lh)) return
        boxes.push({ x: px, y: py, w: lw, h: lh })
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4
        ctx.fillStyle   = CITY_KEYS.has(code) ? 'rgba(70,185,210,.75)' : 'rgba(80,210,130,.82)'
        ctx.fillText(name, px, py); ctx.shadowBlur = 0
      })
      const dotR = Math.max(0.6, 1.2 / Math.sqrt(s))
      entries.forEach(([code, { lat, lng }]) => {
        if (CITY_KEYS.has(code) && s < 6) return
        const px = wx(lng), py = wy(lat)
        if (px < 0 || px > W || py < 0 || py > H) return
        ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(0,210,100,0.40)'; ctx.fill()
      })
      arcs.slice(0, 50).forEach(arc => {
        const st = arcStates.current[arc.id]; if (!st || st.alpha <= 0) return
        const col = arc.typeColor || '#00ff88'
        const sx  = wx(arc.sourceLng), sy = wy(arc.sourceLat)
        const tx2 = wx(arc.targetLng), ty2 = wy(arc.targetLat)
        const mx  = (sx + tx2)/2, my = (sy+ty2)/2 - Math.min(H*.12, 55)
        const bez = t => ({ x:(1-t)**2*sx+2*(1-t)*t*mx+t**2*tx2, y:(1-t)**2*sy+2*(1-t)*t*my+t**2*ty2 })
        if (!st.impacted) { st.t = Math.min(st.t+spd,1); if (st.t>=1) st.impacted=true }
        else { st.ringR+=1.8; st.alpha=Math.max(0,st.alpha-.025) }
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.quadraticCurveTo(mx,my,tx2,ty2)
        ctx.strokeStyle=col+'12'; ctx.lineWidth=1; ctx.stroke()
        if (!st.impacted||st.alpha>.5) {
          const COMET=.13,tailT=Math.max(0,st.t-COMET)
          ctx.beginPath(); let mv=false
          for(let k=0;k<=20;k++){const t_=tailT+(k/20)*(st.t-tailT);const p=bez(t_);if(!mv){ctx.moveTo(p.x,p.y);mv=true}else ctx.lineTo(p.x,p.y)}
          if(mv){ctx.strokeStyle=col+'cc';ctx.lineWidth=arc.severity==='critical'?2.5:1.5;ctx.stroke()}
          const hp=bez(st.t)
          ctx.beginPath();ctx.arc(hp.x,hp.y,arc.severity==='critical'?3.5:2.5,0,Math.PI*2)
          ctx.fillStyle=col;ctx.shadowBlur=10;ctx.shadowColor=col;ctx.fill();ctx.shadowBlur=0
        }
        if(st.impacted&&st.ringR>0){
          const tp2=bez(1)
          ctx.beginPath();ctx.arc(tp2.x,tp2.y,st.ringR,0,Math.PI*2)
          ctx.strokeStyle=col+Math.round(st.alpha*160).toString(16).padStart(2,'0')
          ctx.lineWidth=1.5;ctx.stroke()
        }
      })
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(rafRef.current); ro.disconnect()
      canvas.removeEventListener('mousedown',  onDown)
      canvas.removeEventListener('mousemove',  onMove)
      canvas.removeEventListener('mouseup',    onUp)
      canvas.removeEventListener('mouseleave', onUp)
      canvas.removeEventListener('wheel',      onWheel)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove',  onMove)
      canvas.removeEventListener('touchend',   onUp)
    }
  }, [])

  const doZoom    = f => zoomAt(dimRef.current.W/2, dimRef.current.H/2, f)
  const resetZoom = ()  => { xfRef.current = { scale:1, tx:0, ty:0 } }

  return (
    <div ref={containerRef} style={{ position:'absolute', inset:0, background:'#030d07', overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%', cursor:'grab' }} />
      <div style={{ position:'absolute', bottom:58, right:12, display:'flex', flexDirection:'column', gap:4, zIndex:20 }}>
        {[{ l:'+', f:1.5 },{ l:'\u2212', f:1/1.5 },{ l:'\u2302', f:null }].map(({ l, f }) => (
          <button key={l} onClick={() => f ? doZoom(f) : resetZoom()}
            style={{ width:28, height:28, background:'rgba(0,20,10,.9)', border:'1px solid rgba(0,200,80,.4)',
              color:'#00cc66', borderRadius:4, fontFamily:'monospace', fontSize:16, cursor:'pointer',
              textAlign:'center', lineHeight:'26px', padding:0, userSelect:'none' }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ position:'absolute', bottom:58, left:12, zIndex:20, fontFamily:'monospace',
        fontSize:10, color:'rgba(0,200,80,.4)', pointerEvents:'none' }}>
        scroll/drag · pan+zoom
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3-D GLOBE
// ═══════════════════════════════════════════════════════════════════════
function ThreeGlobe({ filteredArcs, isRotating, speedLevel }) {
  const mountRef    = useRef(null)
  const refs        = useRef({})
  const speedRef    = useRef(speedLevel)
  const renderedRef = useRef(new Set())

  useEffect(() => { speedRef.current = speedLevel }, [speedLevel])

  useEffect(() => {
    const el = mountRef.current; if (!el) return
    const W = el.clientWidth || 800, H = el.clientHeight || 600

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W/H, .1, 100)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const css2d = new CSS2DRenderer()
    css2d.setSize(W, H)
    css2d.domElement.style.cssText = [
      'position:absolute','top:0','left:0',
      'width:100%','height:100%',
      'pointer-events:none','overflow:hidden',
    ].join(';')
    el.appendChild(css2d.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = .05
    controls.autoRotate      = true
    controls.autoRotateSpeed = .25
    controls.enableZoom      = true
    controls.minDistance     = 1.25
    controls.maxDistance     = 5
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }

    scene.add(new THREE.AmbientLight(0x445566, 2.5))
    const sun = new THREE.DirectionalLight(0x88aacc, .45)
    sun.position.set(4, 2, 4); scene.add(sun)

    buildStars(scene)
    buildGlobe(scene)

    // ONE atmosphere shell — unified glow + mist in a single shader
    const atmoMat = buildAtmosphere(scene)

    const labelObjects = buildLabels3D(scene)
    buildCountryBorders(scene)

    const missilesGrp = new THREE.Group()
    const trailsGrp   = new THREE.Group()
    const spikesGrp   = new THREE.Group()
    scene.add(missilesGrp, trailsGrp, spikesGrp)

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      camera.aspect = nW/nH; camera.updateProjectionMatrix()
      renderer.setSize(nW, nH); css2d.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()

    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      atmoMat.uniforms.uTime.value = clock.getElapsedTime()

      const camDist = camera.position.length()
      const camNorm = camera.position.clone().normalize()
      labelObjects.forEach(obj => {
        const ud = obj.userData
        if (camDist > ud.maxDist) { obj.visible = false; return }
        const surfDir = obj.position.clone().normalize()
        obj.visible = surfDir.dot(camNorm) > 0.1
      })

      const spd = SPD3D[speedRef.current] ?? SPD3D[1]
      missilesGrp.children.forEach(m => {
        const ud = m.userData
        if (ud.state === 'flying') {
          ud.t = Math.min(ud.t + spd, 1)
          const idx = Math.min(Math.floor(ud.t * ud.points.length), ud.points.length - 1)
          m.position.copy(ud.points[idx])
          if (ud.trail) {
            const tIdx = Math.max(0, idx - Math.floor(ud.points.length * .12))
            const vis  = ud.points.slice(tIdx, idx + 1)
            if (vis.length >= 2) ud.trail.geometry.setFromPoints(vis)
          }
          if (ud.t >= 1) {
            ud.state = 'impact'
            for (let i = 0; i < (ud.isCrit ? 5 : 3); i++) {
              const bPos = ll2v(ud.targetLat+(Math.random()-.5)*.8, ud.targetLng+(Math.random()-.5)*.8, R)
              const spk  = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([bPos.clone(), bPos.clone()]),
                new THREE.LineBasicMaterial({ color: ud.color, transparent: true, opacity: 0 })
              )
              spk.userData = { base: bPos.clone(), norm: bPos.clone().normalize(),
                maxH: .04+Math.random()*.055, age:0, delay:i*6, maxAge:150+i*20, done:false }
              spikesGrp.add(spk)
            }
          }
        } else if (ud.state === 'impact') {
          m.material.opacity = Math.max(0, m.material.opacity - .08)
          if (ud.trail) ud.trail.material.opacity = Math.max(0, ud.trail.material.opacity - .05)
          if (ud.ghost) ud.ghost.material.opacity = Math.max(0, ud.ghost.material.opacity - .02)
          if (m.material.opacity <= 0) ud.state = 'done'
        }
      })
      spikesGrp.children.forEach(spk => {
        const ud = spk.userData
        if (ud.delay > 0) { ud.delay -= 1; return }
        ud.age += 1; const t = ud.age / ud.maxAge
        let h, op
        if (t < .15)      { h=(t/.15)*ud.maxH; op=t/.15 }
        else if (t < .72) { h=ud.maxH*(1+.09*Math.sin(ud.age*.35)); op=1 }
        else              { const f=(t-.72)/.28; h=ud.maxH*(1-f*.4); op=1-f }
        spk.geometry.setFromPoints([ud.base.clone(), ud.base.clone().add(ud.norm.clone().multiplyScalar(h))])
        spk.material.opacity = Math.max(0, op)
        if (ud.age >= ud.maxAge) ud.done = true
      })
      missilesGrp.children.filter(m => m.userData.state==='done').forEach(m => {
        m.geometry.dispose(); m.material.dispose()
        if (m.userData.trail) { m.userData.trail.geometry.dispose(); m.userData.trail.material.dispose(); trailsGrp.remove(m.userData.trail) }
        if (m.userData.ghost) { m.userData.ghost.geometry.dispose(); m.userData.ghost.material.dispose(); trailsGrp.remove(m.userData.ghost) }
        missilesGrp.remove(m)
      })
      spikesGrp.children.filter(s => s.userData.done).forEach(s => { s.geometry.dispose(); s.material.dispose(); spikesGrp.remove(s) })
      if (renderedRef.current.size > 600) renderedRef.current.clear()

      renderer.render(scene, camera)
      css2d.render(scene, camera)
    }
    animate()

    refs.current = { scene, missilesGrp, trailsGrp, spikesGrp, controls, renderer, css2d, el }
    return () => {
      cancelAnimationFrame(rafId); window.removeEventListener('resize', onResize)
      controls.dispose(); renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
      if (el.contains(css2d.domElement))    el.removeChild(css2d.domElement)
    }
  }, [])

  useEffect(() => { const { controls } = refs.current; if (controls) controls.autoRotate = isRotating }, [isRotating])

  useEffect(() => {
    const { missilesGrp, trailsGrp } = refs.current; if (!missilesGrp) return
    filteredArcs.slice(0, 60).forEach(arc => {
      if (renderedRef.current.has(arc.id)) return
      renderedRef.current.add(arc.id)
      const pts    = arcPoints(arc)
      const col    = new THREE.Color(arc.typeColor || '#00ff88')
      const isCrit = arc.severity === 'critical'
      const ghost  = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color:col, transparent:true, opacity:.06 }))
      const trail  = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pts[0].clone(),pts[0].clone()]), new THREE.LineBasicMaterial({ color:col, transparent:true, opacity:isCrit?.95:.72 }))
      const missile = new THREE.Mesh(new THREE.SphereGeometry(isCrit?.013:.009,6,6), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:1 }))
      missile.position.copy(pts[0])
      missile.userData = { points:pts, t:0, state:'flying', color:col, isCrit,
        targetPos:pts[pts.length-1].clone(), targetLat:arc.targetLat, targetLng:arc.targetLng, trail, ghost }
      trailsGrp.add(ghost); trailsGrp.add(trail); missilesGrp.add(missile)
    })
  }, [filteredArcs])

  return <div ref={mountRef} style={{ position:'relative', width:'100%', height:'100%' }} />
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════
export default function GlobeView() {
  const { globeView, heatmapActive, attacks, isRotating, speedLevel, selectedTypes, selectedSeverities } = useStore()
  const [webglOk] = useState(() => {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl'))) } catch { return false }
  })
  const filteredArcs = attacks
    .filter(a => selectedTypes.includes(a.type) && selectedSeverities.includes(a.severity))
    .slice(0, 60)

  if (globeView === 'flat' || !webglOk) return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <FlatMapView filteredArcs={filteredArcs} speedLevel={speedLevel} />
      {!webglOk && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-3 py-1.5 rounded-lg">WebGL unavailable</div>}
    </div>
  )

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', background:'#000' }}>
      <ThreeGlobe filteredArcs={filteredArcs} isRotating={isRotating} speedLevel={speedLevel} />
      {heatmapActive && <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 35% 45%,rgba(0,60,200,.05) 0%,transparent 55%),radial-gradient(ellipse at 65% 55%,rgba(100,0,200,.04) 0%,transparent 50%)' }} />}
    </div>
  )
}
