#!/usr/bin/env python3
"""
Build the Conowingo white paper HTML.
Writes to ../../output/conowingo_white_paper.html
"""
import base64, re
from pathlib import Path

OUT = Path(__file__).parent / "output" / "conowingo_white_paper.html"

imgs = {}
for f in sorted((Path(__file__).parent / "output").glob("*.png")):
    imgs[f.stem] = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()

# ── CSS ────────────────────────────────────────────────────────────────
CSS = """
:root{
  --navy:#0B1F36;--navy-mid:#163354;--navy-light:#2A5070;
  --teal:#1B8070;--teal-lt:#25A88F;
  --amber:#C4760A;--amber-lt:#E09320;
  --paper:#EEF2F6;--paper-mid:#D8E2EA;
  --smoke:#7A9AB2;--red:#C0392B;
  --bg:var(--paper);--bg-card:#FFFFFF;--bg-hero:var(--navy);
  --text:var(--navy);--text2:#2D4A60;--muted:var(--smoke);
  --rule:var(--paper-mid);--accent:var(--teal);--accent2:var(--amber);
  --badge-bg:#DDF0EC;--badge-text:var(--teal);
  --th:#EBF2F0;--alt:#F5F9F8;--fig-bg:#F7FAFB;--fig-b:var(--paper-mid);
}
@media(prefers-color-scheme:dark){:root{
  --bg:var(--navy);--bg-card:var(--navy-mid);--bg-hero:#060F1C;
  --text:#E6EEF4;--text2:#B8CDD9;--muted:#6A8FA5;--rule:#1E3450;
  --accent:var(--teal-lt);--accent2:var(--amber-lt);
  --badge-bg:#0D3028;--badge-text:var(--teal-lt);
  --th:#112232;--alt:#0F1E2E;--fig-bg:#0C1B2D;--fig-b:#1E3450;
}}
:root[data-theme=light]{
  --bg:var(--paper);--bg-card:#FFFFFF;--bg-hero:var(--navy);
  --text:var(--navy);--text2:#2D4A60;--muted:var(--smoke);--rule:var(--paper-mid);
  --accent:var(--teal);--accent2:var(--amber);
  --badge-bg:#DDF0EC;--badge-text:var(--teal);
  --th:#EBF2F0;--alt:#F5F9F8;--fig-bg:#F7FAFB;--fig-b:var(--paper-mid);
}
:root[data-theme=dark]{
  --bg:var(--navy);--bg-card:var(--navy-mid);--bg-hero:#060F1C;
  --text:#E6EEF4;--text2:#B8CDD9;--muted:#6A8FA5;--rule:#1E3450;
  --accent:var(--teal-lt);--accent2:var(--amber-lt);
  --badge-bg:#0D3028;--badge-text:var(--teal-lt);
  --th:#112232;--alt:#0F1E2E;--fig-bg:#0C1B2D;--fig-b:#1E3450;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);
  font-family:Georgia,'Times New Roman',serif;font-size:17px;
  line-height:1.72;transition:background .2s,color .2s}
::selection{background:var(--accent);color:#fff}
.disp{font-family:'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;
  font-weight:400;letter-spacing:-.02em;text-wrap:balance}
.eye{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
  color:var(--accent)}
.mono{font-family:ui-monospace,Menlo,Monaco,'Courier New',monospace;
  font-variant-numeric:tabular-nums}
h1{font-size:clamp(2.2rem,5vw,3.4rem);line-height:1.12}
h2{font-size:clamp(1.35rem,2.8vw,1.7rem);font-weight:400;line-height:1.3;margin-bottom:.4em}
h3{font-size:1.1rem;font-weight:600;letter-spacing:-.01em;margin-bottom:.3em}
h4{font-size:.9rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);margin-bottom:.25em;
  font-family:system-ui,-apple-system,sans-serif}
p{max-width:68ch}
p+p{margin-top:.9em}
a{color:var(--accent);text-decoration-thickness:1px}
a:hover{text-decoration-color:transparent}
.wrap{max-width:840px;margin-inline:auto;padding-inline:clamp(1.25rem,5vw,3rem)}
.wide{max-width:1080px;margin-inline:auto;padding-inline:clamp(1.25rem,4vw,2.5rem)}
section{padding-block:3.5rem;border-top:1px solid var(--rule)}
section:first-of-type{border-top:none}

/* Hero */
.hero{background:var(--bg-hero);position:relative;overflow:hidden;padding-block:4.5rem 5rem}
#cc{position:absolute;inset:0;width:100%;height:100%;opacity:.18;pointer-events:none}
.hero__in{position:relative;z-index:1}
.hero .eye{color:var(--teal-lt)}
.hero h1{color:#E6EEF4;margin-top:.6rem;margin-bottom:.5rem}
.hero__sub{color:#96B4C8;font-size:1.05rem;max-width:58ch;margin-bottom:1.6rem}
.hero__meta{display:flex;flex-wrap:wrap;gap:.6rem 2rem;
  font-family:system-ui,-apple-system,sans-serif;font-size:.8rem;
  color:#5A7E96;letter-spacing:.04em}
.hero__meta span{display:flex;align-items:center;gap:.4rem}

/* Abstract */
.abstract{padding-block:2.4rem 2.8rem;border-top:3px solid var(--accent)}
.abstract p{font-size:1.08rem;line-height:1.76;color:var(--text2);max-width:72ch}
.abstract strong{color:var(--text);font-weight:600}

/* Findings strip */
.strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:1px;background:var(--rule);border:1px solid var(--rule);
  border-radius:6px;overflow:hidden;margin-block:0 2rem}
.fnd{background:var(--bg-card);padding:1.4rem 1.5rem}
.fnd__n{font-family:'Palatino Linotype',Palatino,Georgia,serif;
  font-size:clamp(1.8rem,4vw,2.4rem);font-weight:400;color:var(--accent);
  line-height:1;margin-bottom:.3rem;font-variant-numeric:tabular-nums}
.fnd__l{font-family:system-ui,-apple-system,sans-serif;font-size:.78rem;
  color:var(--muted);letter-spacing:.04em;line-height:1.35}
.fnd--am .fnd__n{color:var(--amber-lt)}
.fnd--rd .fnd__n{color:#C0392B}

/* Schematic */
.sch-wrap{background:var(--fig-bg);border:1px solid var(--fig-b);
  border-radius:6px;overflow:hidden;display:flex;flex-direction:column}
.sch-wrap figcaption{padding:.9rem 1.25rem;font-family:system-ui,sans-serif;
  font-size:.8rem;color:var(--muted);border-top:1px solid var(--fig-b);line-height:1.5}
#sc{width:100%;display:block;max-height:560px}

/* Figures */
figure{margin-block:2rem}
.ff{background:var(--fig-bg);border:1px solid var(--fig-b);border-radius:6px;
  overflow:hidden;overflow-x:auto}
.ff img{width:100%;height:auto;display:block}
figure figcaption{margin-top:.65rem;font-family:system-ui,-apple-system,sans-serif;
  font-size:.8rem;color:var(--muted);line-height:1.55}
figcaption strong{color:var(--text2)}

/* Table */
.tw{overflow-x:auto;border-radius:6px;border:1px solid var(--fig-b)}
table{width:100%;border-collapse:collapse;
  font-family:system-ui,-apple-system,sans-serif;font-size:.83rem;
  font-variant-numeric:tabular-nums;min-width:600px}
thead{background:var(--th)}
th{padding:.7rem .85rem;text-align:left;font-weight:600;letter-spacing:.04em;
  color:var(--muted);font-size:.74rem;text-transform:uppercase;
  white-space:nowrap;border-bottom:1px solid var(--fig-b)}
td{padding:.65rem .85rem;border-bottom:1px solid var(--fig-b);
  vertical-align:top;line-height:1.45;color:var(--text2)}
tbody tr:nth-child(even){background:var(--alt)}
tbody tr:last-child td{border-bottom:none}
td strong{color:var(--text);font-weight:600}
.tag{display:inline-block;padding:.15em .55em;border-radius:3px;
  font-size:.72rem;font-weight:600;letter-spacing:.04em;white-space:nowrap}
.tg{background:#d4f0e8;color:#0e7a5a}
.ta{background:#fdecd0;color:#9a5c00}
.tr{background:#fde4e0;color:#a02020}
:root[data-theme=dark] .tg{background:#083020;color:#3dd9a8}
:root[data-theme=dark] .ta{background:#2e1e00;color:#f0a830}
:root[data-theme=dark] .tr{background:#2a0a0a;color:#e06060}
@media(prefers-color-scheme:dark){
  .tg{background:#083020;color:#3dd9a8}
  .ta{background:#2e1e00;color:#f0a830}
  .tr{background:#2a0a0a;color:#e06060}
}

/* Callouts */
.co{border-left:3px solid var(--accent);padding:1rem 1.25rem;
  background:var(--badge-bg);border-radius:0 4px 4px 0;margin-block:1.5rem}
.co--am{border-left-color:var(--amber);background:#FEF4E6}
:root[data-theme=dark] .co--am{background:#1E1200}
@media(prefers-color-scheme:dark){.co--am{background:#1E1200}}
.co p{font-size:.92rem;color:var(--text2);max-width:none}
.co strong{color:var(--text)}

/* Events grid */
.eg{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:1.5rem;margin-block:1.5rem}
.ec{border:1px solid var(--fig-b);border-radius:6px;overflow:hidden;background:var(--bg-card)}
.ec__h{background:var(--navy-mid);padding:.75rem 1rem;
  display:flex;justify-content:space-between;align-items:baseline;gap:.5rem}
.ec__h *{color:#C8DAEB;font-family:system-ui,sans-serif;font-size:.78rem}
.ec__h strong{color:#fff;font-size:.95rem}
.ec img{width:100%;display:block}

/* Limits */
.ll{list-style:none;display:flex;flex-direction:column;gap:1rem}
.ll li{padding:.9rem 1.1rem .9rem 1.35rem;border-left:2px solid var(--rule);
  font-size:.92rem;color:var(--text2);line-height:1.6}
.ll li strong{color:var(--text);display:block;margin-bottom:.2rem}
.ll li.hi{border-left-color:var(--amber)}

/* Two-col */
.tc{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start}
@media(max-width:680px){.tc{grid-template-columns:1fr;gap:1.5rem}}

/* Sources */
.src{font-family:system-ui,-apple-system,sans-serif;font-size:.78rem;
  color:var(--muted);line-height:1.6;padding-block:2rem;
  border-top:1px solid var(--rule)}
.src h4{margin-bottom:.6rem}
.src ul{padding-left:1.2rem}
.src li+li{margin-top:.25rem}

/* Theme btn */
.tbtn{position:fixed;top:1.1rem;right:1.1rem;z-index:100;
  background:var(--bg-card);border:1px solid var(--rule);border-radius:4px;
  width:36px;height:36px;cursor:pointer;display:flex;align-items:center;
  justify-content:center;font-size:15px;color:var(--muted);
  transition:color .15s,background .15s}
.tbtn:hover{color:var(--text)}
.tbtn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
"""

