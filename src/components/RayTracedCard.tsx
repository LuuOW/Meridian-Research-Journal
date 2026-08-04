import React, { useState, useRef } from "react";
import {
  calculateNormalizedCursor,
  computeRayTracedLightState,
  getDefaultLightState
} from "../lib/rayTracingUtils";

interface RayTracedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  accentGlowColor?: string; // e.g. "rgba(99, 102, 241, 0.2)"
}

export const RayTracedCard: React.FC<RayTracedCardProps> = ({
  children,
  className = "",
  onClick,
  accentGlowColor = "rgba(6, 182, 212, 0.2)"
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const [lightState, setLightState] = useState(getDefaultLightState());

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { normX, normY } = calculateNormalizedCursor(e.clientX, e.clientY, rect);
    const newLightState = computeRayTracedLightState(normX, normY, 4, 20);
    setLightState(newLightState);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setLightState(getDefaultLightState());
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative group p-[1.5px] rounded-3xl transition-transform duration-300 ease-out cursor-pointer ${className}`}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${lightState.tiltX}deg) rotateY(${lightState.tiltY}deg) translateZ(6px)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
        boxShadow: isHovered
          ? `
            ${lightState.shadowX}px ${lightState.shadowY}px 32px -8px rgba(0, 0, 0, 0.22),
            ${lightState.shadowX * 0.5}px ${lightState.shadowY * 0.5}px 18px -4px ${accentGlowColor}
          `
          : "0 4px 20px -2px rgba(0, 0, 0, 0.05)"
      }}
    >
      {/* Ray Traced Ambient Caustic Backsplash (Visible on hover) */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500 blur-xl opacity-0 group-hover:opacity-100 -z-10"
        style={{
          background: `radial-gradient(circle 250px at ${lightState.lightX}% ${lightState.lightY}%, ${accentGlowColor}, transparent 70%)`
        }}
      />

      {/* Dynamic Ray-Guided Border Sheen */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: `conic-gradient(from ${lightState.angle}deg, rgba(6, 182, 212, 0.4), rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4), rgba(6, 182, 212, 0.4))`
        }}
      />

      {/* Main Card Content Frame */}
      <div className="relative rounded-[22px] w-full h-full overflow-hidden bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800/80 transition-colors duration-300">
        
        {/* Ray Traced Specular Light Reflection Overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100 z-10"
          style={{
            background: `radial-gradient(circle 300px at ${lightState.lightX}% ${lightState.lightY}%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02) 50%, transparent 80%)`
          }}
        />

        {/* Optical Ray Sweep Angle Highlight */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100 z-10"
          style={{
            background: `linear-gradient(${lightState.angle}deg, transparent 40%, rgba(255, 255, 255, 0.12) 50%, transparent 60%)`
          }}
        />

        {/* Original Child Card Content */}
        <div className="relative z-0 h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};
