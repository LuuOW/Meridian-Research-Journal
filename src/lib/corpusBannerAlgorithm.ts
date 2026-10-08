/**
 * Corpus-Aware Contextual Vector Synthesis Engine for Meridian Research
 * 
 * Algorithm:
 * 1. Analyzes the global article corpus (titles, tags, content keywords, arXiv categories).
 * 2. Classifies each article into its primary scientific archetype & domain.
 * 3. Computes a collision-free corpus position using deterministic golden-ratio chromatic
 *    and spatial dispersal:
 *      - Non-colliding hue rotation angle: θ = (H_base + index * 137.508°) mod 360°
 *      - Non-colliding wave frequencies, harmonic phases, and lattice coordinates
 *      - Context-faithful mathematical operator formulas and domain badges
 * 4. Renders responsive, standalone, animated SVG vector banners with rich glowing aesthetics.
 */

import { BlogPost } from "../types";
import { SVG_ANIMATION_STYLES } from "./svgUtils.js";
import { cleanLatexForPlainText } from "./paperGenerationEngine";

export type ScientificArchetype =
  | "MESON_DECAY_AND_COLLIDER_PHYSICS"
  | "ASTROPARTICLE_AND_DARK_MATTER"
  | "QUANTUM_THERMODYNAMICS_AND_SYMMETRIES"
  | "NEUTRINO_OSCILLATIONS_AND_MATTER"
  | "QUANTUM_STATES_AND_CIRCUITS"
  | "TOPOLOGICAL_PHOTONICS_AND_BICS"
  | "CAVITY_QED_AND_LASERS"
  | "OPTICAL_INTERFEROMETRY"
  | "DIFFRACTIVE_AI_AND_TENSORS"
  | "CONDENSED_MATTER_AND_SPINS"
  | "BIOPHOTONICS_AND_IMAGING"
  | "DIAMOND_NV_AND_COLOR_CENTERS"
  | "DISTRIBUTED_SYSTEMS_AND_MCP"
  | "FINANCE_AND_CRYPTOGRAPHY"
  | "FERMION_MOMENTS_AND_LOOP_PHYSICS"
  | "HIGH_ENERGY_AND_NEUTRINO_PHYSICS";

export interface CorpusBannerProfile {
  archetype: ScientificArchetype;
  label: string;
  badgeLabel: string;
  formula: string;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  primary: string;
  secondary: string;
  accent: string;
  accent2: string;
  hueAngle: number;
  harmonicSeed: number;
  corpusHash: string;
}

// Base hues for each scientific archetype
const ARCHETYPE_BASE_HUES: Record<ScientificArchetype, number> = {
  MESON_DECAY_AND_COLLIDER_PHYSICS: 285,      // Vibrant Violet / Magenta
  FERMION_MOMENTS_AND_LOOP_PHYSICS: 310,      // Royal Fuchsia / Radiant Magenta
  ASTROPARTICLE_AND_DARK_MATTER: 240,         // Deep Celestial Indigo
  QUANTUM_THERMODYNAMICS_AND_SYMMETRIES: 175, // Electric Emerald / Cyan
  NEUTRINO_OSCILLATIONS_AND_MATTER: 205,      // Radiant Cobalt / Azure
  QUANTUM_STATES_AND_CIRCUITS: 195,           // Cyan / Electric Blue
  TOPOLOGICAL_PHOTONICS_AND_BICS: 160,        // Emerald / Mint
  CAVITY_QED_AND_LASERS: 345,                 // Rose / Ruby Red
  OPTICAL_INTERFEROMETRY: 270,                // Deep Violet / Purple
  DIFFRACTIVE_AI_AND_TENSORS: 220,            // Royal Blue / Indigo
  CONDENSED_MATTER_AND_SPINS: 35,             // Amber / Gold
  BIOPHOTONICS_AND_IMAGING: 140,              // Jade Green / Teal
  DIAMOND_NV_AND_COLOR_CENTERS: 295,          // Imperial Orchid / Violet
  DISTRIBUTED_SYSTEMS_AND_MCP: 210,           // Sky Blue / Slate
  FINANCE_AND_CRYPTOGRAPHY: 45,               // Warm Gold / Topaz
  HIGH_ENERGY_AND_NEUTRINO_PHYSICS: 265       // Cosmic Violet / Cherenkov Radiant Indigo
};

// Domain Formulas tailored to context
const ARCHETYPE_FORMULAS: Record<ScientificArchetype, string[]> = {
  MESON_DECAY_AND_COLLIDER_PHYSICS: [
    "M²_miss = (p_D - p_e)² ≥ m_φ²",
    "dΓ/dM²_miss ∝ (m_D² - M²)² (M² - m_φ²)",
    "D⁺ → e⁺ ν̄_α φ // STCF Threshold",
    "ℒ_int = -½ g_φ φ ν̄^c ν + h.c.",
    "B(D⁺ → e⁺ ν̄ φ) ≫ B(D⁺ → e⁺ ν_e)_SM",
    "10 MeV ≲ m_φ ≲ 1 GeV // BESIII"
  ],
  FERMION_MOMENTS_AND_LOOP_PHYSICS: [
    "ℒ_eff = ½ ψ̄ σ^μν (μ + i d γ₅) ψ F_μν",
    "μ_f = g (e / 2m) · [1 + (α / 2π) + ...]",
    "Majorana Invariance: μ_ii = d_ii = 0",
    "Γ(ψ_j → ψ_i γ) = (|μ_ij|² + |d_ij|²) · (Δm³ / 8π)",
    "Passarino-Veltman C_0(p², q², m_S², m_f²)",
    "a_μ = (g - 2)/2 // Transition Dipoles"
  ],
  ASTROPARTICLE_AND_DARK_MATTER: [
    "V_α(r) = √2 G_eff (n_χ - n_χ̄)",
    "ρ_DM(r) ∝ r^(-γ_sp) // Gondolo-Silk Spike",
    "V_DM(r_res) ≈ Δm²₃₁ / (2 E_ν) cos 2θ₂₃",
    "(f_e : f_μ : f_τ)_⊕ ↔ IceCube MESE",
    "E_ν ~ 100 TeV // Resonant MSW Conversion",
    "|ε_α (n_χ - n_χ̄)| ~ 10¹⁸ cm⁻³"
  ],
  QUANTUM_THERMODYNAMICS_AND_SYMMETRIES: [
    "[U_SH, Q_S + Q_H] = 0 // Noether Symmetry",
    "ΔS_H = 0 ⟹ A_Q(ρ_S) ≥ A_Q(ρ_S')",
    "ρ_S(θ) = e^(-i θ Q_S) ρ_S e^(i θ Q_S)",
    "ΔE_H = Tr[H_H (ρ_H' - ρ_H)] > 0",
    "A_Q(ρ_S) = S(G_Q(ρ_S)) - S(ρ_S) ≥ 0",
    "DEH Exact Preservation: ΔA_Q = 0"
  ],
  NEUTRINO_OSCILLATIONS_AND_MATTER: [
    "i dΨ/dx = H(x) Ψ // Ψ(x) = exp(Ω(x))",
    "Ω_1 = -i ∫ H(t) dt",
    "Ω_2 = -½ ∫ dt₁ ∫ dt₂ [H(t₁), H(t₂)]",
    "Ψ(x)† Ψ(x) = I // Unconditional Unitarity",
    "U_PMNS = V_e† · V_ν // 3×3 Mixing Matrix",
    "P(ν_e → ν_μ; x) = |⟨ν_μ|Ψ(x)|ν_e⟩|²"
  ],
  HIGH_ENERGY_AND_NEUTRINO_PHYSICS: [
    "P(ν_e → ν_μ) = sin²(2θ) sin²(Δm² L / 4E)",
    "Δm²₂₁ ≪ |Δm²₃₁| // JUNO Mass Hierarchy",
    "U_PMNS = V_e† · V_ν // 3×3 Mixing Matrix",
    "(√Δm²₃₁ + √Δm²₂₁) / (√Δm²₃₁ - √Δm²₂₁) = √2",
    "Δm²₃₁ ≈ 2.52 × 10⁻³ eV² // θ₁₂ ≈ 33.4°",
    "ℒ_mass = -½ ν̄_L^c M_ν ν_L + h.c.",
    "Φ_osc = Δm² L / (4 E_ν)"
  ],
  QUANTUM_STATES_AND_CIRCUITS: [
    "|Ψ⟩ = 1/√2 (|00⟩ + |11⟩)",
    "F_frame^(k)(E) = ∫ |⟨ψ|φ⟩|^(2k) dμ",
    "Ĥ|Ψ⟩ = iℏ ∂_t|Ψ⟩",
    "ρ̂ = ∑ p_i |ψ_i⟩⟨ψ_i|",
    "U_QSVT = ∏ e^(i Φ_j σ_z) W",
    "Δx · Δp ≥ ℏ/2"
  ],
  TOPOLOGICAL_PHOTONICS_AND_BICS: [
    "Q_BIC → ∞  (q_vortex = ±1)",
    "k_z = √(ε_r k_0² - β²)",
    "C = 1/(2π) ∮ F_xy d²k",
    "H(k) = d(k) · σ",
    "γ = ∮ ⟨u(k)| i∇_k |u(k)⟩ · dk",
    "Ω_n(k) = ∇_k × A_n(k)"
  ],
  CAVITY_QED_AND_LASERS: [
    "w(z) = w_0 √(1 + (z/z_R)²)",
    "F = π √R / (1 - R)",
    "g^(2)(0) < 0.05",
    "∇ × E = -∂_t B",
    "E(r,t) = E_0 e^{i(k·r - ωt)}",
    "P_out = η_slope · (P_pump - P_th)"
  ],
  OPTICAL_INTERFEROMETRY: [
    "Δφ = 2π/λ · n_eff · L",
    "I(θ) = I_0 cos²(Δφ / 2)",
    "T_matrix = (I - iK)/(I + iK)",
    "NA = n · sin(θ_max)",
    "V = (I_max - I_min)/(I_max + I_min)",
    "Δx_interf ≈ λ / (2 NA)"
  ],
  DIFFRACTIVE_AI_AND_TENSORS: [
    "U_l+1 = P_l · (M_l ⊙ U_l)",
    "W_opt = ∑_k λ_k |u_k⟩⟨v_k|",
    "y = σ(W_diffractive · x + b)",
    "E_loss = ||y_pred - y_target||²",
    "D2NN: L = 5 Phase Layers",
    "𝒯_(ijk) = ∑_r A_ir B_jr C_kr"
  ],
  CONDENSED_MATTER_AND_SPINS: [
    "Δ(T) ≈ 1.76 k_B T_c √(1 - T/T_c)",
    "B = ∇ × A_vec",
    "j_s = - (n_s e² / m) A",
    "H_Hubbard = -t ∑ c_i^† c_j + U ∑ n_i↑ n_i↓",
    "σ_Hall = ν · e²/h",
    "M_alter(k) = -M_alter(k + Q)"
  ],
  BIOPHOTONICS_AND_IMAGING: [
    "I_2p(r,z) ∝ [I_0 / (1 + (z/z_R)²)]²",
    "I_ball(z) = I_0 e^{-z/ℓ_scat}",
    "z_vanish ≈ ℓ_scat · ln(N_modes)",
    "d_min = λ / (2 NA √(log 2))",
    "F_fluo = σ_2p · I² · η_det",
    "λ_ex = 920 nm // λ_em = 525 nm"
  ],
  DIAMOND_NV_AND_COLOR_CENTERS: [
    "D_gs = 2.87 GHz (³A₂ → ³E)",
    "H_NV = D S_z² + g_e μ_B B · S + A I · S",
    "T_2^* > 1.5 ms  (¹²C enriched)",
    "ODMR: Δν = 2 γ_e B_z",
    "η_B ≈ 1 pT / √Hz",
    "|0⟩_s ↔ |±1⟩_s Splitting"
  ],
  DISTRIBUTED_SYSTEMS_AND_MCP: [
    "MCP::JSON-RPC 2.0 // Transport: Stream",
    "τ_latency < 4.2 ms  (Edge Cache)",
    "H_merkle = SHA256(H_L ∥ H_R)",
    "RPS > 45,000 // 99.999% SLA",
    "Consensus: Byzantine Quorum",
    "Vector Index: HNSW M=16 ef=64"
  ],
  FINANCE_AND_CRYPTOGRAPHY: [
    "dS_t = μ S_t dt + σ S_t dW_t",
    "C(S,t) = S N(d_1) - K e^{-r(T-t)} N(d_2)",
    "EVM: ecrecover(hash, v, r, s)",
    "AMM: x · y = k  (Constant Product)",
    "VaR_(99%) = μ_P - 2.33 · σ_P",
    "Depth = ∫ [P_ask(q) - P_bid(q)] dq"
  ]
};

