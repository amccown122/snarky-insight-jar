document.addEventListener("DOMContentLoaded", () => {
  const CATEGORY_LIST = [
    { name: "Nonsense Request Coin", color: "#a855f7" },
    { name: "It’s Not the Data Coin", color: "#f59e0b" },
    { name: "Magic Wand Coin", color: "#8b5cf6" },
    { name: "Chaos Coin", color: "#ef4444" },
    { name: "Shrug it off Coin", color: "#64748b" },
    { name: "Click Support Coin", color: "#3b82f6" }
  ];
  const STORAGE_KEY = "snarky-jar-entries-v1";
  const $ = (s,d=document)=>d.querySelector(s);
  const canvas = $("#jarCanvas"); const ctx = canvas.getContext("2d");
  const listEl=$("#list"), countEl=$("#count");

  // Prefer the newly provided cropped external assets (guarded)
  try {
    const safeSwap = (selector, url) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const probe = new Image();
      probe.decoding = 'async';
      probe.onload = () => {
        // Only swap if external asset loaded successfully (dims available)
        if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
          el.decoding = 'async';
          // Preserve existing size/position; just change the source
          el.src = url;
        }
      };
      probe.onerror = () => { /* keep embedded fallback */ };
      probe.src = url;
    };
    safeSwap('.jar-inside', 'assets/jar-inside2.png');
    safeSwap('.tape-art', 'assets/tape-art2.png');
  } catch {}

  function load(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch(e){ return []; } }
  function save(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
  let entries = load();

  // Track coins that are currently animating so we don't draw their static version.
  const inFlight = new Set();
  
  // Phase 3: Offscreen static layer to avoid re-drawing all coins per frame
  let staticLayer = null;
  let staticLayerCtx = null;
  let staticDirty = true;
  function markStaticDirty(){ staticDirty = true; }

  // Mask prep
  const maskImg = new Image(); maskImg.src = "data:image/png;base64,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SwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgQQyBJAIEsAgSwBBLIEEMgSQCBLAIEsAQSyBBDIEkAgSwCBLAEEsgRwjI9XPwDYHAGE6/loM4QATrB79QOIksHNE8Ctswlfxsed7RNAIEsA53AWfBqjnkIAR3AzBrcQwM1zGnmRnclvnwAOYkM+iUGPIYAzuAeGGwjg9jmPvIQ74AkEcBJb8imMeQ4BHMI98JM5AI4ggAN8HHmLhzHkQQRwij9HQJvzSZy4ZxDACWTviT6+/cK2CeAYjoBP8WfAXgEcQgBHsB3hFgI4w8fiCPgUDoCzCOAgCvhwhjuMAA7xcfRNHsIBcAwBnMTXZjyYG+BpBHCKj2VxE/xgn/178aNgRQI4hpvgR/s4+JXtE8A5/n0m2BZ9hM+hugGeRACHUcBH0b+JBHCQvZcBFXBtX/177aNgZQI4iQI+zN/+mesoAjiKAj6I/g0lgLMo4EN8/HiDGVzQaXbL4gWrlTn/jeUEOI0z4Or0by4BHEcBV6Z/g7mmA+3fBbsNvpf+TeaiTqSAq/k3RVtlIrfAE+3fBdu499C/4VzWmb6dAR0Cb6V/07muQyng/f6NzzaZypUdywuBd3L8C3Bp53IIvIv+Fbi2gyng7dz+Nri6o0ngbfZGZoeM5vLO9r2AEngZ/ctwfYc7+DFJCnje3scL22M6V3g8h8Cr7E/K7hjPJZ7v8GdlSuAv3P22uMgFB4dACTzF8a/GVW6QwAvIX4/rHHF4HyyBh+SvyJXOcAj8zbfB2BUZLnWIBJ4if1UudooEHiN/XS53y4+XAvMN/D4L+yHGBa+RwH3yF+eS9/xMYLSBByOwF4Jc9KTD1wKLCZQ/BDDrZwJbDZQ/lkUAw8J3wodP2i7IcunDjiQw0MAfz9ceCHPx22oNVD++cf3rjiVwaAN/PknLv84KoNHAw5XuEx8sAsiyLCcSOCeCx56Ylc9iGfBlbAPVj9OsBP460cANR/Doc7Hm+ctiYN+pBm4wgsefhAXPPuuBAycbuKEInnj0VjsHLAl++izd0cXx9hU8lW5LnZ+sCo766tymInh8NTv6cZKVwUm/HQTfroIn42eNc5rFwa9+j+BbZPDUYxM/zrJAOOfXu+Hv7/JcZx6Qtc1ZFgkXuaCCT8zg2UdhXXMRC4XLXVLB/fdb20V/riXN5awWrnRpBfff9z4XLVI3vdzAkuEWf8t27QI6n8Tb/o8WMrewbrjdzRlc84+3hLmd1cO9XpBB6WMd1hDr2L+3fdSqevGJk3msJFa2fgmv+bQLXMOa4lGOfL7jsuV28ButUR7G4uJ5LvqqGEsSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADbv/4sB+5+kVo0nAAAAAElFTkSuQmCC";
  let maskCanvas=null, maskData=null, maskW=0, maskH=0;
  maskImg.onload = () => {
    maskW = maskImg.naturalWidth; maskH = maskImg.naturalHeight;
    const off = document.createElement("canvas"); off.width=maskW; off.height=maskH;
    const octx = off.getContext("2d"); octx.drawImage(maskImg,0,0);
    const data = octx.getImageData(0,0,maskW,maskH); const p = data.data;
    for(let i=0;i<p.length;i+=4){ const lum=(p[i]*0.299+p[i+1]*0.587+p[i+2]*0.114); p[i]=255; p[i+1]=255; p[i+2]=255; p[i+3]=lum; }
    octx.putImageData(data,0,0);
    maskCanvas = off; maskData = octx.getImageData(0,0,maskW,maskH).data;
    buildSprites(); initial();
  };
  // Keep embedded mask as primary source to avoid race conditions with init.
  // Try to upgrade to external mask if it matches dimensions (safe, cached)
  // Try the newly provided cropped mask; if it loads, replace the embedded one.
  try {
    const newMask = new Image();
    newMask.decoding = 'async';
    newMask.onload = () => {
      const w = newMask.naturalWidth, h = newMask.naturalHeight;
      if(!w || !h) return;
      const off2 = document.createElement('canvas'); off2.width = w; off2.height = h;
      const ctx2 = off2.getContext('2d'); ctx2.drawImage(newMask, 0, 0);
      const d = ctx2.getImageData(0,0,w,h); const px = d.data;
      for (let i=0;i<px.length;i+=4){ const lum=(px[i]*0.299+px[i+1]*0.587+px[i+2]*0.114); px[i]=255; px[i+1]=255; px[i+2]=255; px[i+3]=lum; }
      ctx2.putImageData(d,0,0);
      maskCanvas = off2; maskData = ctx2.getImageData(0,0,w,h).data; maskW=w; maskH=h;
      requestAnimationFrame(renderFrame);
    };
    newMask.onerror = () => {};
    newMask.src = 'assets/jar-mask2.png';
  } catch {}

  // Audio clink - using real MP3 file
  let coinAudio = null;
  
  // Initialize audio on first user interaction
  function initAudio() {
    if (!coinAudio) {
      coinAudio = new Audio('assets/magic_coin.mp3');
      coinAudio.volume = 0.5; // Set volume to 50%
      coinAudio.preload = 'auto';
    }
  }
  
  function playClink() {
    try {
      initAudio();
      if (coinAudio) {
        // Clone the audio to allow overlapping sounds
        const audioClone = coinAudio.cloneNode();
        audioClone.volume = 0.5;
        audioClone.play().catch(e => {
          // Fallback for browsers that block autoplay
          console.log('Audio playback failed:', e);
        });
      }
    } catch(e) {
      console.log('Audio error:', e);
    }
  }

  // Sprites
  let dpr = Math.max(1, window.devicePixelRatio||1);
  let coinSize = 42;
  const JAR_SCALE = 1.0; // CSS handles scaling, coordinates should be 1:1
  let coinSprite = null;
  let coinShadowSprite = null, coinShadowDY = 0;
  function buildSprites(){
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    const s = Math.round(coinSize*2);
    const off=document.createElement("canvas"); off.width=s; off.height=s;
    const c=off.getContext("2d"); const r=s/2;
    const grad=c.createRadialGradient(r*0.5,r*0.5,r*0.2,r*0.6,r*0.55,r*0.98);
    grad.addColorStop(0,"#fff3c4"); grad.addColorStop(0.4,"#ffd56b"); grad.addColorStop(0.75,"#f1b43e"); grad.addColorStop(1,"#e19a2a");
    c.fillStyle=grad; c.beginPath(); c.arc(r,r,r*0.88,0,Math.PI*2); c.fill();
    c.save(); c.translate(r,r); c.strokeStyle="#b47a21"; c.lineWidth=s*0.03;
    for(let i=0;i<56;i++){ const a=(i/56)*Math.PI*2; const x1=Math.cos(a)*r*0.92, y1=Math.sin(a)*r*0.92; const x2=Math.cos(a)*r*0.98, y2=Math.sin(a)*r*0.98; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); }
    c.restore();
    c.lineWidth=s*0.04; c.strokeStyle="rgba(0,0,0,.35)"; c.beginPath(); c.arc(r,r,r*0.88,0,Math.PI*2); c.stroke();
    c.lineWidth=s*0.07; c.strokeStyle="rgba(255,255,255,.18)"; c.beginPath(); c.arc(r,r,r*0.55,0,Math.PI*2); c.stroke();
    const hi=c.createRadialGradient(r*0.6,r*0.55,1,r*0.6,r*0.55,r*0.9); hi.addColorStop(0,"rgba(255,255,255,.65)"); hi.addColorStop(1,"rgba(255,255,255,0)");
    c.fillStyle=hi; c.beginPath(); c.arc(r,r,r*0.88,0,Math.PI*2); c.fill();
    coinSprite=off;

    // Shadow sprite (pre-baked to avoid per-frame blur)
    coinShadowDY = Math.round(s*0.10);
    const sh=document.createElement("canvas"); sh.width=s; sh.height=s;
    const sc=sh.getContext("2d");
    sc.save();
    sc.globalAlpha=0.45;
    sc.filter="blur(5px)";
    sc.fillStyle="rgba(0,0,0,0.35)";
    sc.beginPath();
    sc.ellipse(s*0.5,(s*0.5+s*0.30)-coinShadowDY,s*0.42,s*0.22,0,0,Math.PI*2);
    sc.fill();
    sc.restore();
    coinShadowSprite=sh;
  }
  // Build sprites once early so coins can render even if mask is still loading.
  try { buildSprites(); } catch {}

  // Canvas utils
  function fitCanvas(){ const rect=canvas.getBoundingClientRect(); dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1)); const w=Math.max(1,Math.ceil(rect.width*dpr)); const h=Math.max(1,Math.ceil(rect.height*dpr)); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} ctx.setTransform(dpr,0,0,dpr,0,0); }
  function clearCanvas(){ ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight); }
  function drawCoinSprite(x,y){ if(!coinSprite) return; const s=coinSize; if(coinShadowSprite) ctx.drawImage(coinShadowSprite,x,y-coinShadowDY,s,s); ctx.drawImage(coinSprite,x,y,s,s); }

  // Coordinate system helpers
  function getJarScale(){ return 1; } // CSS --jar-scale value
  function normalizedToCanvas(nx, ny){
    // Transform normalized coordinates to canvas pixels, accounting for CSS jar scaling
    // The jar container is CSS scaled by 1.65x, so we need to account for this
    const scale = getJarScale();
    const canvasX = nx * canvas.clientWidth / scale;
    const canvasY = ny * canvas.clientHeight / scale;
    return { x: canvasX, y: canvasY };
  }

  // Phase 3: Spatial index helpers (normalized grid keyed by min separation)
  function buildSpatialIndex(points, minSepPx){
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const cellW = Math.max(1e-6, minSepPx / w);
    const cellH = Math.max(1e-6, minSepPx / h);
    const map = new Map();
    const key = (i,j)=> i+","+j;
    for(const p of points){
      if(!p) continue;
      const ci = Math.floor(p.x / cellW);
      const cj = Math.floor(p.y / cellH);
      const k = key(ci,cj);
      let arr = map.get(k);
      if(!arr){ arr=[]; map.set(k, arr); }
      arr.push(p);
    }
    return { cellW, cellH, map };
  }
  function spatialNearby(index, nx, ny){
    if(!index) return [];
    const {cellW, cellH, map} = index;
    const ci = Math.floor(nx / cellW);
    const cj = Math.floor(ny / cellH);
    const out = [];
    for(let dj=-1; dj<=1; dj++){
      for(let di=-1; di<=1; di++){
        const k = (ci+di)+","+(cj+dj);
        const arr = map.get(k);
        if(arr) out.push(...arr);
      }
    }
    return out;
  }

  // Mask helpers & placement
  function maskAlphaAt(nx,ny){ 
    if(!maskData) return 0; 
    const x=Math.max(0,Math.min(maskW-1,Math.round(nx*maskW))); 
    const y=Math.max(0,Math.min(maskH-1,Math.round(ny*maskH))); 
    return maskData[(y*maskW+x)*4+3]; 
  }
  
  function insideMaskPadded(nx,ny,padPx){ 
    const steps=4; 
    let minA=255; 
    // Adjust padding for the CSS scale
    const scale = getJarScale();
    const adjustedPadPx = padPx / scale;
    
    for(let dy=-steps;dy<=steps;dy++){ 
      for(let dx=-steps;dx<=steps;dx++){ 
        const sx=nx+dx*(adjustedPadPx/maskW); 
        const sy=ny+dy*(adjustedPadPx/maskH); 
        if(sx<0||sx>1||sy<0||sy>1) return false; 
        const a=maskAlphaAt(sx,sy); 
        if(a<minA) minA=a; 
      } 
    } 
    return minA>220; 
  }
  
  function mulberry32(a){ return function(){ var t= a += 0x6D2B79F5; t = Math.imul(t ^ (t>>>15), t|1); t ^= t + Math.imul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296; } }
  function hashString(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19); } return (h>>>0); }
  
  // Geometric fallback approximating the jar silhouette in normalized space.
  function insideVisualJar(nx, ny){
    const yTop = 0.32;     // below neck
    const yBottom = 0.18;  // above base curve
    if (ny < yTop || ny > 1 - yBottom) return false;
    const normalizedY = (ny - yTop) / (1 - yTop - yBottom);
    if (normalizedY < 0 || normalizedY > 1) return false;
    const centerX = 0.5;
    const jarWidthFactor = 0.5 + 0.35 * normalizedY; // narrow at top, wider at bottom
    const maxHalfWidth = jarWidthFactor * 0.34;       // safely within outline
    const left = centerX - maxHalfWidth;
    const right = centerX + maxHalfWidth;
    return nx >= Math.max(0.12, left) && nx <= Math.min(0.88, right);
  }

  function sampleInside(seed, existing){ 
    const rng=mulberry32(hashString(seed)); 
    const pad=48; // Reduce padding; previous mask guard was too tight
    const scale = getJarScale();
    const minSep=0.55*coinSize; // Slightly smaller separation to increase capacity
    const index = buildSpatialIndex(existing, minSep);
    
    for(let i=0;i<260;i++){
      // Create a more jar-like sampling shape
      const baseY = rng();
      const normalizedY = Math.pow(baseY, 2.8); // Stronger bias to bottom
      
      // Map to jar coordinates with tighter bounds for visual jar shape
      const yTop = 0.58;    // Restrict to lower region to simulate pile
      const yBottom = 0.10; // Margin above base curve
      const ny = yTop + normalizedY * (1 - yTop - yBottom);
      
      // Calculate jar width at this height to match cartoon jar outline
      const jarWidthFactor = 0.5 + 0.35 * normalizedY; // More conservative width at top, gradual widening
      const centerX = 0.5;
      const maxHalfWidth = jarWidthFactor * 0.32; // Allow a bit more lateral spread in body
      
      // Sample x position within the jar width at this height
      const xRange = rng() * 2 - 1; // -1 to 1
      const nx = centerX + xRange * maxHalfWidth;
      
      // Ensure we're within visual jar bounds with more conservative margins
      if(nx < 0.15 || nx > 0.85) continue;
      
      if(!insideMaskPadded(nx,ny,pad)){
        // Fallback to an analytic jar shape so coins still disperse
        if(!insideVisualJar(nx, ny)) continue;
      }
      
      let ok=true; 
      const near = spatialNearby(index, nx, ny);
      for(const p of near){ 
        const scale = getJarScale();
        const dx=(nx-p.x)*canvas.clientWidth / scale; 
        const dy=(ny-p.y)*canvas.clientHeight / scale; 
        if(Math.hypot(dx,dy)<minSep){ ok=false; break; } 
      } 
      if(ok) return {x:nx,y:ny}; 
    } 
    
    console.warn('Could not find valid position, using fallback'); 
    return {x:0.5,y:0.62}; // Centered fallback position in visual jar body
  }
  
  function ensureInside(e, existing){ 
    if(!e.pos || !insideMaskPadded(e.pos.x,e.pos.y,50)){ 
      e.pos=sampleInside(e.id,existing); 
      save(entries); 
    } 
  }

  // Animation
  function easeOutBounce(t){ const n1=7.5625,d1=2.75; if(t<1/d1) return n1*t*t; else if(t<2/d1) return n1*(t-=1.5/d1)*t+.75; else if(t<2.5/d1) return n1*(t-=2.25/d1)*t+.9375; return n1*(t-=2.625/d1)*t+.984375; }
  function lerp(a,b,t){ return a + (b-a)*t; }
  let animCoins=[];
  function startDropAnimation(e){
    const start={x:0.58,y:0.12}; // Adjusted to match jar opening visually
    const dur=650+Math.random()*200;
    animCoins.push({id:e.id,pos:e.pos,cur:{...start},t0:performance.now(),dur,sparkleUntil:0});
    inFlight.add(e.id);          // HIDE static coin while animating
    markStaticDirty();           // Static layer must exclude this coin
    // Play sound at 65% of animation (during the drop, before landing)
    setTimeout(()=>playClink(), Math.round(dur * 0.65));
  }
  function drawSparkle(x,y,t){ const life=280; const p=(performance.now()-t)/life; if(p>1) return false; const a=1-p; const s=6+10*p; ctx.save(); ctx.globalAlpha=a*0.9; ctx.strokeStyle="rgba(255,255,255,.9)"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x-s,y); ctx.lineTo(x+s,y); ctx.moveTo(x,y-s); ctx.lineTo(x,y+s); ctx.stroke(); ctx.restore(); return true; }

  // Rebuild the offscreen static layer with non-animating coins
  function rebuildStaticLayer(){
    const wCss = Math.max(1, canvas.clientWidth);
    const hCss = Math.max(1, canvas.clientHeight);
    const scale = getJarScale();
    const w = Math.ceil(wCss * dpr);
    const h = Math.ceil(hCss * dpr);
    if(!staticLayer){ staticLayer = document.createElement('canvas'); }
    staticLayer.width = w; staticLayer.height = h;
    staticLayerCtx = staticLayer.getContext('2d');
    staticLayerCtx.setTransform(dpr,0,0,dpr,0,0);
    staticLayerCtx.clearRect(0,0,wCss,hCss);
    const ordered=[...entries].filter(e=>!inFlight.has(e.id) && e.pos)
                              .sort((a,b)=>a.pos.y-b.pos.y);
    ordered.forEach(e=>{ 
      const canvasPos = normalizedToCanvas(e.pos.x, e.pos.y);
      const maxX = wCss / scale - coinSize;
      const maxY = hCss / scale - coinSize;
      const x = Math.max(0, Math.min(maxX, Math.round(canvasPos.x - coinSize/2))); 
      const y = Math.max(0, Math.min(maxY, Math.round(canvasPos.y - coinSize/2))); 
      if(coinSprite){
        if(coinShadowSprite) staticLayerCtx.drawImage(coinShadowSprite,x,y-coinShadowDY,coinSize,coinSize);
        staticLayerCtx.drawImage(coinSprite,x,y,coinSize,coinSize);
      }
    });
    staticDirty = false;
  }

  function renderCoinsAnimated(){
    const now=performance.now();
    const next=[];
    let landedThisFrame = false;
    animCoins.forEach(c=>{
      const p=Math.min(1,(now-c.t0)/c.dur);
      const eased=easeOutBounce(p);
      // Animation starts from normalized coordinates that work with our CSS scale
      const startX = 0.58; // Centered over jar opening
      const startY = 0.12; // Just above visible jar opening
      c.cur.x=lerp(startX,c.pos.x,eased);
      c.cur.y=lerp(startY,c.pos.y,eased);
      if(p>=1 && !c.sparkleUntil) c.sparkleUntil=now;
      const done = c.sparkleUntil && (now - c.sparkleUntil) >= 300;
      if(!done){ next.push(c); }
      else{ inFlight.delete(c.id); markStaticDirty(); landedThisFrame = true; }   // show static coin only AFTER landing + sparkle
    });
    animCoins = next;
    // Draw animated coins only (static coins come from offscreen layer)
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const animOrdered = [...animCoins].sort((a,b)=>a.cur.y-b.cur.y);
    animOrdered.forEach(c=>{
      const canvasPos = normalizedToCanvas(c.cur.x, c.cur.y);
      const scale = getJarScale();
      const maxX = w / scale - coinSize;
      const maxY = h / scale - coinSize;
      const x = Math.max(0, Math.min(maxX, Math.round(canvasPos.x - coinSize/2))); 
      const y = Math.max(0, Math.min(maxY, Math.round(canvasPos.y - coinSize/2)));
      drawCoinSprite(x,y);
      if(c.sparkleUntil) drawSparkle(x+coinSize*0.78,y+coinSize*0.32,c.sparkleUntil);
    });
    return { hasAnim: animCoins.length>0, landed: landedThisFrame };
  }

  function applyMask(){ 
    if(!maskCanvas) return; 
    ctx.save(); 
    ctx.globalCompositeOperation="destination-in"; 
    
    // Simple mask application aligned with our coordinate system
    const scale = getJarScale();
    const w = canvas.clientWidth / scale;
    const h = canvas.clientHeight / scale;
    
    ctx.drawImage(maskCanvas, 0, 0, w, h);
    
    ctx.restore(); 
  }

  function renderFrame(){
    fitCanvas(); clearCanvas();
    // Rebuild static layer if size changed or marked dirty
    const wCss = canvas.clientWidth, hCss = canvas.clientHeight;
    const needsRebuild = !staticLayer || staticLayer.width !== Math.ceil(wCss*dpr) || staticLayer.height !== Math.ceil(hCss*dpr) || staticDirty;
    if(needsRebuild){ rebuildStaticLayer(); }
    // Draw static layer first
    if(staticLayer){ ctx.drawImage(staticLayer, 0, 0, wCss, hCss); }
    // Draw animated coins on top
    const animState = renderCoinsAnimated();
    applyMask();
    countEl.textContent = entries.length;
    // Schedule another frame if animation continues or we just landed a coin
    if(animState.hasAnim || animState.landed) requestAnimationFrame(renderFrame);
  }

  // List + CSV + reset
  function timeAgo(d){ const s=Math.floor((Date.now()-d.getTime())/1000); const u=[[60,"s"],[60,"m"],[24,"h"],[7,"d"],[4.348,"w"],[12,"mo"]]; let n=s,l="s"; for(const [k,t] of u){ if(n<k)break; n=n/k; l=t; } return Math.floor(n)+l+" ago"; }
  function escapeHtml(str){ return (str??"").toString().replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s])); }
  function linkify(str){ return str.replace(/(https?:\/\/\S+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function renderList(){ const data=[...entries].sort((a,b)=>b.created-a.created); listEl.innerHTML=""; if(!data.length){ listEl.innerHTML='<div style="text-align:center;color:var(--muted);padding:var(--space-8);font-size:var(--text-lg)">🪙 No coins in the jar yet.<br><span style="font-size:var(--text-sm);margin-top:var(--space-2);display:block">Add your first coin to get started!</span></div>'; } data.forEach(e=>listEl.appendChild(renderItem(e))); }
  function renderItem(e){
    const d=new Date(e.created);
    const el=document.createElement("div"); el.className="item";
    el.innerHTML=`
      <div>
        <div class="meta">
          <span class="chip">${escapeHtml(e.category)}</span>
          <span title="${d.toLocaleString()}">${timeAgo(d)}</span>
        </div>
        <div class="item-text">${linkify(escapeHtml(e.text))}</div>
      </div>
      <div class="actions">
        <button class="action-btn" title="Delete entry" data-act="del" aria-label="Delete entry">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h1"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>`;
    el.addEventListener("click",(ev)=>{
      const btn = ev.target.closest('[data-act]');
      if(!btn) return;
      const act=btn.getAttribute("data-act");
      if(act==="del"){
        if(confirm("Delete this entry? This action cannot be undone.")){
          entries.splice(entries.indexOf(e),1);
          // also cancel animation if any
          animCoins = animCoins.filter(c=>c.id!==e.id);
          inFlight.delete(e.id);
          save(entries); markStaticDirty(); renderList(); renderFrame();
        }
      }
    });
    return el;
  }
  function exportCSV(){
    if(!entries.length){ alert("No coins to export yet."); return; }
    const rows=[["id","category","text","created_iso"]];
    entries.forEach(e=>{ const created=new Date(e.created).toISOString(); const cell=s=> '"' + String(s).replace(/"/g,'""') + '"'; rows.push([e.id,e.category,e.text,created].map(cell)); });
    const csv="\ufeff"+rows.map(r=>r.join(",")).join("\r\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="snarky-insight-jar.csv"; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0);
  }
  function resetJar(){
    if(!entries.length){ alert("Jar is already empty."); return; }
    if(confirm("Reset the jar and clear all coins? This cannot be undone.")){
      entries=[]; animCoins=[]; inFlight.clear();
      save(entries); markStaticDirty(); renderList(); renderFrame();
    }
  }
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
  document.getElementById("resetBtn").addEventListener("click", resetJar);

  // Modal
  const modal=$("#modal"), openModal=$("#openModal"), closeModal=$("#closeModal");
  const coinGrid=$("#coinGrid"), step2=$("#step2"), addBtn=$("#addBtn");
  const modalText=$("#modalText"), charCount=$("#charCount"); let selectedCat=null;
  openModal.addEventListener("click", openDialog); closeModal.addEventListener("click", closeDialog);
  modal.addEventListener("click",(e)=>{ if(e.target===modal) closeDialog(); }); document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeDialog(); });

  function openDialog(){
    selectedCat=null; step2.style.display="none"; modalText.value=""; addBtn.disabled=true; charCount.textContent="0/140";
    coinGrid.innerHTML="";
    CATEGORY_LIST.forEach((c)=>{
      const div=document.createElement("div"); div.className="coin-opt"; div.setAttribute("role","option"); div.setAttribute("tabindex","0");
      div.innerHTML=`<span class="coin-dot" style="background:${c.color}"></span>${c.name}`;
      const selectIt=()=>{ document.querySelectorAll('.coin-opt').forEach(x=>x.classList.remove("selected")); div.classList.add("selected"); selectedCat=c.name; step2.style.display="block"; modalText.focus(); };
      div.addEventListener("click",selectIt); div.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); selectIt(); } });
      coinGrid.appendChild(div);
    });
    modal.classList.add("show");
  }
  function closeDialog(){ modal.classList.remove("show"); }
  modalText.addEventListener("input", ()=>{ charCount.textContent=modalText.value.length+"/140"; addBtn.disabled=!(selectedCat && modalText.value.trim().length); });
  addBtn.addEventListener("click", ()=>{
    const text=modalText.value.trim(); if(!selectedCat||!text) return;
    const existing=entries.map(e=>e.pos).filter(Boolean);
    const item={ id:crypto.randomUUID(), text, category:selectedCat, created:Date.now() };
    item.pos=sampleInside(item.id, existing);
    entries.push(item); save(entries); renderList();
    startDropAnimation(item); renderFrame();
    closeDialog();
  });

  // initial
  function ensureAll(){ const existing=[]; entries.forEach(e=>{ ensureInside(e, existing); existing.push(e.pos); }); save(entries); }
  function initial(){ ensureAll(); renderList(); renderFrame(); }
  let __rzTimer=null;
  window.addEventListener('resize', ()=>{
    if(__rzTimer) clearTimeout(__rzTimer);
    __rzTimer = setTimeout(()=>{ buildSprites(); markStaticDirty(); renderFrame(); }, 150);
  });
  // Initialize once mask is ready; avoid duplicate interval-based init
  if(maskCanvas) initial();
});
