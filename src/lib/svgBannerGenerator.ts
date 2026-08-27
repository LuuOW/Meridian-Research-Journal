/**
 * Procedural Vector Banner Generator for Meridian Quantum & Optics Articles.
 * Generates mathematically grounded, animated scientific vector SVG artwork with rich unique variations.
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

/**
 * Derives dynamic physics formula annotations based on topic tags and title
 */
function getScientificFormula(title: string, tag: string, seed: number): string {
  const combined = `${title} ${tag}`.toLowerCase();
  
  const quantumFormulas = [
    "|Ψ⟩ = 1/√2 (|00⟩ + |11⟩)",
    "Δx · Δp ≥ ℏ/2",
    "Ĥ|Ψ⟩ = iℏ ∂_t|Ψ⟩",
    "ρ̂ = ∑ p_i |ψ_i⟩⟨ψ_i|",
    "F_Q ≥ 1/(Δθ)²"
  ];

  const opticsFormulas = [
    "∇ × E = -∂_t B",
    "Δφ = 2π/λ · n_eff · L",
    "k_x² + k_y² + k_z² = (ω/c)²",
    "E(r,t) = E_0 e^{i(k·r - ωt)}",
    "NA = n · sin(θ_max)"
  ];

  const topologyFormulas = [
    "C = 1/(2π) ∮ F_xy d²k",
    "Q_factor > 8.4 × 10⁶",
    "H(k) = d(k) · σ",
    "γ = ∮ ⟨u(k)| i∇_k |u(k)⟩ · dk",
    "Ω_n(k) = ∇_k × A_n(k)"
  ];

  const laserScatteringFormulas = [
    "I_ball(z) = I_0 e^{-z/ℓ_scat}",
    "z_vanish ≈ ℓ_scat · ln(N_modes)",
    "g^(2)(0) < 0.05",
    "T_matrix = (I - iK)/(I + iK)",
    "P_out = η_slope · (P_pump - P_th)"
  ];

  let pool = opticsFormulas;
  if (combined.includes("quantum") || combined.includes("qubit") || combined.includes("entangle") || combined.includes("matter")) {
    pool = quantumFormulas;
  } else if (combined.includes("topology") || combined.includes("chiral") || combined.includes("crystal") || combined.includes("lattice")) {
    pool = topologyFormulas;
  } else if (combined.includes("scatter") || combined.includes("laser") || combined.includes("cavity") || combined.includes("imaging")) {
    pool = laserScatteringFormulas;
  }

  return pool[Math.abs(seed) % pool.length];
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
  const formula = getScientificFormula(cleanTitle, tagText, numSeed);

  // Parametric offsets for dynamic variety
  const offsetA = (numSeed % 40) - 20;
  const offsetB = ((numSeed * 7) % 30) - 15;
  const waveAmp = 70 + (numSeed % 50);

  // Geometric variants
  let geometrySvg = "";

  if (geomType === 0) {
    // Archetype 0: Diffraction & Wave Packet Interference
    const yMid = 190 + offsetA;
    geometrySvg = `
      <!-- Wave Packet Harmonics -->
      <path class="mrd-anim-wave-1" d="M 30,${yMid} Q 160,${yMid - waveAmp} 320,${yMid} T 600,${yMid} T 770,${yMid}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 30,${yMid - 20 + offsetB} Q 200,${yMid + waveAmp - 10} 370,${yMid - 20 + offsetB} T 670,${yMid - 20 + offsetB} T 770,${yMid - 20 + offsetB}" fill="none" stroke="${t.primary}" stroke-width="1.8" stroke-opacity="0.8" stroke-dasharray="10,6" />
      <path class="mrd-anim-wave-1" d="M 50,${yMid + 30} C 200,${yMid - waveAmp + 20} 450,${yMid + waveAmp + 10} 750,${yMid - 40}" fill="none" stroke="${t.accent2}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="6,4" />
      
      <!-- Nodes -->
      <circle cx="${160 + offsetB}" cy="${yMid - 55}" r="38" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="${160 + offsetB}" cy="${yMid - 55}" r="6" fill="#ffffff" filter="url(#glow_${uid})" />
      <circle cx="${460 - offsetB}" cy="${yMid + 50}" r="48" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="${460 - offsetB}" cy="${yMid + 50}" r="8" fill="${t.accent2}" filter="url(#glow_${uid})" />
      <circle cx="640" cy="${yMid - 30}" r="32" fill="url(#nodeGlow_${uid})" />
      <circle cx="640" cy="${yMid - 30}" r="5" fill="#ffffff" />
      
      <line x1="${160 + offsetB}" y1="${yMid - 55}" x2="${460 - offsetB}" y2="${yMid + 50}" stroke="${t.primary}" stroke-width="1.2" stroke-opacity="0.5" stroke-dasharray="4,4" />
      <line x1="${460 - offsetB}" y1="${yMid + 50}" x2="640" y2="${yMid - 30}" stroke="${t.secondary}" stroke-width="1.2" stroke-opacity="0.5" />
    `;
  } else if (geomType === 1) {
    // Archetype 1: Optical Cavity Resonator & Laser Modes
    const waistY = 200 + offsetA;
    geometrySvg = `
      <!-- Cavity Mirrors -->
      <path d="M 100,${80 + offsetB} Q ${80 - offsetA / 2},${waistY} 100,${320 + offsetB}" fill="none" stroke="${t.primary}" stroke-width="5" filter="url(#glow_${uid})" />
      <path d="M 700,${80 - offsetB} Q ${720 + offsetA / 2},${waistY} 700,${320 - offsetB}" fill="none" stroke="${t.secondary}" stroke-width="5" filter="url(#glow_${uid})" />
      
      <!-- Laser Waist Beam & Phase Oscillations -->
      <path class="mrd-anim-beam" d="M 100,${waistY} C 280,${waistY - 30} 360,${waistY - 10} 400,${waistY} C 440,${waistY + 10} 520,${waistY + 30} 700,${waistY}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="4.5" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-1" d="M 100,${waistY - 40} C 260,${waistY - 15} 360,${waistY - 5} 400,${waistY} C 440,${waistY + 5} 540,${waistY + 15} 700,${waistY - 40}" fill="none" stroke="${t.accent}" stroke-width="1.8" stroke-opacity="0.75" />
      <path class="mrd-anim-wave-2" d="M 100,${waistY + 40} C 260,${waistY + 15} 360,${waistY + 5} 400,${waistY} C 440,${waistY - 5} 540,${waistY - 15} 700,${waistY + 40}" fill="none" stroke="${t.accent2}" stroke-width="1.8" stroke-opacity="0.75" />
      
      <!-- Central Focus Spot -->
      <circle cx="400" cy="${waistY}" r="55" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="${waistY}" r="10" fill="#ffffff" filter="url(#glow_${uid})" />
      <circle cx="400" cy="${waistY}" r="24" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-dasharray="3,3" class="mrd-anim-spin" />
    `;
  } else if (geomType === 2) {
    // Archetype 2: Concentric Fresnel Diffraction Rings & Caustic Optics
    const cX = 400 + offsetB;
    const cY = 190 + offsetA;
    geometrySvg = `
      <!-- Concentric Phase Rings -->
      <ellipse cx="${cX}" cy="${cY}" rx="${280 + offsetA}" ry="${110 + offsetB}" fill="none" stroke="${t.primary}" stroke-width="1.2" stroke-opacity="0.35" />
      <ellipse cx="${cX}" cy="${cY}" rx="${210 + offsetA}" ry="${80 + offsetB}" fill="none" stroke="${t.secondary}" stroke-width="1.6" stroke-opacity="0.5" stroke-dasharray="8,6" class="mrd-anim-wave-1" />
      <ellipse cx="${cX}" cy="${cY}" rx="${140 + offsetB}" ry="${55 + offsetA}" fill="none" stroke="${t.accent2}" stroke-width="2.2" stroke-opacity="0.75" filter="url(#glow_${uid})" />
      <ellipse cx="${cX}" cy="${cY}" rx="70" ry="28" fill="none" stroke="${t.primary}" stroke-width="3" filter="url(#glow_${uid})" />
      
      <!-- Radial Caustic Rays -->
      <line x1="120" y1="80" x2="${cX}" y2="${cY}" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.5" stroke-dasharray="4,3" />
      <line x1="680" y1="80" x2="${cX}" y2="${cY}" stroke="${t.accent2}" stroke-width="1" stroke-opacity="0.5" stroke-dasharray="4,3" />
      <line x1="${cX}" y1="30" x2="${cX}" y2="350" stroke="${t.primary}" stroke-width="1.5" stroke-opacity="0.6" />
      
      <circle cx="${cX}" cy="${cY}" r="45" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="${cX}" cy="${cY}" r="8" fill="#ffffff" filter="url(#glow_${uid})" />
    `;
  } else if (geomType === 3) {
    // Archetype 3: Topological Geodesics & Tensor Network Manifold
    geometrySvg = `
      <!-- Intersecting Manifold Curves -->
      <path class="mrd-anim-wave-1" d="M 60,${300 + offsetA} C 220,${80 - offsetB} 440,${320 + offsetB} 740,${100 + offsetA}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 60,${100 - offsetB} C 240,${340 + offsetA} 480,${60 + offsetB} 740,${280 - offsetA}" fill="none" stroke="${t.secondary}" stroke-width="2.2" stroke-opacity="0.8" />
      
      <!-- Tensor Contraction Points -->
      <circle cx="${210 + offsetB}" cy="165" r="40" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="${210 + offsetB}" cy="165" r="7" fill="#ffffff" />
      <circle cx="${350 - offsetA}" cy="205" r="48" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="${350 - offsetA}" cy="205" r="9" fill="${t.accent2}" filter="url(#glow_${uid})" />
      <circle cx="${530 + offsetB}" cy="160" r="38" fill="url(#nodeGlow_${uid})" />
      <circle cx="${530 + offsetB}" cy="160" r="6" fill="${t.primary}" />
      
      <!-- Interconnect Vectors -->
      <line x1="${210 + offsetB}" y1="165" x2="${350 - offsetA}" y2="205" stroke="${t.primary}" stroke-width="1.4" stroke-opacity="0.7" stroke-dasharray="5,3" />
      <line x1="${350 - offsetA}" y1="205" x2="${530 + offsetB}" y2="160" stroke="${t.secondary}" stroke-width="1.4" stroke-opacity="0.7" stroke-dasharray="5,3" />
      <line x1="${210 + offsetB}" y1="165" x2="${530 + offsetB}" y2="160" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.4" />
    `;
  } else if (geomType === 4) {
    // Archetype 4: Photonic Crystal Lattice & Waveguide Modes
    const yCenter = 190 + offsetA;
    geometrySvg = `
      <!-- Photonic Crystal Lattice Grid Dots -->
      <g opacity="0.45">
        <circle cx="150" cy="${100 + offsetB}" r="4" fill="${t.primary}" />
        <circle cx="230" cy="${100 + offsetB}" r="4" fill="${t.primary}" />
        <circle cx="310" cy="${100 + offsetB}" r="4" fill="${t.primary}" />
        <circle cx="490" cy="${100 + offsetB}" r="4" fill="${t.primary}" />
        <circle cx="570" cy="${100 + offsetB}" r="4" fill="${t.primary}" />
        <circle cx="650" cy="${100 + offsetB}" r="4" fill="${t.primary}" />

        <circle cx="150" cy="${280 - offsetB}" r="4" fill="${t.secondary}" />
        <circle cx="230" cy="${280 - offsetB}" r="4" fill="${t.secondary}" />
        <circle cx="310" cy="${280 - offsetB}" r="4" fill="${t.secondary}" />
        <circle cx="490" cy="${280 - offsetB}" r="4" fill="${t.secondary}" />
        <circle cx="570" cy="${280 - offsetB}" r="4" fill="${t.secondary}" />
        <circle cx="650" cy="${280 - offsetB}" r="4" fill="${t.secondary}" />
      </g>
      
      <!-- Central Guided Wave Path -->
      <path class="mrd-anim-wave-1" d="M 40,${yCenter} L 320,${yCenter} L 400,${yCenter - 70} L 480,${yCenter + 70} L 560,${yCenter} L 760,${yCenter}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="4" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 40,${yCenter} L 320,${yCenter} L 400,${yCenter - 70} L 480,${yCenter + 70} L 560,${yCenter} L 760,${yCenter}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="8,6" />
      
      <!-- Dispersive Resonator Nodes -->
      <circle cx="400" cy="${yCenter - 70}" r="42" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="${yCenter - 70}" r="7" fill="#ffffff" />
      <circle cx="480" cy="${yCenter + 70}" r="46" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="480" cy="${yCenter + 70}" r="8" fill="${t.accent2}" filter="url(#glow_${uid})" />
    `;
  } else {
    // Archetype 5: Mach-Zehnder Quantum Interferometer
    const yCenter = 200 + offsetA;
    geometrySvg = `
      <!-- Dual Optical Paths -->
      <path class="mrd-anim-wave-1" d="M 60,${yCenter} L 220,${yCenter} L 220,${yCenter - 90} L 580,${yCenter - 90} L 580,${yCenter} L 740,${yCenter}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3" filter="url(#glow_${uid})" />
      <path class="mrd-anim-wave-2" d="M 220,${yCenter} L 220,${yCenter + 90} L 580,${yCenter + 90} L 580,${yCenter}" fill="none" stroke="${t.secondary}" stroke-width="3" stroke-dasharray="10,6" filter="url(#glow_${uid})" />
      
      <!-- Beam Splitters & Phase Mirrors -->
      <rect x="210" y="${yCenter - 10}" width="20" height="20" transform="rotate(45 220 ${yCenter})" fill="${t.accent}" fill-opacity="0.4" stroke="#ffffff" stroke-width="1.5" />
      <rect x="570" y="${yCenter - 10}" width="20" height="20" transform="rotate(45 580 ${yCenter})" fill="${t.accent2}" fill-opacity="0.4" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="400" cy="${yCenter - 90}" r="28" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="${yCenter - 90}" r="5" fill="#ffffff" />
      <circle cx="400" cy="${yCenter + 90}" r="35" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
      <circle cx="400" cy="${yCenter + 90}" r="6" fill="${t.accent2}" />
      
      <!-- Phase Shift Indicator -->
      <text x="400" y="${yCenter - 55}" text-anchor="middle" fill="${t.accent}" font-family="monospace" font-size="10" font-weight="bold">Δφ = π/2</text>
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

  <!-- Mathematical Formula Overlay -->
  <text x="750" y="56" text-anchor="end" fill="${t.accent}" font-family="monospace" font-size="11" font-weight="600" opacity="0.85" letter-spacing="0.5">${formula}</text>

  <!-- Title Watermark & Unique Run Branding -->
  <text x="50" y="340" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" letter-spacing="-0.5">${cleanTitle}</text>
  <text x="50" y="366" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1.2">MERIDIAN RESEARCH // ${t.label} // #${uid.toUpperCase()}</text>
</svg>`;
}