// Domain Watermark Labels
const ARCHETYPE_LABELS: Record<ScientificArchetype, string> = {
  MESON_DECAY_AND_COLLIDER_PHYSICS: "HIGH ENERGY PHYSICS // LEPTONIC DECAYS & STCF",
  ASTROPARTICLE_AND_DARK_MATTER: "MULTI-MESSENGER ASTROPHYSICS // DM SPIKES & ICECUBE",
  QUANTUM_THERMODYNAMICS_AND_SYMMETRIES: "QUANTUM PHYSICS // NOETHER HARVESTING PROTOCOLS",
  NEUTRINO_OSCILLATIONS_AND_MATTER: "HIGH ENERGY PHYSICS // MAGNUS EXPANSION",
  QUANTUM_STATES_AND_CIRCUITS: "QUANTUM INFORMATION // CIRCUITS & TOMOGRAPHY",
  TOPOLOGICAL_PHOTONICS_AND_BICS: "TOPOLOGICAL PHOTONICS // GRATINGS & BICS",
  CAVITY_QED_AND_LASERS: "CAVITY OPTICS // CONFOCAL RESONATOR MODES",
  OPTICAL_INTERFEROMETRY: "OPTICAL INTERFEROMETRY // WAVEFRONT METROLOGY",
  DIFFRACTIVE_AI_AND_TENSORS: "NEURAL PHOTONICS // DIFFRACTIVE COMPUTING",
  CONDENSED_MATTER_AND_SPINS: "CONDENSED MATTER // SUPERCONDUCTING STATES",
  BIOPHOTONICS_AND_IMAGING: "BIOPHOTONICS // TWO-PHOTON FLUORESCENCE",
  DIAMOND_NV_AND_COLOR_CENTERS: "QUANTUM SENSING // DIAMOND NV CENTERS",
  DISTRIBUTED_SYSTEMS_AND_MCP: "DISTRIBUTED ARCHITECTURES // MCP PROTOCOL",
  FINANCE_AND_CRYPTOGRAPHY: "QUANTITATIVE SYSTEMS // CRYPTOGRAPHY",
  FERMION_MOMENTS_AND_LOOP_PHYSICS: "HIGH ENERGY PHYSICS // ONE-LOOP MOMENTS & VERTICES",
  HIGH_ENERGY_AND_NEUTRINO_PHYSICS: "HIGH ENERGY PHYSICS // NEUTRINO OSCILLATIONS & JUNO"
};

// Clean, professional top badge labels
const ARCHETYPE_BADGE_LABELS: Record<ScientificArchetype, string> = {
  MESON_DECAY_AND_COLLIDER_PHYSICS: "PRECISION FLAVOR & MESON DECAYS",
  FERMION_MOMENTS_AND_LOOP_PHYSICS: "FERMION MOMENTS & LOOP QED",
  ASTROPARTICLE_AND_DARK_MATTER: "ASTROPARTICLE & DARK MATTER",
  QUANTUM_THERMODYNAMICS_AND_SYMMETRIES: "QUANTUM THERMODYNAMICS & SYMMETRY",
  NEUTRINO_OSCILLATIONS_AND_MATTER: "NEUTRINO OSCILLATIONS & PROFILES",
  QUANTUM_STATES_AND_CIRCUITS: "QUANTUM CIRCUITS & TOMOGRAPHY",
  TOPOLOGICAL_PHOTONICS_AND_BICS: "TOPOLOGICAL PHOTONICS & BICS",
  CAVITY_QED_AND_LASERS: "CAVITY OPTICS & LASERS",
  OPTICAL_INTERFEROMETRY: "OPTICAL INTERFEROMETRY",
  DIFFRACTIVE_AI_AND_TENSORS: "DIFFRACTIVE OPTICS & AI",
  CONDENSED_MATTER_AND_SPINS: "CONDENSED MATTER & SPINS",
  BIOPHOTONICS_AND_IMAGING: "BIOPHOTONICS & IMAGING",
  DIAMOND_NV_AND_COLOR_CENTERS: "DIAMOND NV CENTERS",
  DISTRIBUTED_SYSTEMS_AND_MCP: "DISTRIBUTED SYSTEMS & MCP",
  FINANCE_AND_CRYPTOGRAPHY: "QUANTITATIVE SYSTEMS",
  HIGH_ENERGY_AND_NEUTRINO_PHYSICS: "HIGH ENERGY PARTICLE PHYSICS"
};

/**
 * Fast string hash based on FNV-1a (32-bit integer)
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Analyzes article context (title, tags, excerpt, content) against the scientific taxonomy.
 */