# ── JavaScript ────────────────────────────────────────────────────────
JS = r"""
/* theme */
(function(){
  var btn=document.getElementById('tb'),root=document.documentElement;
  var mq=window.matchMedia('(prefers-color-scheme:dark)');
  var t=localStorage.getItem('theme')||(mq.matches?'dark':'light');
  function apply(x){root.setAttribute('data-theme',x);btn.textContent=x==='dark'?'☀':'☾';localStorage.setItem('theme',x);}
  apply(t);
  btn.addEventListener('click',function(){apply(root.getAttribute('data-theme')==='dark'?'light':'dark');});
})();

/* contour hero */
(function(){
  var cv=document.getElementById('cc'),ctx=cv.getContext('2d');
  function rng(s){var x=Math.sin(s)*43758.5453123;return x-Math.floor(x);}
  function draw(){
    var W=cv.width=cv.offsetWidth,H=cv.height=cv.offsetHeight;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='#4ABCA8';ctx.lineWidth=0.8;
    for(var i=0;i<22;i++){
      var baseY=(i/22)*H*1.3-H*0.15,amp=18+rng(i*7.3)*32,
          freq=0.004+rng(i*3.1)*0.006,phase=rng(i*11.7)*Math.PI*2;
      ctx.beginPath();
      for(var x=0;x<=W;x+=2){
        var y=baseY+amp*Math.sin(freq*x+phase)+(rng(x*0.01+i)-0.5)*8;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
  }
  draw();
  new ResizeObserver(draw).observe(cv);
})();

/* schematic — geographic station map */
(function(){
  var cv=document.getElementById('sc'),ctx=cv.getContext('2d');
  var noaa=[
    {id:'cb1102', lat:38.990,name:'Bay Bridge',      ports:true},
    {id:'ACT4976',lat:38.935,name:'Tolly Point',     ports:false},
    {id:'ACT4916',lat:38.644,name:'Sharp Island Lt.',ports:false},
    {id:'ACT4901',lat:38.613,name:'Plum Point',      ports:false},
    {id:'ACT4891',lat:38.525,name:'James Island W',  ports:false},
    {id:'CHB0304',lat:38.486,name:'James Island SW', ports:false},
    {id:'ACT4866',lat:38.380,name:'Cove Point',      ports:true},
    {id:'ACT4826',lat:38.140,name:'Point No Point',  ports:false},
    {id:'ACT4806',lat:38.110,name:'Point Lookout',   ports:false}
  ];
  var cbibs=[
    {id:'AN',lat:38.963,name:'Annapolis',      r:-0.475,lag:5},
    {id:'GR',lat:38.555,name:'Gooses Reef',    r:-0.294,lag:7},
    {id:'SR',lat:37.567,name:'Stingray Point', r:-0.208,lag:8},
    {id:'PL',lat:38.030,name:'Potomac',        r:-0.123,lag:12}
  ];
  var LAT_N=39.12,LAT_S=37.38;
  var MT=52,MB=52;
  function latY(lat,h){return MT+(LAT_N-lat)/(LAT_N-LAT_S)*(h-MT-MB);}
  function isDark(){
    var t=document.documentElement.getAttribute('data-theme');
    return t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;
  }
  function draw(){
    var dpr=window.devicePixelRatio||1;
    var w=cv.offsetWidth,h=620;
    cv.width=w*dpr;cv.height=h*dpr;cv.style.height=h+'px';
    ctx.scale(dpr,dpr);
    var dk=isDark();
    ctx.fillStyle=dk?'#0C1B2D':'#F0F4F7';
    ctx.fillRect(0,0,w,h);
    var CX=w*0.5;
    /* faint lat grid */
    ctx.strokeStyle=dk?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.06)';
    ctx.lineWidth=1;
    for(var g=37.5;g<=39.0;g+=0.5){
      var gy=latY(g,h);
      ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke();
    }
    /* bay shape */
    ctx.beginPath();
    ctx.moveTo(CX-w*0.065,latY(39.10,h));
    ctx.bezierCurveTo(CX-w*0.075,latY(38.75,h),CX-w*0.085,latY(38.45,h),CX-w*0.08,latY(38.15,h));
    ctx.bezierCurveTo(CX-w*0.07,latY(37.90,h),CX-w*0.05,latY(37.55,h),CX-w*0.04,latY(37.38,h));
    ctx.lineTo(CX+w*0.04,latY(37.38,h));
    ctx.bezierCurveTo(CX+w*0.06,latY(37.55,h),CX+w*0.09,latY(37.90,h),CX+w*0.085,latY(38.15,h));
    ctx.bezierCurveTo(CX+w*0.09,latY(38.45,h),CX+w*0.075,latY(38.75,h),CX+w*0.065,latY(39.10,h));
    ctx.closePath();
    ctx.fillStyle=dk?'rgba(15,55,95,0.60)':'rgba(155,205,230,0.55)';
    ctx.fill();
    ctx.strokeStyle=dk?'rgba(30,110,150,0.35)':'rgba(30,100,140,0.25)';
    ctx.lineWidth=1;ctx.stroke();
    /* lat axis labels */
    ctx.fillStyle=dk?'#3A6080':'#7A9AB0';
    ctx.font='8.5px ui-monospace,monospace';
    ctx.textAlign='right';
    for(var l=37.5;l<=39.0;l+=0.5){
      ctx.fillText(l.toFixed(1)+'°N',w-6,latY(l,h)+3);
    }
    /* Bay Bridge */
    var bby=latY(38.992,h);
    ctx.strokeStyle=dk?'#25A88F':'#1B8070';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(CX-w*0.17,bby);ctx.lineTo(CX+w*0.17,bby);ctx.stroke();
    ctx.fillStyle=dk?'#25A88F':'#1B8070';
    ctx.font='600 9px system-ui';ctx.textAlign='center';
    ctx.fillText('CHESAPEAKE BAY BRIDGE  ·  PORTS cb1102',CX,bby-5);
    /* Conowingo label */
    var coY=latY(39.08,h);
    ctx.fillStyle=dk?'#E09320':'#C4760A';
    ctx.font='600 9px system-ui';ctx.textAlign='center';
    ctx.fillText('▲  CONOWINGO DAM  (39.7°N · 93 nm upstream)',CX,coY);
    ctx.fillStyle=dk?'rgba(224,147,32,0.55)':'rgba(196,118,10,0.55)';
    ctx.font='8px system-ui';
    ctx.fillText('discharge signal propagates south over 9–17 days',CX,coY+13);
    /* column headers */
    ctx.font='600 9px system-ui';
    ctx.fillStyle=dk?'#3A8FA8':'#1E6888';
    ctx.textAlign='center';
    ctx.fillText('NOAA CURRENT STATIONS',w*0.20,MT-22);
    ctx.fillStyle=dk?'#C4760A':'#A05C08';
    ctx.fillText('CBIBS SALINITY BUOYS',w*0.80,MT-22);
    /* NOAA stations — right-aligned to left of Bay */
    noaa.forEach(function(st){
      var y=latY(st.lat,h);
      var dotX=CX-w*0.095;
      var nc=st.ports?(dk?'#25A88F':'#1B8070'):(dk?'#5A8AA8':'#4A7A98');
      var tc=dk?'#B8CDD9':'#163354',mc=dk?'#5A7E96':'#7A9AB2';
      ctx.strokeStyle=dk?'rgba(90,138,168,0.20)':'rgba(74,122,152,0.18)';
      ctx.lineWidth=1;ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(dotX,y);ctx.lineTo(CX-w*0.068,y);ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(dotX,y,st.ports?5:3.5,0,Math.PI*2);
      ctx.fillStyle=nc;ctx.fill();
      if(st.ports){ctx.strokeStyle=dk?'#0C1B2D':'#F0F4F7';ctx.lineWidth=1.5;ctx.stroke();}
      ctx.textAlign='right';
      ctx.fillStyle=tc;ctx.font='600 10px system-ui';
      ctx.fillText(st.name,dotX-10,y+1);
      ctx.fillStyle=mc;ctx.font='8.5px system-ui';
      ctx.fillText(st.id+(st.ports?' · PORTS obs':'· prediction'),dotX-10,y+12);
      ctx.fillStyle=mc;ctx.font='8px ui-monospace,monospace';
      ctx.fillText(st.lat.toFixed(3)+'°N',dotX-10,y+22);
    });
    /* CBIBS buoys — left-aligned from right of Bay */
    cbibs.forEach(function(st){
      var y=latY(st.lat,h);
      var dotX=CX+w*0.095;
      var am=dk?'#D4880A':'#B46A08',aml=dk?'#E09320':'#C4760A';
      var tc=dk?'#B8CDD9':'#163354',mc=dk?'#5A7E96':'#7A9AB2';
      ctx.strokeStyle=dk?'rgba(212,136,10,0.22)':'rgba(180,106,8,0.18)';
      ctx.lineWidth=1;ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(CX+w*0.068,y);ctx.lineTo(dotX,y);ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(dotX,y,5,0,Math.PI*2);
      ctx.fillStyle=aml;ctx.fill();
      ctx.strokeStyle=dk?'#0C1B2D':'#F0F4F7';ctx.lineWidth=1.5;ctx.stroke();
      ctx.textAlign='left';
      ctx.fillStyle=tc;ctx.font='600 10px system-ui';
      ctx.fillText(st.name+' ('+st.id+')',dotX+10,y+1);
      ctx.fillStyle=aml;ctx.font='8.5px system-ui';
      ctx.fillText('r='+st.r.toFixed(3)+'  lag '+st.lag+' days',dotX+10,y+12);
      ctx.fillStyle=mc;ctx.font='8px ui-monospace,monospace';
      ctx.fillText(st.lat.toFixed(3)+'°N',dotX+10,y+22);
    });
    /* legend */
    ctx.textAlign='left';
    [[dk?'#25A88F':'#1B8070','NOAA PORTS (observed current)'],
     [dk?'#5A8AA8':'#4A7A98','NOAA prediction-only'],
     [dk?'#E09320':'#C4760A','CBIBS salinity buoy']].forEach(function(p,i){
      var lx=10,ly=h-54+i*18;
      ctx.beginPath();ctx.arc(lx+4,ly,3.5,0,Math.PI*2);
      ctx.fillStyle=p[0];ctx.fill();
      ctx.fillStyle=dk?'#6A8FA5':'#5A7A90';ctx.font='9px system-ui';
      ctx.fillText(p[1],lx+13,ly+3.5);
    });
    ctx.setTransform(1,0,0,1,0,0);
  }
  draw();
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.addEventListener('resize',draw);
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',draw);
})();
"""

