import { BlogPost } from "../types";

export interface ResumeData {
  name: string;
  title: string;
  subtitle: string;
  email: string;
  linkedin: string;
  phone: string;
  location: string;
  summary: string;
  coreCompetencies: {
    category: string;
    skills: string[];
  }[];
  experience: {
    role: string;
    organization: string;
    period: string;
    location: string;
    highlights: string[];
    technologies: string[];
  }[];
  researchDomains: {
    domain: string;
    keyThemes: string[];
    representativePapers: string[];
  }[];
  keyPublications: {
    title: string;
    category: string;
    arxivLink?: string;
    impactSummary: string;
    keywords: string[];
  }[];
  technicalKeywords: string[];
}

export const RESUME_DATA: ResumeData = {
  name: "Lucas Kempe",
  title: "Founder & Principal Director of Meridian Informatics",
  subtitle: "Quantum Photonics · Neural Acceleration & Compilers · Distributed AI Infrastructure",
  email: "lucas.kempe@icloud.com",
  linkedin: "https://www.linkedin.com/in/lucaskempe/",
  phone: "+54 11 7132-3723",
  location: "Buenos Aires, Argentina",
  summary:
    "Pioneering research engineer and systems architect specializing in quantum optics, on-device compiler pipelines, neural acceleration engines, and high-throughput AI infrastructure. Founder of Meridian Journal, an open scientific editorial and translation platform dissecting quantum computing, integrated photonics, and machine learning physics. Experienced in deploying edge inference engines (Apple Neural Engine, WebGPU), building fault-tolerant quantum algorithms (QLDPC, error correction, QSVT), and architecting distributed edge protocols (MCP servers, Cloudflare Workers, vector indices).",
  
  coreCompetencies: [
    {
      category: "Quantum Computing & Mathematical Physics",
      skills: [
        "Quantum Error Correction (QEC & QLDPC)",
        "Subsystem Product Codes & Tanner Graphs",
        "Quantum Singular Value Transformation (QSVT)",
        "Temporal Coupled-Mode Theory (TCMT)",
        "Bound States in the Continuum (BIC)",
        "Diffractive Neural Networks (D2NN)",
        "Wavefront Shaping & Adaptive Optics",
        "Non-Hermitian Dynamics & PT-Symmetry"
      ]
    },
    {
      category: "Systems & Edge AI Engineering",
      skills: [
        "Apple Neural Engine (ANE) Ops & MIL Optimization",
        "WebGPU Browser Inference (ONNX / WGSL)",
        "Model Context Protocol (MCP) Server Architecture",
        "Online SGD Calibration & Orbital Skill Classifiers",
        "Cloudflare Workers, Vectorize & AI Gateway",
        "Full-Stack TypeScript / Node.js / React / Vite",
        "WebAuthn / Passkey Biometric Auth Pipelines",
        "eDNA Genomic Pipelines (Oxford Nanopore + DGX)"
      ]
    },
    {
      category: "Scientific Editorial & Research Synthesis",
      skills: [
        "Rigorous LaTeX Mathematical Formulation",
        "arXiv Ingestion & AST Analysis Pipelines",
        "Procedural Vector Graphics & Diagram Generation",
        "Scholarly Citation & BibTeX Metadata Pipelines",
        "Multi-modal Physics & Spectral Prediction",
        "High-density Technical Communication"
      ]
    }
  ],

  experience: [
    {
      role: "Founder & Principal Systems Director",
      organization: "Meridian Informatics / Meridian Journal",
      period: "2024 – Present",
      location: "Buenos Aires, Argentina / Remote",
      highlights: [
        "Architected and deployed Meridian Journal, an advanced computational physics publishing platform bridging arXiv preprints with mathematical analyses across 70+ quantum, photonic, and AI domains.",
        "Built automated LaTeX parsing AST pipelines, procedural SVG wave/tensor synthesis engines, and real-time audio TTS synthesis for scholarly papers.",
        "Implemented secure biometric WebAuthn/Passkey authentication with zero-trust multi-tier synchronization (Local, Snapshot, Firestore) and offline-first fallback guarantees.",
        "Engineered Grok-integrated orbital skill routing connectors, MCP servers on Cloudflare Workers, and multi-tier caching architectures."
      ],
      technologies: [
        "TypeScript", "React", "Node.js", "Express", "WebGPU", "WebAuthn", "Firestore", "Cloudflare Workers", "Tailwind CSS", "LaTeX / MathJax"
      ]
    },
    {
      role: "Lead Machine Learning & Neural Acceleration Researcher",
      organization: "Autonomous Research & Advanced Systems",
      period: "2022 – 2024",
      location: "Remote",
      highlights: [
        "Optimized on-device ML model execution targeting 100% compute placement on Apple Neural Engine (ANE) using CoreML and FP16 graph compilation.",
        "Shipped browser-native WebGPU transformer inference reducing memory footprint and server egress costs while preserving sub-second token latency.",
        "Designed and tuned an online stochastic gradient descent (SGD) orbital skill classifier increasing routing precision from 17% to 81%.",
        "Developed end-to-end eDNA analysis pipelines integrating Oxford Nanopore real-time sequencing with NVIDIA DGX Spark GPU acceleration."
      ],
      technologies: [
        "WebGPU", "CoreML / ANE", "Python", "PyTorch", "CUDA", "NVIDIA DGX", "Oxford Nanopore MinKNOW", "TypeScript"
      ]
    }
  ],

  researchDomains: [
    {
      domain: "Integrated Photonics & Waveguide Physics",
      keyThemes: [
        "Artificial Anisotropy Induced Bound States in the Continuum (BIC)",
        "Subwavelength Gratings & Photonic Crystal Waveguides",
        "Perturbative Matrix Multiplication slashing optical phase-shift ranges 10x",
        "Orbital Altermagnetic Photonic Crystals & Pseudospin Splitting"
      ],
      representativePapers: [
        "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide",
        "Perturbative Photonic Matrix Multiplication — Slashing Phase-Shift Range by 10x",
        "Inverse Designed Photonic Crystal Waveguides for Pulsed Operation"
      ]
    },
    {
      domain: "Fault-Tolerant Quantum Computing & Error Correction",
      keyThemes: [
        "Biased-Noise Ancillas Quenching Hook Errors in QLDPC Codes",
        "Exact Dyadic Phase Gate Cultivation via Reusable Logical Catalyst States",
        "Optimal Quantum Estimators for State Frame Potential & Haar Diagnostics",
        "Quantum Split-Step Fourier Algorithms for Nonlinear Optical Waveguides"
      ],
      representativePapers: [
        "Biased-Noise Ancillas Quench Hook Errors and Short Tanner Loops in QLDPC Scaling",
        "Exact Fine Dyadic Phase Gates via Reusable Logical Catalyst States: A Surface-Code Protocol",
        "Towards Optimal Quantum Estimators for State Frame Potential"
      ]
    },
    {
      domain: "Wavefront Shaping & Adaptive Optics",
      keyThemes: [
        "Diffractive Neural Networks (D2NN) for Spin-Multiplexed Nonlocal Metasurfaces",
        "Dynamic Scattering Bounds & Ballistic Boundaries in Deep-Tissue Imaging",
        "Stiefel Manifold Constrained Neural Operators for Inverse EM Design",
        "Single-Shot Multi-Channel Convolutions Overcoming Free-Space SISO Limits"
      ],
      representativePapers: [
        "Edge-Enhanced Diffractive Neural Networks: Spin-Multiplexed Nonlocal Metasurfaces",
        "The Vanishing Distance: Practical Range Boundaries for Dynamic Wavefront Shaping",
        "Deep Wavefronts: Hard-Constraining Neural Operators on Stiefel Manifolds"
      ]
    }
  ],

  keyPublications: [
    {
      title: "Artificial Anisotropy Induced Bound States in the Continuum for Integrated Photonic Waveguide",
      category: "Integrated Photonics & Waveguide Physics",
      arxivLink: "https://arxiv.org/abs/2608.20992",
      impactSummary: "Formulates dielectric tensor perturbation for optical field confinement without radiative leakage in subwavelength integrated waveguides.",
      keywords: ["Bound States in Continuum", "Anisotropic Metamaterials", "Subwavelength Gratings", "Waveguide Physics"]
    },
    {
      title: "Biased-Noise Ancillas Quench Hook Errors and Short Tanner Loops in QLDPC Scaling",
      category: "Fault-Tolerant Quantum Computing",
      arxivLink: "https://arxiv.org/abs/2608.20817",
      impactSummary: "Demonstrates algebraic suppression of high-weight hook errors in quantum low-density parity check codes using biased noise ancilla qubits.",
      keywords: ["QLDPC Codes", "Quantum Error Correction", "Tanner Graphs", "Hook Errors", "Fault-Tolerant Computing"]
    },
    {
      title: "Towards Optimal Quantum Estimators for State Frame Potential: Near-Optimal Query & Sample Complexities",
      category: "Quantum Information Theory",
      arxivLink: "https://arxiv.org/abs/2608.19662",
      impactSummary: "Establishes tight sample and query complexity bounds for verifying Haar randomness in quantum state ensembles via QSVT.",
      keywords: ["Quantum State Ensembles", "Frame Potential", "QSVT", "Haar Randomness", "Sample Complexity"]
    },
    {
      title: "Edge-Enhanced Diffractive Neural Networks: Spin-Multiplexed Nonlocal Metasurfaces",
      category: "Optical Computing & Wavefront Shaping",
      arxivLink: "https://arxiv.org/abs/2608.20788",
      impactSummary: "Synthesizes passive spin-multiplexed metasurfaces capable of performing multi-channel spatial convolutions at the speed of light.",
      keywords: ["Diffractive Neural Networks", "Metasurfaces", "Wavefront Shaping", "Optical Computing"]
    },
    {
      title: "100% on the Apple Neural Engine — Eligibility is Not Placement",
      category: "Neural Acceleration & Compiler Systems",
      impactSummary: "Comprehensive architectural breakdown of ANE kernel compilation, tensor memory layout, and runtime compiler behavior for on-device ML.",
      keywords: ["Apple Neural Engine", "CoreML", "Compiler Optimization", "On-Device Inference"]
    },
    {
      title: "Browser AI on a RAM Diet — WebGPU Memory Optimization and Edge Partitioning",
      category: "Edge Computing & Distributed AI",
      impactSummary: "Production deployment patterns for client-side WebGPU transformers with intelligent fallback and server-side model offloading.",
      keywords: ["WebGPU", "Browser ML", "Edge Computing", "Memory Footprint", "TypeScript"]
    }
  ],

  technicalKeywords: [
    // Quantum & Optical Physics
    "Quantum Error Correction", "QLDPC Codes", "Tanner Graphs", "QSVT", "Haar Randomness",
    "Bound States in Continuum (BIC)", "Anisotropic Metamaterials", "Subwavelength Gratings",
    "Diffractive Neural Networks (D2NN)", "Wavefront Shaping", "Adaptive Optics",
    "Temporal Coupled-Mode Theory (TCMT)", "Non-Hermitian Systems", "PT-Symmetry Breaking",
    "Quantum Metrology", "Squeezed Light", "Vacuum Birefringence", "Single-Photon Transduction",
    // Systems & Neural Compilers
    "Apple Neural Engine (ANE)", "CoreML Compilation", "WebGPU (WGSL)", "On-Device Inference",
    "Model Context Protocol (MCP)", "Online SGD Routing", "Cloudflare Workers & Vectorize",
    "WebAuthn / Passkeys", "TypeScript", "React", "Node.js", "Express", "LaTeX AST Ingestion",
    "Oxford Nanopore eDNA", "NVIDIA DGX GPU Pipelines", "Distributed Systems Architecture"
  ]
};