export function classifyArticleArchetype(article: {
  title?: string;
  tags?: string[] | string;
  excerpt?: string;
  content?: string;
}): ScientificArchetype {
  const title = (article.title || "").toLowerCase();
  const tags = Array.isArray(article.tags)
    ? article.tags.join(" ").toLowerCase()
    : (article.tags || "").toLowerCase();
  const text = `${title} ${tags} ${(article.excerpt || "").toLowerCase()} ${(article.content || "").slice(0, 1000).toLowerCase()}`;

  // 1. Check for Meson Decays & Collider Phenomenology
  if (
    text.includes("meson") ||
    text.includes("missing-mass") ||
    text.includes("missing mass") ||
    text.includes("neutrinophilic") ||
    text.includes("stcf") ||
    text.includes("besiii") ||
    text.includes("three-body decay") ||
    text.includes("leptonic decay") ||
    text.includes("branching fraction")
  ) {
    return "MESON_DECAY_AND_COLLIDER_PHYSICS";
  }

  // 2. Check for Fermion Electromagnetic Moments & Dipoles (arXiv:2610.09974)
  if (
    text.includes("electromagnetic moment") ||
    text.includes("electromagnetic moments") ||
    text.includes("transition electromagnetic") ||
    text.includes("diagonal and transition") ||
    (text.includes("spin-1/2") && (text.includes("fermion") || text.includes("moment"))) ||
    (text.includes("one-loop") && text.includes("fermion")) ||
    (text.includes("dirac and majorana") && text.includes("moment")) ||
    (text.includes("anomalous magnetic") && text.includes("moment"))
  ) {
    return "FERMION_MOMENTS_AND_LOOP_PHYSICS";
  }

  // 3. Check for Magnus expansion & matter profiles
  if (
    (text.includes("magnus") || text.includes("hermitian hamiltonian") || text.includes("density profile") || text.includes("varying profile")) &&
    (text.includes("neutrino") || text.includes("oscillation"))
  ) {
    return "NEUTRINO_OSCILLATIONS_AND_MATTER";
  }

  // 4. Check for Dark Matter Spikes & Astroparticle Neutrinos
  if (
    (text.includes("dm spike") || text.includes("spike") || text.includes("gondolo-silk")) &&
    (text.includes("neutrino") || text.includes("icecube") || text.includes("agn") || text.includes("flavor conversion"))
  ) {
    return "ASTROPARTICLE_AND_DARK_MATTER";
  }

  // 5. Check for Noether Symmetries & Energy Harvesting
  if (
    (text.includes("noether") || text.includes("energy harvesting") || text.includes("energy-harvesting")) &&
    (text.includes("symmetry") || text.includes("asymmetry") || text.includes("entropy") || text.includes("harvester"))
  ) {
    return "QUANTUM_THERMODYNAMICS_AND_SYMMETRIES";
  }

  // Domain score accumulator for remaining archetypes
  const scores: Record<ScientificArchetype, number> = {
    MESON_DECAY_AND_COLLIDER_PHYSICS: 0,
    FERMION_MOMENTS_AND_LOOP_PHYSICS: 0,
    ASTROPARTICLE_AND_DARK_MATTER: 0,
    QUANTUM_THERMODYNAMICS_AND_SYMMETRIES: 0,
    NEUTRINO_OSCILLATIONS_AND_MATTER: 0,
    HIGH_ENERGY_AND_NEUTRINO_PHYSICS: 0,
    QUANTUM_STATES_AND_CIRCUITS: 0,
    TOPOLOGICAL_PHOTONICS_AND_BICS: 0,
    CAVITY_QED_AND_LASERS: 0,
    OPTICAL_INTERFEROMETRY: 0,
    DIFFRACTIVE_AI_AND_TENSORS: 0,
    CONDENSED_MATTER_AND_SPINS: 0,
    BIOPHOTONICS_AND_IMAGING: 0,
    DIAMOND_NV_AND_COLOR_CENTERS: 0,
    DISTRIBUTED_SYSTEMS_AND_MCP: 0,
    FINANCE_AND_CRYPTOGRAPHY: 0
  };

  // High-Energy Particle Physics, Neutrino Oscillations & JUNO / DUNE Observatories (strictly for reactor/oscillation preprints)
  if (
    text.includes("juno") ||
    text.includes("mass splittings") ||
    text.includes("kamiokande") ||
    text.includes("dune") ||
    text.includes("pmns") ||
    (text.includes("neutrino") && text.includes("oscillation") && !text.includes("magnus"))
  ) {
    scores.HIGH_ENERGY_AND_NEUTRINO_PHYSICS += 20;
  }

  // Quantum Information, Circuits & Algorithms
  if (text.includes("frame potential") || text.includes("haar") || text.includes("qsvt") || text.includes("singular value transformation")) scores.QUANTUM_STATES_AND_CIRCUITS += 10;
  if (text.includes("qubit") || text.includes("quantum circuit") || text.includes("tomography") || text.includes("entangle")) scores.QUANTUM_STATES_AND_CIRCUITS += 5;
  if (text.includes("quantum") || text.includes("bell state") || text.includes("density matrix")) scores.QUANTUM_STATES_AND_CIRCUITS += 3;

  // Topological Photonics & BICs & Gratings
  if (text.includes("dielectric grating") || text.includes("propagation constant") || text.includes("bound states in the continuum") || text.includes("bic")) scores.TOPOLOGICAL_PHOTONICS_AND_BICS += 10;
  if (text.includes("photonic crystal") || text.includes("chern") || text.includes("berry curvature") || text.includes("topological")) scores.TOPOLOGICAL_PHOTONICS_AND_BICS += 5;
  if (text.includes("chiral waveguide") || text.includes("dirac cone") || text.includes("edge state")) scores.TOPOLOGICAL_PHOTONICS_AND_BICS += 4;

  // Cavity Optics & Lasers
  if (text.includes("cavity") || text.includes("resonator") || text.includes("laser mode") || text.includes("spdc")) scores.CAVITY_QED_AND_LASERS += 6;
  if (text.includes("beam waist") || text.includes("confocal") || text.includes("optical parametric")) scores.CAVITY_QED_AND_LASERS += 5;

  // Interferometry & Wavefronts
  if (text.includes("interferom") || text.includes("mach-zehnder") || text.includes("fresnel") || text.includes("diffraction")) scores.OPTICAL_INTERFEROMETRY += 6;
  if (text.includes("phase estimation") || text.includes("wavefront") || text.includes("caustic")) scores.OPTICAL_INTERFEROMETRY += 4;

  // Diffractive Neural Networks & Optical Computing
  if (text.includes("diffractive") || text.includes("optical neural network") || text.includes("matrix multiplication") || text.includes("d2nn")) scores.DIFFRACTIVE_AI_AND_TENSORS += 8;
  if (text.includes("tensor network") || text.includes("optical computing") || text.includes("equivariant gnn")) scores.DIFFRACTIVE_AI_AND_TENSORS += 5;

  // Condensed Matter & Superconductivity
  if (text.includes("superconduct") || text.includes("altermagnet") || text.includes("condensed matter") || text.includes("cooper pair")) scores.CONDENSED_MATTER_AND_SPINS += 8;
  if (text.includes("vortex") || text.includes("hall effect") || text.includes("weyl")) scores.CONDENSED_MATTER_AND_SPINS += 4;

  // Biophotonics & Imaging
  if (text.includes("two-photon") || text.includes("in vivo") || text.includes("microscopy") || text.includes("scattering correction")) scores.BIOPHOTONICS_AND_IMAGING += 9;
  if (text.includes("dna") || text.includes("sequencing") || text.includes("nanopore") || text.includes("fluorescence")) scores.BIOPHOTONICS_AND_IMAGING += 7;

  // Diamond NV Centers & Color Centers
  if (text.includes("diamond") || text.includes("nv center") || text.includes("color center") || text.includes("odmr")) scores.DIAMOND_NV_AND_COLOR_CENTERS += 10;
  if (text.includes("magnetometry") || text.includes("nitrogen-vacancy")) scores.DIAMOND_NV_AND_COLOR_CENTERS += 6;

  // Distributed Systems & MCP
  if (text.includes("mcp") || text.includes("cloudflare") || text.includes("model context protocol") || text.includes("microservice")) scores.DISTRIBUTED_SYSTEMS_AND_MCP += 9;
  if (text.includes("edge worker") || text.includes("json-rpc") || text.includes("distributed system")) scores.DISTRIBUTED_SYSTEMS_AND_MCP += 6;

  // Quantitative Finance & Web3 / Crypto
  if (text.includes("binance") || text.includes("crypto") || text.includes("evm") || text.includes("finance") || text.includes("liquidity")) scores.FINANCE_AND_CRYPTOGRAPHY += 9;
  if (text.includes("order book") || text.includes("blockchain") || text.includes("merkle")) scores.FINANCE_AND_CRYPTOGRAPHY += 6;

  // Find max scoring archetype
  let bestArchetype: ScientificArchetype = "QUANTUM_STATES_AND_CIRCUITS";
  let maxScore = -1;

  for (const [arch, score] of Object.entries(scores) as [ScientificArchetype, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestArchetype = arch;
    }
  }

  // Fallback defaults based on generic topic words if score is low
  if (maxScore <= 0) {
    if (text.includes("crystal") || text.includes("lattice")) return "TOPOLOGICAL_PHOTONICS_AND_BICS";
    if (text.includes("optic") || text.includes("photon")) return "OPTICAL_INTERFEROMETRY";
    if (text.includes("neural") || text.includes("learning")) return "DIFFRACTIVE_AI_AND_TENSORS";
    return "QUANTUM_STATES_AND_CIRCUITS";
  }

  return bestArchetype;
}

/**
 * Computes a HSL color string with high contrast and optimal luminosity.
 */
function hsl(h: number, s: number, l: number): string {
  const normH = ((h % 360) + 360) % 360;
  return `hsl(${normH.toFixed(1)}, ${s}%, ${l}%)`;
}

/**
 * Derives a collision-free chromatic and parametric profile for an article within the corpus.
 */
