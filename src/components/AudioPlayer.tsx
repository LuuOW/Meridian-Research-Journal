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
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const estimatedDurationRef = useRef<number>(300); // in seconds, default 5 mins
  const timeElapsedRef = useRef<number>(0);

  // Strip markdown & LaTeX to make a beautifully readable narration script
  const getSpeechScript = (content: string, title: string): string => {
    let text = `Listening to: ${title}. Published by Meridian Research. \n\n`;
    
    // Process markdown to speech script
    let cleanText = content
      // Remove LaTeX block equations
      .replace(/\$\$([\s\S]*?)\$\$/g, " [equation mathematical formula] ")
      // Remove inline equations
      .replace(/\$([\s\S]*?)\$/g, " $1 ")
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

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Estimate duration based on word count (avg reading speed 150 words/min)
    const textToSpeak = getSpeechScript(blog.content, blog.title);
    const words = textToSpeak.split(/\s+/).length;
    estimatedDurationRef.current = Math.ceil((words / 150) * 60);

    return () => {
      stopSpeech();
    };
  }, [blog]);

  const startSpeech = () => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();

    const textToSpeak = getSpeechScript(blog.content, blog.title);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    // Pick an English voice
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
      setIsPlaying(false);
      setProgress(100);
      stopInterval();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      setIsPlaying(false);
      stopInterval();
    };

    synthRef.current.speak(utterance);
    setIsPlaying(true);
    startInterval();
  };

  const pauseSpeech = () => {
    if (!synthRef.current) return;
    if (synthRef.current.speaking && !synthRef.current.paused) {
      synthRef.current.pause();
      setIsPlaying(false);
      stopInterval();
    }
  };

  const resumeSpeech = () => {
    if (!synthRef.current) return;
    if (synthRef.current.paused) {
      synthRef.current.resume();
      setIsPlaying(true);
      startInterval();
    } else {
      startSpeech();
    }
  };

  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setProgress(0);
    timeElapsedRef.current = 0;
    stopInterval();
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSpeech();
    } else {
      resumeSpeech();
    }
  };

  // Timeline Progress Emulation (Since Web Speech Synthesis does not have native progress callbacks)
  const startInterval = () => {
    stopInterval();
    progressIntervalRef.current = setInterval(() => {
      timeElapsedRef.current += 1;
      const pct = Math.min((timeElapsedRef.current / (estimatedDurationRef.current / playbackSpeed)) * 100, 99);
      setProgress(pct);
    }, 1000);
  };

  const stopInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Control Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      // Must restart speech to apply new rate in some browsers
      stopSpeech();
      setTimeout(() => {
        setPlaybackSpeed(speed);
        startSpeech();
      }, 100);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (utteranceRef.current && synthRef.current) {
      // Directly alter volume of current stream
      utteranceRef.current.volume = nextMute ? 0 : 1;
      // In some speech engines we need to reload to apply
      if (isPlaying) {
        synthRef.current.cancel();
        const textToSpeak = getSpeechScript(blog.content, blog.title);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utteranceRef.current = utterance;
        utterance.rate = playbackSpeed;
        utterance.volume = nextMute ? 0 : 1;
        const voices = synthRef.current.getVoices();
        const premiumVoice = voices.find(v => v.lang.startsWith("en-")) || voices[0];
        if (premiumVoice) utterance.voice = premiumVoice;
        synthRef.current.speak(utterance);
      }
    }
  };

  // Formatter for elapsed/total times
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const timeElapsed = Math.floor(timeElapsedRef.current);
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
              timeElapsedRef.current = Math.max(0, timeElapsedRef.current - 15);
              if (isPlaying) {
                // Emulate rewind by restarting utterance from a general point
                stopSpeech();
                setTimeout(() => startSpeech(), 150);
              }
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
            title="Rewind 15s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-3 bg-cyan-500 text-slate-950 rounded-full hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => {
              timeElapsedRef.current = Math.min(totalDuration, timeElapsedRef.current + 15);
              if (isPlaying) {
                stopSpeech();
                setTimeout(() => startSpeech(), 150);
              }
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
            title="Forward 15s"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              stopSpeech();
              timeElapsedRef.current = 0;
            }}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
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
