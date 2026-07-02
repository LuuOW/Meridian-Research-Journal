import React, { useState, useEffect, useRef } from "react";
import { X, Linkedin, PhoneCall, Compass, Shield, BookOpen, Award, User, Camera, UploadCloud, Trash2, Loader2 } from "lucide-react";
// @ts-ignore
import lucasProfileImg from "../assets/images/profile.jpg";
import { db } from "../lib/googleAuth";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

          // Save to Firestore so it is persistent across browsers/deployments
          try {
            await setDoc(doc(db, "settings", "profile"), {
              profileImage: compressed,
              updatedAt: new Date().toISOString()
            });
          } catch (err) {
            console.error("Failed to backup custom profile image to Firestore:", err);
          }
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
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
      try {
        await setDoc(doc(db, "settings", "profile"), {
          profileImage: "",
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to remove profile image from Firestore:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-950/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-600" />

        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 dark:bg-neutral-800 flex items-center justify-center text-white">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight">About Meridian Journal</h3>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-widest font-mono">Symmetry &amp; Quantum Informatics</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content (Scrollable if viewport is small) */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 no-scrollbar">
          
          {/* Mission Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-neutral-950 dark:text-neutral-100" /> Our Editorial Mission
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
              Welcome to <strong>Meridian Journal</strong>, an advanced translations companion that bridges the gap between intricate, mathematical, and cutting-edge quantum informatics, deep learning, and chemical physics papers (e.g., from arXiv) and highly legible, beautifully written editorial briefs.
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
              Our core design paradigm values <strong>precision, transparency, and architectural elegance</strong>, preserving complex LaTeX-formatted scientific formulations while highlighting practical engineering constraints and physical insights.
            </p>
          </div>

          {/* Founder Section */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-neutral-50/50 dark:bg-neutral-950/20 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div 
                className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl shrink-0 group overflow-hidden border-2 transition-all duration-300 ${
                  isEditorMode 
                    ? isDragging 
                      ? "border-neutral-950 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-800 scale-105 shadow-lg cursor-pointer" 
                      : "border-neutral-200/80 dark:border-neutral-700 shadow-md hover:shadow-lg cursor-pointer"
                    : "border-neutral-200/80 dark:border-neutral-800 shadow-sm"
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
                {/* Profile Image */}
                <img 
                  src={profileImg} 
                  alt="Lucas Kempe" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                />

                {/* Hover / Drag Overlay */}
                {isEditorMode && (
                  <div className={`absolute inset-0 bg-neutral-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 text-white transition-opacity duration-200 ${
                    isDragging || isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-200" />
                        <span className="text-[10px] font-mono tracking-wider">COMPRESSING...</span>
                      </>
                    ) : isDragging ? (
                      <>
                        <UploadCloud className="w-7 h-7 text-white animate-bounce" />
                        <span className="text-[10px] font-mono font-bold tracking-wider">DROP TO UPLOAD</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-neutral-100" />
                        <span className="text-[10px] font-mono tracking-wider font-semibold">TAP TO EDIT</span>
                        <span className="text-[8px] font-mono text-neutral-300">OR DRAG IMAGE HERE</span>
                      </>
                    )}
                  </div>
                )}
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
                    <span className="inline-block px-3 py-1 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-mono">
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

            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans italic border-l-4 border-neutral-950 dark:border-neutral-200 pl-4 py-1">
              Meridian is spearheaded by Lucas Kempe. Lucas's work centers on creating performant on-device compiler pipelines, deploying high-throughput local AI models, and optimizing neural engines to process complex multi-modal physics and structural chemistry streams cleanly.
            </p>

            {/* Social Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* LinkedIn */}
              <a 
                href="https://www.linkedin.com/in/lucaskempe/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-950/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-850 rounded-2xl group transition-all cursor-pointer hover:shadow-md hover:border-neutral-300"
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
                href="https://wa.me/541170666236"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-950/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-850 rounded-2xl group transition-all cursor-pointer hover:shadow-md hover:border-neutral-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                    <PhoneCall className="w-5 h-5 text-white fill-current" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200 block group-hover:text-black dark:group-hover:text-white transition-colors">Direct WhatsApp</span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono block">wa.me/541170666...</span>
                  </div>
                </div>
                <div className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-all text-xs font-mono font-bold transform group-hover:translate-x-1">
                  Chat &rarr;
                </div>
              </a>
            </div>
          </div>

          {/* Technical Integrity Badge */}
          <div className="bg-neutral-50 dark:bg-neutral-950/30 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-4 flex gap-3.5 text-neutral-800 dark:text-neutral-300">
            <Shield className="w-5 h-5 shrink-0 text-neutral-900 dark:text-neutral-100 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-bold font-sans">Open, Offline-First Security Paradigm</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
                Meridian's architecture leverages secure client-side Firestore integration paired with offline-first persistence keys. Our scientific translations run transparently with clean sandboxed parameters, giving researchers absolute ownership of their translation telemetry.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950/40 border-t border-neutral-100 dark:border-neutral-850 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 px-6">
          <span className="font-mono uppercase tracking-widest font-bold">Ver. 2.1 // Production Node</span>
          <span>© {new Date().getFullYear()} Meridian. All rights reserved.</span>
        </div>

      </div>
    </div>
  );
};
