import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { BlogPost } from "../types";

interface AudioPlayerProps {
  blog: BlogPost;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ blog, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.1); // Slightly faster default is standard for text readers
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const estimatedDurationRef = useRef<number>(300); // in seconds, default 5 mins
  const sentencesRef = useRef<string[]>([]);
  const currentSentenceIndexRef = useRef<number>(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Strip markdown & LaTeX to make a beautifully readable narration script
  const getSpeechScript = (content: string, title: string): string => {
    let text = `Listening to: ${title}. Published by Meridian Research. \n\n`;
    
    // Process markdown to speech script
    let cleanText = content
      // Remove LaTeX block equations
      .replace(/\$\$([\s\S]*?)\$\$/g, " [equation mathematical formula] ")
      // Remove inline equations
      .replace(/\$([\s\S]*?)\$\$/g, " ")
      .replace(/\$([^$]+)\$/g, " $1 ")
      // Remove markdown headings
      .replace(/###\s*(.*)/g, "$1. ")
      .replace(/##\s*(.*)/g, "$1. ")
      // Remove markdown horizontal rules
      .replace(/---\s*/g, " ")
      // Remove markdown lists and bullets
      .replace(/[-\*]\s*/g, "")
      // Remove markdown bold/italic
      .replace(/[\*_]{1,3}([^*_]+)[\*_]{1,3}/g, "$1")
      // Remove brackets
      .replace(/[\[\]\(\)]/g, " ")
      // Fix backslash artifacts
      .replace(/\\/g, " ");

    return text + cleanText;
  };

  const getSentences = (text: string): string[] => {
    const matches = text.match(/[^.!?\n]+[.!?\n]*/g);
    if (!matches) return [text];
    return matches
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
  };

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Cancel any current speech synthesis globally to free the audio device
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    const textToSpeak = getSpeechScript(blog.content, blog.title);
    const splitSentences = getSentences(textToSpeak);
    sentencesRef.current = splitSentences;
    
    setCurrentSentenceIndex(0);
    currentSentenceIndexRef.current = 0;
    setProgress(0);
    setTimeElapsed(0);
    setIsPlaying(false);

    const words = textToSpeak.split(/\s+/).length;
    estimatedDurationRef.current = Math.ceil((words / 150) * 60);

    // Auto-play on mount with a safe delay to allow the browser to load voices and user gesture context
    const timer = setTimeout(() => {
      startSpeech(0);
    }, 250);

    return () => {
      clearTimeout(timer);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [blog]);

  // Keep track of active playback elapsed timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const startSpeech = (index: number) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();

    if (index >= sentencesRef.current.length) {
      setIsPlaying(false);
      setProgress(100);
      setCurrentSentenceIndex(0);
      currentSentenceIndexRef.current = 0;
      return;
    }

    currentSentenceIndexRef.current = index;
    setCurrentSentenceIndex(index);
    
    const pct = Math.round((index / sentencesRef.current.length) * 100);
    setProgress(pct);

    const sentence = sentencesRef.current[index];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utteranceRef.current = utterance;

    // Resolve voices safely
    const voices = synthRef.current.getVoices();
    const premiumVoice = voices.find(
      (v) => v.lang.startsWith("en-") && (v.name.includes("Google") || v.name.includes("Natural"))
    ) || voices.find((v) => v.lang.startsWith("en-")) || voices[0];
    
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.rate = playbackSpeed;
    utterance.volume = isMuted ? 0 : 1;

    utterance.onend = () => {
      const nextIndex = currentSentenceIndexRef.current + 1;
      startSpeech(nextIndex);
    };

    utterance.onerror = (e) => {
      console.warn("Speech Synthesis error:", e);
      if (e.error !== "interrupted") {
        const nextIndex = currentSentenceIndexRef.current + 1;
        startSpeech(nextIndex);
      }
    };

    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  const pauseSpeech = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // Cancel current utterance to release engine lock, but keep the index
    setIsPlaying(false);
  };

  const resumeSpeech = () => {
    if (!synthRef.current) return;
    startSpeech(currentSentenceIndexRef.current);
  };

  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setProgress(0);
    setTimeElapsed(0);
    setCurrentSentenceIndex(0);
    currentSentenceIndexRef.current = 0;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSpeech();
    } else {
      resumeSpeech();
    }
  };

  // Control Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      // Apply speed rate update immediately
      pauseSpeech();
      setTimeout(() => {
        setPlaybackSpeed(speed);
        startSpeech(currentSentenceIndexRef.current);
      }, 100);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (isPlaying) {
      pauseSpeech();
      setTimeout(() => {
        setIsMuted(nextMute);
        startSpeech(currentSentenceIndexRef.current);
      }, 50);
    }
  };

  // Formatter for elapsed/total times
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const totalDuration = Math.ceil(estimatedDurationRef.current / playbackSpeed);

  return (
    <div id="listen-bar" className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-800 z-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-all duration-300">
      
      {/* Waveform and Title Panel */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Animated sound wave bars */}
        <div className="flex items-end gap-1 h-8 w-10 flex-shrink-0 bg-slate-800/50 rounded-lg p-2 justify-center">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              style={{
                height: isPlaying ? "100%" : "20%",
                animationDelay: `${bar * 0.15}s`,
                animationDuration: `${1 + Math.random() * 0.5}s`,
              }}
              className={`w-1 rounded-full bg-cyan-400 ${isPlaying ? "animate-bounce" : "transition-all duration-300"}`}
            />
          ))}
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-xs text-cyan-400 font-mono tracking-wider uppercase font-semibold">Narrating Article</p>
          <h4 className="text-sm font-medium text-slate-100 truncate mt-0.5">{blog.title}</h4>
        </div>
      </div>

      {/* Main audio controls */}
      <div className="flex flex-col gap-2 flex-1 min-w-[280px]">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              const prevIndex = Math.max(0, currentSentenceIndexRef.current - 2);
              startSpeech(prevIndex);
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title="Rewind 2 sentences"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-3 bg-cyan-500 text-slate-950 rounded-full hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => {
              const nextIndex = Math.min(sentencesRef.current.length - 1, currentSentenceIndexRef.current + 2);
              startSpeech(nextIndex);
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title="Forward 2 sentences"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              stopSpeech();
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>{formatTime(timeElapsed)}</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-cyan-400 shadow-md shadow-cyan-400/50 transition-all duration-300"
            />
          </div>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Additional utilities: speed and close */}
      <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-800 pt-3 md:border-none md:pt-0">
        {/* Speed Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400">Speed</span>
          <select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-1 py-0.5 font-mono outline-none focus:border-cyan-400 transition-colors"
          >
            <option value="0.9">0.9x</option>
            <option value="1.0">1.0x</option>
            <option value="1.1">1.1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>
        </div>

        {/* Mute and Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
