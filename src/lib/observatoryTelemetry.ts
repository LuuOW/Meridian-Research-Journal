/**
 * Meridian Observatory Environmental & Celestial Telemetry
 * Provides real-time atmospheric, barometric, astronomical, and air quality data
 * for the Daily Autonomous Editorial Pipeline observatory station.
 */

export interface MoonPhaseInfo {
  phaseName: string;
  illumination: number; // 0 - 100%
  moonAgeDays: number;
  emoji: string;
  stage: "waxing" | "waning" | "full" | "new";
  observationalQuality: string;
}

export interface ObservatoryTelemetry {
  timestamp: string;
  station: {
    name: string;
    latitude: number;
    longitude: number;
    elevationMeters: number;
    timezone: string;
  };
  weather: {
    code: number;
    description: string;
    iconName: "Sun" | "CloudSun" | "Cloud" | "CloudRain" | "CloudSnow" | "CloudLightning";
  };
  temperature: {
    celsius: number;
    fahrenheit: number;
    apparentCelsius: number;
    apparentFahrenheit: number;
  };
  wind: {
    speedKmh: number;
    speedMph: number;
    directionDegrees: number;
    compassHeading: string;
    bftScale: number;
  };
  barometer: {
    pressureHpa: number;
    pressureInHg: number;
    tendency: "Steady" | "Rising" | "Falling";
    atmosphericCondition: string;
  };
  humidity: {
    relativePercentage: number;
    dewPointCelsius: number;
    comfortIndex: string;
  };
  radiation: {
    uvIndex: number;
    uvCategory: "Low" | "Moderate" | "High" | "Very High" | "Extreme";
    protectiveAdvice: string;
  };
  airQuality: {
    usAqi: number;
    aqiCategory: "Good" | "Moderate" | "Sensitive" | "Unhealthy" | "Very Unhealthy" | "Hazardous";
    pm25: number;
    pm10: number;
    airPurityLevel: string;
  };
  moon: MoonPhaseInfo;
  status: "live" | "cached" | "fallback";
}

/**
 * Astronomical Moon Phase Calculation
 * Synodic month: 29.53058867 days
 * Reference Epoch: Jan 11, 2024, 11:57 UTC (New Moon)
 */
export function calculateMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const epochNewMoon = new Date("2024-01-11T11:57:00Z").getTime();
  const synodicMonthMs = 29.53058867 * 86400000;
  const timeDiff = date.getTime() - epochNewMoon;
  const cycleTime = ((timeDiff % synodicMonthMs) + synodicMonthMs) % synodicMonthMs;
  const daysIntoCycle = cycleTime / 86400000;
  const phaseFraction = daysIntoCycle / 29.53058867;

  // Illumination calculation: 0% at New Moon, 100% at Full Moon
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phaseFraction)) / 2) * 100);

  let phaseName = "";
  let emoji = "";
  let stage: "waxing" | "waning" | "full" | "new" = "waxing";
  let observationalQuality = "";

  if (phaseFraction < 0.03 || phaseFraction >= 0.97) {
    phaseName = "New Moon";
    emoji = "🌑";
    stage = "new";
    observationalQuality = "Dark Sky • Peak Deep-Space Stargazing";
  } else if (phaseFraction < 0.22) {
    phaseName = "Waxing Crescent";
    emoji = "🌒";
    stage = "waxing";
    observationalQuality = "Minimal Glare • Ideal Evening Observation";
  } else if (phaseFraction < 0.28) {
    phaseName = "First Quarter";
    emoji = "🌓";
    stage = "waxing";
    observationalQuality = "50% Illumination • High Crater Relief";
  } else if (phaseFraction < 0.47) {
    phaseName = "Waxing Gibbous";
    emoji = "🌔";
    stage = "waxing";
    observationalQuality = "High Brightness • Lunar Surface Dominance";
  } else if (phaseFraction < 0.53) {
    phaseName = "Full Moon";
    emoji = "🌕";
    stage = "full";
    observationalQuality = "Maximum Albedo • 100% Night Radiance";
  } else if (phaseFraction < 0.72) {
    phaseName = "Waning Gibbous";
    emoji = "🌖";
    stage = "waning";
    observationalQuality = "Bright Pre-Dawn • Fading Glare";
  } else if (phaseFraction < 0.78) {
    phaseName = "Last Quarter";
    emoji = "🌗";
    stage = "waning";
    observationalQuality = "50% Illumination • Morning Terminator Visible";
  } else {
    phaseName = "Waning Crescent";
    emoji = "🌘";
    stage = "waning";
    observationalQuality = "Low Light • Dawn Stellar Windows";
  }

  return {
    phaseName,
    illumination,
    moonAgeDays: Math.round(daysIntoCycle * 10) / 10,
    emoji,
    stage,
    observationalQuality,
  };
}

