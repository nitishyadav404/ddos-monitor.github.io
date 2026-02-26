/**
 * GlobeView.jsx
 *
 * 3D Globe:
 *   - Zoom-aware label tiers (small countries + cities appear on zoom)
 *   - Labels back-face culled (hidden when on back of globe)
 *
 * 2D Flat Map:
 *   - NO grid lines (clean dark ocean look)
 *   - Filled country polygons from world-atlas topojson
 *   - ALL countries labeled from COUNTRIES constant
 *   - Zoom-aware font sizing (bigger = more labels visible)
 *   - Pan (drag) + zoom (wheel / pinch / buttons)
 */
import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useStore from '../../store/useStore.js'
import { COUNTRIES } from '../../utils/constants.js'

const R        = 1.0
const SEGMENTS = 80
const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

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

// ── 3D label tiers ─────────────────────────────────────────────────────
// tier 0 = always visible, tier 3 = only when very zoomed in
const LABELS_3D = [
  // Tier 0 — always
  { name:'USA',         lat:38,    lng:-97,   tier:0 },
  { name:'CANADA',      lat:57,    lng:-96,   tier:0 },
  { name:'BRAZIL',      lat:-10,   lng:-53,   tier:0 },
  { name:'RUSSIA',      lat:62,    lng:100,   tier:0 },
  { name:'CHINA',       lat:35,    lng:103,   tier:0 },
  { name:'INDIA',       lat:22,    lng:78,    tier:0 },
  { name:'AUSTRALIA',   lat:-25,   lng:133,   tier:0 },
  { name:'UK',          lat:54,    lng:-2,    tier:0 },
  { name:'GERMANY',     lat:51,    lng:10,    tier:0 },
  { name:'FRANCE',      lat:46,    lng:2,     tier:0 },
  { name:'JAPAN',       lat:36,    lng:138,   tier:0 },
  // Tier 1 — slight zoom
  { name:'S.KOREA',     lat:36,    lng:128,   tier:1 },
  { name:'NIGERIA',     lat:9,     lng:8,     tier:1 },
  { name:'S.AFRICA',    lat:-29,   lng:25,    tier:1 },
  { name:'MEXICO',      lat:24,    lng:-102,  tier:1 },
  { name:'ARGENTINA',   lat:-35,   lng:-65,   tier:1 },
  { name:'UKRAINE',     lat:49,    lng:32,    tier:1 },
  { name:'IRAN',        lat:32,    lng:53,    tier:1 },
  { name:'TURKEY',      lat:39,    lng:35,    tier:1 },
  { name:'SAUDI ARABIA',lat:24,    lng:45,    tier:1 },
  { name:'EGYPT',       lat:27,    lng:30,    tier:1 },
  { name:'SPAIN',       lat:40,    lng:-4,    tier:1 },
  { name:'ITALY',       lat:42,    lng:13,    tier:1 },
  { name:'POLAND',      lat:52,    lng:20,    tier:1 },
  { name:'VIETNAM',     lat:16,    lng:108,   tier:1 },
  { name:'PAKISTAN',    lat:30,    lng:69,    tier:1 },
  { name:'INDONESIA',   lat:-5,    lng:117,   tier:1 },
  { name:'KAZAKHSTAN',  lat:48,    lng:67,    tier:1 },
  { name:'ALGERIA',     lat:28,    lng:2,     tier:1 },
  { name:'DR CONGO',    lat:-4,    lng:22,    tier:1 },
  { name:'SUDAN',       lat:15,    lng:30,    tier:1 },
  // Tier 2 — zoomed in
  { name:'NEPAL',       lat:28,    lng:84,    tier:2 },
  { name:'CUBA',        lat:22,    lng:-79,   tier:2 },
  { name:'PORTUGAL',    lat:39.5,  lng:-8,    tier:2 },
  { name:'NETHERLANDS', lat:52.3,  lng:5.3,   tier:2 },
  { name:'BELGIUM',     lat:50.5,  lng:4.5,   tier:2 },
  { name:'SWITZERLAND', lat:47,    lng:8.2,   tier:2 },
  { name:'AUSTRIA',     lat:47.5,  lng:14.5,  tier:2 },
  { name:'SWEDEN',      lat:61,    lng:15,    tier:2 },
  { name:'NORWAY',      lat:64,    lng:14,    tier:2 },
  { name:'FINLAND',     lat:64,    lng:26,    tier:2 },
  { name:'DENMARK',     lat:56,    lng:10,    tier:2 },
  { name:'GREECE',      lat:39,    lng:22,    tier:2 },
  { name:'CZECHIA',     lat:50,    lng:15.5,  tier:2 },
  { name:'ROMANIA',     lat:46,    lng:25,    tier:2 },
  { name:'HUNGARY',     lat:47,    lng:19,    tier:2 },
  { name:'ISRAEL',      lat:31.5,  lng:35,    tier:2 },
  { name:'BANGLADESH',  lat:23.7,  lng:90.4,  tier:2 },
  { name:'SRI LANKA',   lat:7.9,   lng:80.7,  tier:2 },
  { name:'MYANMAR',     lat:19,    lng:97,    tier:2 },
  { name:'KENYA',       lat:-1,    lng:37,    tier:2 },
  { name:'ETHIOPIA',    lat:9,     lng:40,    tier:2 },
  { name:'GHANA',       lat:8,     lng:-1,    tier:2 },
  { name:'TANZANIA',    lat:-6,    lng:35,    tier:2 },
  { name:'PERU',        lat:-10,   lng:-75,   tier:2 },
  { name:'CHILE',       lat:-35,   lng:-71,   tier:2 },
  { name:'VENEZUELA',   lat:8,     lng:-66,   tier:2 },
  { name:'N.KOREA',     lat:40,    lng:127,   tier:2 },
  { name:'TAIWAN',      lat:23.7,  lng:121,   tier:2 },
  { name:'PHILIPPINES', lat:13,    lng:122,   tier:2 },
  { name:'NEW ZEALAND', lat:-42,   lng:172,   tier:2 },
  { name:'SINGAPORE',   lat:1.35,  lng:103.8, tier:2 },
  { name:'MALAYSIA',    lat:4,     lng:109,   tier:2 },
  { name:'THAILAND',    lat:15,    lng:101,   tier:2 },
  { name:'MOROCCO',     lat:31.8,  lng:-7,    tier:2 },
  { name:'ANGOLA',      lat:-11.2, lng:17.9,  tier:2 },
  { name:'MOZAMBIQUE',  lat:-18.7, lng:35.5,  tier:2 },
  { name:'MADAGASCAR',  lat:-18.8, lng:46.9,  tier:2 },
  { name:'IRAQ',        lat:33.2,  lng:43.7,  tier:2 },
  { name:'SYRIA',       lat:34.8,  lng:39,    tier:2 },
  { name:'AFGHANISTAN', lat:33.9,  lng:67.7,  tier:2 },
  { name:'UZBEKISTAN',  lat:41.4,  lng:64.6,  tier:2 },
  { name:'COLOMBIA',    lat:4,     lng:-74,   tier:2 },
  // Tier 3 — city-level zoom
  { name:'New York',    lat:40.71,  lng:-74.01, tier:3 },
  { name:'Los Angeles', lat:34.05,  lng:-118.2, tier:3 },
  { name:'London',      lat:51.51,  lng:-0.12,  tier:3 },
  { name:'Paris',       lat:48.86,  lng:2.35,   tier:3 },
  { name:'Berlin',      lat:52.52,  lng:13.4,   tier:3 },
  { name:'Moscow',      lat:55.75,  lng:37.62,  tier:3 },
  { name:'Beijing',     lat:39.91,  lng:116.4,  tier:3 },
  { name:'Shanghai',    lat:31.23,  lng:121.47, tier:3 },
  { name:'Tokyo',       lat:35.69,  lng:139.69, tier:3 },
  { name:'Mumbai',      lat:19.08,  lng:72.88,  tier:3 },
  { name:'Delhi',       lat:28.61,  lng:77.21,  tier:3 },
  { name:'Karachi',     lat:24.86,  lng:67.01,  tier:3 },
  { name:'Jakarta',     lat:-6.2,   lng:106.8,  tier:3 },
  { name:'São Paulo',   lat:-23.55, lng:-46.63, tier:3 },
  { name:'Mexico City', lat:19.43,  lng:-99.13, tier:3 },
  { name:'Kathmandu',   lat:27.71,  lng:85.31,  tier:3 },
  { name:'Havana',      lat:23.13,  lng:-82.38, tier:3 },
  { name:'Islamabad',   lat:33.72,  lng:73.04,  tier:3 },
  { name:'Kyiv',        lat:50.45,  lng:30.52,  tier:3 },
  { name:'Tel Aviv',    lat:32.08,  lng:34.78,  tier:3 },
  { name:'Bangkok',     lat:13.75,  lng:100.52, tier:3 },
  { name:'Singapore',   lat:1.29,   lng:103.85, tier:3 },
  { name:'Taipei',      lat:25.03,  lng:121.56, tier:3 },
  { name:'Hong Kong',   lat:22.32,  lng:114.17, tier:3 },
  { name:'Amsterdam',   lat:52.37,  lng:4.90,   tier:3 },
  { name:'Warsaw',      lat:52.23,  lng:21.01,  tier:3 },
  { name:'Chicago',     lat:41.88,  lng:-87.63, tier:3 },
  { name:'Toronto',     lat:43.65,  lng:-79.38, tier:3 },
  { name:'Dubai',       lat:25.20,  lng:55.27,  tier:3 },
  { name:'Sydney',      lat:-33.87, lng:151.21, tier:3 },
  { name:'Cairo',       lat:30.06,  lng:31.25,  tier:3 },
  { name:'Lagos',       lat:6.52,   lng:3.38,   tier:3 },
  { name:'Seoul',       lat:37.57,  lng:126.98, tier:3 },
  { name:'Nairobi',     lat:-1.29,  lng:36.82,  tier:3 },
  { name:'Frankfurt',   lat:50.11,  lng:8.68,   tier:3 },
]

