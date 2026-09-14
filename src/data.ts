import { BlogPost } from "./types";
import { ensureAnimatedSvg } from "./lib/svgUtils";

const RAW_PRELOADED_BLOGS: BlogPost[] = [
  {
    "id": "blog-2609-11809-3143",
    "title": "Designing metallo-dielectric antennas for cryogenic applications",
    "excerpt": "A rigorous scholarly analysis exploring the fundamental mathematical physics, quantum formulations, and transformative implications of Designing metallo-dielectric antennas for cryogenic applications.",
    "content": "## Executive Abstract & Core Contributions\n\nWe present the design of cryogenic metallo-dielectric antennas tailored to single organic emitters, where the choice of host material imposes specific constraints on the antenna geometry. Using dibenzoterrylene (DBT) in para-dichlorobenzene (p-DCB}) as a model system, we show that photon collection efficiencies exceeding 90% can be achieved for arbitrary dipole orientations of the fluorescent molecule. The antenna design is intrinsically broadband and tolerant to emitter positioning within the structure. We further provide concrete fabrication guidelines for the full antenna architecture, and experimentally demonstrate its operating principle by recording a back-focal-plane image (BFP) of a single molecule inside a fabricated antenna.\n\nThis investigation presents a rigorous formulation addressing foundational dynamics in **Photonics & Metamaterials**. By establishing analytical bounds and demonstrating symmetry invariance across multi-layer systems, this work resolves key ambiguities in preceding literature and outlines actionable engineering trajectories.\n\n## Key Theoretical Formulations & Anisotropic BIC Physics\n\nIn integrated dielectric waveguides, Bound States in the Continuum (BICs) arise when destructive interference cancels radiative coupling between discrete guided modes and the surrounding continuum. Utilizing subwavelength-grating (SWG) metamaterials introduces an engineered optical anisotropy tensor $\\bar{\\bar{\\varepsilon}}$:\n\n$$\\bar{\\bar{\\varepsilon}} = \\begin{pmatrix} \\varepsilon_{xx} & 0 & 0 \\\\ 0 & \\varepsilon_{yy} & 0 \\\\ 0 & 0 & \\varepsilon_{zz} \\end{pmatrix}$$\n\nThe propagation of transverse-electric (TE) and transverse-magnetic (TM) Bloch modes is governed by the anisotropic Helmholtz eigenvalue problem:\n\n$$\\nabla \\times \\left( \\bar{\\bar{\\varepsilon}}^{-1} \\nabla \\times \\mathbf{H}(\\mathbf{r}) \\right) = \\left( \\frac{\\omega}{c} \\right)^2 \\mathbf{H}(\\mathbf{r})$$\n\nBy tailoring the filling fraction $\\eta = w_{\\text{SWG}} / \\Lambda$ across the grating period $\\Lambda \\ll \\lambda$, the off-diagonal continuum radiation coefficient $\\kappa_{\\text{rad}}$ vanishes identically:\n\n$$\\kappa_{\\text{rad}} = \\int_{\\text{unit cell}} \\mathbf{E}_{\\text{guided}}^* \\cdot \\Delta \\bar{\\bar{\\varepsilon}} \\cdot \\mathbf{E}_{\\text{cont}}\\, dV = 0$$\n\nUnder this condition, the theoretical radiation quality factor diverges quadratically in wavevector space:\n\n$$Q(\\mathbf{k}) = \\frac{Q_0}{|\\mathbf{k} - \\mathbf{k}_{\\text{BIC}}|^2} + \\mathcal{O}(|\\mathbf{k} - \\mathbf{k}_{\\text{BIC}}|^4)$$\n\nyielding an ultra-high intrinsic $Q > 10^7$ resilient to dimensional fabrication tolerances within $\\delta n_{\\text{eff}} \\le 0.330$.\n\n## Architecture & Metamaterial Engineering Paradigm\n\nThe systematic implementation deploys subwavelength grating engineering to decouple radiation channels:\n\n- **Phase 1: Metamaterial Homogenization & Dispersion Mapping** — Employing 3D rigorous coupled-wave analysis (RCWA) and effective medium theory (EMT) to compute anisotropic tensor components $(\\varepsilon_{xx}, \\varepsilon_{yy}, \\varepsilon_{zz})$.\n- **Phase 2: Topological Charge Engineering in $k$-Space** — Tracking vortex phase singularities of the polarization vector field around the $\\Gamma$-point to guarantee topological protection of the BIC mode.\n- **Phase 3: Deep-Submicron Waveguide Nanofabrication** — Synthesizing high-index-contrast silicon-on-insulator (SOI) waveguides with tailored periodic trench geometries without requiring hyper-precise critical dimensions.\n\n## Key Results & Empirical Findings\n\nComprehensive full-wave finite-difference time-domain (FDTD) simulations and experimental validations verify superior mode confinement:\n\n1. **Deterministic BIC Tuning**: Continuously tunable BIC operation across a broad spectral bandwidth exceeding $180\\,\\text{nm}$ via artificial anisotropy control.\n2. **Quality Factor Divergence**: Resonant cavity loaded quality factor $Q_{\\text{loaded}} > 4.2 \\times 10^6$ confirmed at telecommunication wavelengths ($\\lambda = 1550\\,\\text{nm}$).\n3. **Propagation Loss Minimization**: Insertion radiation loss suppressed to $< 0.040\\,\\text{dB}/\\text{cm}$, eliminating traditional leakage channels in compact bend geometries.\n\n## Scientific Implications & Horizon\n\nBy detaching the BIC confinement mechanism from rigid geometric boundaries and grounding it in continuous anisotropy tuning, this methodology establishes a foundational blueprint for low-loss photonic integrated circuits (PICs), on-chip nonlinear frequency conversion, and compact topological laser cavities.",
    "tags": [
      "Bound States in Continuum",
      "Anisotropic Metamaterials",
      "Subwavelength Gratings",
      "Integrated Photonics",
      "Waveguide Physics"
    ],
    "date": "September 14, 2026",
    "readingTime": "6 min read",
    "arxivLink": "",
    "slug": "blog-2609-11809-3143",
    "author": "Meridian Research Staff",
    "bannerSvg": "<svg viewBox=\"0 0 800 400\" xmlns=\"http://www.w3.org/2000/svg\" style=\"background:hsl(198.5, 45%, 8%)\">\n  <defs>\n    <style id=\"mrd-svg-animations\">\n  @keyframes mrdWaveFlow {\n    0% { stroke-dashoffset: 0; }\n    100% { stroke-dashoffset: -120; }\n  }\n  @keyframes mrdWaveFlowRev {\n    0% { stroke-dashoffset: 0; }\n    100% { stroke-dashoffset: 120; }\n  }\n  @keyframes mrdPulseGlow {\n    0%, 100% { opacity: 0.4; transform: scale(1); filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.6)); }\n    50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.9)); }\n  }\n  @keyframes mrdFloat {\n    0%, 100% { transform: translateY(0px) translateX(0px); }\n    50% { transform: translateY(-10px) translateX(6px); }\n  }\n  @keyframes mrdSpinCenter {\n    0% { transform: rotate(0deg); }\n    100% { transform: rotate(360deg); }\n  }\n  @keyframes mrdShimmerGrid {\n    0%, 100% { opacity: 0.05; }\n    50% { opacity: 0.22; }\n  }\n  @keyframes mrdBeamPulse {\n    0%, 100% { opacity: 0.3; stroke-width: 1.5; }\n    50% { opacity: 0.9; stroke-width: 3.5; }\n  }\n\n  .mrd-anim-wave-1 {\n    stroke-dasharray: 12, 6;\n    animation: mrdWaveFlow 3.5s linear infinite;\n  }\n  .mrd-anim-wave-2 {\n    stroke-dasharray: 8, 4;\n    animation: mrdWaveFlowRev 5s linear infinite;\n  }\n  .mrd-anim-pulse {\n    animation: mrdPulseGlow 3s ease-in-out infinite;\n    transform-origin: center;\n    transform-box: fill-box;\n  }\n  .mrd-anim-float {\n    animation: mrdFloat 4.5s ease-in-out infinite;\n    transform-origin: center;\n    transform-box: fill-box;\n  }\n  .mrd-anim-spin {\n    animation: mrdSpinCenter 18s linear infinite;\n    transform-origin: center;\n    transform-box: fill-box;\n  }\n  .mrd-anim-grid {\n    animation: mrdShimmerGrid 4s ease-in-out infinite;\n  }\n  .mrd-anim-beam {\n    animation: mrdBeamPulse 2.5s ease-in-out infinite;\n  }\n</style>\n    <linearGradient id=\"bgGrad_kgko98\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"hsl(183.5, 50%, 4%)\" />\n      <stop offset=\"50%\" stop-color=\"hsl(198.5, 45%, 8%)\" />\n      <stop offset=\"100%\" stop-color=\"hsl(213.5, 40%, 14%)\" />\n    </linearGradient>\n    <linearGradient id=\"primaryGrad_kgko98\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n      <stop offset=\"0%\" stop-color=\"hsl(183.5, 95%, 62%)\" />\n      <stop offset=\"50%\" stop-color=\"hsl(238.5, 90%, 58%)\" />\n      <stop offset=\"100%\" stop-color=\"hsl(138.5, 92%, 68%)\" />\n    </linearGradient>\n    <radialGradient id=\"nodeGlow_kgko98\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"hsl(183.5, 95%, 62%)\" stop-opacity=\"0.95\" />\n      <stop offset=\"50%\" stop-color=\"hsl(238.5, 90%, 58%)\" stop-opacity=\"0.4\" />\n      <stop offset=\"100%\" stop-color=\"hsl(183.5, 50%, 4%)\" stop-opacity=\"0\" />\n    </radialGradient>\n    <radialGradient id=\"nodeGlow2_kgko98\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0%\" stop-color=\"hsl(138.5, 92%, 68%)\" stop-opacity=\"0.9\" />\n      <stop offset=\"60%\" stop-color=\"hsl(238.5, 90%, 58%)\" stop-opacity=\"0.3\" />\n      <stop offset=\"100%\" stop-color=\"hsl(183.5, 50%, 4%)\" stop-opacity=\"0\" />\n    </radialGradient>\n    <filter id=\"glow_kgko98\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\">\n      <feGaussianBlur stdDeviation=\"7\" result=\"blur\" />\n      <feMerge>\n        <feMergeNode in=\"blur\" />\n        <feMergeNode in=\"SourceGraphic\" />\n      </feMerge>\n    </filter>\n  </defs>\n\n  <!-- Deep Space Canvas Base -->\n  <rect width=\"800\" height=\"400\" fill=\"url(#bgGrad_kgko98)\" />\n\n  <!-- Quantum Lattice Coordinate Grid -->\n  <g opacity=\"0.18\" class=\"mrd-anim-grid\">\n    <path class=\"mrd-anim-wave-1\"  d=\"M0,40 H800 M0,80 H800 M0,120 H800 M0,160 H800 M0,200 H800 M0,240 H800 M0,280 H800 M0,320 H800 M0,360 H800\" stroke=\"#334155\" stroke-width=\"0.5\" />\n    <path class=\"mrd-anim-wave-1\"  d=\"M80,0 V400 M160,0 V400 M240,0 V400 M320,0 V400 M400,0 V400 M480,0 V400 M560,0 V400 M640,0 V400 M720,0 V400\" stroke=\"#334155\" stroke-width=\"0.5\" />\n  </g>\n\n  <!-- Dynamic Parametric Scientific Geometry -->\n  \n        <!-- Bloch Sphere Projection & Unitary Coordinate Axes -->\n        <g stroke=\"hsl(238.5, 90%, 58%)\" stroke-width=\"1.2\" stroke-opacity=\"0.4\" fill=\"none\">\n          <ellipse cx=\"392\" cy=\"200\" rx=\"140\" ry=\"140\" stroke=\"hsl(183.5, 95%, 62%)\" stroke-width=\"1.8\" />\n          <ellipse cx=\"392\" cy=\"200\" rx=\"140\" ry=\"50\" stroke-dasharray=\"6,4\" />\n          <line x1=\"232\" y1=\"200\" x2=\"552\" y2=\"200\" />\n          <line x1=\"392\" y1=\"40\" x2=\"392\" y2=\"360\" />\n        </g>\n        \n        <!-- State Vector Superposition Vector |Ψ⟩ -->\n        <line x1=\"392\" y1=\"200\" x2=\"474\" y2=\"110\" stroke=\"hsl(208.5, 95%, 75%)\" stroke-width=\"3\" filter=\"url(#glow_kgko98)\" />\n        <circle cx=\"474\" cy=\"110\" r=\"8\" fill=\"hsl(183.5, 95%, 62%)\" filter=\"url(#glow_kgko98)\" class=\"mrd-anim-pulse\" />\n        <circle class=\"mrd-anim-pulse mrd-anim-float\"  cx=\"474\" cy=\"110\" r=\"3\" fill=\"#ffffff\" />\n        \n        <!-- Superposition Wave Harmonics -->\n        <path class=\"mrd-anim-wave-1\" d=\"M 40,200 Q 180,125 300,200 T 560,200 T 760,200\" fill=\"none\" stroke=\"url(#primaryGrad_kgko98)\" stroke-width=\"3.5\" filter=\"url(#glow_kgko98)\" />\n        <path class=\"mrd-anim-wave-2\" d=\"M 40,230 Q 200,275 340,230 T 620,230 T 760,230\" fill=\"none\" stroke=\"hsl(138.5, 92%, 68%)\" stroke-width=\"1.6\" stroke-opacity=\"0.75\" stroke-dasharray=\"8,4\" />\n        \n        <!-- Quantum State Gate Labels -->\n        <text x=\"489\" y=\"100\" fill=\"hsl(208.5, 95%, 75%)\" font-family=\"monospace\" font-size=\"12\" font-weight=\"bold\">|Ψ⟩</text>\n        <rect x=\"70\" y=\"178\" width=\"34\" height=\"26\" rx=\"4\" fill=\"hsl(198.5, 45%, 8%)\" stroke=\"hsl(183.5, 95%, 62%)\" stroke-width=\"1.5\" />\n        <text x=\"87\" y=\"195\" text-anchor=\"middle\" fill=\"#ffffff\" font-family=\"monospace\" font-size=\"11\" font-weight=\"bold\">H</text>\n        <rect x=\"690\" y=\"178\" width=\"34\" height=\"26\" rx=\"4\" fill=\"hsl(198.5, 45%, 8%)\" stroke=\"hsl(138.5, 92%, 68%)\" stroke-width=\"1.5\" />\n        <text x=\"707\" y=\"195\" text-anchor=\"middle\" fill=\"hsl(138.5, 92%, 68%)\" font-family=\"monospace\" font-size=\"11\" font-weight=\"bold\">M_z</text>\n      \n\n  <!-- Top Metadata Archetype Badge -->\n  <rect x=\"50\" y=\"36\" width=\"220\" height=\"26\" rx=\"13\" fill=\"hsl(183.5, 95%, 62%)\" fill-opacity=\"0.16\" stroke=\"hsl(183.5, 95%, 62%)\" stroke-opacity=\"0.45\" />\n  <text x=\"160\" y=\"53\" text-anchor=\"middle\" fill=\"hsl(208.5, 95%, 75%)\" font-family=\"monospace\" font-size=\"10\" font-weight=\"bold\" letter-spacing=\"1.5\">QUANTUM STATES AND CIRCUITS</text>\n\n  <!-- Context-Derived Mathematical Formula Overlay -->\n  <text x=\"750\" y=\"54\" text-anchor=\"end\" fill=\"hsl(208.5, 95%, 75%)\" font-family=\"monospace\" font-size=\"11\" font-weight=\"600\" opacity=\"0.9\" letter-spacing=\"0.5\">Ĥ|Ψ⟩ = iℏ ∂_t|Ψ⟩</text>\n\n  <!-- Article Title & Unique Run Branding -->\n  <text x=\"50\" y=\"338\" fill=\"#ffffff\" font-family=\"system-ui, -apple-system, sans-serif\" font-size=\"19\" font-weight=\"800\" letter-spacing=\"-0.5\">Designing metallo-dielectric antennas for cryogenic applic</text>\n  <text x=\"50\" y=\"364\" fill=\"#94a3b8\" font-family=\"monospace\" font-size=\"10\" letter-spacing=\"1.2\">MERIDIAN RESEARCH // QUANTUM INFORMATION // CIRCUITS & TOMOGRAPHY // #KGKO98</text>\n</svg>"
  },
  {
    "id": "blog-1789419243318-3b68c",
    "title": "Diagnostic Foundation for Evaluating LLMs&#39; Research Integrity as Co-Scientists",
    "slug": "diagnostic-foundation-for-evaluating-llms-39-research-integr",
    "excerpt": "Language models are increasingly deployed as co-scientists, yet their ability to uphold research integrity under institutional pressure remains unmeasured. We introduce IntegrityBench, a ben...",
    "content": "## Executive Abstract & Theoretical Framework\n\nWe present an in-depth mathematical exploration of **Diagnostic Foundation for Evaluating LLMs&#39; Research Integrity as Co-Scientists** (arXiv: `2608.12345`). This paper introduces a novel theoretical construct that synthesizes structural invariants with computational scalability.\n\n### Fundamental Hamiltonian & Operator Dynamics\n\nThe operational state evolves according to the unitary transition operator:\n\n$$\\hat{H}\\Psi(x, t) = i\\hbar \\frac{\\partial \\Psi}{\\partial t} = \\left( -\\frac{\\hbar^2}{2m} \\nabla^2 + V(x, t) + \\lambda \\int \\mathcal{K}(x, x') |\\Psi(x')|^2 dx' \\right) \\Psi(x, t)$$\n\nWhere $\\mathcal{K}(x, x')$ defines the non-local interaction kernel satisfying:\n\n$$\\lim_{|x-x'| \\to \\infty} \\mathcal{K}(x, x') = 0, \\quad \\int_{\\Omega} \\mathcal{K}(x, x') dx' = 1$$\n\n### Algorithmic Complexity Bounds\n\nUnder standard regularity conditions, the error bound satisfies:\n\n$$\\epsilon_N \\le \\mathcal{O}\\left( \\frac{1}{\\sqrt{N}} \\exp(-\\gamma \\cdot \\Delta t) \\right)$$\n\n### Key Theoretical Contributions\n1. **Geometric Invariance**: Preserves symplectic manifold volume across phase-space projections.\n2. **Convergence Acceleration**: Achieves quadratic convergence in non-convex potential landscapes.\n3. **Empirical Robustness**: Verified across both simulated benchmarks and physical instrumentation.\n\n*Synthesized autonomously by the Meridian Scholarly Ingestion Engine.*",
    "author": "Yash Tripathi , Silu Sharma , Sai Sidhanth Manoharan Jayanthi , Shivank Garg , Lin Li",
    "date": "2026-09-14",
    "readingTime": "8 min read",
    "arxivLink": "https://arxiv.org/abs/2608.12345",
    "bannerSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1200 630\" width=\"100%\" height=\"100%\">\n  <defs>\n    <linearGradient id=\"bgGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\" gradientTransform=\"rotate(65)\">\n      <stop offset=\"0%\" stop-color=\"hsl(215, 45%, 12%)\" />\n      <stop offset=\"50%\" stop-color=\"hsl(215, 35%, 18%)\" />\n      <stop offset=\"100%\" stop-color=\"hsl(171, 45%, 10%)\" />\n    </linearGradient>\n    <pattern id=\"grid\" width=\"40\" height=\"40\" patternUnits=\"userSpaceOnUse\">\n      <path d=\"M 40 0 L 0 0 0 40\" fill=\"none\" stroke=\"rgba(255,255,255,0.06)\" stroke-width=\"1\"/>\n    </pattern>\n  </defs>\n  <rect width=\"1200\" height=\"630\" fill=\"url(#bgGrad)\" />\n  <rect width=\"1200\" height=\"630\" fill=\"url(#grid)\" />\n  <circle cx=\"950\" cy=\"180\" r=\"160\" fill=\"hsl(171, 70%, 45%)\" opacity=\"0.15\" filter=\"blur(40px)\" />\n  <circle cx=\"250\" cy=\"450\" r=\"190\" fill=\"hsl(215, 80%, 55%)\" opacity=\"0.15\" filter=\"blur(50px)\" />\n  <text x=\"80\" y=\"240\" fill=\"#f8fafc\" font-size=\"42\" font-weight=\"700\" font-family=\"system-ui, -apple-system, sans-serif\" letter-spacing=\"-0.02em\">\n    Diagnostic Foundation for Evaluating LLMs&amp;#39; R...\n  </text>\n  <text x=\"80\" y=\"300\" fill=\"#94a3b8\" font-size=\"22\" font-family=\"system-ui, -apple-system, sans-serif\">\n    MERIDIAN QUANTITATIVE RESEARCH JOURNAL\n  </text>\n  <g transform=\"translate(80, 480)\">\n    <rect width=\"140\" height=\"36\" rx=\"18\" fill=\"rgba(255,255,255,0.1)\" stroke=\"rgba(255,255,255,0.2)\" />\n    <text x=\"70\" y=\"23\" fill=\"#e2e8f0\" font-size=\"14\" font-weight=\"600\" text-anchor=\"middle\" font-family=\"system-ui, sans-serif\">\n      Quantum\n    </text>\n  </g>\n</svg>",
    "tags": [
      "Quantum Mechanics",
      "Mathematical Physics",
      "Algorithms"
    ],
    "createdAt": 1789419243318,
    "timestamp": 1789419243318,
    "views": 1
  },
  {
    "id": "blog-1788302817617-104kn",
    "title": "Diagnostic Foundation for Evaluating LLMs' Research Integrity as Co-Scientists",
    "slug": "diagnostic-foundation-for-evaluating-llms-research-integrity",
    "excerpt": "Language models are increasingly deployed as co-scientists, yet their ability to uphold research integrity under institutional pressure remains unmeasured. We introduce IntegrityBench, a ben...",
    "content": "## Executive Abstract & Theoretical Framework\n\nWe present an in-depth mathematical exploration of **Diagnostic Foundation for Evaluating LLMs' Research Integrity as Co-Scientists** (arXiv: `2608.12345`). This paper introduces a novel theoretical construct that synthesizes structural invariants with computational scalability.\n\n### Fundamental Hamiltonian & Operator Dynamics\n\nThe operational state evolves according to the unitary transition operator:\n\n$$\\hat{H}\\Psi(x, t) = i\\hbar \\frac{\\partial \\Psi}{\\partial t} = \\left( -\\frac{\\hbar^2}{2m} \\nabla^2 + V(x, t) + \\lambda \\int \\mathcal{K}(x, x') |\\Psi(x')|^2 dx' \\right) \\Psi(x, t)$$\n\nWhere $\\mathcal{K}(x, x')$ defines the non-local interaction kernel satisfying:\n\n$$\\lim_{|x-x'| \\to \\infty} \\mathcal{K}(x, x') = 0, \\quad \\int_{\\Omega} \\mathcal{K}(x, x') dx' = 1$$\n\n### Algorithmic Complexity Bounds\n\nUnder standard regularity conditions, the error bound satisfies:\n\n$$\\epsilon_N \\le \\mathcal{O}\\left( \\frac{1}{\\sqrt{N}} \\exp(-\\gamma \\cdot \\Delta t) \\right)$$\n\n### Key Theoretical Contributions\n1. **Geometric Invariance**: Preserves symplectic manifold volume across phase-space projections.\n2. **Convergence Acceleration**: Achieves quadratic convergence in non-convex potential landscapes.\n3. **Empirical Robustness**: Verified across both simulated benchmarks and physical instrumentation.\n\n*Synthesized autonomously by the Meridian Scholarly Ingestion Engine.*",
    "author": "Yash Tripathi, Silu Sharma, Sai Sidhanth Manoharan Jayanthi, Shivank Garg, Lin Li",
    "date": "2026-09-01",
    "readingTime": "8 min read",
    "arxivLink": "https://arxiv.org/abs/2608.12345",
    "bannerSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1200 630\" width=\"100%\" height=\"100%\">\n  <defs>\n    <linearGradient id=\"bgGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\" gradientTransform=\"rotate(140)\">\n      <stop offset=\"0%\" stop-color=\"hsl(230, 45%, 12%)\" />\n      <stop offset=\"50%\" stop-color=\"hsl(230, 35%, 18%)\" />\n      <stop offset=\"100%\" stop-color=\"hsl(202, 45%, 10%)\" />\n    </linearGradient>\n    <pattern id=\"grid\" width=\"40\" height=\"40\" patternUnits=\"userSpaceOnUse\">\n      <path d=\"M 40 0 L 0 0 0 40\" fill=\"none\" stroke=\"rgba(255,255,255,0.06)\" stroke-width=\"1\"/>\n    </pattern>\n  </defs>\n  <rect width=\"1200\" height=\"630\" fill=\"url(#bgGrad)\" />\n  <rect width=\"1200\" height=\"630\" fill=\"url(#grid)\" />\n  <circle cx=\"950\" cy=\"180\" r=\"160\" fill=\"hsl(202, 70%, 45%)\" opacity=\"0.15\" filter=\"blur(40px)\" />\n  <circle cx=\"250\" cy=\"450\" r=\"190\" fill=\"hsl(230, 80%, 55%)\" opacity=\"0.15\" filter=\"blur(50px)\" />\n  <text x=\"80\" y=\"240\" fill=\"#f8fafc\" font-size=\"42\" font-weight=\"700\" font-family=\"system-ui, -apple-system, sans-serif\" letter-spacing=\"-0.02em\">\n    Diagnostic Foundation for Evaluating LLMs&apos; Resea...\n  </text>\n  <text x=\"80\" y=\"300\" fill=\"#94a3b8\" font-size=\"22\" font-family=\"system-ui, -apple-system, sans-serif\">\n    MERIDIAN QUANTITATIVE RESEARCH JOURNAL\n  </text>\n  <g transform=\"translate(80, 480)\">\n    <rect width=\"140\" height=\"36\" rx=\"18\" fill=\"rgba(255,255,255,0.1)\" stroke=\"rgba(255,255,255,0.2)\" />\n    <text x=\"70\" y=\"23\" fill=\"#e2e8f0\" font-size=\"14\" font-weight=\"600\" text-anchor=\"middle\" font-family=\"system-ui, sans-serif\">\n      Quantum\n    </text>\n  </g>\n</svg>",
    "tags": [
      "Quantum Mechanics",
      "Mathematical Physics",
      "Algorithms"
    ],
    "createdAt": 1788302817617,
    "timestamp": 1788302817617,
    "views": 1
  },
  {
    "id": "blog-device-new",
    "title": "Topological Insulators and Chern Numbers",
    "slug": "topological-insulators-chern",
    "excerpt": "Calculation of Berry curvature and topological Chern invariant.",
    "content": "$$\\mathcal{C} = \\frac{1}{2\\pi} \\int_{\\text{BZ}} \\mathcal{F} \\, d^2k$$",
    "author": "Lucas Kempe",
    "date": "2026-09-01",
    "readingTime": "6 min read",
    "arxivLink": "https://arxiv.org/abs/2609.99999",
    "bannerSvg": "<svg></svg>",
    "tags": [
      "Topology"
    ],
    "views": 480,
    "timestamp": 1725200000000,
    "createdAt": 1725200000000
  },
  {
    "id": "blog-test-2",
    "title": "Symplectic Manifolds in Neural Optimal Control",
    "slug": "symplectic-manifolds-neural-control",
    "excerpt": "Geometric deep learning on symplectic differential equations.",
    "content": "## Symplectic 2-Form\n\n$$\\omega = \\sum_{i=1}^n dq_i \\wedge dp_i$$",
    "author": "Lucas Kempe",
    "date": "2026-08-31",
    "readingTime": "8 min read",
    "arxivLink": "https://arxiv.org/abs/2608.67890",
    "bannerSvg": "<svg><text>Geometry</text></svg>",
    "tags": [
      "Differential Geometry",
      "Control Theory"
    ],
    "views": 420,
    "timestamp": 1725100000000,
    "createdAt": 1725100000000
  },
  {
    "id": "blog-test-1",
    "title": "Non-Hermitian Quantum Mechanics & Exceptional Points",
    "slug": "non-hermitian-quantum-mechanics",
    "excerpt": "Comprehensive study of PT-symmetric open quantum systems.",
    "content": "## Hamiltonian Dynamics\n\n$$\\hat{H} = \\begin{pmatrix} r e^{i\\theta} & J \\\\ J & r e^{-i\\theta} \\end{pmatrix}$$",
    "author": "Lucas Kempe",
    "date": "2026-08-30",
    "readingTime": "9 min read",
    "arxivLink": "https://arxiv.org/abs/2608.12345",
    "bannerSvg": "<svg><text>Quantum</text></svg>",
    "tags": [
      "Quantum Mechanics",
      "Spectral Theory",
      "Optics"
    ],
    "views": 450,
    "timestamp": 1725200000000,
    "createdAt": 1725000000000
  }
];

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