/**
 * Degrees to 16-point Compass Heading
 */
export function degreesToCompass(deg: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return directions[idx];
}

/**
 * WMO Weather code interpreter
 */
export function interpretWmoCode(code: number): {
  description: string;
  iconName: "Sun" | "CloudSun" | "Cloud" | "CloudRain" | "CloudSnow" | "CloudLightning";
} {
  switch (code) {
    case 0:
      return { description: "Clear Sky", iconName: "Sun" };
    case 1:
      return { description: "Mainly Clear", iconName: "Sun" };
    case 2:
      return { description: "Partly Cloudy", iconName: "CloudSun" };
    case 3:
      return { description: "Overcast", iconName: "Cloud" };
    case 45:
    case 48:
      return { description: "Atmospheric Fog", iconName: "Cloud" };
    case 51:
    case 53:
    case 55:
      return { description: "Light Drizzle", iconName: "CloudRain" };
    case 61:
    case 63:
    case 65:
      return { description: "Precipitation / Rain", iconName: "CloudRain" };
    case 71:
    case 73:
    case 75:
      return { description: "Snow Influx", iconName: "CloudSnow" };
    case 80:
    case 81:
    case 82:
      return { description: "Showers", iconName: "CloudRain" };
    case 95:
    case 96:
    case 99:
      return { description: "Thunderstorm Front", iconName: "CloudLightning" };
    default:
      return { description: "Scattered Atmospheric Layer", iconName: "CloudSun" };
  }
}

/**
 * Interpret UV Index
 */
export function interpretUvIndex(uv: number): {
  category: "Low" | "Moderate" | "High" | "Very High" | "Extreme";
  advice: string;
} {
  if (uv <= 2) return { category: "Low", advice: "Minimal solar protection required." };
  if (uv <= 5) return { category: "Moderate", advice: "Standard ambient solar exposure." };
  if (uv <= 7) return { category: "High", advice: "Optic and cutaneous protection recommended." };
  if (uv <= 10) return { category: "Very High", advice: "High intensity solar flux. Take precautions." };
  return { category: "Extreme", advice: "Hazardous solar radiation. Limit exposure." };
}

/**
 * Interpret US Air Quality Index (AQI)
 */
export function interpretAqi(aqi: number): {
  category: "Good" | "Moderate" | "Sensitive" | "Unhealthy" | "Very Unhealthy" | "Hazardous";
  purity: string;
} {
  if (aqi <= 50) return { category: "Good", purity: "Pristine Atmospheric Clarity (Zero particulate hindrance)" };
  if (aqi <= 100) return { category: "Moderate", purity: "Acceptable Air Quality (Light aerosol dispersion)" };
  if (aqi <= 150) return { category: "Sensitive", purity: "Marginal Haze for Sensitive Observers" };
  if (aqi <= 200) return { category: "Unhealthy", purity: "Noticeable Atmospheric Turbidity" };
  if (aqi <= 300) return { category: "Very Unhealthy", purity: "Elevated Particulate Scattering" };
  return { category: "Hazardous", purity: "Critical Aerosol Contamination" };
}

// Default Buenos Aires Observatory coordinates (matches America/Argentina/Buenos_Aires ART time)
export const DEFAULT_STATION = {
  name: "Meridian Observatory Station (ART UTC-3)",
  latitude: -34.6037,
  longitude: -58.3816,
  elevationMeters: 25,
  timezone: "America/Argentina/Buenos_Aires",
};

/**
 * Fetch Full Real-Time Observatory Telemetry
 */
