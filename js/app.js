const btn = document.getElementById('searchBtn');
const input = document.getElementById('cityInput');
const result = document.getElementById('weatherResult');
const loader = document.getElementById('loader');
const hourlySection = document.getElementById('hourlySection');
const hourlyList = document.getElementById('hourlyList');
const dailySection = document.getElementById('dailySection');
const dailyList = document.getElementById('dailyList');

// Mapea weathercode de Open-Meteo a iconos y descripciones simples
const weatherCodeMap = {
  0: {icon: '☀️', text: 'Despejado'},
  1: {icon: '🌤️', text: 'Parcialmente nublado'},
  2: {icon: '⛅', text: 'Nublado'},
  3: {icon: '☁️', text: 'Muy nublado'},
  45: {icon: '🌫️', text: 'Niebla'},
  48: {icon: '🌫️', text: 'Deposito de niebla'},
  51: {icon: '🌦️', text: 'Lluvia ligera'},
  53: {icon: '🌧️', text: 'Lluvia moderada'},
  55: {icon: '🌧️', text: 'Lluvia intensa'},
  56: {icon: '🌨️', text: 'Llovizna helada'},
  57: {icon: '🌨️', text: 'Llovizna helada intensa'},
  61: {icon: '🌧️', text: 'Lluvia'},
  63: {icon: '🌧️', text: 'Lluvia'},
  65: {icon: '🌧️', text: 'Lluvia fuerte'},
  66: {icon: '🌨️', text: 'Aguanieve ligera'},
  67: {icon: '🌨️', text: 'Aguanieve fuerte'},
  71: {icon: '❄️', text: 'Nieve ligera'},
  73: {icon: '❄️', text: 'Nieve'},
  75: {icon: '❄️', text: 'Nieve intensa'},
  77: {icon: '🌨️', text: 'Granizo'},
  80: {icon: '🌧️', text: 'Chubascos'},
  81: {icon: '🌧️', text: 'Chubascos'},
  82: {icon: '⛈️', text: 'Tormenta'},
  85: {icon: '❄️', text: 'Nevadas ligeras'},
  86: {icon: '❄️', text: 'Nevadas fuertes'},
  95: {icon: '⛈️', text: 'Tormenta'},
  96: {icon: '⛈️', text: 'Tormenta con granizo'},
  99: {icon: '⛈️', text: 'Tormenta con granizo'}
};

function mapWeather(code){
  return weatherCodeMap[code] || {icon:'❔', text:'Desconocido'};
}

function tempBadgeClass(t){
  if(t <= 8) return 'badge cold';
  if(t <= 20) return 'badge mild';
  return 'badge hot';
}

// Cambia esquema de fondo según weathercode principal
function changeBackgroundByCode(code){
  const root = document.documentElement.style;
  let c1 = '#4facfe', c2 = '#00f2fe';
  let particleColor = 'rgba(255,255,255,0.75)';
  if(code === 0){ c1 = '#56CCF2'; c2 = '#2F80ED'; particleColor='rgba(255,255,200,0.9)'; }
  else if(code >=1 && code <=3){ c1='#89f7fe'; c2='#66a6ff'; particleColor='rgba(255,255,255,0.9)'; }
  else if(code ===45 || code===48){ c1='#cfd9df'; c2='#e2ebf0'; particleColor='rgba(200,200,200,0.8)'; }
  else if((code>=51 && code<=82) || (code>=80 && code<=82)){ c1='#667eea'; c2='#764ba2'; particleColor='rgba(200,230,255,0.9)'; }
  else if((code>=71 && code<=86) || (code>=85 && code<=86)){ c1='#83a4d4'; c2='#b6fbff'; particleColor='rgba(230,240,255,0.95)'; }
  else if(code>=95){ c1='#232526'; c2='#414345'; particleColor='rgba(255,200,200,0.9)'; }
  root.setProperty('--bg1', c1);
  root.setProperty('--bg2', c2);
  root.setProperty('--particle-color', particleColor);
}

