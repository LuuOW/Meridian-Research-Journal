import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Compass,
  Gauge,
  Droplets,
  Thermometer,
  Moon,
  Sparkles,
  RefreshCw,
  MapPin,
  Clock,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import {
  ObservatoryTelemetry,
  getObservatoryTelemetry,
  DEFAULT_STATION,
} from "../lib/observatoryTelemetry";

interface ObservatoryTelemetryDeckProps {
  artTimeStr?: string;
  isPendingReview?: boolean;
  remainingSeconds?: number;
  formatCountdown?: (secs: number) => string;
  isAlreadyPublished?: boolean;
  scheduledTimeLabel?: string;
  theme?: "light" | "dark";
}

export const ObservatoryTelemetryDeck: React.FC<ObservatoryTelemetryDeckProps> = ({
  artTimeStr,
  isPendingReview = false,
  remainingSeconds = 0,
  formatCountdown,
  isAlreadyPublished = false,
  scheduledTimeLabel = "Tomorrow 09:00 AM ART",
  theme,
}) => {
  const [telemetry, setTelemetry] = useState<ObservatoryTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [useLocalLocation, setUseLocalLocation] = useState(false);
  const [activeUnit, setActiveUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [liveArtTime, setLiveArtTime] = useState<string>("");

  // Live Argentina Time (ART - UTC-3) ticker
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const dateParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          month: "short",
          day: "numeric",
        }).format(now);
        setLiveArtTime(`${timeFormatter.format(now)} ART • ${dateParts}`);
      } catch {
        setLiveArtTime("09:00:00 ART");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch telemetry
  const loadTelemetry = async (useCoords?: { lat: number; lon: number; name: string }) => {
    setLoading(true);
    try {
      const lat = useCoords ? useCoords.lat : DEFAULT_STATION.latitude;
      const lon = useCoords ? useCoords.lon : DEFAULT_STATION.longitude;
      const name = useCoords ? useCoords.name : DEFAULT_STATION.name;
      const data = await getObservatoryTelemetry(lat, lon, name);
      setTelemetry(data);
    } catch (err) {
      console.warn("Failed to load telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, []);

  // Handle local geolocation toggle
  const handleDetectLocal = () => {
    if (useLocalLocation) {
      setUseLocalLocation(false);
      loadTelemetry();
      return;
    }

    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUseLocalLocation(true);
          loadTelemetry({
            lat: Math.round(pos.coords.latitude * 1000) / 1000,
            lon: Math.round(pos.coords.longitude * 1000) / 1000,
            name: "Local Observer Station",
          });
        },
        (err) => {
          console.warn("Geolocation denied or unavailable:", err);
          setLoading(false);
          loadTelemetry();
        },
        { timeout: 8000 }
      );
    }
  };

  // Weather icon mapping
  const renderWeatherIcon = (iconName: string, className = "w-5 h-5") => {
    switch (iconName) {
      case "Sun":
        return <Sun className={`${className} text-amber-400`} />;
      case "CloudSun":
        return <CloudSun className={`${className} text-amber-300`} />;
      case "Cloud":
        return <Cloud className={`${className} text-slate-300`} />;
      case "CloudRain":
        return <CloudRain className={`${className} text-cyan-400`} />;
      case "CloudSnow":
        return <CloudSnow className={`${className} text-sky-200`} />;
      case "CloudLightning":
        return <CloudLightning className={`${className} text-yellow-400`} />;
      default:
        return <Sun className={`${className} text-amber-400`} />;
    }
  };

  // UV badge color
  const getUvColor = (cat: string) => {
    switch (cat) {
      case "Low":
        return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
      case "Moderate":
        return "text-amber-400 bg-amber-500/15 border-amber-500/30";
      case "High":
      case "Very High":
        return "text-orange-400 bg-orange-500/15 border-orange-500/30";
      case "Extreme":
        return "text-rose-400 bg-rose-500/15 border-rose-500/30";
      default:
        return "text-cyan-400 bg-cyan-500/15 border-cyan-500/30";
    }
  };

  // AQI badge color
  const getAqiColor = (cat: string) => {
    switch (cat) {
      case "Good":
        return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
      case "Moderate":
        return "text-amber-300 bg-amber-500/15 border-amber-500/30";
      case "Sensitive":
      case "Unhealthy":
        return "text-orange-300 bg-orange-500/15 border-orange-500/30";
      default:
        return "text-rose-300 bg-rose-500/15 border-rose-500/30";
    }
  };

  const currentDisplayTime = artTimeStr || liveArtTime || "09:00:00 ART (UTC-3)";
  const isLight = theme === "light";

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-lg transition-colors duration-200 ${
        isLight
          ? "border-cyan-500/20 bg-white/95 text-slate-900 shadow-slate-900/10"
          : "border-cyan-500/25 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-900/90 text-white shadow-cyan-950/20 backdrop-blur-md"
      }`}
    >
      {/* Telemetry Header Bar */}
      <div
        className={`px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 transition-colors ${
          isLight
            ? "border-slate-200 bg-slate-50/90"
            : "border-cyan-500/15 bg-slate-950/70"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm ${
              isLight
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-600"
                : "bg-cyan-500/15 border-cyan-400/30 text-cyan-400"
            }`}
          >
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold tracking-wide uppercase ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                Observatory &amp; Environmental Telemetry
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1 ${
                  isLight
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Sensor Feed
              </span>
            </div>
            <p
              className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
              <span>{telemetry?.station.name || DEFAULT_STATION.name}</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Clock */}
        <div className="flex items-center gap-2 ml-auto">
          {/* ART Clock Ticker */}
          <div
            className={`px-3 py-1 rounded-xl border text-right font-mono ${
              isLight
                ? "bg-white border-slate-200 text-cyan-700 shadow-xs"
                : "bg-slate-900/90 border-cyan-500/25 text-cyan-300"
            }`}
          >
            <div className="text-[11px] font-bold flex items-center gap-1.5 justify-end">
              <Clock className="w-3 h-3 text-cyan-500" />
              <span>{currentDisplayTime}</span>
            </div>
          </div>

          {/* Unit Switcher */}
          <button
            type="button"
            onClick={() => setActiveUnit((prev) => (prev === "celsius" ? "fahrenheit" : "celsius"))}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
              isLight
                ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border-slate-700/60"
            }`}
            title="Toggle Temperature Unit"
          >
            {activeUnit === "celsius" ? "°C" : "°F"}
          </button>

          {/* Detect Local Toggle */}
          <button
            type="button"
            onClick={handleDetectLocal}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
              useLocalLocation
                ? isLight
                  ? "bg-cyan-50 text-cyan-700 border-cyan-300"
                  : "bg-cyan-500/20 text-cyan-200 border-cyan-400/40"
                : isLight
                ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                : "bg-slate-800/60 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title={useLocalLocation ? "Revert to ART Buenos Aires" : "Detect local weather"}
          >
            <MapPin className="w-3 h-3" />
            <span className="hidden sm:inline">{useLocalLocation ? "Local" : "Local GPS"}</span>
          </button>

          {/* Refresh Sensor Data */}
          <button
            type="button"
            onClick={() => loadTelemetry(useLocalLocation ? undefined : undefined)}
            disabled={loading}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              isLight
                ? "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                : "bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700"
            }`}
            title="Refresh Environmental Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-500" : ""}`} />
          </button>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight
                ? "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                : "bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700"
            }`}
            title={isExpanded ? "Collapse Telemetry" : "Expand Telemetry"}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Primary Atmospheric Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
              {/* 1. Weather & Condition */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Condition
                  </span>
                  {renderWeatherIcon(telemetry?.weather.iconName || "Sun")}
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-bold truncate transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {telemetry?.weather.description || "Clear Sky"}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Atmospheric Optics
                  </div>
                </div>
              </div>

              {/* 2. Temperature */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Temperature
                  </span>
                  <Thermometer className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-base font-extrabold font-mono transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {activeUnit === "celsius"
                      ? `${telemetry?.temperature.celsius ?? 8}°C`
                      : `${telemetry?.temperature.fahrenheit ?? 46.4}°F`}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Feels like{" "}
                    {activeUnit === "celsius"
                      ? `${telemetry?.temperature.apparentCelsius ?? 5}°C`
                      : `${telemetry?.temperature.apparentFahrenheit ?? 41}°F`}
                  </div>
                </div>
              </div>

              {/* 3. Barometric Pressure */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Pressure
                  </span>
                  <Gauge className="w-4 h-4 text-cyan-500" />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-extrabold font-mono transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {telemetry?.barometer.pressureHpa ?? 1021.9} hPa
                  </div>
                  <div
                    className={`text-[10px] font-medium mt-0.5 flex items-center gap-1 ${
                      isLight ? "text-emerald-600" : "text-emerald-400"
                    }`}
                  >
                    <span>{telemetry?.barometer.pressureInHg ?? 30.17} inHg</span>
                    <span className="text-slate-400">•</span>
                    <span>{telemetry?.barometer.tendency ?? "Steady"}</span>
                  </div>
                </div>
              </div>

              {/* 4. Wind Velocity & Direction */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Wind
                  </span>
                  <Wind className="w-4 h-4 text-sky-500" />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-extrabold font-mono transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {telemetry?.wind.speedKmh ?? 14.6} km/h
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 flex items-center gap-1 ${
                      isLight ? "text-cyan-700" : "text-cyan-300"
                    }`}
                  >
                    <Compass className="w-2.5 h-2.5" />
                    <span>
                      {telemetry?.wind.compassHeading ?? "SW"} ({telemetry?.wind.directionDegrees ?? 219}°)
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Relative Humidity */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Humidity
                  </span>
                  <Droplets className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-extrabold font-mono transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {telemetry?.humidity.relativePercentage ?? 72}%
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Dew pt: {telemetry?.humidity.dewPointCelsius ?? 3.2}°C
                  </div>
                </div>
              </div>

              {/* 6. Moon Phase & Astronomical Cycle */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Moon Phase
                  </span>
                  <span className="text-base select-none">{telemetry?.moon.emoji ?? "🌗"}</span>
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-bold truncate transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {telemetry?.moon.phaseName ?? "Last Quarter"}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 ${
                      isLight ? "text-indigo-600" : "text-indigo-300"
                    }`}
                  >
                    {telemetry?.moon.illumination ?? 42}% Illum • Day {telemetry?.moon.moonAgeDays ?? 22.9}
                  </div>
                </div>
              </div>

              {/* 7. UV Index */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    UV Index
                  </span>
                  <Sun className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-extrabold font-mono transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    UV {telemetry?.radiation.uvIndex ?? 2.0}
                  </div>
                  <div className="mt-0.5">
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${getUvColor(
                        telemetry?.radiation.uvCategory ?? "Low"
                      )}`}
                    >
                      {telemetry?.radiation.uvCategory ?? "Low"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 8. Air Quality (AQI) */}
              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-white shadow-xs"
                    : "bg-slate-900/70 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Air Quality
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-xs font-extrabold font-mono transition-colors ${
                      isLight
                        ? "text-slate-900 group-hover:text-cyan-700"
                        : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    AQI {telemetry?.airQuality.usAqi ?? 37}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${getAqiColor(
                        telemetry?.airQuality.aqiCategory ?? "Good"
                      )}`}
                    >
                      {telemetry?.airQuality.aqiCategory ?? "Good"}
                    </span>
                    <span
                      className={`text-[9px] ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      PM2.5: {telemetry?.airQuality.pm25 ?? 4.1}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observatory Footer Context Banner */}
            <div
              className={`mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                isLight
                  ? "border-slate-200 text-slate-600"
                  : "border-slate-800/80 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>
                  <strong className={isLight ? "text-slate-800" : "text-slate-200"}>
                    Astronomical Window:
                  </strong>{" "}
                  {telemetry?.moon.observationalQuality || "Optimal high-contrast deep sky window."}
                </span>
              </div>

              {/* Cadence status badge */}
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                <span>
                  Cadence Target:{" "}
                  <strong className={isLight ? "text-slate-800" : "text-slate-200"}>
                    {scheduledTimeLabel}
                  </strong>
                </span>
                {isPendingReview && remainingSeconds > 0 ? (
                  <span className="text-amber-500 font-mono font-bold">
                    ({formatCountdown ? formatCountdown(remainingSeconds) : `${remainingSeconds}s`})
                  </span>
                ) : isAlreadyPublished ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Published
                  </span>
                ) : (
                  <span className={isLight ? "text-cyan-700 font-mono" : "text-cyan-300/80 font-mono"}>
                    Review Window Ready
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