export async function getObservatoryTelemetry(
  lat: number = DEFAULT_STATION.latitude,
  lon: number = DEFAULT_STATION.longitude,
  stationName: string = DEFAULT_STATION.name
): Promise<ObservatoryTelemetry> {
  const moon = calculateMoonPhase(new Date());

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index&timezone=auto`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=auto`;

    const [weatherRes, aqiRes] = await Promise.allSettled([
      fetch(weatherUrl).then((r) => r.json()),
      fetch(aqiUrl).then((r) => r.json()),
    ]);

    const weatherData = weatherRes.status === "fulfilled" ? weatherRes.value?.current : null;
    const aqiData = aqiRes.status === "fulfilled" ? aqiRes.value?.current : null;

    if (weatherData) {
      const tempC = Math.round((weatherData.temperature_2m ?? 8) * 10) / 10;
      const appTempC = Math.round((weatherData.apparent_temperature ?? tempC) * 10) / 10;
      const tempF = Math.round((tempC * 1.8 + 32) * 10) / 10;
      const appTempF = Math.round((appTempC * 1.8 + 32) * 10) / 10;

      const windKmh = Math.round((weatherData.wind_speed_10m ?? 12) * 10) / 10;
      const windMph = Math.round((windKmh * 0.621371) * 10) / 10;
      const windDeg = weatherData.wind_direction_10m ?? 180;
      const compass = degreesToCompass(windDeg);

      const pressureHpa = Math.round((weatherData.surface_pressure ?? 1018) * 10) / 10;
      const pressureInHg = Math.round((pressureHpa * 0.02953) * 100) / 100;
      const humidityPct = Math.round(weatherData.relative_humidity_2m ?? 65);

      // Dew point approximation: T - ((100 - RH)/5)
      const dewPointC = Math.round((tempC - (100 - humidityPct) / 5) * 10) / 10;

      const uvVal = Math.round((weatherData.uv_index ?? 2) * 10) / 10;
      const uvInfo = interpretUvIndex(uvVal);

      const wmoCode = weatherData.weather_code ?? 0;
      const wmoInfo = interpretWmoCode(wmoCode);

      const aqiVal = Math.round(aqiData?.us_aqi ?? 35);
      const pm25Val = Math.round((aqiData?.pm2_5 ?? 4) * 10) / 10;
      const pm10Val = Math.round((aqiData?.pm10 ?? 6) * 10) / 10;
      const aqiInfo = interpretAqi(aqiVal);

      return {
        timestamp: new Date().toISOString(),
        station: {
          name: stationName,
          latitude: lat,
          longitude: lon,
          elevationMeters: 25,
          timezone: "America/Argentina/Buenos_Aires",
        },
        weather: {
          code: wmoCode,
          description: wmoInfo.description,
          iconName: wmoInfo.iconName,
        },
        temperature: {
          celsius: tempC,
          fahrenheit: tempF,
          apparentCelsius: appTempC,
          apparentFahrenheit: appTempF,
        },
        wind: {
          speedKmh: windKmh,
          speedMph: windMph,
          directionDegrees: windDeg,
          compassHeading: compass,
          bftScale: Math.min(12, Math.floor(Math.pow(windKmh / 3.01, 2 / 3))),
        },
        barometer: {
          pressureHpa,
          pressureInHg,
          tendency: pressureHpa >= 1020 ? "Steady" : pressureHpa >= 1013 ? "Steady" : "Falling",
          atmosphericCondition: pressureHpa >= 1020 ? "High Pressure Anticyclone (Optimal Optics)" : "Standard Barometric Equilibrium",
        },
        humidity: {
          relativePercentage: humidityPct,
          dewPointCelsius: dewPointC,
          comfortIndex: humidityPct > 80 ? "Humid" : humidityPct < 30 ? "Dry" : "Temperate",
        },
        radiation: {
          uvIndex: uvVal,
          uvCategory: uvInfo.category,
          protectiveAdvice: uvInfo.advice,
        },
        airQuality: {
          usAqi: aqiVal,
          aqiCategory: aqiInfo.category,
          pm25: pm25Val,
          pm10: pm10Val,
          airPurityLevel: aqiInfo.purity,
        },
        moon,
        status: "live",
      };
    }
  } catch (err) {
    console.warn("[Observatory Telemetry] Falling back to baseline observation:", err);
  }

  // Graceful high-fidelity fallback baseline
  return {
    timestamp: new Date().toISOString(),
    station: {
      name: stationName,
      latitude: lat,
      longitude: lon,
      elevationMeters: 25,
      timezone: "America/Argentina/Buenos_Aires",
    },
    weather: {
      code: 0,
      description: "Clear Sky • High Astronomical Transparency",
      iconName: "Sun",
    },
    temperature: {
      celsius: 14.5,
      fahrenheit: 58.1,
      apparentCelsius: 13.8,
      apparentFahrenheit: 56.8,
    },
    wind: {
      speedKmh: 11.2,
      speedMph: 7.0,
      directionDegrees: 215,
      compassHeading: "SW",
      bftScale: 2,
    },
    barometer: {
      pressureHpa: 1021.4,
      pressureInHg: 30.16,
      tendency: "Steady",
      atmosphericCondition: "High Pressure System (Clear Optic Trajectory)",
    },
    humidity: {
      relativePercentage: 64,
      dewPointCelsius: 7.7,
      comfortIndex: "Temperate",
    },
    radiation: {
      uvIndex: 2.4,
      uvCategory: "Low",
      protectiveAdvice: "Minimal solar protection required.",
    },
    airQuality: {
      usAqi: 32,
      aqiCategory: "Good",
      pm25: 4.2,
      pm10: 5.8,
      airPurityLevel: "Pristine Atmospheric Clarity (Zero particulate hindrance)",
    },
    moon,
    status: "fallback",
  };
}
