import React from "react";
import { Sparkles, Compass } from "lucide-react";

interface NavbarProps {
  onOpenCreate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreate }) => {
  return (
    <header id="app-header" className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Compass */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => window.location.reload()}
        >
          {/* Elite Geometric Emblazoned Logo */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-[1px] shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105">
            <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center overflow-hidden relative">
              {/* Decorative background grid line */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_1px,_transparent_1px)] bg-[size:6px_6px] opacity-40"></div>
              {/* Core rotating compass */}
              <Compass 
                className="w-5 h-5 text-white transition-all duration-1000 ease-in-out group-hover:rotate-[360deg] relative z-10" 
              />
              {/* Outer orbit circle */}
              <div className="absolute w-8 h-8 rounded-full border border-white/10 animate-pulse"></div>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tighter italic font-serif text-black group-hover:text-neutral-800 transition-colors">
                Meridian.
              </span>
              <span className="px-2 py-0.5 bg-neutral-950 text-white text-[8px] font-extrabold rounded-md font-mono uppercase tracking-widest shadow-sm">
                Journal
              </span>
            </div>
            <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase font-mono">
              Symmetry &amp; Quantum Informatics
            </p>
          </div>
        </div>

        {/* Navigation Links (As seen in the Design HTML) */}
        <div className="hidden md:flex gap-8 text-xs font-bold tracking-widest uppercase text-gray-400">
          <span className="text-black border-b-2 border-black pb-1 cursor-pointer">Blog</span>
          <span className="hover:text-black cursor-pointer transition-colors pb-1">Research</span>
          <span className="hover:text-black cursor-pointer transition-colors pb-1">Tools</span>
          <span className="hover:text-black cursor-pointer transition-colors pb-1">About</span>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenCreate}
            className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-sm transition-all duration-200 flex items-center gap-2 group active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-white fill-white/20 group-hover:rotate-12 transition-transform" />
            <span>Generate Blog</span>
          </button>
        </div>

      </div>
    </header>
  );
};