const TIER_MAX_DIST = [Infinity, 2.2, 1.75, 1.35]

// ── Shared topo cache ──────────────────────────────────────────────────
let _topoCache = null
async function getTopoFeatures() {
  if (_topoCache) return _topoCache
  const res   = await fetch(TOPO_URL)
  const world = await res.json()
  _topoCache  = topojson.feature(world, world.objects.countries).features
  return _topoCache
}

// ── 3D helpers ─────────────────────────────────────────────────────────
function buildStars(scene) {
  const N = 8000, pos = new Float32Array(N*3), sz = new Float32Array(N)
  for (let i=0;i<N;i++) {
    const t=2*Math.PI*Math.random(),p=Math.acos(2*Math.random()-1),r=14+Math.random()*36
    pos[i*3]=r*Math.sin(p)*Math.cos(t);pos[i*3+1]=r*Math.sin(p)*Math.sin(t);pos[i*3+2]=r*Math.cos(p)
    sz[i]=Math.random()<.07?2.0:Math.random()<.2?1.1:.5
  }
  const g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3))
  g.setAttribute('aSize',new THREE.Float32BufferAttribute(sz,1))
  scene.add(new THREE.Points(g,new THREE.ShaderMaterial({
    vertexShader:`attribute float aSize;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*(280./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=1.-smoothstep(0.,1.,d);gl_FragColor=vec4(1.,1.,1.,a*.82);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
  })))
}

function buildGlobe(scene) {
  const L=new THREE.TextureLoader()
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R,64,64),
    new THREE.MeshPhongMaterial({
      map:        L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-dark.jpg'),
      specularMap:L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-water.png'),
      bumpMap:    L.load('https://unpkg.com/three-globe@2.27.3/example/img/earth-topology.png'),
      bumpScale:.010,specular:new THREE.Color(0x1a3344),shininess:6,
    }),
  ))
}

async function buildCountryBorders(scene) {
  try {
    const features=await getTopoFeatures()
    const mat=new THREE.LineBasicMaterial({color:0x3a6045,transparent:true,opacity:.70})
    features.forEach(f=>{
      if(!f.geometry) return
      const drawRing=ring=>{
        if(ring.length<2) return
        const pts=ring.map(([lng,lat])=>ll2v(lat,lng,R+.0015))
        if(!pts[0].equals(pts[pts.length-1])) pts.push(pts[0].clone())
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mat))
      }
      if(f.geometry.type==='Polygon') f.geometry.coordinates.forEach(drawRing)
      else if(f.geometry.type==='MultiPolygon') f.geometry.coordinates.forEach(p=>p.forEach(drawRing))
    })
  } catch(e){console.warn('3D borders:',e)}
}

function buildAtmosphere(scene) {
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(R*1.012,64,64),
    new THREE.ShaderMaterial({
      uniforms:{c:{value:new THREE.Color(0x33dd66)}},
      vertexShader:`varying float vI;void main(){vec3 n=normalize(normalMatrix*normal);vec3 v=normalize(-(modelViewMatrix*vec4(position,1.)).xyz);vI=pow(max(0.,1.-dot(n,v)),5.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform vec3 c;varying float vI;void main(){gl_FragColor=vec4(c,vI*.18);}`,
      side:THREE.FrontSide,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,
    }),
  ))
}

function buildLabels3D(scene) {
  const makeSprite=(name,lat,lng,tier)=>{
    const fSize=tier<=1?12:10
    const W=tier<=1?180:150,H=26
    const cv=Object.assign(document.createElement('canvas'),{width:W,height:H})
    const cx=cv.getContext('2d')
    cx.font=`bold ${fSize}px monospace`
    cx.textAlign='center';cx.textBaseline='middle'
    const col=['rgba(150,255,160,.85)','rgba(100,200,130,.75)','rgba(60,200,180,.70)','rgba(50,170,200,.65)'][tier]
    cx.shadowColor=tier<=1?'#00ff88':'#00ccbb';cx.shadowBlur=tier<=1?4:2
    cx.fillStyle=col
    cx.fillText(tier>=2?`· ${name}`:name,W/2,H/2)
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}))
    spr.position.copy(ll2v(lat,lng,R+.055))
    const sc=[.38,.32,.24,.20][tier]
    spr.scale.set(sc,sc*(H/W),1)
    spr.userData={tier,maxDist:TIER_MAX_DIST[tier]}
    spr.visible=tier===0
    scene.add(spr)
    return spr
  }
  return LABELS_3D.map(l=>makeSprite(l.name,l.lat,l.lng,l.tier))
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
  const xfRef           = useRef({ scale:1, tx:0, ty:0 })
  const dragRef         = useRef(null)
  const pinchRef        = useRef(null)
  const dimRef          = useRef({ W:0, H:0 })

  useEffect(()=>{speedRef.current=speedLevel},[speedLevel])
  useEffect(()=>{filteredArcsRef.current=filteredArcs},[filteredArcs])
  useEffect(()=>{ getTopoFeatures().then(f=>{countriesRef.current=f}).catch(console.warn) },[])

  const clampXf=(xf,W,H)=>{
    const s=Math.max(1,Math.min(14,xf.scale))
    return{scale:s,tx:Math.max(-(W*(s-1)),Math.min(0,xf.tx)),ty:Math.max(-(H*(s-1)),Math.min(0,xf.ty))}
  }
  const zoomAt=(cx,cy,factor)=>{
    const {W,H}=dimRef.current
    const xf=xfRef.current
    const ns=Math.max(1,Math.min(14,xf.scale*factor))
    const r=ns/xf.scale
    xfRef.current=clampXf({scale:ns,tx:cx-r*(cx-xf.tx),ty:cy-r*(cy-xf.ty)},W,H)
  }

  useEffect(()=>{
    const container=containerRef.current,canvas=canvasRef.current
    if(!container||!canvas) return
    const ctx=canvas.getContext('2d')

    const setSize=()=>{
      const r=container.getBoundingClientRect()
      const nw=Math.floor(r.width)||800,nh=Math.floor(r.height)||600
      const {W,H}=dimRef.current
      if(nw===W&&nh===H) return
      dimRef.current={W:nw,H:nh}
      canvas.width=nw;canvas.height=nh
      xfRef.current=clampXf(xfRef.current,nw,nh)
    }
    setTimeout(setSize,0)
    const ro=new ResizeObserver(setSize);ro.observe(container)

    // ── Pointer handlers ─────────────────────────
    const getXY=e=>e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY}
    const rect=()=>canvas.getBoundingClientRect()

    const onDown=e=>{
      if(e.touches?.length===2){
        const dx=e.touches[0].clientX-e.touches[1].clientX
        const dy=e.touches[0].clientY-e.touches[1].clientY
        pinchRef.current={dist0:Math.hypot(dx,dy),scale0:xfRef.current.scale,
          cx:(e.touches[0].clientX+e.touches[1].clientX)/2-rect().left,
          cy:(e.touches[0].clientY+e.touches[1].clientY)/2-rect().top}
        return
      }
      const {x,y}=getXY(e)
      dragRef.current={sx:x,sy:y,tx0:xfRef.current.tx,ty0:xfRef.current.ty}
    }
    const onMove=e=>{
      e.preventDefault()
      if(e.touches?.length===2&&pinchRef.current){
        const dx=e.touches[0].clientX-e.touches[1].clientX
        const dy=e.touches[0].clientY-e.touches[1].clientY
        const dist=Math.hypot(dx,dy)
        const {W,H}=dimRef.current
        const f=dist/pinchRef.current.dist0
        const ns=Math.max(1,Math.min(14,pinchRef.current.scale0*f))
        const r=ns/pinchRef.current.scale0
        xfRef.current=clampXf({scale:ns,
          tx:pinchRef.current.cx-r*(pinchRef.current.cx-xfRef.current.tx),
          ty:pinchRef.current.cy-r*(pinchRef.current.cy-xfRef.current.ty)},W,H)
        return
      }
      if(!dragRef.current)return
      const{x,y}=getXY(e)
      const{W,H}=dimRef.current
      xfRef.current=clampXf({...xfRef.current,
        tx:dragRef.current.tx0+(x-dragRef.current.sx),
        ty:dragRef.current.ty0+(y-dragRef.current.sy)},W,H)
    }
    const onUp=()=>{dragRef.current=null;pinchRef.current=null}
    const onWheel=e=>{
      e.preventDefault()
      const r2=rect()
      zoomAt(e.clientX-r2.left,e.clientY-r2.top,e.deltaY<0?1.18:1/1.18)
    }
    canvas.addEventListener('mousedown',onDown)
    canvas.addEventListener('mousemove',onMove)
    canvas.addEventListener('mouseup',onUp)
    canvas.addEventListener('mouseleave',onUp)
    canvas.addEventListener('wheel',onWheel,{passive:false})
    canvas.addEventListener('touchstart',onDown,{passive:true})
    canvas.addEventListener('touchmove',onMove,{passive:false})
    canvas.addEventListener('touchend',onUp)

    // ── Draw loop ─────────────────────────────────
    const draw=()=>{
      const{W,H}=dimRef.current
      if(!W||!H){rafRef.current=requestAnimationFrame(draw);return}
      const spd=SPD2D[speedRef.current]??SPD2D[1]
      const arcs=filteredArcsRef.current
      const{scale:s,tx,ty}=xfRef.current

      // World → canvas
      const wx=lng=>((lng+180)/360)*W*s+tx
      const wy=lat=>((90-lat)/180)*H*s+ty

      // Sync arc states
      const ids=new Set(arcs.map(a=>a.id))
      Object.keys(arcStates.current).forEach(id=>{if(!ids.has(id))delete arcStates.current[id]})
      arcs.forEach(arc=>{if(!arcStates.current[arc.id])arcStates.current[arc.id]={t:0,impacted:false,alpha:1,ringR:0}})

      // ── Background: deep dark ocean, NO grid lines ──
      ctx.fillStyle='#030d07'
      ctx.fillRect(0,0,W,H)

      // ── Country polygons ──────────────────────────
      if(countriesRef.current){
        // One combined path for all fills (fast)
        ctx.beginPath()
        countriesRef.current.forEach(f=>{
          if(!f.geometry)return
          const drawRing=ring=>{
            let first=true
            ring.forEach(([lng,lat])=>{
              const px=wx(lng),py=wy(lat)
              if(first){ctx.moveTo(px,py);first=false}else ctx.lineTo(px,py)
            })
            ctx.closePath()
          }
          if(f.geometry.type==='Polygon') f.geometry.coordinates.forEach(drawRing)
          else if(f.geometry.type==='MultiPolygon') f.geometry.coordinates.forEach(p=>p.forEach(drawRing))
        })
        ctx.fillStyle='#0d2016'
        ctx.fill('evenodd')

        // Border lines — separate pass so they render on top of fill
        ctx.strokeStyle='rgba(50,130,70,0.75)'
        ctx.lineWidth=Math.max(0.25,0.6/s)
        ctx.beginPath()
        countriesRef.current.forEach(f=>{
          if(!f.geometry)return
          const drawRing=ring=>{
            let first=true
            ring.forEach(([lng,lat])=>{
              const px=wx(lng),py=wy(lat)
              if(first){ctx.moveTo(px,py);first=false}else ctx.lineTo(px,py)
            })
            ctx.closePath()
          }
          if(f.geometry.type==='Polygon') f.geometry.coordinates.forEach(drawRing)
          else if(f.geometry.type==='MultiPolygon') f.geometry.coordinates.forEach(p=>p.forEach(drawRing))
        })
        ctx.stroke()
      }

      // ── Country labels (ALL countries from COUNTRIES constant) ──
      // Show all countries at zoom≥1, cities only at zoom≥3
      const entries=Object.values(COUNTRIES)
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowBlur=0
      entries.forEach(({name,lat,lng})=>{
        const px=wx(lng),py=wy(lat)
        if(px<-60||px>W+60||py<-30||py>H+30)return  // cull offscreen

        // Decide if this is a city entry (has City/City-level coord)
        // Cities are the 3-letter codes at bottom of COUNTRIES — show only at s>=3
        const isCity=name.length>12||name.includes('City')||name.includes('São')||
          name.includes('Nairobi')||name.includes('Jakarta')||name.includes('Karachi')||
          name.includes('Frankfurt')||name.includes('Addis')||name.includes('Heathrow')
        if(isCity&&s<3)return

        const fs=Math.max(8,Math.min(13,8+s*1.2))
        ctx.font=`bold ${fs}px monospace`
        // Subtle shadow for readability
        ctx.shadowColor='#000'
        ctx.shadowBlur=3
        ctx.fillStyle=isCity?'rgba(80,190,200,.70)':'rgba(90,210,130,.80)'
        ctx.fillText(name,px,py)
        ctx.shadowBlur=0
      })

      // Small dot at each country centroid
      entries.forEach(({lat,lng})=>{
        const px=wx(lng),py=wy(lat)
        if(px<0||px>W||py<0||py>H)return
        ctx.beginPath()
        ctx.arc(px,py,Math.max(0.8,1.4/Math.sqrt(s)),0,Math.PI*2)
        ctx.fillStyle='rgba(0,220,110,0.45)'
        ctx.fill()
      })

      // ── Missiles ──────────────────────────────────
      arcs.slice(0,50).forEach(arc=>{
        const st=arcStates.current[arc.id];if(!st||st.alpha<=0)return
        const col=arc.typeColor||'#00ff88'
        const sx=wx(arc.sourceLng),sy=wy(arc.sourceLat)
        const txp=wx(arc.targetLng),typ=wy(arc.targetLat)
        const mx=(sx+txp)/2,my=(sy+typ)/2-Math.min(H*.12,55)
        const bez=t=>({x:(1-t)**2*sx+2*(1-t)*t*mx+t**2*txp,y:(1-t)**2*sy+2*(1-t)*t*my+t**2*typ})

        if(!st.impacted){st.t=Math.min(st.t+spd,1);if(st.t>=1)st.impacted=true}
        else{st.ringR+=1.8;st.alpha=Math.max(0,st.alpha-.025)}

        // Ghost arc
        ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(mx,my,txp,typ)
        ctx.strokeStyle=col+'12';ctx.lineWidth=1;ctx.stroke()

        // Comet
        if(!st.impacted||st.alpha>.5){
          const COMET=.13,tailT=Math.max(0,st.t-COMET)
          ctx.beginPath();let mv=false
          for(let k=0;k<=20;k++){
            const t_=tailT+(k/20)*(st.t-tailT);const p=bez(t_)
            if(!mv){ctx.moveTo(p.x,p.y);mv=true}else ctx.lineTo(p.x,p.y)
          }
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

      rafRef.current=requestAnimationFrame(draw)
    }
    draw()
    return()=>{
      cancelAnimationFrame(rafRef.current);ro.disconnect()
      canvas.removeEventListener('mousedown',onDown)
      canvas.removeEventListener('mousemove',onMove)
      canvas.removeEventListener('mouseup',onUp)
      canvas.removeEventListener('mouseleave',onUp)
      canvas.removeEventListener('wheel',onWheel)
      canvas.removeEventListener('touchstart',onDown)
      canvas.removeEventListener('touchmove',onMove)
      canvas.removeEventListener('touchend',onUp)
    }
  },[])

  const doZoom=f=>zoomAt(dimRef.current.W/2,dimRef.current.H/2,f)
  const resetZoom=()=>{xfRef.current={scale:1,tx:0,ty:0}}

  return(
    <div ref={containerRef} style={{position:'absolute',inset:0,background:'#030d07',overflow:'hidden'}}>
      <canvas ref={canvasRef} style={{display:'block',width:'100%',height:'100%',cursor:'grab'}} />
      {/* Zoom buttons */}
      <div style={{position:'absolute',bottom:58,right:12,display:'flex',flexDirection:'column',gap:4,zIndex:20}}>
        {[{l:'+',f:1.5},{l:'−',f:1/1.5},{l:'⌂',f:null}].map(({l,f})=>(
          <button key={l} onClick={()=>f?doZoom(f):resetZoom()}
            style={{width:28,height:28,background:'rgba(0,20,10,.9)',border:'1px solid rgba(0,200,80,.4)',
              color:'#00cc66',borderRadius:4,fontFamily:'monospace',fontSize:16,cursor:'pointer',
              textAlign:'center',lineHeight:'26px',padding:0,userSelect:'none'}}>
            {l}
          </button>
        ))}
      </div>
      <div style={{position:'absolute',bottom:58,left:12,zIndex:20,fontFamily:'monospace',
        fontSize:10,color:'rgba(0,200,80,.4)',pointerEvents:'none'}}>
        scroll/drag · pan+zoom
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 3-D GLOBE
// ═══════════════════════════════════════════════════════════════════════
function ThreeGlobe({filteredArcs,isRotating,speedLevel}){
  const mountRef=useRef(null)
  const refs=useRef({})
  const speedRef=useRef(speedLevel)
  const renderedRef=useRef(new Set())

  useEffect(()=>{speedRef.current=speedLevel},[speedLevel])

  useEffect(()=>{
    const el=mountRef.current;if(!el)return
    const W=el.clientWidth||800,H=el.clientHeight||600
    const scene=new THREE.Scene()
    const camera=new THREE.PerspectiveCamera(45,W/H,.1,100)
    camera.position.z=2.5
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})
    renderer.setSize(W,H);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    el.appendChild(renderer.domElement)
    const controls=new OrbitControls(camera,renderer.domElement)
    controls.enableDamping=true;controls.dampingFactor=.05
    controls.autoRotate=true;controls.autoRotateSpeed=.25
    controls.enableZoom=true;controls.minDistance=1.25;controls.maxDistance=5
    controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE}

    scene.add(new THREE.AmbientLight(0x445566,2.5))
    const sun=new THREE.DirectionalLight(0x88aacc,.45);sun.position.set(4,2,4);scene.add(sun)

    buildStars(scene)
    buildGlobe(scene)
    buildAtmosphere(scene)
    const labelSprites=buildLabels3D(scene)
    buildCountryBorders(scene)

    const missilesGrp=new THREE.Group(),trailsGrp=new THREE.Group(),spikesGrp=new THREE.Group()
    scene.add(missilesGrp,trailsGrp,spikesGrp)

    const onResize=()=>{
      camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth,el.clientHeight)
    }
    window.addEventListener('resize',onResize)

    let rafId
    const animate=()=>{
      rafId=requestAnimationFrame(animate);controls.update()
      const spd=SPD3D[speedRef.current]??SPD3D[1]
      const camDist=camera.position.length()
      const camDir=camera.position.clone().normalize()

      // Update label visibility
      labelSprites.forEach(spr=>{
        spr.visible=camDist<=spr.userData.maxDist&&
          spr.position.clone().normalize().dot(camDir)>0.08
      })

      missilesGrp.children.forEach(m=>{
        const ud=m.userData
        if(ud.state==='flying'){
          ud.t=Math.min(ud.t+spd,1)
          const idx=Math.min(Math.floor(ud.t*ud.points.length),ud.points.length-1)
          m.position.copy(ud.points[idx])
          if(ud.trail){
            const tIdx=Math.max(0,idx-Math.floor(ud.points.length*.12))
            const vis=ud.points.slice(tIdx,idx+1)
            if(vis.length>=2)ud.trail.geometry.setFromPoints(vis)
          }
          if(ud.t>=1){
            ud.state='impact'
            const ns=ud.isCrit?5:3
            for(let i=0;i<ns;i++){
              const bPos=ll2v(ud.targetLat+(Math.random()-.5)*.8,ud.targetLng+(Math.random()-.5)*.8,R)
              const spk=new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([bPos.clone(),bPos.clone()]),
                new THREE.LineBasicMaterial({color:ud.color,transparent:true,opacity:0})
              )
              spk.userData={base:bPos.clone(),norm:bPos.clone().normalize(),
                maxH:.04+Math.random()*.055,age:0,delay:i*6,maxAge:150+i*20,done:false}
              spikesGrp.add(spk)
            }
          }
        } else if(ud.state==='impact'){
          m.material.opacity=Math.max(0,m.material.opacity-.08)
          if(ud.trail)ud.trail.material.opacity=Math.max(0,ud.trail.material.opacity-.05)
          if(ud.ghost)ud.ghost.material.opacity=Math.max(0,ud.ghost.material.opacity-.02)
          if(m.material.opacity<=0)ud.state='done'
        }
      })

      spikesGrp.children.forEach(spk=>{
        const ud=spk.userData
        if(ud.delay>0){ud.delay-=1;return}
        ud.age+=1;const t=ud.age/ud.maxAge
        let h,op
        if(t<.15){h=(t/.15)*ud.maxH;op=t/.15}
        else if(t<.72){h=ud.maxH*(1+.09*Math.sin(ud.age*.35));op=1}
        else{const f=(t-.72)/.28;h=ud.maxH*(1-f*.4);op=1-f}
        spk.geometry.setFromPoints([ud.base.clone(),ud.base.clone().add(ud.norm.clone().multiplyScalar(h))])
        spk.material.opacity=Math.max(0,op)
        if(ud.age>=ud.maxAge)ud.done=true
      })

      missilesGrp.children.filter(m=>m.userData.state==='done').forEach(m=>{
        m.geometry.dispose();m.material.dispose()
        if(m.userData.trail){m.userData.trail.geometry.dispose();m.userData.trail.material.dispose();trailsGrp.remove(m.userData.trail)}
        if(m.userData.ghost){m.userData.ghost.geometry.dispose();m.userData.ghost.material.dispose();trailsGrp.remove(m.userData.ghost)}
        missilesGrp.remove(m)
      })
      spikesGrp.children.filter(s=>s.userData.done).forEach(s=>{s.geometry.dispose();s.material.dispose();spikesGrp.remove(s)})

      if(renderedRef.current.size>600)renderedRef.current.clear()
      renderer.render(scene,camera)
    }
    animate()

    refs.current={scene,missilesGrp,trailsGrp,spikesGrp,controls,renderer,el}
    return()=>{
      cancelAnimationFrame(rafId);window.removeEventListener('resize',onResize)
      controls.dispose();renderer.dispose()
      if(el.contains(renderer.domElement))el.removeChild(renderer.domElement)
    }
  },[])

  useEffect(()=>{const{controls}=refs.current;if(controls)controls.autoRotate=isRotating},[isRotating])

  useEffect(()=>{
    const{missilesGrp,trailsGrp}=refs.current;if(!missilesGrp)return
    filteredArcs.slice(0,60).forEach(arc=>{
      if(renderedRef.current.has(arc.id))return
      renderedRef.current.add(arc.id)
      const pts=arcPoints(arc),col=new THREE.Color(arc.typeColor||'#00ff88'),isCrit=arc.severity==='critical'
      const ghost=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.06}))
      const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([pts[0].clone(),pts[0].clone()]),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:isCrit?.95:.72}))
      const missile=new THREE.Mesh(new THREE.SphereGeometry(isCrit?.013:.009,6,6),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1}))
      missile.position.copy(pts[0])
      missile.userData={points:pts,t:0,state:'flying',color:col,isCrit,
        targetPos:pts[pts.length-1].clone(),targetLat:arc.targetLat,targetLng:arc.targetLng,trail,ghost}
      trailsGrp.add(ghost);trailsGrp.add(trail);missilesGrp.add(missile)
    })
  },[filteredArcs])

  return <div ref={mountRef} style={{width:'100%',height:'100%'}} />
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════
export default function GlobeView(){
  const{globeView,heatmapActive,attacks,isRotating,speedLevel,selectedTypes,selectedSeverities}=useStore()
  const[webglOk]=useState(()=>{
    try{const c=document.createElement('canvas');return!!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch{return false}
  })
  const filteredArcs=attacks
    .filter(a=>selectedTypes.includes(a.type)&&selectedSeverities.includes(a.severity))
    .slice(0,60)

  if(globeView==='flat'||!webglOk)return(
    <div style={{position:'relative',width:'100%',height:'100%'}}>
      <FlatMapView filteredArcs={filteredArcs} speedLevel={speedLevel}/>
      {!webglOk&&<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-3 py-1.5 rounded-lg">WebGL unavailable</div>}
    </div>
  )

  return(
    <div style={{position:'relative',width:'100%',height:'100%',background:'#000'}}>
      <ThreeGlobe filteredArcs={filteredArcs} isRotating={isRotating} speedLevel={speedLevel}/>
      {heatmapActive&&<div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 35% 45%,rgba(0,60,200,.05) 0%,transparent 55%),radial-gradient(ellipse at 65% 55%,rgba(100,0,200,.04) 0%,transparent 50%)'}}/>}
    </div>
  )
}
