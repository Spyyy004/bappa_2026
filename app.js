const $ = (id) => document.getElementById(id);
const D = $('date'), B = $('budget'), M = $('mode'), S = $('start'), R = $('route'), C = $('cards'), F = $('filters');

for (let d = new Date('2026-09-14T00:00:00'); d <= new Date('2026-09-25T00:00:00'); d.setDate(d.getDate() + 1)) {
  const o = document.createElement('option');
  o.value = d.toISOString().slice(0,10);
  o.textContent = d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
  D.appendChild(o);
}

let map = null;
let markers = [];
if (window.L) {
  map = L.map('map').setView([19.0,72.84],12.7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);
}

function redraw(){
  if (!map) { $('map').innerHTML = '<div class="map-fallback">Map tiles could not load. Route planning still works.</div>'; return; }
  markers.forEach(m => m.remove()); markers=[];
  PANDALS.forEach(p => {
    const m = L.marker([p.lat,p.lng]).addTo(map).bindPopup(`<b>${p.name}</b><br>${p.area}<br>Est. queue: ${p.queue?.mukh || 15} min`);
    markers.push(m);
  });
  $('mapnote').textContent = `${PANDALS.length} curated stops`;
}

function dist(a,b){
  const earth=6371, x=(b.lat-a.lat)*Math.PI/180, y=(b.lng-a.lng)*Math.PI/180;
  const z=Math.sin(x/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(y/2)**2;
  return 2*earth*Math.asin(Math.sqrt(z));
}

let browserLocation = null;
function anchor(){
  if (browserLocation && S.value === 'My location') return browserLocation;
  const q=S.value.toLowerCase();
  const known=[['dadar',19.019,72.843],['andheri',19.12,72.847],['cst',18.94,72.835],['csmt',18.94,72.835],['churchgate',18.932,72.826],['matunga',19.028,72.855],['sion',19.043,72.863],['parel',19.004,72.841],['lalbaug',19.001,72.838],['khetwadi',18.957,72.821],['chembur',19.063,72.899],['charni',18.954,72.819]];
  const a=known.find(x=>q.includes(x[0]));
  return a ? {lat:a[1],lng:a[2],label:a[0]} : {lat:19.019,lng:72.843,label:'Dadar'};
}

function travelMinutes(km){
  const pref=$('transport').value;
  if (pref.includes('walking')) return Math.max(5, Math.round(km*13));
  if (pref.includes('train')) return Math.max(8, Math.round(km*5 + 7));
  if (pref.includes('auto')) return Math.max(6, Math.round(km*5.5));
  if (km < 1.6) return Math.max(5, Math.round(km*13));
  if (km > 5) return Math.max(10, Math.round(km*5 + 7));
  return Math.max(7, Math.round(km*6));
}

function build(){
  let cur=anchor(), left=Number(B.value), out=[];
  let pool=PANDALS.filter(p => (p.availability || [{start:'2026-09-14',end:'2026-09-25'}]).some(w => D.value >= w.start && D.value <= w.end));
  while(pool.length && out.length < 10){
    let best=null, bestScore=-Infinity;
    for(const p of pool){
      const km=dist(cur,p), travel=travelMinutes(km), wait=p.queue?.mukh || 15, cost=travel+wait+(p.darshanMinutes||6);
      if(cost > left) continue;
      let score=(M.value==='icons' ? p.importance*2 : p.importance + p.uniqueness*.4) - km*18 - wait*.7;
      if(M.value==='easy') score -= travel*.7;
      if(score>bestScore){bestScore=score; best={p,travel,wait,cost,km};}
    }
    if(!best) break;
    out.push(best); left -= best.cost; cur=best.p; pool=pool.filter(p=>p.id!==best.p.id);
  }

  const used=Number(B.value)-left;
  R.innerHTML=`<div class="stats"><div class="stat"><b>${out.length}</b><small>pandals</small></div><div class="stat"><b>${Math.floor(used/60)}h ${Math.round(used%60)}m</b><small>planned</small></div><div class="stat"><b>${Math.round(left)}m</b><small>buffer</small></div></div>`;
  out.forEach((x,i)=>{
    const p=x.p, e=document.createElement('div'); e.className='stop';
    e.innerHTML=`<div class="stoptop"><div class="num">${i+1}</div><div><h3>${p.name}</h3><div class="local">${p.localName || ''}</div><div class="meta">${p.area} · ${p.nearestStation}</div><div class="chips"><span class="chip">~${x.wait} min queue</span><span class="chip">${x.travel} min travel</span><span class="chip">${p.bestWindows?.[0] || 'Flexible'}</span></div></div></div><div class="stop-actions"><button class="secondary view-map">View map</button><button class="secondary directions">Directions</button></div>`;
    e.querySelector('.view-map').onclick=()=>{if(map){map.setView([p.lat,p.lng],15); document.querySelector('.map-panel').scrollIntoView({behavior:'smooth'});}};
    e.querySelector('.directions').onclick=()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,'_blank');
    R.appendChild(e);
  });
  if(!out.length) R.insertAdjacentHTML('beforeend','<div class="empty">No route fits this budget/date. Try a longer time budget.</div>');
  $('routeMode').textContent=M.options[M.selectedIndex].text;
}

function renderCards(area='All'){
  const arr=area==='All' ? PANDALS : PANDALS.filter(p=>p.area===area);
  $('count').textContent=`${arr.length} stops`;
  C.innerHTML='';
  arr.forEach(p=>{
    const card=document.createElement('article'); card.className='card';
    card.innerHTML=`<h3>${p.name}</h3><div class="local">${p.localName || ''}</div><p>${p.area} · ${p.nearestStation}</p><div class="chips"><span class="chip">Est. queue ${p.queue?.mukh || 15} min</span><span class="chip">Importance ${p.importance}</span></div><button class="secondary">Build from ${p.nearestStation}</button>`;
    card.querySelector('button').onclick=()=>{S.value=p.nearestStation; build(); window.scrollTo({top:0,behavior:'smooth'});};
    C.appendChild(card);
  });
}

function render(){
  F.innerHTML='';
  ['All', ...new Set(PANDALS.map(p=>p.area))].forEach((area,i)=>{
    const b=document.createElement('button'); b.className=`filter${i===0?' active':''}`; b.textContent=area;
    b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderCards(area);};
    F.appendChild(b);
  });
  renderCards();
}

$('build').onclick=build;
$('locate').onclick=()=>{
  if(!navigator.geolocation){alert('Location is not available in this browser.');return;}
  navigator.geolocation.getCurrentPosition(pos=>{browserLocation={lat:pos.coords.latitude,lng:pos.coords.longitude,label:'My location'};S.value='My location';build();},()=>alert('Could not access your location.'));
};
$('showMap').onclick=()=>{const panel=document.querySelector('.map-panel');panel.classList.toggle('mobile-open'); if(map)setTimeout(()=>map.invalidateSize(),80);};

redraw(); render(); build();
