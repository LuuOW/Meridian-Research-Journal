import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Linkedin, PhoneCall, Compass, Shield, BookOpen, User, Camera, UploadCloud, Trash2, Loader2, Sparkles, CheckCircle2, Zap } from "lucide-react";
// @ts-ignore
import lucasProfileImg from "../assets/images/profile.jpg";
import { db } from "../lib/googleAuth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "../lib/rayTracingUtils";

const STAR_PARTICLES = Array.from({ length: 16 }).map((_, i) => {
  const angle = (i * 360) / 16;
  const rad = (angle * Math.PI) / 180;
  const distance = 90 + (i % 3) * 35;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    size: 3 + (i % 4) * 2.5,
    color: i % 4 === 0 ? "#06b6d4" : i % 4 === 1 ? "#a855f7" : i % 4 === 2 ? "#38bdf8" : "#ffffff",
    delay: (i % 4) * 0.02,
  };
});

const StarExplosionBurst: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
    {/* Blinding White-Cyan Flash Orb */}
    <motion.div
      initial={{ scale: 0.1, opacity: 0 }}
      animate={{
        scale: [0.1, 3.2, 4.5],
        opacity: [0, 1, 0],
        filter: ["brightness(1) blur(0px)", "brightness(3) blur(4px)", "brightness(6) blur(16px)"],
      }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-white via-cyan-300 to-purple-400 shadow-[0_0_80px_35px_rgba(255,255,255,0.95)]"
    />

    {/* Primary 4-Point Lens Flare Beams */}
    <motion.div
      initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
      animate={{ scale: [0.2, 4.2], rotate: [0, 90], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-48 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#06b6d4]"
    />
    <motion.div
      initial={{ scale: 0.2, rotate: 90, opacity: 0 }}
      animate={{ scale: [0.2, 4.2], rotate: [90, 180], opacity: [0, 1, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-48 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_25px_#a855f7]"
    />
    <motion.div
      initial={{ scale: 0.1, rotate: 45, opacity: 0 }}
      animate={{ scale: [0.1, 3.5], rotate: [45, 135], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute w-40 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-transparent"
    />

    {/* Radial Stardust Particles */}
    {STAR_PARTICLES.map((pt) => (
      <motion.div
        key={pt.id}
        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
        animate={{
          x: pt.x,
          y: pt.y,
          scale: [0, 2.5, 0],
          opacity: [1, 1, 0],
        }}
        transition={{ duration: 0.65, delay: pt.delay, ease: "easeOut" }}
        className="absolute rounded-full shadow-[0_0_14px_currentcolor]"
        style={{
          width: `${pt.size}px`,
          height: `${pt.size}px`,
          backgroundColor: pt.color,
          color: pt.color,
        }}
      />
    ))}
  </div>
);

const compressImage = (base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = (err) => reject(err);
  });
};

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditorMode: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, isEditorMode }) => {
  const [profileImg, setProfileImg] = useState<string>(lucasProfileImg);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [lightState, setLightState] = useState(getDefaultLightState());
  const [showExplosion, setShowExplosion] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
    const computed = computeRayTracedLightState(normX, normY, 4, 18);
    setLightState(computed);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setLightState(getDefaultLightState());
  };

  const handleCloseWithExplosion = () => {
    setShowExplosion(true);
    setTimeout(() => {
      setShowExplosion(false);
      onClose();
    }, 550);
  };

  // Load from LocalStorage and Firestore
  useEffect(() => {
    if (!isOpen) return;

    // 1. Try local storage first
    const cachedImg = localStorage.getItem("meridian_custom_profile_image");
    if (cachedImg) {
      setProfileImg(cachedImg);
    }

    // 2. Fetch from Firestore
    const fetchCloudProfile = async () => {
      if (!db) return;
      try {
        const docRef = doc(db, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.profileImage) {
            setProfileImg(data.profileImage);
            localStorage.setItem("meridian_custom_profile_image", data.profileImage);
          }
        }
      } catch (err) {
        console.error("Failed to fetch custom profile image from Firestore:", err);
      }
    };

    fetchCloudProfile();
  }, [isOpen]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Str = e.target?.result as string;
        if (base64Str) {
          const compressed = await compressImage(base64Str);
          
          setProfileImg(compressed);
          localStorage.setItem("meridian_custom_profile_image", compressed);

          if (db) {
            try {
              await setDoc(doc(db, "settings", "profile"), {
                profileImage: compressed,
                updatedAt: new Date().toISOString()
              });
            } catch (err) {
              console.error("Failed to save profile image to Firestore:", err);
            }
          }
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error compressing image:", err);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleReset = async () => {
    if (confirm("Reset profile picture to the default image?")) {
      setProfileImg(lucasProfileImg);
      localStorage.removeItem("meridian_custom_profile_image");
      if (db) {
        try {
          await setDoc(doc(db, "settings", "profile"), {
            profileImage: "",
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.error("Failed to remove profile image from Firestore:", err);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={handleCloseWithExplosion}
      />

      <AnimatePresence>
        {showExplosion && <StarExplosionBurst />}
      </AnimatePresence>

      {/* Modal Card with Interactive Ambient Ray-Tracing (No Tilt) */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative group p-[2px] rounded-[34px] overflow-hidden w-full max-w-2xl z-10 max-h-[90vh] flex flex-col"
        style={{
          boxShadow: isHovered
            ? `${lightState.shadowX}px ${lightState.shadowY}px 45px -5px rgba(6, 182, 212, 0.5), 0 0 50px 10px rgba(168, 85, 247, 0.3)`
            : `${lightState.shadowX * 0.5}px ${lightState.shadowY * 0.5}px 30px -5px rgba(6, 182, 212, 0.25)`
        }}
      >
        {/* Dynamic Ray Traced Conic Neon Light Ring */}
        <div
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-80 blur-xl group-hover:opacity-100 transition-opacity"
          style={{
            background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
          }}
        />

        {/* Dynamic Neon Refraction Border */}
        <div
          className="absolute -inset-[150%] animate-[spin_8s_linear_infinite] opacity-95"
          style={{
            background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #06b6d4)`
          }}
        />

        {/* Inner Card Panel */}
        <div className="relative bg-white dark:bg-neutral-950/95 border border-neutral-200/80 dark:border-neutral-800/90 rounded-[32px] w-full shadow-2xl relative overflow-hidden flex flex-col h-full max-h-[90vh]">
          {/* Specular Highlight Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-75 z-10"
            style={{
              background: `radial-gradient(circle 350px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.3), rgba(6, 182, 212, 0.12) 45%, transparent 75%)`
            }}
          />

          {/* Optical Ray Angle Sheen Sweep */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-20 group-hover:opacity-40 z-10"
            style={{
              background: `linear-gradient(${lightState.angle}deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%)`
            }}
          />

          {/* Top Shimmer Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 bg-[length:200%_200%] animate-[shimmer_3s_linear_infinite] z-20" />

          {/* Header */}
          <div className="relative z-20 p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30 shadow-sm">
                <Compass className="w-5 h-5 text-cyan-500 dark:text-cyan-400 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight flex items-center gap-2">
                  About Meridian Journal
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-mono font-bold uppercase rounded-full border border-cyan-500/30">
                    Ray-Traced
                  </span>
                </h3>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-widest font-mono">Quantum Optics · Computing · AI</p>
              </div>
            </div>
            <button 
              onClick={handleCloseWithExplosion}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content (Scrollable if viewport is small) */}
          <div className="relative z-20 p-6 overflow-y-auto flex flex-col gap-6 no-scrollbar">
            
            {/* Mission Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" /> Our Editorial Mission
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
                Welcome to <strong>Meridian Journal</strong>, an advanced translations companion that bridges the gap between intricate, mathematical, and cutting-edge quantum optics, quantum computing, and artificial intelligence papers (e.g., from arXiv) and highly legible, beautifully written editorial briefs.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
                Our core design paradigm values <strong>precision, transparency, and architectural elegance</strong>, preserving complex LaTeX-formatted scientific formulations while highlighting practical engineering constraints and physical insights.
              </p>
            </div>

            {/* Founder Section */}
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-neutral-50/50 dark:bg-neutral-900/40 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                
                {/* Ray-Traced Neon Avatar Frame */}
                <div 
                  className={`relative shrink-0 group p-[3px] rounded-3xl overflow-hidden shadow-xl cursor-pointer transition-all duration-300 ${
                    isEditorMode && isDragging ? "scale-105 shadow-2xl" : ""
                  }`}
                  onClick={() => {
                    if (isEditorMode) {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    if (isEditorMode) {
                      handleDragOver(e);
                    } else {
                      e.preventDefault();
                    }
                  }}
                  onDragLeave={() => {
                    if (isEditorMode) {
                      handleDragLeave();
                    }
                  }}
                  onDrop={(e) => {
                    if (isEditorMode) {
                      handleDrop(e);
                    } else {
                      e.preventDefault();
                    }
                  }}
                >
                  {/* Spinning Conic Neon Light Ring Around Avatar */}
                  <div 
                    className="absolute -inset-[100%] animate-[spin_6s_linear_infinite] opacity-85 group-hover:opacity-100 blur-sm transition-opacity"
                    style={{
                      background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #3b82f6, #a855f7, #ec4899, #06b6d4)`
                    }}
                  />

                  {/* Crisp Refraction Edge */}
                  <div 
                    className="absolute -inset-[100%] animate-[spin_6s_linear_infinite] opacity-100"
                    style={{
                      background: `conic-gradient(from ${lightState.angle}deg, #06b6d4, #6366f1, #a855f7, #ec4899, #06b6d4)`
                    }}
                  />

                  {/* Avatar Container Inner Dark Body */}
                  <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-[22px] bg-neutral-950 overflow-hidden border border-neutral-800">
                    <img 
                      src={profileImg} 
                      alt="Lucas Kempe" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                    />

                    {/* Specular Raytraced Highlight Spot on Avatar */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at ${lightState.lightX}% ${lightState.lightY}%, rgba(255,255,255,0.5), transparent 60%)`
                      }}
                    />

                    {/* Hover / Drag Overlay for Editor Mode */}
                    {isEditorMode && (
                      <div className={`absolute inset-0 bg-neutral-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 text-white transition-opacity duration-200 ${
                        isDragging || isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                        {isUploading ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-cyan-300" />
                            <span className="text-[10px] font-mono tracking-wider">COMPRESSING...</span>
                          </>
                        ) : isDragging ? (
                          <>
                            <UploadCloud className="w-7 h-7 text-cyan-300 animate-bounce" />
                            <span className="text-[10px] font-mono font-bold tracking-wider">DROP TO UPLOAD</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-cyan-200" />
                            <span className="text-[10px] font-mono tracking-wider font-semibold">TAP TO EDIT</span>
                            <span className="text-[8px] font-mono text-neutral-300">OR DRAG IMAGE HERE</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verified Checkmark Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-tr from-cyan-500 to-emerald-400 rounded-full border-2 border-white dark:border-neutral-950 flex items-center justify-center shadow-lg z-20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black font-bold stroke-[3]" />
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                <div className="text-center sm:text-left space-y-2.5 py-1 flex-1 flex flex-col justify-between h-full">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="inline-block px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-mono">
                        Journal Founder
                      </span>
                      {isEditorMode && profileImg !== lucasProfileImg && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-mono transition-colors cursor-pointer"
                          title="Reset to default original image"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Reset Image
                        </button>
                      )}
                    </div>
                    <h4 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight">Lucas Kempe</h4>
                    <p className="text-base sm:text-lg font-semibold text-neutral-700 dark:text-neutral-300 font-sans leading-snug">
                      Founder &amp; Principal Director of Meridian Informatics
                    </p>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono flex items-center justify-center sm:justify-start gap-2 pt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    lucas.kempe@icloud.com
                  </p>
                </div>
              </div>

              <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans italic border-l-4 border-cyan-500 dark:border-cyan-400 pl-4 py-1">
                Meridian is spearheaded by Lucas Kempe. Lucas's work centers on creating performant on-device compiler pipelines, deploying high-throughput local AI models, and optimizing neural engines to process complex multi-modal physics and structural chemistry streams cleanly.
              </p>

              {/* Social Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* LinkedIn */}
                <a 
                  href="https://www.linkedin.com/in/lucaskempe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-950/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl group transition-all cursor-pointer hover:shadow-md hover:border-neutral-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0077b5] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                      <Linkedin className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200 block group-hover:text-black dark:group-hover:text-white transition-colors">LinkedIn Profile</span>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono block">@lucaskempe</span>
                    </div>
                  </div>
                  <div className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-all text-xs font-mono font-bold transform group-hover:translate-x-1">
                    Connect &rarr;
                  </div>
                </a>

                {/* WhatsApp */}
                <a 
                  href="https://wa.me/541171323723"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-950/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-800 rounded-2xl group transition-all cursor-pointer hover:shadow-md hover:border-neutral-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                      <PhoneCall className="w-5 h-5 text-white fill-current" />
                    </div>
                    <div>
                      <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200 block group-hover:text-black dark:group-hover:text-white transition-colors">Direct WhatsApp</span>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono block">+54 11 7132-3723</span>
                    </div>
                  </div>
                  <div className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-all text-xs font-mono font-bold transform group-hover:translate-x-1">
                    Chat &rarr;
                  </div>
                </a>
              </div>
            </div>

            {/* Technical Integrity Badge */}
            <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 flex gap-3.5 text-neutral-800 dark:text-neutral-300">
              <Shield className="w-5 h-5 shrink-0 text-cyan-500 dark:text-cyan-400 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold font-sans">Open, Offline-First Security Paradigm</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
                  Meridian's architecture leverages secure client-side Firestore integration paired with offline-first persistence keys. Our scientific translations run transparently with clean sandboxed parameters, giving researchers absolute ownership of their translation telemetry.
                </p>
              </div>
            </div>

            {/* Privacy Policy & Advertising Disclosure (Google AdSense Policy Compliance) */}
            <div className="bg-neutral-50/70 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-4 flex flex-col gap-2 text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-2 text-xs font-bold font-sans text-neutral-900 dark:text-neutral-100">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Privacy Policy &amp; Cookie Disclosure</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
                Meridian utilizes Google AdSense and authorized digital sellers to serve non-intrusive, privacy-respecting educational and scholarly advertisements. Third-party vendors, including Google, use cookies to serve ads based on prior visits to our website and across the internet. Users may opt out of personalized advertising by visiting Google's <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 underline font-medium">Ads Settings</a> or <a href="https://aboutads.info" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 underline font-medium">aboutads.info</a>.
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="relative z-20 p-4 bg-neutral-50 dark:bg-neutral-950/40 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 px-6 shrink-0">
            <span className="font-mono uppercase tracking-widest font-bold text-cyan-600 dark:text-cyan-400">Ver. 2.1 // Production Node</span>
            <span>© {new Date().getFullYear()} Meridian. All rights reserved.</span>
          </div>

        </div>
      </div>
    </div>
  );
};
