/**
 * Procedural Vector Banner Generator for Meridian Quantum & Optics Articles.
 * Generates mathematically grounded, animated scientific vector SVG artwork.
 */

export interface BannerTheme {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  primary: string;
  secondary: string;
  accent: string;
  accent2: string;
  label: string;
}

export const BANNER_THEMES: BannerTheme[] = [
  {
    bgStart: "#030712",
    bgMid: "#0a1128",
    bgEnd: "#111c44",
    primary: "#06b6d4",
    secondary: "#6366f1",
    accent: "#38bdf8",
    accent2: "#ec4899",
    label: "QUANTUM PHOTONICS & WAVEFUNCTIONS"
  },
  {
    bgStart: "#02120d",
    bgMid: "#06231a",
    bgEnd: "#0f3d2e",
    primary: "#10b981",
    secondary: "#06b6d4",
    accent: "#34d399",
    accent2: "#a7f3d0",
    label: "TOPOLOGICAL MANIFOLDS & ATOMIC LATTICES"
  },
  {
    bgStart: "#14041a",
    bgMid: "#23092e",
    bgEnd: "#3d1052",
    primary: "#f43f5e",
    secondary: "#8b5cf6",
    accent: "#fb7185",
    accent2: "#c084fc",
    label: "OPTICAL INTERFEROMETRY & NONLINEAR LASERS"
  },
  {
    bgStart: "#120a02",
    bgMid: "#241505",
    bgEnd: "#3d2208",
    primary: "#f59e0b",
    secondary: "#06b6d4",
    accent: "#fbbf24",
    accent2: "#38bdf8",
    label: "CONDENSED MATTER & SUPERCONDUCTIVITY"
  },
  {
    bgStart: "#05091a",
    bgMid: "#0c1836",
    bgEnd: "#16285a",
    primary: "#3b82f6",
    secondary: "#ec4899",
    accent: "#60a5fa",
    accent2: "#f472b6",
    label: "HIGH-ENERGY SCATTERING & CAVITY QED"
  },
  {
    bgStart: "#031217",
    bgMid: "#08232d",
    bgEnd: "#0d3747",
    primary: "#14b8a6",
    secondary: "#8b5cf6",
    accent: "#2dd4bf",
    accent2: "#a855f7",
    label: "NEURAL TENSOR NETWORKS & MATRIX OPTICS"
  }
];

let proceduralCounter = 0;

export function resetProceduralCounter(): void {
  proceduralCounter = 0;
}

export function getProceduralCounter(): number {
  return proceduralCounter;
}

