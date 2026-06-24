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
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5 animate-spin-slow text-white" style={{ animationDuration: "20s" }} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tighter italic font-serif text-black">Meridian.</span>
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-800 text-[9px] font-bold rounded-full font-mono uppercase tracking-widest">Research Journal</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Symmetry & Quantum Informatics</p>
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
