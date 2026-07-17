import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Brain, ExternalLink, RefreshCw, BookOpen, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";

interface DailyPredictionProps {
  onGeneratePredictedBlog: (arxivId: string) => void;
  historyCount: number;
}

interface PredictedPaper {
  id: string;
  title: string;
  summary: string;
  authors: string;
  link: string;
}

interface PredictionData {
  predictedPaper: PredictedPaper;
  reasoning: string;
  predictedAt: string;
  timestamp: number;
}

export const DailyPrediction: React.FC<DailyPredictionProps> = ({ onGeneratePredictedBlog, historyCount }) => {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  const LOADING_PREDICTION_STEPS = [
    "Analyzing your scholarly publication history...",
    "Scanning latest arXiv entries in physics.optics & quant-ph...",
    "Correlating mathematical formulas and physical paradigms...",
    "Calculating predictive relevance scoring via Gemini...",
    "Drafting technical reasoning justification..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_PREDICTION_STEPS.length);
      }, 2500);
    } else {
      setLoadingStepIdx(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Load cached prediction on mount
  useEffect(() => {
    const cached = localStorage.getItem("meridian_daily_prediction");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as PredictionData;
        const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        // Check if the prediction belongs to today
        if (parsed.predictedAt === todayStr) {
          setPrediction(parsed);
        }
      } catch (err) {
        console.error("Failed to load cached daily prediction:", err);
      }
    }
  }, []);

  const handlePredict = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStepIdx(0);

    try {
      const response = await fetch("/api/blog/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        let errText = "Failed to run scientific forecast.";
        try {
          const data = await response.json();
          errText = data.error || errText;
        } catch {
          const raw = await response.text();
          errText = `Server error (${response.status}): ${raw.slice(0, 100)}`;
        }
        throw new Error(errText);
      }

      const data = await response.json();
      if (data.predictedPaper && data.reasoning) {
        const predictionResult: PredictionData = {
          predictedPaper: data.predictedPaper,
          reasoning: data.reasoning,
          predictedAt: data.predictedAt || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          timestamp: data.timestamp || Date.now()
        };
        setPrediction(predictionResult);
        localStorage.setItem("meridian_daily_prediction", JSON.stringify(predictionResult));
      } else {
        throw new Error("Invalid prediction payload received from Gemini advisor.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during prediction.");
    } finally {
      setIsLoading(false);
    }
  };

  const todayDateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Dynamic technical top glow */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-cyan-500 via-pink-500 to-amber-500 dark:from-cyan-700 dark:via-pink-700 dark:to-amber-600 opacity-90" />
      
      {/* Ambient background decoration */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-neutral-100/40 dark:bg-neutral-950/20 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-neutral-100 dark:border-neutral-800/80 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">
              AI-Powered Scholarly Forecasting
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold italic text-neutral-900 dark:text-neutral-100 tracking-tight">
            Daily Research Journal Predictor
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-950/30 px-3 py-1.5 rounded-xl border border-neutral-200/20">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span>{todayDateStr}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          /* LOADING FORECAST STATE */
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-neutral-100 dark:border-neutral-800" />
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
            </div>

            <div className="space-y-2 max-w-md">
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Generating Scientific Recommendation</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Scanning arXiv optics & quantum physics feed for you...</p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950/20 border border-neutral-100 dark:border-neutral-800 p-4 rounded-2xl w-full max-w-md text-left">
              <div className="flex flex-col gap-2.5">
                {LOADING_PREDICTION_STEPS.map((step, idx) => {
                  const isDone = idx < loadingStepIdx;
                  const isCurrent = idx === loadingStepIdx;
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 transition-all duration-300 ${
                        isDone ? "opacity-30" : isCurrent ? "opacity-100 scale-[1.01]" : "opacity-10"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${isCurrent ? "text-neutral-800 dark:text-neutral-200 font-bold" : "text-neutral-500"}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : prediction ? (
          /* COMPLETED PREDICTION DISPLAY */
          <motion.div
            key="prediction-result"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="space-y-6"
          >
            {/* Top Recommended Paper card */}
            <div className="bg-neutral-50/50 dark:bg-neutral-950/20 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 dark:text-cyan-400 text-[9px] font-extrabold uppercase tracking-widest rounded-full border border-cyan-500/10 flex items-center gap-1">
                  <Brain className="w-3 h-3 text-cyan-500" />
                  Today's Scientific Forecast
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                  arXiv:{prediction.predictedPaper.id}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-serif font-bold italic tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug">
                  {prediction.predictedPaper.title}
                </h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                  Authors: {prediction.predictedPaper.authors}
                </p>
              </div>

              {/* AI Recommendation Context Block */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 dark:bg-cyan-600" />
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono mb-2">
                  AI Recommendation Alignment
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal italic">
                  "{prediction.reasoning}"
                </p>
              </div>

              {/* Paper abstract excerpt summary */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">
                  Abstract Overview
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-light line-clamp-3">
                  {prediction.predictedPaper.summary}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => onGeneratePredictedBlog(prediction.predictedPaper.id)}
                  className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-150 cursor-pointer active:scale-98 group"
                >
                  <Sparkles className="w-4 h-4 fill-current animate-pulse text-white dark:text-black" />
                  Generate Ask Meridian Post
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <a
                  href={prediction.predictedPaper.link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-950/40"
                >
                  View on arXiv
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handlePredict}
                  title="Recalculate Predictor"
                  className="p-3 border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-full transition-all flex items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-950/40"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* EMPTY/PROMPT TO GENERATE TODAY'S FORECAST */
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-10 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold uppercase tracking-widest rounded-full border border-amber-500/10">
                <Brain className="w-3.5 h-3.5 text-amber-500" />
                Dynamic Interest Alignment
              </div>
              <h3 className="text-lg font-serif font-bold italic text-neutral-900 dark:text-neutral-100">
                Analyze your history to predict today's paper
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-lg leading-relaxed font-light">
                Our predictor scans recent physics arXiv preprints in <span className="font-medium text-neutral-700 dark:text-neutral-300 font-mono">physics.optics</span> and <span className="font-medium text-neutral-700 dark:text-neutral-300 font-mono">quant-ph</span>, correlates them with your existing articles, and selects the ideal mathematical matching candidate.
              </p>
            </div>

            <button
              onClick={handlePredict}
              className="px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-98 cursor-pointer border border-neutral-200/10 group shrink-0"
            >
              <Sparkles className="w-4 h-4 fill-white/20 dark:fill-black/10 animate-pulse" />
              Predict Today's Paper
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
