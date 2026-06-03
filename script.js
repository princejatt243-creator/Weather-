// ===== Weather App - Open-Meteo API Integration =====

class WeatherApp {
    constructor() {
        this.currentUnit = 'celsius';
        this.currentWeather = null;
        this.forecastData = null;
        this.hourlyData = null;
        this.currentCity = { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'United States' };

        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.createParticles();
        this.loadWeather(this.currentCity);
    }

    cacheDOM() {
        this.dom = {
            bgGradient: document.getElementById('bgGradient'),
            particles: document.getElementById('particles'),
            searchInput: document.getElementById('searchInput'),
            searchBtn: document.getElementById('searchBtn'),
            searchSuggestions: document.getElementById('searchSuggestions'),
            btnLocation: document.getElementById('btnLocation'),
            unitBtns: document.querySelectorAll('.unit-btn'),
            loadingOverlay: document.getElementById('loadingOverlay'),

            // Weather display
            cityName: document.getElementById('cityName'),
            countryName: document.getElementById('countryName'),
            currentDate: document.getElementById('currentDate'),
            tempValue: document.getElementById('tempValue'),
            tempUnit: document.getElementById('tempUnit'),
            weatherDesc: document.getElementById('weatherDesc'),
            weatherIcon3d: document.getElementById('weatherIcon3d'),
            iconSvg: document.getElementById('iconSvg'),

            // Details
            feelsLike: document.getElementById('feelsLike'),
            uvIndex: document.getElementById('uvIndex'),
            windSpeed: document.getElementById('windSpeed'),
            humidity: document.getElementById('humidity'),
            pressure: document.getElementById('pressure'),
            precipitation: document.getElementById('precipitation'),

            // Forecast
            hourlyScroll: document.getElementById('hourlyScroll'),
            forecastGrid: document.getElementById('forecastGrid'),
        };
    }

