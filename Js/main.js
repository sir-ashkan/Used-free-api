// main.js — improved visuals + image fallback + preview helper
const API_BASE = 'http://localhost:3000';

const $ = sel => document.querySelector(sel);
const locationsListEl = $('#locations-list');
const nationalContentEl = $('#national-content');
const detailContentEl = $('#detail-content');
const detailCityEl = $('#detail-city');
const closeDetailBtn = $('#close-detail');
const imageTagsEl = $('#image-tags');
const searchInput = $('#search');
const searchBtn = $('#search-btn');
const loadAllBtn = $('#load-all-btn');
const shuffleBtn = $('#shuffle-btn');
const previewFile = $('#img-preview-file');
const previewArea = $('#preview-area');

let allLocations = [];

// Utility: safe image loader with fallback
function setImgWithFallback(imgEl, src, fallback = 'images/placeholder.jpg'){
  imgEl.src = src;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = fallback;
  };
}

// small helper to shuffle array
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }

async function fetchNational(){
  try{
    const res = await fetch(`${API_BASE}/national`);
    if(!res.ok) throw new Error('national fetch failed');
    const data = await res.json();
    renderNational(data);
  } catch(err){
    nationalContentEl.innerHTML = `<p class="muted">Could not load national data: ${err.message}</p>`;
  }
}

function renderNational(data){
  nationalContentEl.innerHTML = `
    <div style="display:flex;gap:18px;align-items:center">
      <div style="flex:0 0 120px;padding:8px;border-radius:10px;background:linear-gradient(180deg,#fff,#f7fbff);text-align:center;box-shadow:0 8px 26px rgba(12,18,40,0.04)">
        <div style="font-size:22px;font-weight:700">${Math.round(data.avgTemp)}°F</div>
        <div class="muted small">Avg Temp</div>
      </div>
      <div>
        <div><strong>Hotspots:</strong> ${data.hotspots.join(', ')}</div>
        <small class="muted">Updated: ${data.updated}</small>
      </div>
    </div>
  `;
}

async function loadLocations(limit = 50){
  locationsListEl.innerHTML = '<p>Loading…</p>';
  try{
    const res = await fetch(`${API_BASE}/locations?_limit=${limit}`);
    if(!res.ok) throw new Error('locations failed');
    const data = await res.json();
    allLocations = data;
    renderLocations(data);
    renderImageTags(data);
  }catch(err){
    locationsListEl.innerHTML = `<p class="muted">Error loading locations: ${err.message}</p>`;
  }
}

function renderLocations(locations){
  locationsListEl.innerHTML = '';
  if(locations.length === 0){
    locationsListEl.innerHTML = '<p>No results</p>';
    return;
  }
  locations.forEach(loc => {
    const tile = document.createElement('div');
    tile.className = 'location-tile';
    tile.setAttribute('data-id', loc.id);

    const media = document.createElement('div');
    media.className = 'tile-media';
    const img = document.createElement('img');
    // set image with fallback
    setImgWithFallback(img, `images/${loc.image}`, 'images/placeholder.jpg');
    img.alt = `${loc.city} image`;

    media.appendChild(img);

    const body = document.createElement('div');
    body.className = 'tile-body';
    const info = document.createElement('div');
    info.innerHTML = `<div class="city-name">${loc.city}, ${loc.state}</div><div class="city-meta">${loc.condition} · ${Math.round(loc.current.temp)}°F</div>`;
    const actions = document.createElement('div');
    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', (e) => { e.stopPropagation(); showDetail(loc.id); });
    actions.appendChild(viewBtn);

    body.appendChild(info);
    body.appendChild(actions);

    tile.appendChild(media);
    tile.appendChild(body);

    tile.addEventListener('click', () => showDetail(loc.id));

    locationsListEl.appendChild(tile);
  });
}

function renderImageTags(locations){
  const tags = [...new Set(locations.map(l => l.image).filter(Boolean))];
  imageTagsEl.innerHTML = '';
  tags.forEach(t => {
    const li = document.createElement('li');
    li.textContent = `${t}  — put your file in /images/${t}`;
    imageTagsEl.appendChild(li);
  });
}

async function showDetail(id){
  const loc = allLocations.find(l => l.id === id);
  if(!loc){
    detailContentEl.innerHTML = '<p>Location not found</p>';
    return;
  }
  detailCityEl.textContent = `${loc.city}, ${loc.state}`;
  detailContentEl.innerHTML = `<p>Loading details…</p>`;
  try{
    const res = await fetch(`${API_BASE}/locations/${id}`);
    if(!res.ok) throw new Error('detail fetch failed');
    const data = await res.json();
    renderDetail(data);
  } catch(err){
    detailContentEl.innerHTML = `<p class="muted">Could not load details: ${err.message}</p>`;
  }
}

function renderDetail(d){
  const imgHtml = `<div style="margin-bottom:12px;border-radius:10px;overflow:hidden"><img src="images/${d.image}" alt="${d.city}" onerror="this.src='images/placeholder.jpg'" style="width:100%;height:220px;object-fit:cover;display:block" /></div>`;

  const curHtml = `
    <div class="current">
      ${imgHtml}
      <p><strong>${d.condition}</strong> · ${Math.round(d.current.temp)}°F</p>
      <p>Feels like: ${Math.round(d.current.feels_like)}°F · Humidity: ${d.current.humidity}% · Wind: ${d.current.wind} mph</p>
    </div>
  `;
  const hourly = (d.hourly || []).slice(0,8).map(h => `<li>${h.time} — ${Math.round(h.temp)}°F · ${h.condition}</li>`).join('');
  const daily = (d.daily || []).map(day => `<li><strong>${day.date}</strong> — H: ${Math.round(day.high)}°F L: ${Math.round(day.low)}°F · ${day.condition}</li>`).join('');
  detailContentEl.innerHTML = `
    ${curHtml}
    <h4>Next hours</h4>
    <ul>${hourly}</ul>
    <h4>7-day</h4>
    <ul>${daily}</ul>
  `;
}

// search & controls
function runSearch(q){
  q = (q||'').trim().toLowerCase();
  if(!q){
    renderLocations(allLocations.slice(0,20));
    return;
  }
  const results = allLocations.filter(l => l.city.toLowerCase().includes(q) || l.state.toLowerCase().includes(q) || String(l.zip).includes(q));
  renderLocations(results);
}

// preview uploader (client-side only)
previewFile.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if(!f){ previewArea.innerHTML = '<small>No preview</small>'; return; }
  const url = URL.createObjectURL(f);
  previewArea.innerHTML = `<img src="${url}" style="max-width:100%;height:120px;object-fit:cover;border-radius:8px" alt="preview" /> <div style="font-size:12px;margin-top:6px">${f.name} (local preview only) </div>`;
});

// events
searchBtn.addEventListener('click', () => runSearch(searchInput.value));
searchInput.addEventListener('keydown', e => { if(e.key === 'Enter') runSearch(searchInput.value); });
closeDetailBtn.addEventListener('click', () => {
  detailCityEl.textContent = 'Select a city';
  detailContentEl.innerHTML = '<p>Click a city to see current conditions and 7-day forecast.</p>';
});
loadAllBtn.addEventListener('click', () => loadLocations(200));
shuffleBtn.addEventListener('click', () => {
  allLocations = shuffle(allLocations);
  renderLocations(allLocations.slice(0,20));
});

// boot
fetchNational();
loadLocations();