export function deriveCorpusProfile(
  article: { id?: string; title?: string; tags?: string[] | string; excerpt?: string; content?: string },
  corpusIndex: number = 0,
  seedModifier: number = 0
): CorpusBannerProfile {
  const archetype = classifyArticleArchetype(article);
  const baseHue = ARCHETYPE_BASE_HUES[archetype];

  // Golden ratio hue stepping: 137.50776405 degrees per corpus index
  const GOLDEN_RATIO_ANGLE = 137.50776405;
  const combinedSeed = hashString(`${article.id || ""}:${article.title || ""}:${corpusIndex}`) + seedModifier;
  const hueAngle = (baseHue + (corpusIndex * GOLDEN_RATIO_ANGLE) + (combinedSeed % 23)) % 360;

  // Primary: Bright neon foreground accent
  const primary = hsl(hueAngle, 95, 62);
  // Secondary: Triadic / Complementary harmonic offset (+45° to +75°)
  const secondary = hsl(hueAngle + 55, 90, 58);
  // Accent: High luminance glow (+180° or +30°)
  const accent = hsl(hueAngle + 25, 95, 75);
  // Accent2: Contrasting electric highlight
  const accent2 = hsl(hueAngle - 45, 92, 68);

  // Deep space canvas background stops
  const bgStart = hsl(hueAngle, 50, 4);
  const bgMid = hsl(hueAngle + 15, 45, 8);
  const bgEnd = hsl(hueAngle + 30, 40, 14);

  // Contextual formula selection
  const formulaPool = ARCHETYPE_FORMULAS[archetype];
  const formulaIndex = Math.abs(combinedSeed) % formulaPool.length;
  const formula = formulaPool[formulaIndex];

  const label = ARCHETYPE_LABELS[archetype];
  const badgeLabel = ARCHETYPE_BADGE_LABELS[archetype];
  const corpusHash = Math.abs(combinedSeed).toString(36).padStart(6, "0").slice(-6).toUpperCase();

  return {
    archetype,
    label,
    badgeLabel,
    formula,
    bgStart,
    bgMid,
    bgEnd,
    primary,
    secondary,
    accent,
    accent2,
    hueAngle,
    harmonicSeed: combinedSeed,
    corpusHash
  };
}

/**
 * Builds vector SVG geometry corresponding to the article's scientific archetype
 * and unique parametric profile.
 */
