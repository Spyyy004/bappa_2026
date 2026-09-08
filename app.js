(() => {
  function boot() {
    try {
      const $ = id => document.getElementById(id);
      const D=$('date'), B=$('budget'), M=$('mode'), S=$('start'), R=$('route'), C=$('cards'), F=$('filters');
      if (!D || !B || !M || !S || !R || !C || !F) throw new Error('Planner UI elements are missing');
      const pandals = typeof PANDALS !== 'undefined' ? PANDALS : [];
      if (!pandals.length) throw new Error('Pandal data did not load');

      D.innerHTML='';
      for(let d=new Date('2026-09-14T00:00:00');d<=new Date('2026-09-25T00:00:00');d.setDate(d.getDate()+1)){
        const o=document.createElement('option'); o.value=d.toISOString().slice(0,10); o.textContent=d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}); D.appendChild(o);
      }
      D.value='2026-09-14';

      const START_POINTS=[
        ['dahisar',19.250,72.859],['dahisar east',19.250,72.872],['dahisar west',19.249,72.856],
        ['mira road',19.281,72.871],['miraroad',19.281,72.871],['bhayandar',19.302,72.852],['bhayander',19.302,72.852],
        ['borivali',19.230,72.856],['borivli',19.230,72.856],['kandivali',19.204,72.852],['kandivli',19.204,72.852],
        ['malad',19.187,72.848],['goregaon',19.166,72.849],['jogeshwari',19.135,72.848],['andheri',19.119,72.847],
        ['vile parle',19.100,72.844],['vileparle',19.100,72.844],['santacruz',19.081,72.842],['khar',19.069,72.836],
        ['bandra',19.060,72.836],['mahim',19.043,72.846],['dadar',19.019,72.843],['matunga',19.028,72.855],
        ['sion',19.043,72.863],['kurla',19.072,72.882],['ghatkopar',19.086,72.909],['vikhroli',19.112,72.928],
        ['powai',19.119,72.906],['bhandup',19.145,72.937],['mulund',19.172,72.956],['thane',19.218,72.978],
        ['parel',19.004,72.841],['lalbaug',19.001,72.838],['kalachowki',18.998,72.843],['byculla',18.976,72.832],
        ['mazgaon',18.968,72.843],['cst',18.940,72.835],['csmt',18.940,72.835],['fort',18.932,72.834],
        ['churchgate',18.932,72.826],['colaba',18.916,72.831],['charni road',18.954,72.819],['charni',18.954,72.819],
        ['grant road',18.963,72.815],['mumbai central',18.969,72.819],['tardeo',18.970,72.810],
        ['khetwadi',18.957,72.821],['girgaon',18.955,72.817],['chembur',19.063,72.899],['wadala',19.017,72.858],
        ['vashi',19.077,72.998],['airoli',19.159,72.998],['nerul',19.033,73.019],['navi mumbai',19.033,73.029]
      ];
      const KNOWN_OUTSIDE=['london','delhi','pune','bangalore','bengaluru','hyderabad','kolkata','chennai','goa'];
      let browserLocation=null;

      let map=null, markers=[];
      if(window.L){
        map=L.map('map').setView([19,72.84],12.7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      } else $('map').innerHTML='<div class="map-fallback">Map unavailable right now. Route planning still works.</div>';

      function redraw(){
        if(!map)return;
        markers.forEach(m=>m.remove()); markers=[];
        pandals.forEach(p=>markers.push(L.marker([p.lat,p.lng]).addTo(map).bindPopup(`<b>${p.name}</b><br>${p.area}<br>Est. queue: ${p.queue?.mukh||15} min`)));
        $('mapnote').textContent=`${pandals.length} curated stops`;
      }
      function dist(a,b){const e=6371,x=(b.lat-a.lat)*Math.PI/180,y=(b.lng-a.lng)*Math.PI/180,z=Math.sin(x/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(y/2)**2;return 2*e*Math.asin(Math.sqrt(z));}
      function normalize(q){return q.toLowerCase().trim().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ');}
      function anchor(){
        if(browserLocation)return browserLocation;
        const q=normalize(S.value||'');
        if(!q)return {lat:19.019,lng:72.843,label:'Dadar'};
        const exact=START_POINTS.find(x=>q===x[0]);
        if(exact)return {lat:exact[1],lng:exact[2],label:exact[0]};
        const contains=START_POINTS.find(x=>q.includes(x[0])||x[0].includes(q));
        if(contains)return {lat:contains[1],lng:contains[2],label:contains[0]};
        if(KNOWN_OUTSIDE.some(x=>q===x||q.includes(x))) throw new Error(`“${S.value}” is outside Mumbai. Enter a Mumbai/Thane/Navi Mumbai locality or use your location.`);
        throw new Error(`I couldn't recognise “${S.value}”. Try a locality or station such as Dahisar, Mira Road, Borivali, Andheri, Dadar, Thane or CST.`);
      }
      function travel(km){const p=$('transport').value||'Smart mix';if(p.includes('walking'))return Math.max(5,Math.round(km*13));if(p.includes('train'))return Math.max(8,Math.round(km*5+7));if(p.includes('auto'))return Math.max(6,Math.round(km*5.5));return km<1.6?Math.max(5,Math.round(km*13)):km>5?Math.max(10,Math.round(km*5+7)):Math.max(7,Math.round(km*6));}
      function build(){
        try{
          let cur=anchor(), left=Number(B.value)||240, out=[];
          const pool0=pandals.filter(p=>(p.availability||[{start:'2026-09-14',end:'2026-09-25'}]).some(w=>D.value>=w.start&&D.value<=w.end));
          let pool=[...pool0];
          while(pool.length&&out.length<10){
            let best=null,scoreBest=-Infinity;
            for(const p of pool){const km=dist(cur,p), t=travel(km), wait=p.queue?.mukh||15, cost=t+wait+(p.darshanMinutes||6);if(cost>left)continue;let score=(M.value==='icons'?p.importance*2:p.importance+(p.uniqueness||0)*.4)-km*18-wait*.7;if(M.value==='easy')score-=t*.7;if(score>scoreBest){scoreBest=score;best={p,t,wait,cost};}}
            if(!best)break;out.push(best);left-=best.cost;cur=best.p;pool=pool.filter(p=>p.id!==best.p.id);
          }
          R.innerHTML=`<div class="stats"><div class="stat"><b>${out.length}</b><small>pandals</small></div><div class="stat"><b>${Math.floor((Number(B.value)-left)/60)}h ${Math.round((Number(B.value)-left)%60)}m</b><small>planned</small></div><div class="stat"><b>${Math.round(left)}m</b><small>buffer</small></div></div>`;
          if(cur && browserLocation && map)map.setView([browserLocation.lat,browserLocation.lng],12.7);
          out.forEach((x,i)=>{const p=x.p,e=document.createElement('div');e.className='stop';e.innerHTML=`<div class="stoptop"><div class="num">${i+1}</div><div><h3>${p.name}</h3><div class="local">${p.localName||''}</div><div class="meta">${p.area} · ${p.nearestStation}</div><div class="chips"><span class="chip">~${x.wait} min queue</span><span class="chip">${x.t} min travel</span><span class="chip">${p.bestWindows?.[0]||'Flexible'}</span></div></div></div><div class="stop-actions"><button type="button" class="secondary view-map">View map</button><button type="button" class="secondary directions">Directions</button></div>`;e.querySelector('.view-map').onclick=()=>{if(map){map.setView([p.lat,p.lng],15);document.querySelector('.map-panel').scrollIntoView({behavior:'smooth'});}};e.querySelector('.directions').onclick=()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,'_blank');R.appendChild(e);});
          if(!out.length)R.insertAdjacentHTML('beforeend','<div class="empty">No route fits this budget. Try a longer time budget.</div>');
          $('routeMode').textContent=M.options[M.selectedIndex].text;
        }catch(err){console.error('PandalHop route error:',err);R.innerHTML=`<div class="empty"><b>Could not build the route.</b><br>${err.message}</div>`;}
      }
      function renderCards(area='All'){const arr=area==='All'?pandals:pandals.filter(p=>p.area===area);$('count').textContent=`${arr.length} stops`;C.innerHTML='';arr.forEach(p=>{const card=document.createElement('article');card.className='card';card.innerHTML=`<h3>${p.name}</h3><div class="local">${p.localName||''}</div><p>${p.area} · ${p.nearestStation}</p><div class="chips"><span class="chip">Est. queue ${p.queue?.mukh||15} min</span><span class="chip">Importance ${p.importance}</span></div><button type="button" class="secondary">Build from ${p.nearestStation}</button>`;card.querySelector('button').onclick=()=>{S.value=p.nearestStation;browserLocation=null;build();window.scrollTo({top:0,behavior:'smooth'});};C.appendChild(card);});}
      F.innerHTML='';['All',...new Set(pandals.map(p=>p.area))].forEach((area,i)=>{const b=document.createElement('button');b.type='button';b.className=`filter${i===0?' active':''}`;b.textContent=area;b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderCards(area);};F.appendChild(b);});
      renderCards(); redraw();
      $('build').type='button'; $('build').onclick=e=>{e.preventDefault();browserLocation=null;build();};
      $('locate').onclick=()=>{if(!navigator.geolocation){alert('Location is not available in this browser.');return;}navigator.geolocation.getCurrentPosition(pos=>{browserLocation={lat:pos.coords.latitude,lng:pos.coords.longitude,label:'My location'};S.value='My location';build();},()=>alert('Could not access your location. Please enter your locality instead.'));};
      $('showMap').onclick=()=>{const panel=document.querySelector('.map-panel');panel.classList.toggle('mobile-open');if(map)setTimeout(()=>map.invalidateSize(),80);};
      build();
      window.__PANDALHOP_READY__=true;
      console.log('PandalHop planner ready');
    }catch(err){
      console.error('PandalHop startup error:',err);
      const box=document.getElementById('route'); if(box)box.innerHTML=`<div class="empty"><b>Planner failed to start.</b><br>${err.message}</div>`;
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();