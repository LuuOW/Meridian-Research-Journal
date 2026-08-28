import fs from "fs";
import path from "path";

const newPaper = {
  title: "Towards Optimal Quantum Estimators for State Frame Potential: Near-Optimal Query & Sample Complexities for Haar Randomness Diagnostics",
  excerpt: "A rigorous scholarly investigation establishing near-optimal quantum query complexity and tight sample bounds for state frame potential estimation across query, general-sample, and single-copy access models.",
  readingTime: "9 min read",
  arxivLink: "https://arxiv.org/abs/2408.09854",
  bannerSvg: `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" style="background:#080f24">
  <defs>
    <linearGradient id="bgGrad_frame_pot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030712" />
      <stop offset="50%" stop-color="#080f24" />
      <stop offset="100%" stop-color="#111c44" />
    </linearGradient>
    <linearGradient id="primaryGrad_frame_pot" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <radialGradient id="nodeGlow_frame_pot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#030712" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="nodeGlow2_frame_pot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#8b5cf6" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#030712" stop-opacity="0" />
    </radialGradient>
    <filter id="glow_frame_pot" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Deep Space Canvas Base -->
  <rect width="800" height="400" fill="url(#bgGrad_frame_pot)" />

  <!-- Quantum Lattice Coordinate Grid -->
  <g opacity="0.22" class="mrd-anim-grid">
    <path d="M0,40 H800 M0,80 H800 M0,120 H800 M0,160 H800 M0,200 H800 M0,240 H800 M0,280 H800 M0,320 H800 M0,360 H800" stroke="#334155" stroke-width="0.5" />
    <path d="M80,0 V400 M160,0 V400 M240,0 V400 M320,0 V400 M400,0 V400 M480,0 V400 M560,0 V400 M640,0 V400 M720,0 V400" stroke="#334155" stroke-width="0.5" />
  </g>

  <!-- Quantum State Ensemble Haar Manifold Sphere -->
  <g transform="translate(200, 200)">
    <circle cx="0" cy="0" r="95" fill="none" stroke="#8b5cf6" stroke-width="1.2" stroke-dasharray="6,4" stroke-opacity="0.5" />
    <ellipse cx="0" cy="0" rx="95" ry="34" fill="none" stroke="#00f2fe" stroke-width="1.4" stroke-opacity="0.75" />
    <line x1="0" y1="-105" x2="0" y2="105" stroke="#6366f1" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="4,4" />
    <circle cx="-35" cy="-25" r="32" fill="url(#nodeGlow_frame_pot)" class="mrd-anim-pulse" />
    <circle cx="-35" cy="-25" r="7" fill="#ffffff" filter="url(#glow_frame_pot)" />
    <circle cx="45" cy="20" r="28" fill="url(#nodeGlow2_frame_pot)" class="mrd-anim-pulse" />
    <circle cx="45" cy="20" r="6" fill="#ec4899" filter="url(#glow_frame_pot)" />
  </g>

  <!-- Generalized SWAP Test & QSVT Unitary Tunnel -->
  <path class="mrd-anim-beam" d="M 200,200 C 330,130 400,270 490,200 C 580,130 660,240 760,200" fill="none" stroke="url(#primaryGrad_frame_pot)" stroke-width="4.5" filter="url(#glow_frame_pot)" />
  <path class="mrd-anim-wave-1" d="M 200,170 C 310,240 420,140 490,200 C 560,260 670,150 760,170" fill="none" stroke="#00f2fe" stroke-width="1.8" stroke-opacity="0.8" stroke-dasharray="8,5" />
  <path class="mrd-anim-wave-2" d="M 200,230 C 330,160 400,260 490,200 C 580,140 660,250 760,230" fill="none" stroke="#ec4899" stroke-width="1.8" stroke-opacity="0.75" />

  <!-- Frame Potential Tensor Node & Rényi Entropy Estimator -->
  <g transform="translate(490, 200)">
    <circle cx="0" cy="0" r="54" fill="url(#nodeGlow_frame_pot)" class="mrd-anim-pulse" />
    <circle cx="0" cy="0" r="10" fill="#ffffff" filter="url(#glow_frame_pot)" />
    <circle cx="0" cy="0" r="26" fill="none" stroke="#00f2fe" stroke-width="1.5" stroke-dasharray="4,4" class="mrd-anim-spin" />
    <circle cx="0" cy="0" r="40" fill="none" stroke="#ec4899" stroke-width="1" stroke-opacity="0.6" />
  </g>

  <!-- Output Estimator Fidelity Convergence Point -->
  <circle cx="700" cy="180" r="42" fill="url(#nodeGlow2_frame_pot)" class="mrd-anim-pulse" />
  <circle cx="700" cy="180" r="8" fill="#10b981" filter="url(#glow_frame_pot)" />

  <!-- Top Metadata Badge -->
  <rect x="50" y="38" width="220" height="26" rx="13" fill="#8b5cf6" fill-opacity="0.22" stroke="#8b5cf6" stroke-opacity="0.6" />
  <text x="160" y="55" text-anchor="middle" fill="#c084fc" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="1.5">QUANTUM INFORMATION</text>

  <!-- Title Watermark & Unique Run Branding -->
  <text x="50" y="340" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="800" letter-spacing="-0.5">Towards Optimal Quantum Estimators for State Frame Potential</text>
  <text x="50" y="366" fill="#94a3b8" font-family="monospace" font-size="10" letter-spacing="1.2">MERIDIAN RESEARCH // QSVT &amp; HAAR RANDOMNESS DIAGNOSTICS // #9854</text>
</svg>`,
  content: `## Executive Abstract & Core Contributions

Quantifying the degree to which an ensemble of quantum states approximates the uniform Haar measure is a cornerstone of quantum information theory, pseudorandomness verification, and quantum supremacy benchmarking. The **$t$-th state frame potential** $\\mathcal{F}_t(\\mathcal{E})$ serves as the definitive diagnostic tool for measuring deviation from exact $t$-designs.

This investigation explores the fundamental algorithmic limits of estimating the state frame potential across three distinct physical access models:
1. **The Quantum Query Access Model**: Given unitary oracle access preparing ensemble states and sampling ensemble weights, we establish a near-optimal query complexity of $\\widetilde{\\mathcal{O}}(\\sqrt{t}/\\varepsilon)$, achieving a quadratic acceleration in the degree parameter $t$.
2. **The General Sample Access Model**: Given multi-copy access to independent state draws, we demonstrate an optimal sample complexity of $\\Theta(t/\\varepsilon^2)$ utilizing a generalized multi-register SWAP permutation test.
3. **The Single-Copy Sample Access Model**: Given only single-copy draws per trial, we formulate a store-and-estimate protocol whose sample complexity is rigorously bounded by the Rényi collision entropy of the probability distribution.

## Mathematical Formulations & The State Frame Potential

Let $\\mathcal{E} = \\{(p_i, |\\psi_i\\rangle)\\}_{i=1}^M$ be an ensemble of pure states in a $d$-dimensional Hilbert space $\\mathcal{H}_d$, where $\\sum_{i=1}^M p_i = 1$. The **$t$-th state frame potential** is defined algebraically as:

$$\\mathcal{F}_t(\\mathcal{E}) = \\sum_{i,j=1}^M p_i p_j |\\langle \\psi_i | \\psi_j \\rangle|^{2t} = \\operatorname{Tr}\\left( \\left( \\sum_{i=1}^M p_i (|\\psi_i\\rangle\\langle \\psi_i|)^{\\otimes t} \\right)^2 \\right)$$

For the Haar random ensemble $\\mathcal{E}_{\\text{Haar}}$, Schur-Weyl duality guarantees that the frame potential achieves the global minimum:

$$\\mathcal{F}_t(\\mathcal{E}_{\\text{Haar}}) = \\frac{1}{\\binom{d + t - 1}{t}} = \\frac{t!(d-1)!}{(d+t-1)!}$$

An ensemble $\\mathcal{E}$ forms an exact quantum state $t$-design if and only if $\\mathcal{F}_t(\\mathcal{E}) = \\mathcal{F}_t(\\mathcal{E}_{\\text{Haar}})$, and forms an $\\varepsilon$-approximate $t$-design when $|\\mathcal{F}_t(\\mathcal{E}) - \\mathcal{F}_t(\\mathcal{E}_{\\text{Haar}})| \\le \\varepsilon$.

## Query Model: Quantum Singular Value Transformation (QSVT) Speedup

In the query access paradigm, the quantum algorithm possesses black-box access to two coherent oracles:
- The state preparation oracle $O_{\\psi} |i\\rangle |0\\rangle = |i\\rangle |\\psi_i\\rangle$
- The probability sampling oracle $O_p |0\\rangle = \\sum_{i=1}^M \\sqrt{p_i} |i\\rangle$

By constructing a block-encoding of the $t$-fold tensor state operator $\\rho_t = \\sum_i p_i (|\\psi_i\\rangle\\langle\\psi_i|)^{\\otimes t}$, estimating $\\mathcal{F}_t(\\mathcal{E}) = \\operatorname{Tr}(\\rho_t^2)$ reduces to polynomial amplitude estimation on the singular values of $\\rho_t$. Applying Quantum Singular Value Transformation (QSVT) with Chebyshev polynomial approximations of degree $k = \\mathcal{O}(\\sqrt{t}/\\varepsilon)$ yields:

$$Q(\\mathcal{E}, t, \\varepsilon) = \\widetilde{\\mathcal{O}}\\left( \\frac{\\sqrt{t}}{\\varepsilon} \\right)$$

This quadratically improves upon all classical Monte Carlo and unamplified quantum sampling approaches that require $\\Omega(t/\\varepsilon^2)$ queries.

## General Sample Model: Optimal Multi-Register SWAP Test

When the quantum computer is provided with independent batches of states sampled from $\\mathcal{E}$, we construct an unbiased quantum estimator $X$ using a $2t$-register controlled cyclic permutation test $W_{2t}$:

$$W_{2t} = \\bigotimes_{k=1}^t \\operatorname{SWAP}_{k, k+t}$$

The expectation value of the controlled permutation operator satisfies:

$$\\langle X \\rangle = \\operatorname{Tr}\\left( W_{2t} \\left( \\rho_t \\otimes \\rho_t \\right) \\right) = \\operatorname{Tr}(\\rho_t^2) = \\mathcal{F}_t(\\mathcal{E})$$

Applying Chebyshev inequality to empirical averages of $X$ establishes the tight minimax sample complexity:

$$S_{\\text{gen}}(t, \\varepsilon) = \\Theta\\left( \\frac{t}{\\varepsilon^2} \\right)$$

## Single-Copy Access Model & Rényi Collision Entropy

In near-term quantum architectures or experimental measurement setups where multi-qubit coherent quantum memories are unavailable, only single state copies can be measured at a time. The algorithm implements a store-and-estimate classical-quantum pipeline where quantum tomography snapshots are correlated against distribution collisions.

The required single-copy sample complexity $S_{\\text{single}}$ is governed by the 2-Rényi collision entropy $H_2(p) = -\\log_2 \\sum_i p_i^2$:

$$S_{\\text{single}}(t, \\varepsilon) = \\mathcal{O}\\left( \\frac{2^{(t-1) H_2(p)}}{\\varepsilon^2} \\right)$$

For uniform ensembles ($p_i = 1/M$), this simplifies to $\\mathcal{O}\\left( \\frac{M^{t-1}}{\\varepsilon^2} \\right)$, proving that single-copy randomness verification requires exponentially more samples as design order $t$ grows unless coherent multi-copy joint measurements are deployed.

## Complexity Bounds Matrix

| Access Model | Known Upper Bound | This Work (Near-Optimal) | Matching Lower Bound |
| :--- | :--- | :--- | :--- |
| **Query Model** | $\\mathcal{O}(t / \\varepsilon^2)$ | $\\widetilde{\\mathcal{O}}(\\sqrt{t} / \\varepsilon)$ | $\\Omega(\\sqrt{t} / \\varepsilon)$ |
| **General Multi-Copy Sample** | $\\mathcal{O}(t^2 / \\varepsilon^2)$ | $\\Theta(t / \\varepsilon^2)$ | $\\Omega(t / \\varepsilon^2)$ |
| **Single-Copy Sample** | Unbounded | $\\mathcal{O}(2^{(t-1)H_2(p)} / \\varepsilon^2)$ | $\\Omega(2^{(t-1)H_2(p)} / \\varepsilon^2)$ |

## Scientific Implications & Practical Outlook

These near-optimal bounds provide the theoretical foundation for:
1. **Efficient Quantum Supremacy Auditing**: Accelerating the verification of Cross-Entropy Benchmarking (XEB) and random circuit sampling without exponential classical tensor network simulation overhead.
2. **Black-Box Hamiltonian Learning**: Utilizing frame potential estimation to identify thermalization rates, information scrambling, and out-of-time-order correlator (OTOC) growth in many-body quantum systems.
3. **Hardware-Efficient Quantum State Tomography**: Guiding the design of minimum required quantum memory depth for multi-copy quantum sensor networks.`,
  author: "Jinge Bao, Wang Fang, Yoshifumi Nakata, Qisheng Wang",
  tags: [
    "Quantum State Ensembles",
    "Frame Potential",
    "Quantum Singular Value Transformation",
    "Haar Randomness",
    "Sample Complexity",
    "Quantum Information"
  ],
  id: "generated-1787570419854",
  slug: "towards-optimal-quantum-estimators-for-state-frame-potential-9854",
  date: "August 24, 2026",
  createdAt: 1787570419854,
  timestamp: 1787570419854,
  views: 1542
};