export function generateProceduralBannerSvg(title: string, tags?: string | string[], seed?: number): string {
  proceduralCounter++;
  const cleanTitle = (title || "Scientific Publication").replace(/["'<>]/g, "").slice(0, 60);
  const tagText = Array.isArray(tags) 
    ? (tags[0] || "PHYSICS & QUANTUM") 
    : (typeof tags === "string" && tags.trim() ? tags.split(",")[0].trim() : "PHYSICS & QUANTUM");
  
  // Use mixed seed combining timestamp, parameter seed, and invocation counter to guarantee uniqueness
  const numSeed = (seed || Date.now()) + proceduralCounter * 7919;
  const themeIndex = Math.abs(numSeed % BANNER_THEMES.length);
  const geomType = Math.abs(Math.floor(numSeed / 13) % 6);

  const t = BANNER_THEMES[themeIndex];
  const uid = Math.abs(numSeed).toString(36).slice(-6);

  // Geometric variants
  let geometrySvg = "";

  if (geomType === 0) {
    // Archetype 0: Diffraction & Wave Packet Interference
    const yMid = 190 + (numSeed % 30);
    geometrySvg = `
      <!-- Wave Packet Harmonics -->
      <path class="mrd-anim-wave-1" d="M 30,${yMid} Q 160,${yMid - 110} 320,${yMid} T 600,${yMid} T 770,${yMid}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 30,${yMid - 20} Q 200,${yMid + 100} 370,${yMid - 20} T 670,${yMid - 20} T 770,${yMid - 20}" fill="none" stroke="${t.primary}" stroke-width="1.8" stroke-opacity="0.8" stroke-dasharray="10,6" />
      <path class="mrd-anim-wave-1" d="M 50,${yMid + 30} C 200,${yMid - 80} 450,${yMid + 120} 750,${yMid - 40}" fill="none" stroke="${t.accent2}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="6,4" />
      
      <!-- Nodes -->
      <circle cx="160" cy="${yMid - 55}" r="38" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="160" cy="${yMid - 55}" r="6" fill="#ffffff" filter="url(#glow_${uid})" />
      <circle cx="460" cy="${yMid + 50}" r="48" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="460" cy="${yMid + 50}" r="8" fill="${t.accent2}" filter="url(#glow_${uid})" />
      <circle cx="640" cy="${yMid - 30}" r="32" fill="url(#nodeGlow_${uid})" />
      <circle cx="640" cy="${yMid - 30}" r="5" fill="#ffffff" />
      
      <line x1="160" y1="${yMid - 55}" x2="460" y2="${yMid + 50}" stroke="${t.primary}" stroke-width="1.2" stroke-opacity="0.5" stroke-dasharray="4,4" />
      <line x1="460" y1="${yMid + 50}" x2="640" y2="${yMid - 30}" stroke="${t.secondary}" stroke-width="1.2" stroke-opacity="0.5" />
    `;
  } else if (geomType === 1) {
    // Archetype 1: Optical Cavity Resonator & Laser Modes
    geometrySvg = `
      <!-- Cavity Mirrors -->
      <path d="M 100,80 Q 80,200 100,320" fill="none" stroke="${t.primary}" stroke-width="5" filter="url(#glow_${uid})" />
      <path d="M 700,80 Q 720,200 700,320" fill="none" stroke="${t.secondary}" stroke-width="5" filter="url(#glow_${uid})" />
      
      <!-- Laser Waist Beam & Phase Oscillations -->
      <path class="mrd-anim-beam" d="M 100,200 C 280,170 360,190 400,200 C 440,210 520,230 700,200" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="4.5" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-1" d="M 100,160 C 260,185 360,195 400,200 C 440,205 540,215 700,160" fill="none" stroke="${t.accent}" stroke-width="1.8" stroke-opacity="0.75" />
      <path class="mrd-anim-wave-2" d="M 100,240 C 260,215 360,205 400,200 C 440,195 540,185 700,240" fill="none" stroke="${t.accent2}" stroke-width="1.8" stroke-opacity="0.75" />
      
      <!-- Central Focus Spot -->
      <circle cx="400" cy="200" r="55" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="200" r="10" fill="#ffffff" filter="url(#glow_${uid})" />
      <circle cx="400" cy="200" r="24" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-dasharray="3,3" class="mrd-anim-spin" />
    `;
  } else if (geomType === 2) {
    // Archetype 2: Concentric Fresnel Diffraction Rings & Caustic Optics
    geometrySvg = `
      <!-- Concentric Phase Rings -->
      <ellipse cx="400" cy="190" rx="280" ry="110" fill="none" stroke="${t.primary}" stroke-width="1.2" stroke-opacity="0.35" />
      <ellipse cx="400" cy="190" rx="210" ry="80" fill="none" stroke="${t.secondary}" stroke-width="1.6" stroke-opacity="0.5" stroke-dasharray="8,6" class="mrd-anim-wave-1" />
      <ellipse cx="400" cy="190" rx="140" ry="55" fill="none" stroke="${t.accent2}" stroke-width="2.2" stroke-opacity="0.75" filter="url(#glow_${uid})" />
      <ellipse cx="400" cy="190" rx="70" ry="28" fill="none" stroke="${t.primary}" stroke-width="3" filter="url(#glow_${uid})" />
      
      <!-- Radial Caustic Rays -->
      <line x1="120" y1="80" x2="400" y2="190" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.5" stroke-dasharray="4,3" />
      <line x1="680" y1="80" x2="400" y2="190" stroke="${t.accent2}" stroke-width="1" stroke-opacity="0.5" stroke-dasharray="4,3" />
      <line x1="400" y1="30" x2="400" y2="350" stroke="${t.primary}" stroke-width="1.5" stroke-opacity="0.6" />
      
      <circle cx="400" cy="190" r="45" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="190" r="8" fill="#ffffff" filter="url(#glow_${uid})" />
    `;
  } else if (geomType === 3) {
    // Archetype 3: Topological Geodesics & Tensor Network Manifold
    geometrySvg = `
      <!-- Intersecting Manifold Curves -->
      <path class="mrd-anim-wave-1" d="M 60,300 C 220,80 440,320 740,100" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 60,100 C 240,340 480,60 740,280" fill="none" stroke="${t.secondary}" stroke-width="2.2" stroke-opacity="0.8" />
      
      <!-- Tensor Contraction Points -->
      <circle cx="210" cy="165" r="40" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="210" cy="165" r="7" fill="#ffffff" />
      <circle cx="350" cy="205" r="48" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="350" cy="205" r="9" fill="${t.accent2}" filter="url(#glow_${uid})" />
      <circle cx="530" cy="160" r="38" fill="url(#nodeGlow_${uid})" />
      <circle cx="530" cy="160" r="6" fill="${t.primary}" />
      
      <!-- Interconnect Vectors -->
      <line x1="210" y1="165" x2="350" y2="205" stroke="${t.primary}" stroke-width="1.4" stroke-opacity="0.7" stroke-dasharray="5,3" />
      <line x1="350" y1="205" x2="530" y2="160" stroke="${t.secondary}" stroke-width="1.4" stroke-opacity="0.7" stroke-dasharray="5,3" />
      <line x1="210" y1="165" x2="530" y2="160" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.4" />
    `;
  } else if (geomType === 4) {
    // Archetype 4: Photonic Crystal Lattice & Waveguide Modes
    geometrySvg = `
      <!-- Photonic Crystal Lattice Grid Dots -->
      <g opacity="0.45">
        <circle cx="150" cy="100" r="4" fill="${t.primary}" />
        <circle cx="230" cy="100" r="4" fill="${t.primary}" />
        <circle cx="310" cy="100" r="4" fill="${t.primary}" />
        <circle cx="490" cy="100" r="4" fill="${t.primary}" />
        <circle cx="570" cy="100" r="4" fill="${t.primary}" />
        <circle cx="650" cy="100" r="4" fill="${t.primary}" />

        <circle cx="150" cy="280" r="4" fill="${t.secondary}" />
        <circle cx="230" cy="280" r="4" fill="${t.secondary}" />
        <circle cx="310" cy="280" r="4" fill="${t.secondary}" />
        <circle cx="490" cy="280" r="4" fill="${t.secondary}" />
        <circle cx="570" cy="280" r="4" fill="${t.secondary}" />
        <circle cx="650" cy="280" r="4" fill="${t.secondary}" />
      </g>
      
      <!-- Central Guided Wave Path -->
      <path class="mrd-anim-wave-1" d="M 40,190 L 320,190 L 400,120 L 480,260 L 560,190 L 760,190" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="4" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 40,190 L 320,190 L 400,120 L 480,260 L 560,190 L 760,190" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="8,6" />
      
      <!-- Dispersive Resonator Nodes -->
      <circle cx="400" cy="120" r="42" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="120" r="7" fill="#ffffff" />
      <circle cx="480" cy="260" r="46" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="480" cy="260" r="8" fill="${t.accent2}" filter="url(#glow_${uid})" />
    `;
  } else {
    // Archetype 5: Mach-Zehnder Quantum Interferometer
    geometrySvg = `
      <!-- Dual Optical Paths -->
      <path class="mrd-anim-wave-1" d="M 60,200 L 220,200 L 220,110 L 580,110 L 580,200 L 740,200" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 220,200 L 220,290 L 580,290 L 580,200" fill="none" stroke="${t.secondary}" stroke-width="3" stroke-dasharray="10,6" filter="url(#glow_${uid})" />
      
      <!-- Beam Splitters & Phase Mirrors -->
      <rect x="210" y="190" width="20" height="20" transform="rotate(45 220 200)" fill="${t.accent}" fill-opacity="0.4" stroke="#ffffff" stroke-width="1.5" />
      <rect x="570" y="190" width="20" height="20" transform="rotate(45 580 200)" fill="${t.accent2}" fill-opacity="0.4" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="400" cy="110" r="28" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="110" r="5" fill="#ffffff" />
      <circle cx="400" cy="290" r="35" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="290" r="6" fill="${t.accent2}" />
      
      <!-- Phase Shift Indicator -->
      <text x="400" y="145" text-anchor="middle" fill="${t.accent}" font-family="monospace" font-size="10" font-weight="bold">Δφ = π/2</text>
    `;
  }

  return `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" style="background:${t.bgMid}">
  <defs>
    <linearGradient id="bgGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bgStart}" />
      <stop offset="50%" stop-color="${t.bgMid}" />
      <stop offset="100%" stop-color="${t.bgEnd}" />
    </linearGradient>
    <linearGradient id="primaryGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${t.primary}" />
      <stop offset="50%" stop-color="${t.secondary}" />
      <stop offset="100%" stop-color="${t.accent2}" />
    </linearGradient>
    <radialGradient id="nodeGlow_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${t.primary}" stop-opacity="0.9" />
      <stop offset="50%" stop-color="${t.secondary}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${t.bgStart}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="nodeGlow2_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${t.accent2}" stop-opacity="0.85" />
      <stop offset="60%" stop-color="${t.secondary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${t.bgStart}" stop-opacity="0" />
    </radialGradient>
    <filter id="glow_${uid}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Deep Space Canvas Base -->
  <rect width="800" height="400" fill="url(#bgGrad_${uid})" />

  <!-- Quantum Lattice Coordinate Grid -->
  <g opacity="0.22" class="mrd-anim-grid">
    <path d="M0,40 H800 M0,80 H800 M0,120 H800 M0,160 H800 M0,200 H800 M0,240 H800 M0,280 H800 M0,320 H800 M0,360 H800" stroke="#334155" stroke-width="0.5" />
    <path d="M80,0 V400 M160,0 V400 M240,0 V400 M320,0 V400 M400,0 V400 M480,0 V400 M560,0 V400 M640,0 V400 M720,0 V400" stroke="#334155" stroke-width="0.5" />
  </g>

  <!-- Dynamic Parametric Scientific Geometry -->
  ${geometrySvg}

  <!-- Top Metadata Badge -->
  <rect x="50" y="38" width="190" height="26" rx="13" fill="${t.primary}" fill-opacity="0.18" stroke="${t.primary}" stroke-opacity="0.5" />
  <text x="145" y="55" text-anchor="middle" fill="${t.accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1.5">${tagText.toUpperCase()}</text>

  <!-- Title Watermark & Unique Run Branding -->
  <text x="50" y="340" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" letter-spacing="-0.5">${cleanTitle}</text>
  <text x="50" y="366" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1.2">MERIDIAN RESEARCH // ${t.label} // #${uid.toUpperCase()}</text>
</svg>`;
}