async function retryFetch(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function getCoordinates(city){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=3&language=es&format=json`;
  const res = await retryFetch(() => fetch(url));
  if(!res.ok) throw new Error('Error geocoding');
  const data = await res.json();
  if(!data.results || data.results.length===0) throw new Error('Ciudad no encontrada');
  
  // Prefer Chile for Santiago
  let best = data.results[0];
  if (city.toLowerCase().includes('santiago') && data.results.find(r => r.country === 'Chile')) {
    best = data.results.find(r => r.country === 'Chile');
  }
  return {lat: best.latitude, lon: best.longitude, name: best.name, country: best.country};
}

async function getWeather(lat, lon){
  // Pedimos current, hourly (temperatura y código) y daily para 5 días
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    current_weather: 'true',
    hourly: 'temperature_2m,relative_humidity_2m,precipitation,weathercode',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,uv_index_max',
    forecast_days: '7'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await retryFetch(() => fetch(url));
  if(!res.ok) throw new Error('Error obteniendo clima');
  return res.json();
}

async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error('Error de ubicación: ' + err.message))
    );
  });
}

function renderCurrent(name, country, current_weather){
  const current = current_weather;
  const mapped = mapWeather(current.weathercode);
  result.innerHTML = `
    <div class="weather-header">
      <div class="icon-big">${mapped.icon}</div>
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <h2 style="margin:0">${name}, ${country || ''}</h2>
          <div class="${tempBadgeClass(current.temperature)}">${Math.round(current.temperature)}°C</div>
        </div>
        <div class="weather-desc">${mapped.text} • Viento ${Math.round(current.windspeed)} km/h</div>
        <div class="weather-meta">Actualizado: ${new Date(current.time).toLocaleString('es-ES', {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
    </div>
  `;
}

function renderHourly(hourly, timezone){
  hourlyList.innerHTML = '';
  const times = hourly.time;
  const temps = hourly.temperature_2m;
  const hums = hourly['relative_humidity_2m'];
  const codes = hourly.weathercode;
  const now = new Date();
  for(let i=0;i<times.length;i++){
    const t = new Date(times[i]);
    if(t < now) continue;
    if(hourlyList.children.length >= 24) break;
    const icon = mapWeather(codes[i]).icon;
    const el = document.createElement('div');
    el.className = 'hour-item';
    el.innerHTML = `
      <div style="font-size:12px;color:var(--muted)">${t.toLocaleTimeString([], {hour:'2-digit'})}</div>
      <div style="font-size:22px;margin:4px 0">${icon}</div>
      <div class="hour-temp">${Math.round(temps[i])}°</div>
      <div style="font-size:11px;color:var(--muted)">${hums[i]?.toFixed(0)}%</div>`;
    hourlyList.appendChild(el);
  }
}

function renderDaily(daily){
  dailyList.innerHTML = '';
  const times = daily.time; // fechas
  const tmax = daily.temperature_2m_max;
  const tmin = daily.temperature_2m_min;
  const codes = daily.weathercode;
  // Tomar los próximos 5 días
  for(let i=0;i<Math.min(5,times.length);i++){
    const date = new Date(times[i]);
    const icon = mapWeather(codes[i]).icon;
    const dayName = date.toLocaleDateString(undefined,{weekday:'short'});
    const el = document.createElement('div');
    el.className = 'day-item';
    el.innerHTML = `
      <div class="day-left">
        <div class="small-icon">${icon}</div>
        <div>
          <div style="font-weight:700">${dayName}</div>
          <div style="font-size:12px;color:var(--muted)">${date.toLocaleDateString()}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="text-align:right"><div style="font-weight:700">${Math.round(tmax[i])}°</div><div style="font-size:12px;color:var(--muted)">${Math.round(tmin[i])}°</div></div>
      </div>
    `;
    dailyList.appendChild(el);
  }
}

const geoBtn = document.getElementById('geoBtn');
const recentList = document.getElementById('recentList');

if (geoBtn) {
  geoBtn.addEventListener('click', async () => {
    loader.classList.remove('hidden');
    result.classList.add('hidden');
    hourlySection.classList.add('hidden');
    dailySection.classList.add('hidden');
    try {
      const coords = await getCurrentLocation();
      const data = await getWeather(coords.lat, coords.lon);
      const cityName = `${Math.round(coords.lat)},${Math.round(coords.lon)}`;
renderCurrent(cityName, '', data.current_weather);
      if (data.hourly) {
        renderHourly(data.hourly);
        hourlySection.classList.remove('hidden');
      }
      if (data.daily) {
        renderDaily(data.daily);
        dailySection.classList.remove('hidden');
      }
      changeBackgroundByCode(data.current.weathercode);
      loader.classList.add('hidden');
      showMain();
      result.classList.remove('hidden');
    } catch (err) {
      loader.classList.add('hidden');
      showMain();
      result.innerHTML = `<div style="padding:12px">❌ ${err.message}</div>`;
      result.classList.remove('hidden');
    }
  });
}

function showMain() {
  document.querySelector('.header').style.flex = '0 0 auto';
  document.querySelector('.main').style.display = 'flex';
}
btn.addEventListener('click', async ()=>{
  const city = input.value.trim();
  if(!city){
    result.classList.remove('hidden');
    result.innerHTML = '<div style="padding:12px">⚠️ Ingresa una ciudad</div>';
    return;
  }
  // UI: mostrar loader
  loader.classList.remove('hidden');
  result.classList.add('hidden');
  hourlySection.classList.add('hidden');
  dailySection.classList.add('hidden');

  try{
    const coords = await getCoordinates(city);
    const data = await getWeather(coords.lat, coords.lon);
    // current
renderCurrent(coords.name, coords.country, data.current_weather);
    changeBackgroundByCode(data.current_weather.weathercode);
    // hourly
    if(data.hourly){
      renderHourly(data.hourly, data.timezone);
      hourlySection.classList.remove('hidden');
    }
    if(data.daily){
      renderDaily(data.daily);
      dailySection.classList.remove('hidden');
    }

    loader.classList.add('hidden');
    showMain();
    result.classList.remove('hidden');
  }catch(err){
    loader.classList.add('hidden');
    showMain();
    result.classList.remove('hidden');
    hourlySection.classList.add('hidden');
    dailySection.classList.add('hidden');
    result.innerHTML = `<div style="padding:12px">❌ ${err.message}</div>`;
  }
});

// Theme toggle
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// Permitir presionar Enter
input.addEventListener('keyup',(e)=>{if(e.key==='Enter')btn.click()});