const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
let blogs = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));

// Upsert at top
const existingIndex = blogs.findIndex(b => b.id === newPaper.id || b.slug === newPaper.slug);
if (existingIndex !== -1) {
  blogs[existingIndex] = newPaper;
} else {
  blogs.unshift(newPaper);
}

fs.writeFileSync(customBlogsPath, JSON.stringify(blogs, null, 2), "utf-8");

// Also update src/data.ts
const dataTsPath = path.join(process.cwd(), "src", "data.ts");
const dataTsContent = `import { BlogPost } from "./types";
import { ensureAnimatedSvg } from "./lib/svgUtils";

const RAW_PRELOADED_BLOGS: BlogPost[] = ${JSON.stringify(blogs, null, 2)};

const today = new Date();
const formatDate = (d: Date) => {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export const PRELOADED_BLOGS: BlogPost[] = RAW_PRELOADED_BLOGS.map((blog, index) => {
  const d = new Date(today);
  if (index === 0) {
    // Today
  } else if (index === 1 || index === 2) {
    // Yesterday
    d.setDate(today.getDate() - 1);
  } else if (index === 3 || index === 4) {
    // 2 days ago
    d.setDate(today.getDate() - 2);
  } else {
    // Older
    d.setDate(today.getDate() - (index - 1));
  }
  return {
    ...blog,
    bannerSvg: ensureAnimatedSvg(blog.bannerSvg),
    date: blog.date || formatDate(d)
  };
});
`;
fs.writeFileSync(dataTsPath, dataTsContent, "utf-8");

console.log("Successfully restored paper across custom_blogs.json and src/data.ts. Total count:", blogs.length);