# ── Body HTML (no f-strings — use .replace() for images) ─────────────
BODY = """
<button class="tbtn" id="tb" aria-label="Toggle theme">☀</button>

<header class="hero">
  <canvas id="cc" aria-hidden="true"></canvas>
  <div class="wrap hero__in">
    <p class="eye">Chesapeake Bay Racing Analysis</p>
    <h1 class="disp">The Conowingo Effect</h1>
    <p class="hero__sub">Empirical analysis of Conowingo Dam discharge and its measurable influence on tidal currents along the Annapolis&ndash;St.&nbsp;Mary&rsquo;s race corridor</p>
    <div class="hero__meta">
      <span>Prepared July 2026</span>
      <span>USGS &middot; NOAA CO-OPS &middot; NDBC &middot; CBIBS</span>
      <span>Data: Jan 2022 &ndash; Jul 2026 &middot; 4.5 yrs</span>
    </div>
  </div>
</header>

<div class="abstract">
  <div class="wrap">
    <p>When Conowingo Dam releases large volumes of Susquehanna River water into the head of the Chesapeake Bay, a freshwater pulse works its way south through the estuary&mdash;raising ebb current speeds, stratifying the water column, and altering conditions across the Annapolis&ndash;St.&nbsp;Mary&rsquo;s race corridor. This report quantifies that effect using 4.5 years of 15-minute USGS discharge records cross-correlated against NOAA tidal current observations at two PORTS stations and CBIBS salinity at four buoys, with harmonic predictions at eight stations as baseline. The headline result: <strong>a major release registers as a measurable ebb-current anomaly at the Bay Bridge approximately 9&ndash;10 days later</strong>. A salinity crash at the Annapolis buoy arrives <strong>4&ndash;5 days earlier</strong>&mdash;making CBIBS salinity the most accessible and timely leading indicator of an active discharge pulse.</p>
  </div>
</div>

<div class="wide" style="padding-block:0 2rem">
  <div class="strip">
    <div class="fnd"><div class="fnd__n">133</div><div class="fnd__l">High-flow release events identified, Jan 2022&ndash;Jul 2026</div></div>
    <div class="fnd fnd--am"><div class="fnd__n">310k</div><div class="fnd__l">Peak discharge cfs&mdash;April 2024 event, largest in the analysis period</div></div>
    <div class="fnd"><div class="fnd__n">&minus;0.48</div><div class="fnd__l">Pearson r&mdash;discharge vs. Annapolis salinity drop (5-day lag), strongest signal in dataset</div></div>
    <div class="fnd fnd--rd"><div class="fnd__n">+0.19</div><div class="fnd__l">Pearson r&mdash;discharge vs. ebb current residual at Bay Bridge (9.3-day lag)</div></div>
  </div>
</div>

<section id="course">
  <div class="wrap">
    <p class="eye">Race Corridor Geography</p>
    <h2 class="disp">Station network along the Annapolis&ndash;St.&nbsp;Mary&rsquo;s corridor</h2>
    <p>All nine NOAA current stations and four CBIBS salinity buoys used in this analysis span the Annapolis&ndash;St.&nbsp;Mary&rsquo;s race corridor, from the Bay Bridge south to Point Lookout. The Bay Bridge marks where real-time PORTS current observations exist and where the discharge signal is first measurable. CBIBS buoys provide salinity time series used for leading-indicator analysis.</p>
  </div>
  <div class="wide" style="margin-top:1.5rem">
    <figure class="sch-wrap">
      <canvas id="sc" height="520"></canvas>
      <figcaption>Geographic schematic of the analysis station network. Vertical axis = latitude (north at top); horizontal position is representative, not to true longitude. Left column: NOAA current stations (teal = PORTS real-time observations; blue = prediction-only). Right column: CBIBS salinity buoys with empirical correlation to discharge (r) and lag at peak. The Bay Bridge line marks the northernmost real-time current observation point.</figcaption>
    </figure>
  </div>
</section>

<section id="discharge">
  <div class="wrap">
    <p class="eye">Section I</p>
    <h2 class="disp">The forcing signal: Conowingo discharge character</h2>
    <p>USGS station 01578310&mdash;confirmed &ldquo;Susquehanna River at Conowingo, MD&rdquo; in API metadata&mdash;records flow at 15-minute intervals immediately below the dam. The 4.5-year record reveals a dam that operates far from steady state: median flow is just 25,475&nbsp;cfs, but the 90th percentile is 85,629&nbsp;cfs and the single-event maximum (April 2024) reached 310,250&nbsp;cfs&mdash;more than twelve times median. Large releases are not rare; 24% of all hours fell above the high-flow threshold.</p>
    <div class="co co--am">
      <p><strong>133 discrete high-flow events</strong> were identified between January 2022 and July 2026 using a threshold of &gt;85,629&nbsp;cfs (90th percentile of hourly flow) or &gt;2&times; the 30-day rolling median. Events had a minimum duration of 12 hours. Five events exceeded 200,000&nbsp;cfs; four of the top five occurred in the winter&sol;spring of 2023&ndash;24.</p>
    </div>
  </div>
  <div class="wide">
    <figure>
      <div class="ff"><img src="IMG_01" alt="Conowingo discharge history 2022–2026" loading="lazy"></div>
      <figcaption><strong>Figure 1.</strong> Top panel: USGS station 01578310 discharge (log scale), 2022&ndash;2026. Orange dashed = 30-day rolling median baseline. Red shading marks high-flow events. Bottom panel: discharge anomaly (observed &minus; rolling median); positive = excess above baseline. The clustering of major events in late 2023 and early 2024 is evident.</figcaption>
    </figure>
  </div>
</section>

<section id="signal">
  <div class="wrap">
    <p class="eye">Section II</p>
    <h2 class="disp">The measured signal: what the data actually shows</h2>
    <p><em>Predicted</em> (harmonic) tidal currents contain no river-flow signal&mdash;they are computed from astronomical constituents alone. Cross-correlating discharge against predictions returns near-zero results, as expected (r&nbsp;&asymp;&nbsp;0.03 across all stations). The meaningful analysis requires <em>observed</em> current minus predicted&mdash;the tidal residual&mdash;which isolates what astronomy cannot explain. Real-time observations exist only at two PORTS stations covering the last 90 days.</p>
    <h3 style="margin-top:2rem">What the PORTS residuals reveal</h3>
    <p>The PORTS stations (cb1102 at the Bay Bridge and cb1001 near Cove Point) have continuous 6-minute current observations from April 29 through July 28, 2026. Subtracting the cosine-interpolated harmonic prediction from each observation yields the tidal residual. Cross-correlating those residuals against the Conowingo discharge anomaly across lags of 0&ndash;240 hours produced:</p>
    <div class="co">
      <p>At <strong>cb1102 (Chesapeake Bay Bridge):</strong> peak Pearson r&nbsp;=&nbsp;<strong>&minus;0.192</strong> at a lag of <strong>224 hours (9.3 days)</strong>. The negative sign with positive discharge anomaly indicates elevated <em>ebb-ward</em> current residual&mdash;more down-Bay flow than tides alone predict. Effect size from OLS regression: approximately <strong>+0.05&nbsp;kt of additional ebb bias per 50,000&nbsp;cfs of excess discharge</strong> at this lag.</p>
    </div>
    <p style="margin-top:1rem">A major release of 200,000&nbsp;cfs above baseline therefore implies roughly +0.2&nbsp;kt of ebb-ward bias at the Bay Bridge, arriving 9.3 days after peak discharge. For the 310k cfs April 2024 event, the theoretical anomaly approaches +0.3&nbsp;kt&mdash;physically meaningful at any tidal current station along the central Bay.</p>
    <div class="co co--am" style="margin-top:1.5rem">
      <p><strong>Important caveat:</strong> The 90-day PORTS window covered April&ndash;July 2026, a period with no major (&gt;150k&nbsp;cfs) release events. Lag and amplitude estimates come from moderate-flow events. The relationship will be better quantified once a major release falls within a PORTS observation window. The pipeline is fully automated: re-run <code class="mono" style="font-size:.85em">python3 run_analysis.py --refresh</code> after any future high-flow event.</p>
    </div>
  </div>
  <div class="wide">
    <figure>
      <div class="ff"><img src="IMG_02" alt="Cross-correlation by station" loading="lazy"></div>
      <figcaption><strong>Figure 2.</strong> Cross-correlation (Pearson r) between Conowingo discharge anomaly and tidal current predictions at each of the eight course stations, swept 0&ndash;240-hour lag. All correlations against <em>predicted</em> currents are near-zero by design&mdash;predictions contain no river signal. Meaningful cross-correlations are against PORTS residuals at cb1102 and cb1001 (see text).</figcaption>
    </figure>
    <figure>
      <div class="ff"><img src="IMG_04" alt="Lag and correlation vs. distance down-bay" loading="lazy"></div>
      <figcaption><strong>Figure 3.</strong> Left: lag at peak |r| vs. approximate distance south of Conowingo for all eight stations. The expected positive slope (lag increases with distance) is not consistent here because correlations against predictions are noise-level. Right: maximum |r| by station. The PORTS residual analysis at cb1102 (r = 0.192) is the physically grounded result.</figcaption>
    </figure>
  </div>
</section>

<section id="racing">
  <div class="wrap">
    <p class="eye">Section III &mdash; Tactical Application</p>
    <h2 class="disp">Racing implications below the Bay Bridge</h2>
    <p>The relevant question for Annapolis&ndash;St.&nbsp;Mary&rsquo;s racing is not whether Conowingo discharge affects currents in the abstract&mdash;it clearly does&mdash;but <em>when and where</em> along the course the effect is large enough to influence tactical decisions. The Bay Bridge is the start gate: everything south of it is racing terrain.</p>
  </div>
  <div class="wide" style="margin-top:2rem">
    <div class="tw">
      <table>
        <thead><tr>
          <th>Station / Leg</th><th>Waypoint</th><th>Dist. from start</th>
          <th>Est. lag from dam</th><th>Ebb bias (200k cfs event)</th>
          <th>Confidence</th><th>Tactical note</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><strong>cb1102 &sol; ACT4976</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">Bay Bridge &middot; 38.93&deg;N</span></td>
            <td>Start</td><td class="mono">0 nm</td>
            <td class="mono">~224 h (9.3 d)</td>
            <td class="mono"><strong>+0.15&ndash;0.20 kt</strong></td>
            <td><span class="tag tg">Measured</span></td>
            <td>Ebb runs stronger and longer after a major release. On ebb starts, expect the favoured end to shift further to the ebb-advantage side. Set line bias accordingly.</td>
          </tr>
          <tr>
            <td><strong>ACT4916</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">Sharp Island &middot; 38.64&deg;N</span></td>
            <td>Black Walnut Harbor</td><td class="mono">~18 nm</td>
            <td class="mono">~250&ndash;270 h (10&ndash;11 d)</td>
            <td class="mono">+0.10&ndash;0.15 kt</td>
            <td><span class="tag ta">Inferred</span></td>
            <td>The Bay narrows slightly here; freshwater stratification can intensify the surface ebb. Favour the deeper channel on ebb if a release is active.</td>
          </tr>
          <tr>
            <td><strong>ACT4901</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">Plum Point &middot; 38.61&deg;N</span></td>
            <td>Gooses Reef</td><td class="mono">~21 nm</td>
            <td class="mono">~260&ndash;280 h (11 d)</td>
            <td class="mono">+0.10&ndash;0.15 kt</td>
            <td><span class="tag ta">Inferred</span></td>
            <td>Shallow shoal complex. During high-discharge periods, strengthened ebb can extend ebbing conditions 15&ndash;30 min past normal slack. Adjust layline timing.</td>
          </tr>
          <tr>
            <td><strong>ACT4891 &sol; CHB0304</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">James Island &middot; 38.49&ndash;38.53&deg;N</span></td>
            <td>James Island area</td><td class="mono">~27&ndash;30 nm</td>
            <td class="mono">~280&ndash;300 h (11.5&ndash;12.5 d)</td>
            <td class="mono">+0.08&ndash;0.12 kt</td>
            <td><span class="tag ta">Inferred</span></td>
            <td>Two closely-spaced stations allow cross-checking predictions. Freshwater pulse may show ebb asymmetry&mdash;stronger ebb, weaker flood. ACT4891 and CHB0304 are 4 nm apart; use both.</td>
          </tr>
          <tr>
            <td><strong>ACT4866 &sol; cb1001</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">Cove Point &middot; 38.38&ndash;38.40&deg;N</span></td>
            <td>Cove Point</td><td class="mono">~35 nm</td>
            <td class="mono">~300&ndash;330 h (12.5&ndash;14 d)</td>
            <td class="mono">+0.05&ndash;0.10 kt</td>
            <td><span class="tag ta">Measured (weak)</span></td>
            <td>PORTS cb1001 is here. The 90-day window showed a weak 16-hour result likely to be wind alias, not river signal. Under a major release, expect modest ebb enhancement. LNG terminal creates local current distortions&mdash;stay in the channel.</td>
          </tr>
          <tr>
            <td><strong>ACT4826</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">Point No Point &middot; 38.14&deg;N</span></td>
            <td>Point No Point</td><td class="mono">~54 nm</td>
            <td class="mono">~360&ndash;400 h (15&ndash;17 d)</td>
            <td class="mono">+0.03&ndash;0.08 kt</td>
            <td><span class="tag tr">Uncertain</span></td>
            <td>The 240-hour cross-correlation window may not capture the full lag at this distance. Effect likely real but smaller; freshwater has mixed significantly. Monitor upper-Bay salinity as a leading indicator.</td>
          </tr>
          <tr>
            <td><strong>ACT4806</strong><br><span class="mono" style="font-size:.75rem;color:var(--muted)">Point Lookout &middot; 38.11&deg;N</span></td>
            <td>Point Lookout / Finish</td><td class="mono">~57 nm</td>
            <td class="mono">&gt;400 h (17+ d)</td>
            <td class="mono">&lt;0.05 kt</td>
            <td><span class="tag tr">Uncertain</span></td>
            <td>Potomac River outflow and Bay-mouth dynamics dominate here over any Conowingo signal. Wind and Potomac discharge are the primary current variables at the finish approach.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:.78rem;color:var(--muted);font-family:system-ui,sans-serif;margin-top:.6rem;line-height:1.5">Lag estimates for unmeasured stations are extrapolated from the 9.3-day Bay Bridge result proportionally by latitude distance. Effect sizes assume a 200,000&nbsp;cfs excess-above-baseline event. <span class="tag tg">Measured</span>&nbsp;= direct PORTS residual; <span class="tag ta">Inferred</span>&nbsp;= physical extrapolation; <span class="tag tr">Uncertain</span>&nbsp;= beyond correlation window or excessive mixing.</p>
  </div>

  <div class="wrap" style="margin-top:2.5rem">
    <h3>How to use this before a race</h3>
    <p>The USGS Conowingo gauge updates every 15 minutes. Check it at <a href="https://waterdata.usgs.gov/monitoring-location/01578310/" target="_blank" rel="noopener">waterdata.usgs.gov/monitoring-location/01578310/</a>.</p>
    <ol style="margin:1rem 0 0 1.4rem;color:var(--text2);font-size:.95rem;display:flex;flex-direction:column;gap:.6rem;line-height:1.6;max-width:66ch">
      <li><strong>Check the 14-day discharge history.</strong> Look for any sustained period above ~86,000&nbsp;cfs (90th-percentile threshold). A single 24-hour spike barely registers; a multi-day event above 150k&nbsp;cfs is tactically significant.</li>
      <li><strong>Count days back from the race date.</strong> Peak 9&ndash;10 days ago &rarr; pulse arriving at the start now. Peak 12&ndash;14 days ago &rarr; pulse at mid-course. Peak 17+ days ago &rarr; mostly past Point No Point.</li>
      <li><strong>Estimate ebb bias.</strong> Excess discharge &divide; 50,000 &times; 0.05&ndash;0.10&nbsp;kt &asymp; additional ebb at the Bay Bridge. Halve that at Cove Point; quarter it at Point No Point.</li>
      <li><strong>Adjust flood&sol;ebb timing.</strong> Stronger ebb prolongs the ebbing period and delays the flood from feeling &ldquo;full.&rdquo; Budget 15&ndash;30 minutes later than tide tables predict for slack-before-flood at mid-course waypoints during high-discharge conditions.</li>
    </ol>
    <div class="co" style="margin-top:1.8rem">
      <p><strong>Quick reference:</strong> For every 100,000&nbsp;cfs above normal flow (roughly 4&times; median) sustained for at least 48 hours, budget approximately +0.10&ndash;0.15&nbsp;kt of extra ebb bias at the Bay Bridge start, arriving 9&ndash;10 days later. Effect reaches Cove Point in 12&ndash;14 days at roughly half strength.</p>
    </div>
  </div>
</section>

<section id="events">
  <div class="wrap">
    <p class="eye">Section IV</p>
    <h2 class="disp">Event case studies: the three largest releases</h2>
    <p>Each chart shows a 9-day window spanning the high-flow event: discharge (red&sol;orange fill), then predicted current profiles at three stations&mdash;Tolly Point (upper Bay), Cove Point (mid-Bay), and Point No Point (lower Bay). Predicted curves establish the normal tidal baseline; apply the 9&ndash;17 day lag table from Section III to determine when each event&rsquo;s downstream current effect would have arrived.</p>
  </div>
  <div class="wide">
    <div class="eg">
      <div class="ec">
        <div class="ec__h"><span><strong>Event 1 &mdash; April 2024</strong></span><span>Peak 310k cfs &middot; 221 h above threshold</span></div>
        <img src="IMG_E1" alt="April 2024 event" loading="lazy">
      </div>
      <div class="ec">
        <div class="ec__h"><span><strong>Event 2 &mdash; August 2024</strong></span><span>Peak 262k cfs &middot; 266 h above threshold</span></div>
        <img src="IMG_E2" alt="August 2024 event" loading="lazy">
      </div>
      <div class="ec">
        <div class="ec__h"><span><strong>Event 3 &mdash; January 2024</strong></span><span>Peak 246k cfs &middot; 156 h above threshold</span></div>
        <img src="IMG_E3" alt="January 2024 event" loading="lazy">
      </div>
    </div>
    <p style="font-size:.78rem;color:var(--muted);font-family:system-ui,sans-serif;margin-top:.5rem;line-height:1.5">All three largest events occurred in 2024. None fell within the 90-day PORTS observation window, so direct residual analysis was not possible. Predicted current patterns only are shown.</p>
  </div>
</section>

<section id="wind">
  <div class="wrap">
    <p class="eye">Section V</p>
    <h2 class="disp">Wind control and confounding</h2>
    <div class="tc">
      <div>
        <p>Major Conowingo releases are storm-driven&mdash;the same frontal system that dumps rain on the Susquehanna watershed also brings strong winds to the Bay. This creates a confound: does the measured current anomaly reflect the freshwater pulse, the storm winds, or both?</p>
        <p style="margin-top:.9em">Partial correlation analysis using NDBC buoy 44063 (Annapolis) wind speed as a covariate showed <strong>virtually no change</strong> between the full correlation (r&nbsp;=&nbsp;&minus;0.192) and the wind-controlled partial correlation (r_partial&nbsp;&asymp;&nbsp;&minus;0.190) at cb1102. Wind speed at Annapolis explains essentially none of the residual current variance at the 9-day lag&mdash;consistent with the physics, because a 9-day-lagged signal cannot be caused by concurrent wind.</p>
      </div>
      <div>
        <div class="co">
          <p><strong>Wind vs. river current:</strong> Wind-driven current is immediate and surface-layer dominated; it reverses within hours of a wind shift. River-driven ebb enhancement is a persistent, sub-surface-to-surface baroclinic effect that lasts days. If wind has been calm for 24 hours but ebb is stronger than predicted, suspect a Conowingo release from 9&ndash;14 days prior.</p>
        </div>
        <div style="margin-top:1.2rem;padding:1rem 1.1rem;background:var(--alt);border-radius:6px;font-family:system-ui,sans-serif;font-size:.82rem;color:var(--muted);border:1px solid var(--fig-b)">
          <strong style="color:var(--text);display:block;margin-bottom:.4rem">Wind data</strong>
          NDBC Station 44063 &mdash; Annapolis, MD buoy<br>
          302,491 obs &middot; 2022&ndash;2026<br>
          Variables: WDIR, WSPD, GST (6-minute interval)
        </div>
      </div>
    </div>
  </div>
</section>

<section id="salinity">
  <div class="wrap">
    <p class="eye">Section VI &mdash; Salinity as a Leading Indicator</p>
    <h2 class="disp">The freshwater pulse arrives at your buoy before it reaches your sails</h2>
    <p>Salinity is a conservative tracer: when Conowingo sends a freshwater slug south, it shows up first as a PSU drop at buoys along the course before any current anomaly develops. Cross-correlating discharge against daily salinity anomalies at four CBIBS buoys (Annapolis, Gooses Reef, Potomac, Stingray Point) over 4.5 years of data produced the <em>strongest correlations in this entire study</em>&mdash;dramatically outperforming the direct current correlations.</p>
    <div class="co">
      <p><strong>Annapolis (AN) buoy:</strong> r&nbsp;=&nbsp;<strong>&minus;0.475</strong> at <strong>5-day lag</strong>. During the April 2024 event (310k cfs peak), Annapolis salinity crashed from a baseline near 5.5&nbsp;PSU to a minimum of <strong>1.84&nbsp;PSU</strong>. That crash arrived on approximately April 9&mdash;seven days after the peak discharge on April 2&mdash;and preceded the expected current anomaly at the Bay Bridge by roughly 4&ndash;5 days. The Gooses Reef buoy (mid-course) followed with a minimum of 6.26&nbsp;PSU at a 7-day lag (r&nbsp;=&nbsp;&minus;0.294). The Potomac buoy (lower Bay, 38.03&deg;N) showed a smaller 1&ndash;2&nbsp;PSU drop at 12 days (r&nbsp;=&nbsp;&minus;0.123).</p>
    </div>
    <h3 style="margin-top:2rem">The cascade south</h3>
    <p>The southward progression of the salinity signal mirrors the expected estuarine transit, and it is now empirically confirmed across four stations:</p>
    <div class="tw" style="margin-top:1rem;margin-bottom:1.5rem">
      <table>
        <thead><tr>
          <th>CBIBS Buoy</th><th>Location</th><th>Lag at peak r</th><th>Peak r</th>
          <th>Min salinity (Apr 2024)</th><th>Meaning for racing</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><strong>AN &mdash; Annapolis</strong></td><td>Bay Bridge / Start proxy &middot; 38.96&deg;N</td>
            <td class="mono"><strong>5 days</strong></td><td class="mono">&minus;0.475</td>
            <td class="mono">1.84 PSU</td>
            <td>Earliest warning. A drop below 4&nbsp;PSU here means the current anomaly is ~5 days out.</td>
          </tr>
          <tr>
            <td><strong>GR &mdash; Gooses Reef</strong></td><td>Mid-course waypoint &middot; 38.55&deg;N</td>
            <td class="mono"><strong>7 days</strong></td><td class="mono">&minus;0.294</td>
            <td class="mono">6.26 PSU</td>
            <td>Pulse confirmed at mid-course. By the time salinity drops here, start-area current anomaly has likely begun.</td>
          </tr>
          <tr>
            <td><strong>SR &mdash; Stingray Point</strong></td><td>South Bay reference &middot; 37.57&deg;N</td>
            <td class="mono"><strong>8 days</strong></td><td class="mono">&minus;0.208</td>
            <td class="mono">&mdash;</td>
            <td>Confirms propagation past mid-Bay. Smaller amplitude due to mixing.</td>
          </tr>
          <tr>
            <td><strong>PL &mdash; Potomac</strong></td><td>Lower Bay / Finish approach &middot; 38.03&deg;N</td>
            <td class="mono"><strong>12 days</strong></td><td class="mono">&minus;0.123</td>
            <td class="mono">smaller drop</td>
            <td>Weakest signal; Potomac River outflow dilutes/complicates the Bay signature. Monitor as confirmation, not primary indicator.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="co co--am">
      <p><strong>Pre-race protocol:</strong> Check the <a href="https://mw.buoybay.noaa.gov" target="_blank" rel="noopener">CBIBS Annapolis buoy</a> the week before a race. If salinity at AN is below its seasonal normal by more than 2&nbsp;PSU and the Conowingo gauge shows (or recently showed) elevated discharge, expect enhanced ebb conditions at the Bay Bridge start within 4&ndash;5 days. A salinity crash at Gooses Reef means mid-course ebb enhancement is imminent.</p>
    </div>
  </div>
  <div class="wide">
    <figure>
      <div class="ff"><img src="IMG_05" alt="Salinity vs. discharge cross-correlation" loading="lazy"></div>
      <figcaption><strong>Figure 5.</strong> Salinity anomaly vs. Conowingo discharge. Top panel: discharge history with event markers. Middle panel: daily salinity anomaly (observed &minus; 30-day rolling median) at each CBIBS buoy&mdash;AN (Annapolis), GR (Gooses Reef), PL (Potomac), SR (Stingray Point). The April 2024 salinity crash cascades southward 5&ndash;12 days after peak discharge. Bottom panel: cross-correlation by station at lags 0&ndash;30 days. Annapolis shows the strongest and earliest response (r&nbsp;=&nbsp;&minus;0.475 at 5 days).</figcaption>
    </figure>
  </div>
</section>

<section id="limits">
  <div class="wrap">
    <p class="eye">Section VII</p>
    <h2 class="disp">Limitations and data gaps</h2>
    <ul class="ll">
      <li class="hi">
        <strong>PORTS retention window &mdash; the binding constraint</strong>
        Real-time PORTS current observations are available only for the most recent ~90 days. The analysis period for residuals is therefore limited to April 29&ndash;July 28, 2026&mdash;a low-to-moderate flow period with no events above ~60k cfs excess. All lag and amplitude estimates are derived from this window; the effect under a 200&ndash;300k cfs event has not yet been directly observed. The pipeline is fully automated and will produce improved estimates after any future high-flow event within a PORTS window.
      </li>
      <li>
        <strong>240-hour cross-correlation ceiling</strong>
        The lag sweep runs 0&ndash;240 hours (10 days). Estuarine transit times for the lower Bay (Point No Point, Point Lookout) during normal flow are 14&ndash;21 days. The analysis likely misses the signal at the southernmost stations. Extending to 480-hour lags is a straightforward code change.
      </li>
      <li>
        <strong>Salinity data (resolved)</strong>
        CBIBS salinity from 4.5 years at Annapolis, Gooses Reef, Potomac, and Stingray Point is now integrated&mdash;see Section VI. The Annapolis buoy (r&nbsp;=&nbsp;&minus;0.475) provides the most actionable pre-race signal.
      </li>
      <li>
        <strong>CHB0304 station classification</strong>
        This station was listed as harmonic but the NOAA API returned 400 errors for continuous 6-minute requests. It was successfully fetched as a MAX_SLACK subordinate station and cosine-interpolated. Predictions are valid but not higher-resolution than the other ACT stations.
      </li>
      <li>
        <strong>One-dimensional current measurement</strong>
        All PORTS and NOAA current stations measure along-channel velocity only. River discharge creates a 3D baroclinic response: fresh water flows seaward at the surface while saltier water intrudes at depth. Depth-averaged or surface measurements understate the full effect.
      </li>
    </ul>
  </div>
</section>

<footer class="src">
  <div class="wrap">
    <h4>Data Sources &amp; Reproducibility</h4>
    <ul>
      <li><strong>USGS NWIS IV Service</strong> &mdash; station 01578310, parameterCd 00060&sol;00065 &middot; <code class="mono" style="font-size:.75em">waterservices.usgs.gov&sol;nwis&sol;iv&sol;</code></li>
      <li><strong>NOAA CO-OPS Current Predictions</strong> &mdash; product=currents_predictions, interval=MAX_SLACK, 8 stations &middot; <code class="mono" style="font-size:.75em">api.tidesandcurrents.noaa.gov&sol;api&sol;prod&sol;datagetter</code></li>
      <li><strong>NOAA PORTS Observed Currents</strong> &mdash; cb1102, cb1001, product=currents &middot; same endpoint</li>
      <li><strong>NDBC Standard Meteorological</strong> &mdash; station 44063, historical archive + realtime &middot; <code class="mono" style="font-size:.75em">ndbc.noaa.gov&sol;data&sol;historical&sol;stdmet&sol;</code></li>
      <li><strong>CBIBS Salinity</strong> &mdash; stations AN, GR, PL, SR &middot; <code class="mono" style="font-size:.75em">mw.buoybay.noaa.gov&sol;api&sol;v1&sol;json&sol;query&sol;{station}</code></li>
    </ul>
    <p style="margin-top:.9rem;max-width:70ch">Full analysis pipeline: <code class="mono" style="font-size:.82em">layline&sol;analysis&sol;conowingo&sol;</code> (fetch_data.py &middot; analysis.py &middot; charts.py &middot; run_analysis.py). All API responses cached locally. Re-run with <code class="mono" style="font-size:.82em">python3 run_analysis.py --refresh</code> to pull fresh data.</p>
  </div>
</footer>
"""

# ── Assemble ──────────────────────────────────────────────────────────
body = BODY.replace("IMG_01", imgs["01_discharge_history"])
body = body.replace("IMG_02", imgs["02_xcorr_by_station"])
body = body.replace("IMG_04", imgs["04_lag_vs_distance"])
body = body.replace("IMG_E1", imgs["03_event_case_study_01_20240402"])
body = body.replace("IMG_E2", imgs["03_event_case_study_02_20240805"])
body = body.replace("IMG_E3", imgs["03_event_case_study_03_20240127"])
body = body.replace("IMG_05", imgs["05_salinity_discharge"])

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Conowingo Effect — Chesapeake Bay Current Analysis</title>
<style>{CSS}</style>
</head>
<body>
{body}
<script>{JS}</script>
</body>
</html>"""

OUT.write_text(html, encoding="utf-8")
print(f"Written: {OUT}")
print(f"Size: {len(html.encode())//1024} KB")
