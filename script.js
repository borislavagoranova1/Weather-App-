const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const weatherContent = document.getElementById('weather-content');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const conditionTextEl = document.getElementById('condition-text');
const currentTempEl = document.getElementById('current-temp');
const hlValuesEl = document.getElementById('hl-values');
const feelsLikeEl = document.getElementById('feels-like');
const windSpeedEl = document.getElementById('wind-speed');
const humidityEl = document.getElementById('humidity');
const uvIndexEl = document.getElementById('uv-index');
const popEl = document.getElementById('pop');
const hourlyChartEl = document.getElementById('hourly-chart');
const dailyForecastEl = document.getElementById('daily-forecast');
const unitToggleBtn = document.getElementById('unit-toggle');

let isFahrenheit = false;
let lastWeatherData = null;

const celsiusToFahrenheit = (celsius) => (celsius * 9/5) + 32;

const weatherCodes = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
  55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 95: 'Thunderstorm'
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const updateTemperatureDisplay = () => {
  if (!lastWeatherData) return;
  
  const current = lastWeatherData.current;
  const daily = lastWeatherData.daily;
  const hourly = lastWeatherData.hourly;
  
  const unit = isFahrenheit ? '°F' : '°C';
  
  const currentTemp = isFahrenheit ? celsiusToFahrenheit(current.temperature_2m) : current.temperature_2m;
  const maxTemp = isFahrenheit ? celsiusToFahrenheit(daily.temperature_2m_max[0]) : daily.temperature_2m_max[0];
  const minTemp = isFahrenheit ? celsiusToFahrenheit(daily.temperature_2m_min[0]) : daily.temperature_2m_min[0];
  const feelsLike = isFahrenheit ? celsiusToFahrenheit(current.apparent_temperature) : current.apparent_temperature;
  
  currentTempEl.textContent = `${currentTemp.toFixed(0)}${unit}`;
  hlValuesEl.textContent = `H:${maxTemp.toFixed(0)}° L:${minTemp.toFixed(0)}°`;
  feelsLikeEl.textContent = `${feelsLike.toFixed(0)}${unit}`;
  
  hourlyChartEl.innerHTML = '';
  const currentHourIndex = new Date().getHours();
  const nextHoursTemps = hourly.temperature_2m.slice(currentHourIndex, currentHourIndex + 5);
  const convertedTemps = isFahrenheit ? nextHoursTemps.map(celsiusToFahrenheit) : nextHoursTemps;
  const maxHourlyTemp = Math.max(...convertedTemps);
  const minHourlyTemp = Math.min(...convertedTemps);

  convertedTemps.forEach((temp, index) => {
    const hourLabel = (currentHourIndex + index) % 24;
    const percentage = maxHourlyTemp === minHourlyTemp ? 50 : ((temp - minHourlyTemp) / (maxHourlyTemp - minHourlyTemp)) * 70 + 30;

    const col = document.createElement('div');
    col.className = 'chart-column';
    col.innerHTML = `
      <div class="chart-temp">${temp.toFixed(0)}${unit}</div>
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height: ${percentage}%"></div>
      </div>
      <div class="chart-time">${hourLabel.toString().padStart(2, '0')}:00</div>
    `;
    hourlyChartEl.appendChild(col);
  });

  dailyForecastEl.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : daysOfWeek[date.getDay()];
    const maxT = isFahrenheit ? celsiusToFahrenheit(daily.temperature_2m_max[i]).toFixed(0) : daily.temperature_2m_max[i].toFixed(0);
    const minT = isFahrenheit ? celsiusToFahrenheit(daily.temperature_2m_min[i]).toFixed(0) : daily.temperature_2m_min[i].toFixed(0);
    const popMax = daily.precipitation_probability_max[i];

    const row = document.createElement('div');
    row.className = 'daily-row';
    row.innerHTML = `
      <div class="daily-day">${dayName}</div>
      <div class="daily-pop">${popMax > 0 ? '💧 ' + popMax + '%' : ''}</div>
      <div class="daily-temps">
        <span class="max-t">${maxT}°</span>
        <span class="min-t">${minT}°</span>
      </div>
    `;
    dailyForecastEl.appendChild(row);
  }
};

unitToggleBtn.addEventListener('click', () => {
  isFahrenheit = !isFahrenheit;
  updateTemperatureDisplay();
});

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  weatherContent.style.display = 'none';

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) throw new Error('City not found');
    const { latitude, longitude, name: correctName } = geoData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);

    lastWeatherData = weatherData;
    isFahrenheit = false;
    
    cityNameEl.textContent = correctName;
    conditionTextEl.textContent = weatherCodes[weatherData.current.weather_code] || 'Variable Conditions';
    windSpeedEl.textContent = `${weatherData.current.wind_speed_10m.toFixed(1)} m/s`;
    humidityEl.textContent = `${weatherData.current.relative_humidity_2m}%`;
    uvIndexEl.textContent = weatherData.current.uv_index.toFixed(1);
    popEl.textContent = `${weatherData.current.precipitation_probability}%`;
    
    updateTemperatureDisplay();

    loadingEl.style.display = 'none';
    weatherContent.style.display = 'block';

  } catch (error) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    console.error(error);
  }
});