function buildArchetypeGeometry(
  profile: CorpusBannerProfile,
  articleTitle: string,
  uid: string
): string {
  const { archetype, primary, secondary, accent, accent2, harmonicSeed } = profile;
  const seed = Math.abs(harmonicSeed);

  // Parametric offsets ensuring unique geometry coordinates for every banner
  const pA = (seed % 30) - 15;
  const pB = ((seed * 7) % 36) - 18;
  const amp = 65 + (seed % 35);
  const yCenter = 195 + pA;
  const cX = 390 + pB;
  const cY = yCenter;

  switch (archetype) {
    case "MESON_DECAY_AND_COLLIDER_PHYSICS": {
      // Collider Beam Axis + Microstrip Vertex Tracker Cylinders + Recoiling Lepton & Missing Mass
      return `
        <!-- Collider Beam Axis & Interaction Point -->
        <line x1="40" y1="${cY}" x2="760" y2="${cY}" stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="8,6" />
        
        <!-- Concentric Silicon Vertex Detector Cylinders -->
        <g stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.4" fill="none">
          <circle cx="${cX}" cy="${cY}" r="65" stroke-dasharray="5,4" />
          <circle cx="${cX}" cy="${cY}" r="115" stroke="${primary}" stroke-width="1.6" stroke-dasharray="8,5" />
          <circle cx="${cX}" cy="${cY}" r="155" stroke-dasharray="6,4" stroke-opacity="0.3" />
        </g>
        
        <!-- Recoiling Charged Lepton Track (e+ / mu+) -->
        <path class="mrd-anim-wave-1" d="M ${cX},${cY} Q ${cX + 90},${cY - 90} ${cX + 210},${cY - 120}" fill="none" stroke="${accent}" stroke-width="3" filter="url(#glow_${uid})" />
        <circle cx="${cX + 210}" cy="${cY - 120}" r="6" fill="#ffffff" filter="url(#glow_${uid})" />
        
        <!-- Recoiling Neutral Missing-Mass Cone (nu_bar + phi) -->
        <path d="M ${cX},${cY} L ${cX - 180},${cY + 85} L ${cX - 150},${cY + 140} Z" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="1.4" stroke-dasharray="6,4" />
        <line x1="${cX}" y1="${cY}" x2="${cX - 165}" y2="${cY + 112}" stroke="${accent2}" stroke-width="2.5" stroke-dasharray="5,3" filter="url(#glow_${uid})" />
        
        <!-- Missing-Mass Phase Space Ellipse -->
        <ellipse cx="${cX - 80}" cy="${cY - 65}" rx="55" ry="32" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4,4" class="mrd-anim-spin" />
        <circle cx="${cX}" cy="${cY}" r="8" fill="#ffffff" class="mrd-anim-pulse" filter="url(#glow_${uid})" />
        
        <!-- Particle & Kinematics Badges -->
        <rect x="${cX + 175}" y="${cY - 150}" width="55" height="24" rx="4" fill="${profile.bgMid}" stroke="${accent}" stroke-width="1.5" />
        <text x="${cX + 202}" y="${cY - 134}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="12" font-weight="bold">e⁺ / μ⁺</text>
        
        <rect x="${cX - 225}" y="${cY + 115}" width="75" height="24" rx="4" fill="${profile.bgMid}" stroke="${accent2}" stroke-width="1.5" />
        <text x="${cX - 188}" y="${cY + 131}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="11" font-weight="bold">ν̄ + φ(m_φ)</text>
        
        <text x="${cX}" y="${cY + 135}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1">STCF / BESIII INTERACTION VERTEX // M²_miss RECOIL</text>
      `;
    }

    case "FERMION_MOMENTS_AND_LOOP_PHYSICS": {
      // One-Loop Triangle / Self-Energy Feynman Diagram with Photon Emission & Transition Dipole
      return `
        <!-- External Ingoing & Outgoing Fermion Propagators -->
        <g stroke="${primary}" stroke-width="2.5" fill="none">
          <line x1="80" y1="${cY}" x2="${cX - 75}" y2="${cY}" filter="url(#glow_${uid})" />
          <line x1="${cX + 75}" y1="${cY}" x2="720" y2="${cY}" filter="url(#glow_${uid})" />
        </g>
        
        <!-- Fermion Propagator Direction Arrows -->
        <polygon points="${cX - 120},${cY - 6} ${cX - 108},${cY} ${cX - 120},${cY + 6}" fill="${primary}" />
        <polygon points="${cX + 120},${cY - 6} ${cX + 132},${cY} ${cX + 120},${cY + 6}" fill="${primary}" />
        
        <!-- Virtual Particle Loop (Charged Scalar / Gauge & Heavy Fermion) -->
        <circle cx="${cX}" cy="${cY - 55}" r="65" fill="none" stroke="${secondary}" stroke-width="2.2" stroke-dasharray="8,5" class="mrd-anim-spin" />
        <circle cx="${cX}" cy="${cY - 55}" r="65" fill="${secondary}" fill-opacity="0.08" />
        
        <!-- Virtual Loop Internal Vertices -->
        <circle cx="${cX - 55}" cy="${cY - 20}" r="6" fill="${accent}" filter="url(#glow_${uid})" />
        <circle cx="${cX + 55}" cy="${cY - 20}" r="6" fill="${accent}" filter="url(#glow_${uid})" />
        <line x1="${cX - 55}" y1="${cY - 20}" x2="${cX - 75}" y2="${cY}" stroke="${primary}" stroke-width="2.5" />
        <line x1="${cX + 55}" y1="${cY - 20}" x2="${cX + 75}" y2="${cY}" stroke="${primary}" stroke-width="2.5" />
        
        <!-- Outgoing Quantum Photon Wavy Waveform (γ) -->
        <path class="mrd-anim-wave-1" d="M ${cX},${cY - 120} Q ${cX + 18},${cY - 145} ${cX},${cY - 170} T ${cX},${cY - 215}" fill="none" stroke="${accent2}" stroke-width="3.5" filter="url(#glow_${uid})" />
        <circle cx="${cX}" cy="${cY - 120}" r="7" fill="#ffffff" filter="url(#glow_${uid})" class="mrd-anim-pulse" />
        
        <!-- Magnetic Dipole Torque Vector Precession Ring -->
        <ellipse cx="${cX}" cy="${cY + 55}" rx="55" ry="20" fill="none" stroke="${accent}" stroke-width="1.6" stroke-dasharray="5,4" />
        <line x1="${cX}" y1="${cY + 20}" x2="${cX}" y2="${cY + 90}" stroke="${accent2}" stroke-width="2.8" filter="url(#glow_${uid})" />
        <polygon points="${cX - 6},${cY + 28} ${cX},${cY + 16} ${cX + 6},${cY + 28}" fill="${accent2}" />
        
        <!-- Particles & Quantum Badges -->
        <rect x="70" y="${cY - 36}" width="78" height="22" rx="4" fill="${profile.bgMid}" stroke="${primary}" stroke-width="1.4" />
        <text x="109" y="${cY - 21}" text-anchor="middle" fill="${primary}" font-family="monospace" font-size="11" font-weight="bold">ψ_j (spin-½)</text>
        
        <rect x="652" y="${cY - 36}" width="78" height="22" rx="4" fill="${profile.bgMid}" stroke="${primary}" stroke-width="1.4" />
        <text x="691" y="${cY - 21}" text-anchor="middle" fill="${primary}" font-family="monospace" font-size="11" font-weight="bold">ψ_i (spin-½)</text>
        
        <rect x="${cX - 46}" y="${cY - 245}" width="92" height="22" rx="4" fill="${profile.bgMid}" stroke="${accent2}" stroke-width="1.4" />
        <text x="${cX}" y="${cY - 230}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="11" font-weight="bold">PHOTON γ(q²)</text>
        
        <text x="${cX}" y="${cY + 118}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1">ONE-LOOP VERTEX // F_M(q²) + i F_E(q²) γ₅ // μ_ij DIPOLE</text>
      `;
    }

    case "ASTROPARTICLE_AND_DARK_MATTER": {
      // Central SMBH & Gravitational Potential Wells + DM Spike Streamlines + IceCube Inset
      return `
        <!-- Central SMBH & Gravitational Potential Wells -->
        <g stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.4" fill="none">
          <circle cx="${cX}" cy="${cY}" r="150" stroke="${primary}" stroke-width="1.8" />
          <circle cx="${cX}" cy="${cY}" r="105" stroke-dasharray="6,4" stroke-opacity="0.5" />
          <circle cx="${cX}" cy="${cY}" r="65" stroke-dasharray="4,3" stroke-opacity="0.7" />
        </g>
        
        <!-- Dark Matter Spike Streamlines (rho(r) ~ r^-gamma) -->
        <path class="mrd-anim-wave-1" d="M 60,${cY + 70} C ${cX - 110},${cY + 95} ${cX - 50},${cY + 30} ${cX},${cY}" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.75" />
        <path class="mrd-anim-wave-2" d="M 60,${cY - 70} C ${cX - 110},${cY - 95} ${cX - 50},${cY - 30} ${cX},${cY}" fill="none" stroke="${accent2}" stroke-width="2" stroke-opacity="0.75" />
        
        <!-- Escaping Neutrino Wave with Resonant Matter Potential Shift -->
        <path class="mrd-anim-wave-1" d="M ${cX},${cY} Q ${cX + 80},${cY - 55} ${cX + 180},${cY + 20} T 750,${cY}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.6" filter="url(#glow_${uid})" />
        
        <!-- Black Hole Horizon & Accretion Glow -->
        <circle cx="${cX}" cy="${cY}" r="38" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="${cX}" cy="${cY}" r="18" fill="#000000" stroke="${accent}" stroke-width="2" />
        <circle cx="${cX}" cy="${cY}" r="6" fill="#ffffff" filter="url(#glow_${uid})" />
        
        <!-- IceCube Ternary Flavor Inset Geometry -->
        <polygon points="680,${cY - 95} 735,${cY} 625,${cY}" fill="${profile.bgMid}" stroke="${accent}" stroke-width="1.5" />
        <circle cx="680" cy="${cY - 45}" r="4" fill="${accent2}" class="mrd-anim-pulse" />
        <text x="680" y="${cY - 102}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="9" font-weight="bold">ν_e</text>
        <text x="618" y="${cY + 14}" text-anchor="middle" fill="${primary}" font-family="monospace" font-size="9" font-weight="bold">ν_μ</text>
        <text x="742" y="${cY + 14}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="9" font-weight="bold">ν_τ</text>
        
        <text x="${cX}" y="${cY + 130}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1">DM SPIKE POTENTIAL V_DM // ICECUBE FLAVOR RATIOS</text>
      `;
    }

    case "QUANTUM_THERMODYNAMICS_AND_SYMMETRIES": {
      // Noether Symmetry Continuous Orbits + Asymmetry Conservation Manifold
      return `
        <!-- Noether Symmetry Continuous Orbits -->
        <g stroke="${secondary}" stroke-width="1.4" stroke-opacity="0.45" fill="none">
          <ellipse cx="${cX}" cy="${cY}" rx="155" ry="85" stroke="${primary}" stroke-width="2" />
          <ellipse cx="${cX}" cy="${cY}" rx="115" ry="60" stroke-dasharray="6,4" stroke-opacity="0.6" />
          <ellipse cx="${cX}" cy="${cY}" rx="70" ry="35" stroke-dasharray="4,3" stroke-opacity="0.8" />
        </g>
        
        <!-- Conserved Charge Trajectory Vector -->
        <path class="mrd-anim-wave-1" d="M 60,${cY} C 200,${cY - 90} 320,${cY + 90} ${cX},${cY}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
        
        <!-- Deterministic Energy Extraction Transfer to Harvester -->
        <line x1="${cX}" y1="${cY}" x2="${cX + 180}" y2="${cY - 70}" stroke="${accent}" stroke-width="3" stroke-dasharray="6,3" filter="url(#glow_${uid})" />
        <polygon points="${cX + 190},${cY - 74} ${cX + 175},${cY - 82} ${cX + 177},${cY - 64}" fill="${accent}" />
        
        <!-- Harvester Battery State Nodes (|0>_H -> |E>_H) -->
        <rect x="${cX + 195}" y="${cY - 95}" width="80" height="28" rx="6" fill="${profile.bgMid}" stroke="${accent}" stroke-width="1.8" />
        <text x="${cX + 235}" y="${cY - 76}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">|E⟩_H (ΔS=0)</text>
        
        <circle cx="${cX}" cy="${cY}" r="45" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="${cX}" cy="${cY}" r="8" fill="#ffffff" filter="url(#glow_${uid})" />
        
        <!-- Asymmetry Conservation Badge -->
        <rect x="65" y="${cY - 120}" width="150" height="26" rx="4" fill="${profile.bgMid}" stroke="${accent2}" stroke-width="1.5" />
        <text x="140" y="${cY - 103}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="10" font-weight="bold">ΔA_Q = 0 SATURATED</text>
        
        <text x="${cX}" y="${cY + 125}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1">NOETHER CHARGE SYMMETRY // DETERMINISTIC EXTRACTION</text>
      `;
    }

    case "NEUTRINO_OSCILLATIONS_AND_MATTER": {
      // Varying Matter Density Step Grid + Magnus Expansions
      return `
        <!-- Varying Matter Density Profile Step Grid -->
        <g stroke="${secondary}" stroke-width="1" stroke-opacity="0.35">
          <line x1="60" y1="${cY - 80}" x2="740" y2="${cY - 80}" stroke-dasharray="4,4" />
          <line x1="60" y1="${cY + 80}" x2="740" y2="${cY + 80}" stroke-dasharray="4,4" />
          <line x1="180" y1="${cY - 120}" x2="180" y2="${cY + 120}" stroke-dasharray="5,4" />
          <line x1="360" y1="${cY - 120}" x2="360" y2="${cY + 120}" stroke-dasharray="5,4" />
          <line x1="540" y1="${cY - 120}" x2="540" y2="${cY + 120}" stroke-dasharray="5,4" />
        </g>
        
        <!-- Matter Density Profile Contour rho(x) -->
        <path d="M 60,${cY + 65} Q 280,${cY + 35} 400,${cY - 45} T 740,${cY - 85}" fill="none" stroke="${primary}" stroke-width="2.5" stroke-opacity="0.65" />
        
        <!-- 3-Flavor Magnus Probability Evolution Waveforms -->
        <path class="mrd-anim-wave-1" d="M 60,${cY - 50} Q 180,${cY + 80} 300,${cY - 50} T 540,${cY - 50} T 740,${cY}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
        <path class="mrd-anim-wave-2" d="M 60,${cY + 20} Q 200,${cY - 75} 340,${cY + 20} T 620,${cY + 20} T 740,${cY - 40}" fill="none" stroke="${accent}" stroke-width="2.2" stroke-opacity="0.8" stroke-dasharray="8,4" />
        
        <!-- Magnus Expansion Step Integration Nodes -->
        <circle cx="180" cy="${cY}" r="6" fill="${accent}" class="mrd-anim-pulse" />
        <circle cx="360" cy="${cY - 25}" r="8" fill="#ffffff" filter="url(#glow_${uid})" class="mrd-anim-pulse" />
        <circle cx="540" cy="${cY - 15}" r="6" fill="${accent2}" class="mrd-anim-pulse" />
        
        <text x="${cX}" y="${cY + 125}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1">MAGNUS EXPANSION // UNITARY FLAVOR EVOLUTION Ψ(x)</text>
      `;
    }

    case "HIGH_ENERGY_AND_NEUTRINO_PHYSICS": {
      // JUNO Spherical Acrylic Detector Geodesic + 3-Flavor Neutrino Oscillation Waveform
      return `
        <!-- Underground Neutrino Observatory Spherical Detector Geodesic -->
        <g stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.35" fill="none">
          <circle cx="${cX}" cy="${cY}" r="145" stroke="${primary}" stroke-width="2" />
          <circle cx="${cX}" cy="${cY}" r="115" stroke-dasharray="5,4" stroke-opacity="0.5" />
          <ellipse cx="${cX}" cy="${cY}" rx="145" ry="48" stroke-dasharray="6,4" stroke-opacity="0.6" />
          <ellipse cx="${cX}" cy="${cY}" rx="48" ry="145" stroke-dasharray="6,4" stroke-opacity="0.4" />
          <line x1="${cX - 170}" y1="${cY}" x2="${cX + 170}" y2="${cY}" stroke-opacity="0.3" />
          <line x1="${cX}" y1="${cY - 170}" x2="${cX}" y2="${cY + 170}" stroke-opacity="0.3" />
        </g>

        <!-- Photomultiplier Tube (PMT) Optical Array Lattice Nodes on Spherical Boundary -->
        <g fill="${accent}">
          <circle cx="${cX - 145}" cy="${cY}" r="4" filter="url(#glow_${uid})" />
          <circle cx="${cX + 145}" cy="${cY}" r="4" filter="url(#glow_${uid})" />
          <circle cx="${cX}" cy="${cY - 145}" r="4" filter="url(#glow_${uid})" />
          <circle cx="${cX}" cy="${cY + 145}" r="4" filter="url(#glow_${uid})" />
          <circle cx="${cX - 102}" cy="${cY - 102}" r="3.5" filter="url(#glow_${uid})" />
          <circle cx="${cX + 102}" cy="${cY - 102}" r="3.5" filter="url(#glow_${uid})" />
          <circle cx="${cX - 102}" cy="${cY + 102}" r="3.5" filter="url(#glow_${uid})" />
          <circle cx="${cX + 102}" cy="${cY + 102}" r="3.5" filter="url(#glow_${uid})" />
        </g>

        <!-- Cherenkov Radiation Central Core Glow -->
        <circle cx="${cX}" cy="${cY}" r="55" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="${cX}" cy="${cY}" r="9" fill="#ffffff" filter="url(#glow_${uid})" />

        <!-- 3-Flavor Neutrino Oscillation Interleaved Wave Harmonics (ν_e, ν_μ, ν_τ) -->
        <path class="mrd-anim-wave-1" d="M 40,${cY} Q 180,${cY - amp} 300,${cY} T 560,${cY} T 760,${cY}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.6" filter="url(#glow_${uid})" />
        <path class="mrd-anim-wave-2" d="M 40,${cY - 22} Q 200,${cY + amp * 0.85} 360,${cY - 22} T 640,${cY - 22} T 760,${cY - 22}" fill="none" stroke="${accent}" stroke-width="2.2" stroke-opacity="0.85" stroke-dasharray="10,5" />
        <path class="mrd-anim-wave-1" d="M 40,${cY + 28} Q 220,${cY - amp * 0.7} 380,${cY + 28} T 620,${cY + 28} T 760,${cY + 28}" fill="none" stroke="${accent2}" stroke-width="1.6" stroke-opacity="0.7" stroke-dasharray="6,4" />

        <!-- Neutrino Flavor State Badges & PMNS Mixing Labels -->
        <rect x="55" y="${cY - 34}" width="42" height="24" rx="4" fill="${profile.bgMid}" stroke="${primary}" stroke-width="1.5" />
        <text x="76" y="${cY - 18}" text-anchor="middle" fill="${primary}" font-family="monospace" font-size="12" font-weight="bold">ν_e</text>

        <rect x="365" y="${cY - 110}" width="50" height="24" rx="4" fill="${profile.bgMid}" stroke="${accent}" stroke-width="1.5" />
        <text x="390" y="${cY - 94}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="bold">U_PMNS</text>

        <rect x="685" y="${cY - 34}" width="42" height="24" rx="4" fill="${profile.bgMid}" stroke="${accent2}" stroke-width="1.5" />
        <text x="706" y="${cY - 18}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="12" font-weight="bold">ν_μ/τ</text>

        <!-- Mass Splitting Annotation Vector -->
        <text x="${cX}" y="${cY + 125}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1">JUNO DETECTOR GEODESIC // Δm²₃₁ ↔ Δm²₂₁</text>
      `;
    }

    case "QUANTUM_STATES_AND_CIRCUITS": {
      // Bloch Sphere Projection + Superposition Waveform + Unitary State Nodes
      return `
        <!-- Bloch Sphere Projection & Unitary Coordinate Axes -->
        <g stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.4" fill="none">
          <ellipse cx="${cX}" cy="${cY}" rx="140" ry="140" stroke="${primary}" stroke-width="1.8" />
          <ellipse cx="${cX}" cy="${cY}" rx="140" ry="50" stroke-dasharray="6,4" />
          <line x1="${cX - 160}" y1="${cY}" x2="${cX + 160}" y2="${cY}" />
          <line x1="${cX}" y1="${cY - 160}" x2="${cX}" y2="${cY + 160}" />
        </g>
        
        <!-- State Vector Superposition Vector |Ψ⟩ -->
        <line x1="${cX}" y1="${cY}" x2="${cX + 80 + pB}" y2="${cY - 95 + pA}" stroke="${accent}" stroke-width="3" filter="url(#glow_${uid})" />
        <circle cx="${cX + 80 + pB}" cy="${cY - 95 + pA}" r="8" fill="${primary}" filter="url(#glow_${uid})" class="mrd-anim-pulse" />
        <circle cx="${cX + 80 + pB}" cy="${cY - 95 + pA}" r="3" fill="#ffffff" />
        
        <!-- Superposition Wave Harmonics -->
        <path class="mrd-anim-wave-1" d="M 40,${cY} Q 180,${cY - amp} 300,${cY} T 560,${cY} T 760,${cY}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
        <path class="mrd-anim-wave-2" d="M 40,${cY + 30} Q 200,${cY + amp} 340,${cY + 30} T 620,${cY + 30} T 760,${cY + 30}" fill="none" stroke="${accent2}" stroke-width="1.6" stroke-opacity="0.75" stroke-dasharray="8,4" />
        
        <!-- Quantum State Gate Labels -->
        <text x="${cX + 95 + pB}" y="${cY - 105 + pA}" fill="${accent}" font-family="monospace" font-size="12" font-weight="bold">|Ψ⟩</text>
        <rect x="70" y="${cY - 22}" width="34" height="26" rx="4" fill="${profile.bgMid}" stroke="${primary}" stroke-width="1.5" />
        <text x="87" y="${cY - 5}" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">H</text>
        <rect x="690" y="${cY - 22}" width="34" height="26" rx="4" fill="${profile.bgMid}" stroke="${accent2}" stroke-width="1.5" />
        <text x="707" y="${cY - 5}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="11" font-weight="bold">M_z</text>
      `;
    }

    case "TOPOLOGICAL_PHOTONICS_AND_BICS": {
      // Subwavelength Dielectric Grating Bars + BIC Vortex Core + Guided Waves
      const bars: string[] = [];
      const barCount = 14;
      const barWidth = 14 + (seed % 6);
      const gap = 20;
      const startX = 140 + pB;
      for (let i = 0; i < barCount; i++) {
        const bx = startX + i * (barWidth + gap);
        if (bx < 700) {
          const barHeight = 110 + ((i % 4) * 12);
          const opacity = 0.35 + ((i % 3) * 0.2);
          bars.push(`<rect x="${bx}" y="${yCenter - barHeight / 2}" width="${barWidth}" height="${barHeight}" rx="3" fill="${primary}" fill-opacity="${opacity}" stroke="${accent}" stroke-width="1.2" />`);
        }
      }

      return `
        <!-- Dielectric Grating Subwavelength Elements -->
        <g class="mrd-anim-float">
          ${bars.join("\n          ")}
        </g>
        
        <!-- Guided Waveguide Mode Trajectory -->
        <path class="mrd-anim-wave-1" d="M 40,${yCenter} L 240,${yCenter} Q 400,${yCenter - 65} 560,${yCenter} L 760,${yCenter}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="4.5" filter="url(#glow_${uid})" />
        <path class="mrd-anim-wave-2" d="M 40,${yCenter} L 240,${yCenter} Q 400,${yCenter + 65} 560,${yCenter} L 760,${yCenter}" fill="none" stroke="${accent2}" stroke-width="2" stroke-dasharray="6,4" />
        
        <!-- Bound State in the Continuum (BIC) Center Vortex -->
        <circle cx="400" cy="${yCenter - 65}" r="38" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="400" cy="${yCenter - 65}" r="8" fill="#ffffff" filter="url(#glow_${uid})" />
        <circle cx="400" cy="${yCenter - 65}" r="22" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4,4" class="mrd-anim-spin" />
        <text x="400" y="${yCenter - 85}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">BIC VORTEX (q=+1)</text>
      `;
    }

    case "CAVITY_QED_AND_LASERS": {
      // Confocal Cavity Curved Mirrors + Gaussian Laser Beam Waist
      const waistY = yCenter;
      return `
        <!-- Cavity Curved Mirrors -->
        <path d="M 110,${80 + pB} Q ${85 - pA / 2},${waistY} 110,${310 + pB}" fill="none" stroke="${primary}" stroke-width="5" filter="url(#glow_${uid})" />
        <path d="M 690,${80 - pB} Q ${715 + pA / 2},${waistY} 690,${310 - pB}" fill="none" stroke="${secondary}" stroke-width="5" filter="url(#glow_${uid})" />
        
        <!-- Gaussian Laser Beam Waist Envelopes -->
        <path class="mrd-anim-beam" d="M 110,${waistY - 80} C 300,${waistY - 15} 360,${waistY - 8} 400,${waistY} C 440,${waistY + 8} 500,${waistY + 15} 690,${waistY - 80}" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.8" />
        <path class="mrd-anim-beam" d="M 110,${waistY + 80} C 300,${waistY + 15} 360,${waistY + 8} 400,${waistY} C 440,${waistY - 8} 500,${waistY - 15} 690,${waistY + 80}" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.8" />
        <path class="mrd-anim-wave-1" d="M 110,${waistY} L 690,${waistY}" stroke="url(#primaryGrad_${uid})" stroke-width="4.5" filter="url(#glow_${uid})" />
        
        <!-- Focus Spot & Microcavity Resonator Core -->
        <circle cx="400" cy="${waistY}" r="50" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="400" cy="${waistY}" r="9" fill="#ffffff" filter="url(#glow_${uid})" />
        <circle cx="400" cy="${waistY}" r="26" fill="none" stroke="${accent2}" stroke-width="1.8" stroke-dasharray="5,3" class="mrd-anim-spin" />
        <text x="400" y="${waistY + 45}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="10" font-weight="bold">BEAM WAIST w_0</text>
      `;
    }

    case "OPTICAL_INTERFEROMETRY": {
      // Mach-Zehnder Dual Arms + Beam Splitters + Interference Fringes
      return `
        <!-- Dual Optical Paths -->
        <path class="mrd-anim-wave-1" d="M 50,${yCenter} L 220,${yCenter} L 220,${yCenter - 85} L 580,${yCenter - 85} L 580,${yCenter} L 750,${yCenter}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
        <path class="mrd-anim-wave-2" d="M 220,${yCenter} L 220,${yCenter + 85} L 580,${yCenter + 85} L 580,${yCenter}" fill="none" stroke="${secondary}" stroke-width="3" stroke-dasharray="8,5" />
        
        <!-- 50:50 Beam Splitters -->
        <rect x="210" y="${yCenter - 10}" width="20" height="20" transform="rotate(45 220 ${yCenter})" fill="${accent}" fill-opacity="0.4" stroke="#ffffff" stroke-width="1.5" />
        <rect x="570" y="${yCenter - 10}" width="20" height="20" transform="rotate(45 580 ${yCenter})" fill="${accent2}" fill-opacity="0.4" stroke="#ffffff" stroke-width="1.5" />
        
        <!-- Phase Modulator Cell -->
        <rect x="360" y="${yCenter - 100}" width="80" height="30" rx="6" fill="${profile.bgMid}" stroke="${accent}" stroke-width="1.6" />
        <text x="400" y="${yCenter - 81}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="bold">Δφ = π/2</text>
        
        <!-- Interference Pattern Nodes -->
        <circle cx="400" cy="${yCenter + 85}" r="32" fill="url(#nodeGlow2_${uid})" class="mrd-anim-pulse" />
        <circle cx="400" cy="${yCenter + 85}" r="7" fill="${accent2}" />
        <line x1="400" y1="${yCenter - 70}" x2="400" y2="${yCenter + 65}" stroke="${secondary}" stroke-width="1.2" stroke-dasharray="4,4" stroke-opacity="0.5" />
      `;
    }

    case "DIFFRACTIVE_AI_AND_TENSORS": {
      // Diffractive Phase Planes + Optical Matrix Grid
      const planes: string[] = [];
      for (let i = 0; i < 4; i++) {
        const px = 220 + i * 110;
        planes.push(`
          <line x1="${px}" y1="80" x2="${px}" y2="310" stroke="${primary}" stroke-width="2.5" stroke-opacity="0.6" stroke-dasharray="14,6" />
          <circle cx="${px}" cy="${130 + (i * 15)}" r="5" fill="${accent}" />
          <circle cx="${px}" cy="${200 - (i * 10)}" r="5" fill="${accent2}" />
          <circle cx="${px}" cy="${260 + (i * 8)}" r="5" fill="${secondary}" />
        `);
      }

      return `
        <!-- Diffractive Neural Phase Masks -->
        ${planes.join("\n        ")}
        
        <!-- Inter-Layer Coherent Light Rays -->
        <g stroke="${secondary}" stroke-width="1" stroke-opacity="0.4">
          <line x1="60" y1="190" x2="220" y2="130" />
          <line x1="60" y1="190" x2="220" y2="200" />
          <line x1="60" y1="190" x2="220" y2="260" />
          <line x1="550" y1="175" x2="740" y2="190" stroke="${primary}" stroke-width="2" />
          <line x1="550" y1="230" x2="740" y2="190" stroke="${accent2}" stroke-width="2" />
        </g>
        
        <!-- Output Focus Detectors -->
        <circle cx="740" cy="190" r="44" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="740" cy="190" r="8" fill="#ffffff" filter="url(#glow_${uid})" />
        <text x="385" y="65" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">D2NN OPTICAL MATRIX TRANSFORM</text>
      `;
    }

    case "CONDENSED_MATTER_AND_SPINS": {
      // Hexagonal Lattice / Magnetic Spin Orbitals
      return `
        <!-- Spin Vortex & Hexagonal Coordinates -->
        <g stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.4" fill="none">
          <polygon points="400,100 480,150 480,250 400,300 320,250 320,150" stroke="${primary}" stroke-width="2" />
          <polygon points="400,130 455,165 455,235 400,270 345,235 345,165" stroke-dasharray="6,4" />
        </g>
        
        <!-- Spin Direction Arrows -->
        <circle cx="400" cy="100" r="6" fill="${accent}" />
        <circle cx="480" cy="150" r="6" fill="${accent2}" />
        <circle cx="480" cy="250" r="6" fill="${accent}" />
        <circle cx="400" cy="300" r="6" fill="${accent2}" />
        <circle cx="320" cy="250" r="6" fill="${accent}" />
        <circle cx="320" cy="150" r="6" fill="${accent2}" />
        
        <!-- Central Vortex Core -->
        <circle cx="400" cy="200" r="45" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="400" cy="200" r="8" fill="#ffffff" filter="url(#glow_${uid})" />
        
        <!-- Superconducting Wave -->
        <path class="mrd-anim-wave-1" d="M 50,${yCenter} C 200,${yCenter - 70} 600,${yCenter + 70} 750,${yCenter}" fill="none" stroke="url(#primaryGrad_${uid})" stroke-width="3.5" filter="url(#glow_${uid})" />
        <text x="400" y="330" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">TOPOLOGICAL SPIN LATTICE</text>
      `;
    }

    case "BIOPHOTONICS_AND_IMAGING": {
      // Two-Photon Focal Cones + Deep Tissue Scattering Decay Path
      return `
        <!-- Dual Ray Cones Focusing into Deep Tissue -->
        <polygon points="80,100 400,${yCenter} 80,${yCenter + 90}" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="1.5" />
        <polygon points="720,100 400,${yCenter} 720,${yCenter + 90}" fill="${secondary}" fill-opacity="0.12" stroke="${secondary}" stroke-width="1.5" />
        
        <!-- Ballistic vs Scattered Photons Curve -->
        <path class="mrd-anim-wave-1" d="M 80,100 Q 240,${yCenter} 400,${yCenter} T 720,${yCenter}" fill="none" stroke="${accent}" stroke-width="3" filter="url(#glow_${uid})" />
        
        <!-- Focal Point: Nonlinear Two-Photon Excitation Spot -->
        <circle cx="400" cy="${yCenter}" r="40" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="400" cy="${yCenter}" r="9" fill="#ffffff" filter="url(#glow_${uid})" />
        <circle cx="400" cy="${yCenter}" r="20" fill="none" stroke="${accent2}" stroke-width="1.8" stroke-dasharray="4,4" class="mrd-anim-spin" />
        <text x="400" y="${yCenter + 45}" text-anchor="middle" fill="${accent2}" font-family="monospace" font-size="10" font-weight="bold">FOCAL VOLUME &gt; 1 mm DEPTH</text>
      `;
    }

    case "DIAMOND_NV_AND_COLOR_CENTERS": {
      // Diamond Carbon Lattice + NV Center Nitrogen & Vacancy Pair
      return `
        <!-- Diamond Cubic Lattice Lines -->
        <g stroke="${secondary}" stroke-width="1.4" stroke-opacity="0.45" fill="none">
          <line x1="${cX - 120}" y1="${cY - 80}" x2="${cX}" y2="${cY - 120}" />
          <line x1="${cX}" y1="${cY - 120}" x2="${cX + 120}" y2="${cY - 80}" />
          <line x1="${cX + 120}" y1="${cY - 80}" x2="${cX + 120}" y2="${cY + 60}" />
          <line x1="${cX + 120}" y1="${cY + 60}" x2="${cX}" y2="${cY + 100}" />
          <line x1="${cX}" y1="${cY + 100}" x2="${cX - 120}" y2="${cY + 60}" />
          <line x1="${cX - 120}" y1="${cY + 60}" x2="${cX - 120}" y2="${cY - 80}" />
        </g>
        
        <!-- Nitrogen Atom (N) -->
        <circle cx="${cX - 40}" cy="${cY - 30}" r="14" fill="${primary}" filter="url(#glow_${uid})" />
        <text x="${cX - 40}" y="${cY - 25}" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">N</text>
        
        <!-- Vacancy (V) with Electron Spin Glow -->
        <circle cx="${cX + 40}" cy="${cY + 30}" r="18" fill="none" stroke="${accent2}" stroke-width="2.5" stroke-dasharray="4,3" class="mrd-anim-spin" />
        <circle cx="${cX + 40}" cy="${cY + 30}" r="7" fill="#ffffff" filter="url(#glow_${uid})" class="mrd-anim-pulse" />
        
        <!-- Optical Microwave Resonance Transition Line -->
        <line x1="${cX - 40}" y1="${cY - 30}" x2="${cX + 40}" y2="${cY + 30}" stroke="${accent}" stroke-width="3" stroke-dasharray="6,3" />
        <text x="${cX}" y="${cY + 75}" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">ODMR 2.87 GHz ZERO-FIELD SPLIT</text>
      `;
    }

    case "DISTRIBUTED_SYSTEMS_AND_MCP": {
      // Mesh Nodes + Packet Routing Channels
      return `
        <!-- Mesh Coordinates -->
        <g stroke="${secondary}" stroke-width="1.2" stroke-opacity="0.4">
          <line x1="120" y1="130" x2="280" y2="90" />
          <line x1="120" y1="130" x2="260" y2="280" />
          <line x1="280" y1="90" x2="400" y2="190" />
          <line x1="260" y1="280" x2="400" y2="190" />
          <line x1="400" y1="190" x2="540" y2="110" />
          <line x1="400" y1="190" x2="550" y2="290" />
          <line x1="540" y1="110" x2="680" y2="190" />
          <line x1="550" y1="290" x2="680" y2="190" />
        </g>
        
        <!-- Active Server Mesh Nodes -->
        <circle cx="120" cy="130" r="10" fill="${primary}" class="mrd-anim-pulse" />
        <circle cx="280" cy="90" r="8" fill="${secondary}" />
        <circle cx="260" cy="280" r="8" fill="${secondary}" />
        <circle cx="400" cy="190" r="48" fill="url(#nodeGlow_${uid})" class="mrd-anim-pulse" />
        <circle cx="400" cy="190" r="12" fill="#ffffff" filter="url(#glow_${uid})" />
        <circle cx="540" cy="110" r="8" fill="${accent}" />
        <circle cx="550" cy="290" r="8" fill="${accent}" />
        <circle cx="680" cy="190" r="10" fill="${accent2}" class="mrd-anim-pulse" />
        <text x="400" y="235" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">MCP PROTOCOL GATEWAY</text>
      `;
    }

    case "FINANCE_AND_CRYPTOGRAPHY": {
      // Order Book Depth Curves + Liquidity Manifold
      return `
        <!-- Market Depth Bid & Ask Curves -->
        <path class="mrd-anim-wave-1" d="M 60,310 L 220,310 Q 340,310 380,180 L 380,310 Z" fill="${primary}" fill-opacity="0.22" stroke="${primary}" stroke-width="2.5" />
        <path class="mrd-anim-wave-2" d="M 420,180 Q 460,310 580,310 L 740,310 L 420,310 Z" fill="${accent2}" fill-opacity="0.22" stroke="${accent2}" stroke-width="2.5" />
        
        <!-- Spread & Midpoint Marker -->
        <line x1="400" y1="120" x2="400" y2="310" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="5,4" />
        <circle cx="400" cy="180" r="8" fill="#ffffff" filter="url(#glow_${uid})" class="mrd-anim-pulse" />
        <text x="400" y="100" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="10" font-weight="bold">LIQUIDITY DEPTH SURFACE</text>
      `;
    }
  }
}

