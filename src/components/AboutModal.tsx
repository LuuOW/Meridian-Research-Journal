import React from "react";
import { X, Linkedin, PhoneCall, Compass, Shield, BookOpen, Award, User } from "lucide-react";
// @ts-ignore
import lucasProfileImg from "../assets/images/profile.jpg";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-950/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-600" />

        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center text-white">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-sans tracking-tight">About Meridian Journal</h3>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest font-mono">Symmetry &amp; Quantum Informatics</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-950 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content (Scrollable if viewport is small) */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 no-scrollbar">
          
          {/* Mission Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-neutral-500 uppercase tracking-widest font-mono flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-neutral-950" /> Our Editorial Mission
            </h4>
            <p className="text-sm text-neutral-600 leading-relaxed font-sans">
              Welcome to <strong>Meridian Journal</strong>, an advanced translations companion that bridges the gap between intricate, mathematical, and cutting-edge quantum informatics, deep learning, and chemical physics papers (e.g., from arXiv) and highly legible, beautifully written editorial briefs.
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed font-sans">
              Our core design paradigm values <strong>precision, transparency, and architectural elegance</strong>, preserving complex LaTeX-formatted scientific formulations while highlighting practical engineering constraints and physical insights.
            </p>
          </div>

          {/* Founder Section */}
          <div className="border-t border-neutral-100 pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-neutral-50/50 p-5 rounded-3xl border border-neutral-100">
              <img 
                src={lucasProfileImg} 
                alt="Lucas Kempe" 
                referrerPolicy="no-referrer"
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 border-neutral-200/80 shadow-md shrink-0 transition-transform hover:scale-[1.02] duration-300"
              />
              <div className="text-center sm:text-left space-y-2.5 py-1">
                <span className="inline-block px-3 py-1 bg-neutral-950 text-white rounded-full text-[10px] font-extrabold uppercase tracking-widest font-mono">
                  Journal Founder
                </span>
                <h4 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 font-sans tracking-tight">Lucas Kempe</h4>
                <p className="text-base sm:text-lg font-semibold text-neutral-700 font-sans leading-snug">
                  Founder &amp; Principal Director of Meridian Informatics
                </p>
                <p className="text-sm text-neutral-500 font-mono flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  lucas.kempe@icloud.com
                </p>
              </div>
            </div>

            <p className="text-base sm:text-lg text-neutral-600 leading-relaxed font-sans italic border-l-4 border-neutral-950 pl-4 py-1">
              Meridian is spearheaded by Lucas Kempe. Lucas's work centers on creating performant on-device compiler pipelines, deploying high-throughput local AI models, and optimizing neural engines to process complex multi-modal physics and structural chemistry streams cleanly.
            </p>

            {/* Social Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* LinkedIn */}
              <a 
                href="https://www.linkedin.com/in/lucaskempe/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 rounded-2xl group transition-all cursor-pointer hover:shadow-md hover:border-neutral-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0077b5] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                    <Linkedin className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-neutral-800 block group-hover:text-black transition-colors">LinkedIn Profile</span>
                    <span className="text-xs text-neutral-400 font-mono block">@lucaskempe</span>
                  </div>
                </div>
                <div className="text-neutral-400 group-hover:text-neutral-900 transition-all text-xs font-mono font-bold transform group-hover:translate-x-1">
                  Connect &rarr;
                </div>
              </a>

              {/* WhatsApp */}
              <a 
                href="https://wa.me/541170666236"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 rounded-2xl group transition-all cursor-pointer hover:shadow-md hover:border-neutral-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                    <PhoneCall className="w-5 h-5 text-white fill-current" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-neutral-800 block group-hover:text-black transition-colors">Direct WhatsApp</span>
                    <span className="text-xs text-neutral-400 font-mono block">wa.me/541170666...</span>
                  </div>
                </div>
                <div className="text-neutral-400 group-hover:text-neutral-900 transition-all text-xs font-mono font-bold transform group-hover:translate-x-1">
                  Chat &rarr;
                </div>
              </a>
            </div>
          </div>

          {/* Technical Integrity Badge */}
          <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 flex gap-3.5 text-neutral-800">
            <Shield className="w-5 h-5 shrink-0 text-neutral-900 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-bold font-sans">Open, Offline-First Security Paradigm</p>
              <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
                Meridian's architecture leverages secure client-side Firestore integration paired with offline-first persistence keys. Our scientific translations run transparently with clean sandboxed parameters, giving researchers absolute ownership of their translation telemetry.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 px-6">
          <span className="font-mono uppercase tracking-widest font-bold">Ver. 2.1 // Production Node</span>
          <span>© {new Date().getFullYear()} Meridian. All rights reserved.</span>
        </div>

      </div>
    </div>
  );
};