    bindEvents() {
        // Search
        this.dom.searchInput.addEventListener('input', this.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        this.dom.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.dom.searchSuggestions.classList.remove('active');
                this.searchCity(this.dom.searchInput.value);
            }
        });

        this.dom.searchBtn.addEventListener('click', () => {
            this.searchCity(this.dom.searchInput.value);
        });

        // Close suggestions on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-section')) {
                this.dom.searchSuggestions.classList.remove('active');
            }
        });

        // Location
        this.dom.btnLocation.addEventListener('click', () => this.detectLocation());

        // Unit toggle
        this.dom.unitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.unitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentUnit = btn.dataset.unit;
                this.updateDisplay();
            });
        });
    }

    // ===== API Methods =====

    async searchCity(query) {
        if (!query.trim()) return;

        this.showLoading();
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                this.currentCity = {
                    name: result.name,
                    lat: result.latitude,
                    lon: result.longitude,
                    country: result.country || 'Unknown'
                };
                await this.loadWeather(this.currentCity);
            } else {
                this.showError('City not found. Please try again.');
            }
        } catch (error) {
            this.showError('Failed to search city. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.dom.searchSuggestions.classList.remove('active');
            return;
        }

        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
            );
            const data = await response.json();

            if (data.results) {
                this.renderSuggestions(data.results);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    renderSuggestions(results) {
        this.dom.searchSuggestions.innerHTML = results.map(city => `
            <div class="suggestion-item" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${city.name}" data-country="${city.country || ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="suggestion-name">${city.name}</span>
                <span class="suggestion-country">${city.country || ''}${city.admin1 ? ', ' + city.admin1 : ''}</span>
            </div>
        `).join('');

        this.dom.searchSuggestions.classList.add('active');

        // Bind click events
        this.dom.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentCity = {
                    name: item.dataset.name,
                    lat: parseFloat(item.dataset.lat),
                    lon: parseFloat(item.dataset.lon),
                    country: item.dataset.country
                };
                this.dom.searchInput.value = item.dataset.name;
                this.dom.searchSuggestions.classList.remove('active');
                this.loadWeather(this.currentCity);
            });
        });
    }

    async loadWeather(city) {
        this.showLoading();
        try {
            // Fetch current weather, forecast, and hourly data
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto&forecast_days=6`;

            const response = await fetch(url);
            const data = await response.json();

            this.currentWeather = data.current;
            this.forecastData = data.daily;
            this.hourlyData = data.hourly;

            this.updateDisplay();
            this.updateBackground();
        } catch (error) {
            this.showError('Failed to load weather data. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    detectLocation() {
        this.dom.btnLocation.classList.add('spinning');

        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            this.dom.btnLocation.classList.remove('spinning');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    // Reverse geocoding to get city name
                    const geoResponse = await fetch(
                        `https://geocoding-api.open-meteo.com/v1/search?name=${latitude},${longitude}&count=1&language=en&format=json`
                    );
                    const geoData = await geoResponse.json();

                    let cityName = 'Current Location';
                    let country = '';

                    if (geoData.results && geoData.results.length > 0) {
                        cityName = geoData.results[0].name;
                        country = geoData.results[0].country || '';
                    }

                    this.currentCity = {
                        name: cityName,
                        lat: latitude,
                        lon: longitude,
                        country: country
                    };

                    this.dom.searchInput.value = cityName;
                    await this.loadWeather(this.currentCity);
                } catch (error) {
                    this.showError('Failed to get location details.');
                } finally {
                    this.dom.btnLocation.classList.remove('spinning');
                }
            },
            (error) => {
                this.dom.btnLocation.classList.remove('spinning');
                let message = 'Unable to retrieve your location.';
                if (error.code === 1) message = 'Location access denied. Please enable location permissions.';
                this.showError(message);
            }
        );
    }

    // ===== Display Methods =====

    updateDisplay() {
        if (!this.currentWeather) return;

        const temp = this.convertTemp(this.currentWeather.temperature_2m);
        const feelsLike = this.convertTemp(this.currentWeather.apparent_temperature);
        const weatherCode = this.currentWeather.weather_code;
        const isDay = this.currentWeather.is_day === 1;
        const weatherInfo = this.getWeatherInfo(weatherCode, isDay);

        // Update basic info
        this.dom.cityName.textContent = this.currentCity.name;
        this.dom.countryName.textContent = this.currentCity.country;
        this.dom.currentDate.textContent = this.formatDate(new Date());

        // Temperature with animation
        this.animateNumber(this.dom.tempValue, temp);
        this.dom.tempUnit.textContent = this.currentUnit === 'celsius' ? '°C' : '°F';
        this.dom.weatherDesc.textContent = weatherInfo.description;

        // Update icon
        this.dom.iconSvg.innerHTML = weatherInfo.svg;

        // Update details
        this.dom.feelsLike.textContent = `${feelsLike}°`;
        this.dom.uvIndex.textContent = this.forecastData.uv_index_max[0] || '0';
        this.dom.windSpeed.textContent = `${this.currentWeather.wind_speed_10m} km/h`;
        this.dom.humidity.textContent = `${this.currentWeather.relative_humidity_2m}%`;
        this.dom.pressure.textContent = `${this.currentWeather.pressure_msl} hPa`;
        this.dom.precipitation.textContent = `${this.currentWeather.precipitation} mm`;

        // Update hourly forecast
        this.renderHourlyForecast();

        // Update 5-day forecast
        this.renderForecast();
    }

    renderHourlyForecast() {
        if (!this.hourlyData) return;

        const now = new Date();
        const currentHour = now.getHours();

        // Get next 24 hours
        const hourlyItems = [];
        for (let i = currentHour; i < currentHour + 24; i++) {
            if (i >= this.hourlyData.time.length) break;

            const timeStr = this.hourlyData.time[i];
            const temp = this.convertTemp(this.hourlyData.temperature_2m[i]);
            const code = this.hourlyData.weather_code[i];
            const isDay = this.hourlyData.is_day[i];
            const weatherInfo = this.getWeatherInfo(code, isDay);
            const hour = new Date(timeStr).getHours();
            const timeLabel = hour === currentHour ? 'Now' : 
                             hour === 0 ? '12 AM' : 
                             hour < 12 ? `${hour} AM` : 
                             hour === 12 ? '12 PM' : `${hour - 12} PM`;

            hourlyItems.push({
                time: timeLabel,
                temp: temp,
                svg: weatherInfo.svgSmall,
                isNow: hour === currentHour
            });
        }

        this.dom.hourlyScroll.innerHTML = hourlyItems.map((item, index) => `
            <div class="hourly-item ${item.isNow ? 'active' : ''}" style="animation-delay: ${index * 0.05}s">
                <div class="hourly-time">${item.time}</div>
                <div class="hourly-icon">${item.svg}</div>
                <div class="hourly-temp">${item.temp}°</div>
            </div>
        `).join('');
    }

    renderForecast() {
        if (!this.forecastData) return;

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date().getDay();

        // Skip today (index 0), show next 5 days
        const forecastItems = [];
        for (let i = 1; i <= 5; i++) {
            if (i >= this.forecastData.time.length) break;

            const date = new Date(this.forecastData.time[i]);
            const dayIndex = (today + i) % 7;
            const dayName = i === 1 ? 'Tomorrow' : days[dayIndex];
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const maxTemp = this.convertTemp(this.forecastData.temperature_2m_max[i]);
            const minTemp = this.convertTemp(this.forecastData.temperature_2m_min[i]);
            const code = this.forecastData.weather_code[i];
            const weatherInfo = this.getWeatherInfo(code, true);

            forecastItems.push({
                day: dayName,
                date: dateStr,
                high: maxTemp,
                low: minTemp,
                desc: weatherInfo.description,
                svg: weatherInfo.svg,
                delay: i * 0.1
            });
        }

        this.dom.forecastGrid.innerHTML = forecastItems.map(item => `
            <div class="forecast-item stagger-in" style="animation-delay: ${item.delay}s">
                <div>
                    <div class="forecast-day">${item.day}</div>
                    <div class="forecast-date">${item.date}</div>
                </div>
                <div class="forecast-icon">${item.svg}</div>
                <div class="forecast-temps">
                    <div class="forecast-temp-high">${item.high}°</div>
                    <div class="forecast-temp-low">${item.low}°</div>
                    <div class="forecast-desc">${item.desc}</div>
                </div>
            </div>
        `).join('');
    }

    updateBackground() {
        if (!this.currentWeather) return;

        const code = this.currentWeather.weather_code;
        const isDay = this.currentWeather.is_day === 1;
        const bgClass = this.getBackgroundClass(code, isDay);

        // Remove all bg classes
        this.dom.bgGradient.className = 'bg-gradient';
        // Add new class
        this.dom.bgGradient.classList.add(bgClass);

        // Update particles based on weather
        this.updateParticles(code);
    }

    updateParticles(weatherCode) {
        this.dom.particles.innerHTML = '';

        if (weatherCode >= 51 && weatherCode <= 67) {
            // Rain
            for (let i = 0; i < 50; i++) {
                const drop = document.createElement('div');
                drop.className = 'rain-drop';
                drop.style.left = Math.random() * 100 + '%';
                drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
                drop.style.animationDelay = Math.random() * 2 + 's';
                this.dom.particles.appendChild(drop);
            }
        } else if (weatherCode >= 71 && weatherCode <= 77) {
            // Snow
            for (let i = 0; i < 40; i++) {
                const flake = document.createElement('div');
                flake.className = 'snow-flake';
                flake.style.left = Math.random() * 100 + '%';
                flake.style.width = flake.style.height = (Math.random() * 6 + 4) + 'px';
                flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
                flake.style.animationDelay = Math.random() * 3 + 's';
                this.dom.particles.appendChild(flake);
            }
        } else {
            // Default floating particles
            this.createParticles();
        }
    }

    createParticles() {
        this.dom.particles.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = particle.style.height = (Math.random() * 4 + 2) + 'px';
            particle.style.background = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            particle.style.animationDelay = Math.random() * 10 + 's';
            this.dom.particles.appendChild(particle);
        }
    }

    // ===== Helper Methods =====

    getWeatherInfo(code, isDay) {
        const weatherCodes = {
            0: { description: 'Clear Sky', svg: this.getSunSVG(), svgSmall: this.getSunSVGS() },
            1: { description: 'Mainly Clear', svg: this.getSunCloudSVG(), svgSmall: this.getSunCloudSVGS() },
            2: { description: 'Partly Cloudy', svg: this.getSunCloudSVG(), svgSmall: this.getSunCloudSVGS() },
            3: { description: 'Overcast', svg: this.getCloudSVG(), svgSmall: this.getCloudSVGS() },
            45: { description: 'Foggy', svg: this.getFogSVG(), svgSmall: this.getFogSVGS() },
            48: { description: 'Depositing Rime Fog', svg: this.getFogSVG(), svgSmall: this.getFogSVGS() },
            51: { description: 'Light Drizzle', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            53: { description: 'Moderate Drizzle', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            55: { description: 'Dense Drizzle', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            56: { description: 'Freezing Drizzle', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            57: { description: 'Dense Freezing Drizzle', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            61: { description: 'Slight Rain', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            63: { description: 'Moderate Rain', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            65: { description: 'Heavy Rain', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            66: { description: 'Freezing Rain', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            67: { description: 'Heavy Freezing Rain', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            71: { description: 'Slight Snow', svg: this.getSnowSVG(), svgSmall: this.getSnowSVGS() },
            73: { description: 'Moderate Snow', svg: this.getSnowSVG(), svgSmall: this.getSnowSVGS() },
            75: { description: 'Heavy Snow', svg: this.getSnowSVG(), svgSmall: this.getSnowSVGS() },
            77: { description: 'Snow Grains', svg: this.getSnowSVG(), svgSmall: this.getSnowSVGS() },
            80: { description: 'Slight Rain Showers', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            81: { description: 'Moderate Rain Showers', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            82: { description: 'Violent Rain Showers', svg: this.getRainSVG(), svgSmall: this.getRainSVGS() },
            85: { description: 'Slight Snow Showers', svg: this.getSnowSVG(), svgSmall: this.getSnowSVGS() },
            86: { description: 'Heavy Snow Showers', svg: this.getSnowSVG(), svgSmall: this.getSnowSVGS() },
            95: { description: 'Thunderstorm', svg: this.getStormSVG(), svgSmall: this.getStormSVGS() },
            96: { description: 'Thunderstorm with Hail', svg: this.getStormSVG(), svgSmall: this.getStormSVGS() },
            99: { description: 'Heavy Thunderstorm', svg: this.getStormSVG(), svgSmall: this.getStormSVGS() },
        };

        const info = weatherCodes[code] || weatherCodes[0];

        // Night variants for clear/partly cloudy
        if (!isDay && (code === 0 || code === 1 || code === 2)) {
            return {
                description: info.description,
                svg: this.getMoonSVG(),
                svgSmall: this.getMoonSVGS()
            };
        }

        return info;
    }

    getBackgroundClass(code, isDay) {
        if (!isDay) return 'night';
        if (code === 0 || code === 1) return 'sunny';
        if (code === 2 || code === 3) return 'cloudy';
        if (code >= 51 && code <= 67) return 'rainy';
        if (code >= 71 && code <= 77) return 'snowy';
        if (code >= 95) return 'stormy';
        return 'cloudy';
    }

    convertTemp(celsius) {
        if (this.currentUnit === 'fahrenheit') {
            return Math.round((celsius * 9/5) + 32);
        }
        return Math.round(celsius);
    }

    formatDate(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    animateNumber(element, target) {
        const current = parseInt(element.textContent) || 0;
        const diff = target - current;
        const steps = 20;
        const stepValue = diff / steps;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            const value = Math.round(current + (stepValue * step));
            element.textContent = value;

            if (step >= steps) {
                element.textContent = target;
                clearInterval(interval);
            }
        }, 25);
    }

    showLoading() {
        this.dom.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.dom.loadingOverlay.classList.remove('active');
    }

    showError(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert(message);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===== SVG Icons =====

    getSunSVG() {
        return `<defs>
            <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#fbbf24"/>
                <stop offset="100%" style="stop-color:#f59e0b"/>
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="22" fill="url(#sunGrad)" class="sun-rays"/>
        <g stroke="#fbbf24" stroke-width="3" stroke-linecap="round">
            <line x1="50" y1="12" x2="50" y2="20"/>
            <line x1="50" y1="80" x2="50" y2="88"/>
            <line x1="12" y1="50" x2="20" y2="50"/>
            <line x1="80" y1="50" x2="88" y2="50"/>
            <line x1="23" y1="23" x2="29" y2="29"/>
            <line x1="71" y1="71" x2="77" y2="77"/>
            <line x1="23" y1="77" x2="29" y2="71"/>
            <line x1="71" y1="29" x2="77" y2="23"/>
        </g>`;
    }

    getSunSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
            <circle cx="12" cy="12" r="5" fill="#fbbf24"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>`;
    }

    getMoonSVG() {
        return `<defs>
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#e2e8f0"/>
                <stop offset="100%" style="stop-color:#94a3b8"/>
            </linearGradient>
        </defs>
        <path d="M65 25 A 28 28 0 1 1 35 75 A 22 22 0 1 0 65 25" fill="url(#moonGrad)"/>
        <circle cx="40" cy="35" r="3" fill="rgba(255,255,255,0.3)"/>
        <circle cx="55" cy="45" r="4" fill="rgba(255,255,255,0.2)"/>
        <circle cx="45" cy="55" r="2" fill="rgba(255,255,255,0.25)"/>
        <g fill="#fbbf24">
            <circle cx="15" cy="20" r="1.5" opacity="0.8"/>
            <circle cx="85" cy="15" r="1" opacity="0.6"/>
            <circle cx="80" cy="80" r="1.5" opacity="0.7"/>
            <circle cx="20" cy="85" r="1" opacity="0.5"/>
            <circle cx="50" cy="10" r="1" opacity="0.4"/>
        </g>`;
    }

    getMoonSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="rgba(226,232,240,0.2)"/>
        </svg>`;
    }

    getSunCloudSVG() {
        return `<defs>
            <linearGradient id="sunGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#fbbf24"/>
                <stop offset="100%" style="stop-color:#f59e0b"/>
            </linearGradient>
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#f1f5f9"/>
                <stop offset="100%" style="stop-color:#cbd5e1"/>
            </linearGradient>
        </defs>
        <circle cx="65" cy="35" r="18" fill="url(#sunGrad2)" class="sun-rays"/>
        <g stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round">
            <line x1="65" y1="8" x2="65" y2="14"/>
            <line x1="65" y1="56" x2="65" y2="62"/>
            <line x1="38" y1="35" x2="44" y2="35"/>
            <line x1="86" y1="35" x2="92" y2="35"/>
        </g>
        <path d="M25 65 Q25 45 42 45 Q48 30 65 35 Q78 25 88 40 Q100 42 100 58 Q100 75 80 75 L35 75 Q15 75 15 58 Q15 50 25 50" 
              fill="url(#cloudGrad)" class="cloud-float" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.2))"/>
        <path d="M30 60 Q30 50 40 50 Q45 42 55 45 Q62 40 68 48 Q75 48 75 58 Q75 68 60 68 L35 68 Q25 68 25 58 Q25 55 30 55" 
              fill="rgba(255,255,255,0.5)" class="cloud-float" style="animation-delay: -2s"/>`;
    }

    getSunCloudSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="16" cy="8" r="4" fill="#fbbf24" stroke="#f59e0b"/>
            <path d="M4 16a4 4 0 014-4h8a4 4 0 014 4 4 4 0 01-4 4H8a4 4 0 01-4-4z" fill="rgba(241,245,249,0.8)"/>
        </svg>`;
    }

    getCloudSVG() {
        return `<defs>
            <linearGradient id="cloudGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#e2e8f0"/>
                <stop offset="100%" style="stop-color:#94a3b8"/>
            </linearGradient>
        </defs>
        <path d="M20 60 Q20 35 40 35 Q48 15 70 22 Q85 12 95 30 Q110 32 110 52 Q110 72 85 72 L30 72 Q10 72 10 52 Q10 42 20 42" 
              fill="url(#cloudGrad2)" class="cloud-float" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.3))"/>
        <path d="M25 55 Q25 42 38 42 Q43 35 52 38 Q58 33 63 40 Q70 40 70 50 Q70 60 55 60 L32 60 Q22 60 22 50 Q22 47 25 47" 
              fill="rgba(255,255,255,0.4)" class="cloud-float" style="animation-delay: -3s"/>`;
    }

    getCloudSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" fill="rgba(226,232,240,0.8)"/>
        </svg>`;
    }

    getRainSVG() {
        return `<defs>
            <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#64748b"/>
                <stop offset="100%" style="stop-color:#475569"/>
            </linearGradient>
        </defs>
        <path d="M20 55 Q20 30 40 30 Q48 10 70 17 Q85 7 95 25 Q110 27 110 47 Q110 67 85 67 L30 67 Q10 67 10 47 Q10 37 20 37" 
              fill="url(#rainCloudGrad)" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.3))"/>
        <g stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round">
            <line x1="35" y1="72" x2="32" y2="88" opacity="0.9"/>
            <line x1="50" y1="72" x2="47" y2="92" opacity="0.8"/>
            <line x1="65" y1="72" x2="62" y2="85" opacity="0.9"/>
            <line x1="80" y1="72" x2="77" y2="90" opacity="0.7"/>
            <line x1="45" y1="78" x2="42" y2="95" opacity="0.6"/>
            <line x1="70" y1="78" x2="67" y2="94" opacity="0.8"/>
        </g>`;
    }

    getRainSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" stroke="#60a5fa"/>
        </svg>`;
    }

    getSnowSVG() {
        return `<defs>
            <linearGradient id="snowCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#e2e8f0"/>
                <stop offset="100%" style="stop-color:#94a3b8"/>
            </linearGradient>
        </defs>
        <path d="M20 55 Q20 30 40 30 Q48 10 70 17 Q85 7 95 25 Q110 27 110 47 Q110 67 85 67 L30 67 Q10 67 10 47 Q10 37 20 37" 
              fill="url(#snowCloudGrad)" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.3))"/>
        <g fill="white">
            <circle cx="35" cy="78" r="3" opacity="0.9"/>
            <circle cx="50" cy="85" r="2.5" opacity="0.8"/>
            <circle cx="65" cy="76" r="3.5" opacity="0.9"/>
            <circle cx="80" cy="82" r="2" opacity="0.7"/>
            <circle cx="45" cy="92" r="2.5" opacity="0.6"/>
            <circle cx="70" cy="90" r="3" opacity="0.8"/>
        </g>`;
    }

    getSnowSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25" stroke="#e2e8f0"/>
            <line x1="8" y1="16" x2="8.01" y2="16" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <line x1="8" y1="20" x2="8.01" y2="20" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <line x1="12" y1="18" x2="12.01" y2="18" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <line x1="16" y1="16" x2="16.01" y2="16" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <line x1="16" y1="20" x2="16.01" y2="20" stroke="white" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    }

    getStormSVG() {
        return `<defs>
            <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#475569"/>
                <stop offset="100%" style="stop-color:#1e293b"/>
            </linearGradient>
        </defs>
        <path d="M20 55 Q20 30 40 30 Q48 10 70 17 Q85 7 95 25 Q110 27 110 47 Q110 67 85 67 L30 67 Q10 67 10 47 Q10 37 20 37" 
              fill="url(#stormCloudGrad)" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.4))"/>
        <path d="M55 68 L48 85 L58 85 L50 105" stroke="#fbbf24" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" class="lightning-flash"/>
        <g stroke="#60a5fa" stroke-width="2" stroke-linecap="round" opacity="0.6">
            <line x1="35" y1="72" x2="33" y2="82"/>
            <line x1="75" y1="72" x2="73" y2="84"/>
        </g>`;
    }

    getStormSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9" stroke="#475569"/>
            <path d="M13 11l-4 6h6l-4 6" stroke="#fbbf24" stroke-width="2"/>
        </svg>`;
    }

    getFogSVG() {
        return `<defs>
            <linearGradient id="fogGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#cbd5e1"/>
                <stop offset="100%" style="stop-color:#94a3b8"/>
            </linearGradient>
        </defs>
        <path d="M15 35 Q15 20 30 20 Q38 8 55 13 Q68 5 78 18 Q90 20 90 35 Q90 48 72 48 L25 48 Q10 48 10 35 Q10 28 15 28" 
              fill="url(#fogGrad)" opacity="0.7"/>
        <rect x="15" y="55" width="70" height="6" rx="3" fill="#cbd5e1" opacity="0.5" class="cloud-float"/>
        <rect x="25" y="68" width="50" height="5" rx="2.5" fill="#cbd5e1" opacity="0.4" class="cloud-float" style="animation-delay: -1s"/>
        <rect x="20" y="80" width="60" height="5" rx="2.5" fill="#cbd5e1" opacity="0.3" class="cloud-float" style="animation-delay: -2s"/>
        <rect x="30" y="92" width="40" height="4" rx="2" fill="#cbd5e1" opacity="0.25" class="cloud-float" style="animation-delay: -3s"/>`;
    }

    getFogSVGS() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 15h16M4 18h16M4 12h16M4 9h16" stroke="#94a3b8"/>
        </svg>`;
    }
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});