/**
 * Generates an SVG vector banner string using corpus-aware analysis.
 * 
 * @param article The article to generate a banner for
 * @param corpus Full collection of articles (to establish global uniqueness coordinates)
 * @param seed Optional seed to vary regeneration for the same article
 */
export function generateCorpusBannerSvg(
  article: Partial<BlogPost>,
  corpus?: BlogPost[],
  seed?: number
): string {
  // Determine index within corpus
  let corpusIndex = 0;
  if (corpus && corpus.length > 0) {
    const idx = corpus.findIndex((b) => b.id === article.id || (article.slug && b.slug === article.slug));
    corpusIndex = idx !== -1 ? idx : corpus.length;
  } else if (article.id) {
    corpusIndex = hashString(article.id) % 120;
  }

  const profile = deriveCorpusProfile(article, corpusIndex, seed || 0);
  const uid = profile.corpusHash.toLowerCase();
  
  // Clean raw LaTeX from title for SVG display
  const cleanTitle = cleanLatexForPlainText(article.title || "Scholarly Publication").replace(/["'<>]/g, "").trim();
  let titleLines: string[] = [];
  if (cleanTitle.length <= 54) {
    titleLines = [cleanTitle];
  } else {
    const words = cleanTitle.split(/\s+/);
    let line1 = "";
    let line2 = "";
    for (const w of words) {
      if ((line1 + " " + w).trim().length <= 54 && line2 === "") {
        line1 = (line1 + " " + w).trim();
      } else {
        line2 = (line2 + " " + w).trim();
      }
    }
    // Cleanly truncate line2 at a word boundary if it exceeds 64 characters
    if (line2.length > 64) {
      const truncated = line2.slice(0, 60);
      const lastSpace = truncated.lastIndexOf(" ");
      line2 = (lastSpace > 25 ? truncated.slice(0, lastSpace) : truncated) + "...";
    }
    titleLines = [line1, line2].filter(Boolean);
  }

  const geometrySvg = buildArchetypeGeometry(profile, cleanTitle, uid);
  const displayBadge = article.isEditorEdition
    ? "EDITOR'S SPECIAL EDITION // PHOTONIC ENGINES"
    : profile.badgeLabel;
  const titleFontSize = cleanTitle.length > 70 ? 15 : 17;

  return `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" style="background:${profile.bgMid}">
  <defs>
    <style id="mrd-svg-animations">${SVG_ANIMATION_STYLES}</style>
    <linearGradient id="bgGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${profile.bgStart}" />
      <stop offset="50%" stop-color="${profile.bgMid}" />
      <stop offset="100%" stop-color="${profile.bgEnd}" />
    </linearGradient>
    <linearGradient id="primaryGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${profile.primary}" />
      <stop offset="50%" stop-color="${profile.secondary}" />
      <stop offset="100%" stop-color="${profile.accent2}" />
    </linearGradient>
    <radialGradient id="nodeGlow_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${profile.primary}" stop-opacity="0.95" />
      <stop offset="50%" stop-color="${profile.secondary}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${profile.bgStart}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="nodeGlow2_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${profile.accent2}" stop-opacity="0.9" />
      <stop offset="60%" stop-color="${profile.secondary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${profile.bgStart}" stop-opacity="0" />
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
  <g opacity="0.18" class="mrd-anim-grid">
    <path d="M0,40 H800 M0,80 H800 M0,120 H800 M0,160 H800 M0,200 H800 M0,240 H800 M0,280 H800 M0,320 H800 M0,360 H800" stroke="#334155" stroke-width="0.5" />
    <path d="M80,0 V400 M160,0 V400 M240,0 V400 M320,0 V400 M400,0 V400 M480,0 V400 M560,0 V400 M640,0 V400 M720,0 V400" stroke="#334155" stroke-width="0.5" />
  </g>

  <!-- Dynamic Parametric Scientific Geometry -->
  ${geometrySvg}

  <!-- Top Metadata Archetype Badge -->
  <rect x="50" y="36" width="${article.isEditorEdition ? 290 : Math.max(220, displayBadge.length * 8.2 + 36)}" height="26" rx="13" fill="${profile.primary}" fill-opacity="0.16" stroke="${profile.primary}" stroke-opacity="0.45" />
  <text x="${50 + (article.isEditorEdition ? 145 : Math.max(110, (displayBadge.length * 8.2 + 36) / 2))}" y="53" text-anchor="middle" fill="${profile.accent}" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1.5">${displayBadge}</text>

  <!-- Context-Derived Mathematical Formula Overlay -->
  <text x="750" y="54" text-anchor="end" fill="${profile.accent}" font-family="monospace" font-size="11" font-weight="600" opacity="0.9" letter-spacing="0.5">${profile.formula}</text>

  <!-- Article Title & Unique Run Branding -->
  ${titleLines.length > 1
    ? `<text x="50" y="324" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.4">${titleLines[0]}</text>
  <text x="50" y="345" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.4">${titleLines[1]}</text>`
    : `<text x="50" y="338" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="800" letter-spacing="-0.5">${titleLines[0] || cleanTitle}</text>`
  }
  <text x="50" y="366" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1.2">MERIDIAN RESEARCH // ${profile.label} // #${profile.corpusHash}</text>
</svg>`;
}

/**
 * Regenerates context-accurate, non-colliding vector banners for all articles in the corpus.
 */
export function regenerateAllCorpusBanners(corpus: BlogPost[], seedModifier: number = 0): BlogPost[] {
  return corpus.map((blog) => {
    const bannerSvg = generateCorpusBannerSvg(blog, corpus, seedModifier);
    return {
      ...blog,
      bannerSvg
    };
  });
}
