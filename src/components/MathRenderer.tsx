import React from "react";
import katex from "katex";
import { 
  Database, 
  Layers, 
  Cpu, 
  Activity, 
  CheckCircle, 
  Copy, 
  FileCode2
} from "lucide-react";

interface MathRendererProps {
  text: string;
}

// Robust helper to check if a matched segment inside $...$ is a math expression or currency/plain text
const isMath = (content: string): boolean => {
  const trimmed = content.trim();
  
  if (!trimmed) return false;
  if (trimmed.includes("\n")) return false;
  
  // Exclude pure currency/number patterns: e.g., 29, 0, 0.02, 10k, 30M, 100k, 0.011, 0.10, ~0.02
  if (/^~?\d+(?:\.\d+)?\s*[kKmMbB]?$/.test(trimmed)) {
    return false;
  }
  
  // Reject common words that are definitely not math
  if (/\b(until|cross|requests|million|tokens|per|day|month|year|dollars?|cents?|off|free)\b/i.test(trimmed)) {
    return false;
  }
  
  // Check if it has math-like characters or LaTeX backslash, or is a single short variable like x, p, g, T, etc.
  const hasLaTexCommand = trimmed.includes("\\") || trimmed.includes("_") || trimmed.includes("^") || trimmed.includes("{") || trimmed.includes("}") || trimmed.includes("=") || trimmed.includes("+") || trimmed.includes("-") || trimmed.includes("<") || trimmed.includes(">") || trimmed.includes("*") || trimmed.includes("/") || trimmed.includes("(") || trimmed.includes(")") || trimmed.includes("[") || trimmed.includes("]") || trimmed.includes("|") || trimmed.includes(",") || trimmed.includes(";");
  
  // If it's a single letter (e.g. $k$, $p$, $g$, $T$, $x$, $i$, $j$, $s$), it's math
  if (/^[a-zA-Z]$/.test(trimmed)) {
    return true;
  }
  
  // If it doesn't have any letters but is a math expression like 2\times 2 or 1 - s
  if (hasLaTexCommand) {
    return true;
  }
  
  // If it has multiple spaces without math-like characters, it's probably not math
  const spaces = (trimmed.match(/\s+/g) || []).length;
  if (spaces > 2) {
    return false;
  }
  
  return true;
};

interface CustomCodeOrDiagramProps {
  lang: string;
  code: string;
}

const renderFormula = (latex: string) => {
  try {
    const html = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
    });
    return (
      <span
        className="inline-block font-mono text-slate-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    return <code className="font-mono text-emerald-400">{latex}</code>;
  }
};

const CustomCodeOrDiagram: React.FC<CustomCodeOrDiagramProps> = ({ lang, code }) => {
  const [copied, setCopied] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<"conceptual" | "mathematical">("conceptual");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if this is the relativistic MHD GC-FNO pipeline diagram
  const isArchitectureDiagram = 
    code.includes("Input Multivector Field") && 
    (code.includes("Clifford Embedding Layer") || code.includes("GC-FNO Fourier Block"));

  if (isArchitectureDiagram) {
    const steps = [
      {
        step: 1,
        title: "Input Multivector Field",
        subtitle: "Relativistic Magnetohydrodynamics",
        icon: Database,
        badge: "Data Ingestion",
        formula: "\\mathcal{H}^{(0)}(x) = (\\rho, u^\\mu, B^\\mu)",
        conceptual: "Ingests standard physical relativistic fields (fluid density, velocity, and magnetic vectors) and organizes them for coordinate-free modeling.",
        mathematical: "Structures fluid density \\rho, fluid four-velocity u^\\mu, and covariant magnetic field B^\\mu into a unified grade-structured spatial-temporal multivector field \\mathcal{H}^{(0)} inside the space-time algebra.",
        physicsDetails: [
          "Combines hydrodynamics and electromagnetic stress into a single cohesive representation.",
          "Uses Minkowski space-time metric \\eta^{\\mu\\nu} to model relativistic propagation.",
          "Prepares variables for coordinate-free geometric calculations under Lorentz boosts."
        ]
      },
      {
        step: 2,
        title: "Clifford Embedding Layer",
        subtitle: "Space-time Clifford Algebra",
        icon: Layers,
        badge: "Geometric Mapping",
        formula: "\\mathcal{H}^{(0)} \\in C\\ell_{3,1}(\\mathbb{R})",
        conceptual: "Maps physical quantities to multi-dimensional coordinates in Space-time Clifford Algebra, ensuring absolute Lorentz covariance.",
        mathematical: "Embeds vector fields into the 1-vector (vectors) and 2-vector (bivectors) subspaces of the Clifford algebra C\\ell_{3,1}. All transformations now preserve physical symmetries under space-time rotations and Lorentz boosts.",
        physicsDetails: [
          "Guarantees that physical laws remain invariant across all relativistic frames of reference.",
          "Uses geometric products instead of standard coordinate-dependent matrix multiplication.",
          "Double-covers the orthogonal group O(3,1) via spin and pin representations."
        ]
      },
      {
        step: 3,
        title: "GC-FNO Fourier Block",
        subtitle: "Spectral Convolution",
        icon: Cpu,
        badge: "Fourier Operator (× L)",
        formula: "\\mathcal{H}^{(l+1)} = \\sigma \\left( W \\mathcal{H}^{(l)} + \\mathcal{F}^{-1} \\left( R \\cdot \\mathcal{F}(\\mathcal{H}^{(l)}) \\right) \\right)",
        conceptual: "Translates Clifford coordinates to the frequency domain using component-wise FFT and applies a geometric spectral filter to process long-range spatial patterns.",
        mathematical: "Computes component-wise Fast Fourier Transforms across the Clifford basis. Applies a parameterized Clifford-valued spectral tensor R over low-frequency modes, a real-space linear Clifford operator W, and a equivariant activation function \\sigma.",
        physicsDetails: [
          "Performs Clifford geometric products in Fourier space to preserve algebraic relationships.",
          "Achieves zero-shot super-resolution: models generalize across differing spatial grid resolutions without retraining.",
          "Applies split-cardinality ReLU or GA-gated non-linearities to preserve vector directions."
        ]
      },
      {
        step: 4,
        title: "Clifford Projector & Solenoidal Filter",
        subtitle: "Conservation Laws",
        icon: Activity,
        badge: "Solenoidal Projection",
        formula: "\\nabla \\cdot \\mathbf{B} = 0 \\implies d\\mathcal{B} = 0",
        conceptual: "Ensures that output fields strictly obey physical conservation laws (such as zero magnetic divergence) down to floating-point precision.",
        mathematical: "Projects the output magnetic vector field onto the kernel of the divergence operator in the Fourier domain. In Clifford algebra, this is represented by enforcing the exterior derivative of the magnetic bivector to be exactly zero.",
        physicsDetails: [
          "Prevents unphysical numerical magnetic monopoles during long-term simulations.",
          "Achieves divergence-free satisfaction down to machine/floating-point precision.",
          "Guarantees conservation of total energy, momentum, and magnetic flux exactly."
        ]
      }
    ];

    const currentStep = steps[activeStep];
    const StepIcon = currentStep.icon;

    return (
      <div className="my-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden text-slate-100">
        {/* Glowing Ambient Accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono tracking-wider uppercase text-emerald-400 font-semibold">Interactive Pipeline Diagram</span>
            </div>
            <h3 className="text-xl font-bold font-serif text-slate-100 m-0">
              GC-FNO Architecture &amp; Execution Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-0">
              Click any step to inspect high-fidelity physical, algebraic, and computational metrics.
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center bg-slate-900/60 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setViewMode("conceptual")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === "conceptual"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Conceptual
            </button>
            <button
              onClick={() => setViewMode("mathematical")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === "mathematical"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Mathematical
            </button>
          </div>
        </div>

        {/* Layout: Desktop splits, Mobile stacks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Vertical Steps Flow */}
          <div className="lg:col-span-5 flex flex-col gap-3 relative">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === activeStep;
              return (
                <div key={s.step} className="relative">
                  {/* Vertical Connection Line */}
                  {idx < steps.length - 1 && (
                    <div className="absolute left-[26px] top-12 bottom-[-16px] w-[2px] bg-slate-900 z-0">
                      <div 
                        className={`absolute inset-0 bg-gradient-to-b from-emerald-500 to-cyan-500 transition-all duration-500 origin-top ${
                          idx < activeStep ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                        }`}
                      />
                    </div>
                  )}

                  {/* Step Card */}
                  <button
                    onClick={() => setActiveStep(idx)}
                    className={`w-full text-left relative z-10 p-4 rounded-xl border transition-all duration-300 flex items-start gap-4 cursor-pointer ${
                      isActive
                        ? "bg-slate-900/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                        : "bg-slate-950/20 border-slate-900 hover:bg-slate-900/30 hover:border-slate-800"
                    }`}
                  >
                    {/* Icon Container with state-dependent colors */}
                    <div 
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                          : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-mono tracking-wider font-semibold uppercase ${
                          isActive ? "text-emerald-400" : "text-slate-500"
                        }`}>
                          STEP 0{s.step}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-850 text-slate-400">
                          {s.badge}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold transition-colors ${
                        isActive ? "text-slate-100" : "text-slate-400"
                      }`}>
                        {s.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                        {s.subtitle}
                      </p>
                    </div>
                  </button>

                  {/* Mobile Inline Details View */}
                  {isActive && (
                    <div className="lg:hidden mt-3 mb-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3 z-20 relative">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">
                          {currentStep.badge} DETAILED VIEW
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Mode: {viewMode === "conceptual" ? "Conceptual" : "Math"}
                        </span>
                      </div>

                      {/* Formula display for math mode */}
                      {viewMode === "mathematical" && (
                        <div className="py-2.5 px-3 bg-slate-950 border border-slate-900 rounded-lg overflow-x-auto text-center">
                          {renderFormula(currentStep.formula)}
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {viewMode === "conceptual" ? currentStep.conceptual : currentStep.mathematical}
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block font-semibold">
                          Key Mechanics:
                        </span>
                        {currentStep.physicsDetails.map((detail, dIdx) => (
                          <div key={dIdx} className="flex items-start gap-2 text-xs text-slate-400">
                            <span className="mt-1 text-emerald-400 text-[10px]">●</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Desktop Deep-Dive Inspector (hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col bg-slate-900/30 border border-slate-900 rounded-xl p-6 relative overflow-hidden h-full min-h-[380px] justify-between">
            {/* Background grid detail */}
            <div className="absolute inset-0 bg-slate-950/20 grid grid-cols-6 grid-rows-6 opacity-30 pointer-events-none">
              <div className="border-r border-b border-slate-800/20" />
              <div className="border-r border-b border-slate-800/20" />
              <div className="border-r border-b border-slate-800/20" />
              <div className="border-r border-b border-slate-800/20" />
              <div className="border-r border-b border-slate-800/20" />
              <div className="border-b border-slate-800/20" />
            </div>

            <div className="relative z-10 space-y-4">
              {/* Card Meta */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-emerald-400 uppercase bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded">
                  {currentStep.badge} Inspector
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  SYSTEM STATUS // STABLE
                </span>
              </div>

              {/* Step Header */}
              <div className="flex items-center gap-4 pt-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 font-sans m-0">
                    {currentStep.title}
                  </h4>
                  <p className="text-xs text-slate-400 m-0 mt-0.5">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>

              {/* Equation Panel */}
              <div className="p-4 bg-slate-950/80 border border-slate-900 rounded-xl flex flex-col justify-center items-center shadow-inner relative overflow-hidden">
                <div className="absolute top-1 right-2 text-[8px] font-mono text-slate-600 uppercase">
                  Operator Equation
                </div>
                <div className="text-slate-100 font-mono text-sm py-2 text-center select-all">
                  {renderFormula(currentStep.formula)}
                </div>
              </div>

              {/* Description Body */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold block">
                  Functional Mechanics
                </span>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  {viewMode === "conceptual" ? currentStep.conceptual : currentStep.mathematical}
                </p>
              </div>

              {/* Detailed Bulletpoints */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold block">
                  Algebraic &amp; Numerical Properties
                </span>
                <div className="space-y-2">
                  {currentStep.physicsDetails.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <div className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer watermark */}
            <div className="pt-4 border-t border-slate-900/60 flex justify-between text-[9px] font-mono text-slate-600 relative z-10">
              <span>MERIDIAN RESEARCH KERNEL V4.1</span>
              <span>GEOMETRIC CLASS-FNO COGNITION</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Render standard beautifully-styled code block
  return (
    <div className="relative group my-6 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden font-mono shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <FileCode2 className="w-3.5 h-3.5 text-cyan-500" />
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 px-2.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto max-w-full text-xs text-slate-300 leading-relaxed font-mono select-all select-text">
        <pre className="m-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export const MathRenderer: React.FC<MathRendererProps> = ({ text }) => {
  if (!text) return null;

  // Clean up escaped characters, literal backslash-n, and escaped quotes
  const cleanText = text
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');

  // Pre-extract all code blocks (delimited by ``` ... ```)
  const codeBlocks: { id: string; lang: string; code: string }[] = [];
  let textForMath = "";
  let lastCodeIndex = 0;
  let codeCount = 0;
  // Match standard markdown code blocks, including potential carriage returns
  const codeRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n\s*```/g;
  let codeMatch;

  while ((codeMatch = codeRegex.exec(cleanText)) !== null) {
    const lang = codeMatch[1] || "";
    const code = codeMatch[2];
    const id = `___CODE_BLOCK_PLACEHOLDER_${codeCount}___`;
    codeBlocks.push({ id, lang, code });
    
    textForMath += cleanText.substring(lastCodeIndex, codeMatch.index) + "\n" + id + "\n";
    lastCodeIndex = codeRegex.lastIndex;
    codeCount++;
  }
  textForMath += cleanText.substring(lastCodeIndex);

  // Pre-extract all multi-line and single-line block math (delimited by $$ ... $$)
  const blockMaths: { id: string; html: string }[] = [];
  let preprocessedText = "";
  let lastBlockIndex = 0;
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let blockMatch;
  let blockCount = 0;

  while ((blockMatch = blockRegex.exec(textForMath)) !== null) {
    const content = blockMatch[1];
    let renderedHtml = "";
    try {
      renderedHtml = katex.renderToString(content.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch (err) {
      console.error("KaTeX block error:", err);
      renderedHtml = `<pre class="text-red-500 text-center my-4">$$\n${content}\n$$</pre>`;
    }
    
    const id = `___BLOCK_MATH_PLACEHOLDER_${blockCount}___`;
    blockMaths.push({ id, html: renderedHtml });
    
    preprocessedText += textForMath.substring(lastBlockIndex, blockMatch.index) + id;
    lastBlockIndex = blockRegex.lastIndex;
    blockCount++;
  }
  preprocessedText += textForMath.substring(lastBlockIndex);

  const parseMarkdownFormatting = (text: string): React.ReactNode[] => {
    const regex = /(`[^`\n]+`|\*\*([^*]+)\*\*|__([^_]+)__|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      
      if (fullMatch.startsWith("`") && fullMatch.endsWith("`")) {
        const codeText = fullMatch.slice(1, -1);
        parts.push(
          <code key={`code-${matchIndex}`} className="px-1.5 py-0.5 font-mono text-xs bg-slate-100 rounded text-slate-800">
            {codeText}
          </code>
        );
      } else if (fullMatch.startsWith("**") && fullMatch.endsWith("**")) {
        const boldText = match[2];
        parts.push(<strong key={`bold-${matchIndex}`} className="font-bold text-slate-900">{boldText}</strong>);
      } else if (fullMatch.startsWith("__") && fullMatch.endsWith("__")) {
        const boldText = match[3];
        parts.push(<strong key={`bold-${matchIndex}`} className="font-bold text-slate-900">{boldText}</strong>);
      } else if (fullMatch.startsWith("[") && fullMatch.includes("](")) {
        const linkText = match[4];
        const linkUrl = match[5];
        parts.push(
          <a 
            key={`link-${matchIndex}`} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-cyan-600 hover:text-cyan-800 underline inline-flex items-center gap-0.5 font-medium transition-colors"
          >
            {linkText}
          </a>
        );
      } else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
        const italicText = match[6];
        parts.push(<em key={`italic-${matchIndex}`} className="italic text-slate-800">{italicText}</em>);
      } else if (fullMatch.startsWith("_") && fullMatch.endsWith("_")) {
        const italicText = match[7];
        parts.push(<em key={`italic-${matchIndex}`} className="italic text-slate-800">{italicText}</em>);
      } else {
        parts.push(fullMatch);
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  const renderInlineMathAndText = (plainText: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\$([^\$\n]+?)\$/g;
    let match;
    
    while ((match = regex.exec(plainText)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      const content = match[1];
      
      if (matchIndex > lastIndex) {
        parts.push(...parseMarkdownFormatting(plainText.substring(lastIndex, matchIndex)));
      }
      
      if (isMath(content)) {
        try {
          const html = katex.renderToString(content.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          parts.push(
            <span
              key={`inline-${matchIndex}`}
              className="inline-block px-1 font-mono text-slate-900"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (err) {
          console.error("KaTeX inline error:", err);
          parts.push(<code key={`inline-err-${matchIndex}`} className="text-red-500">${content}$</code>);
        }
      } else {
        parts.push(...parseMarkdownFormatting(fullMatch));
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < plainText.length) {
      parts.push(...parseMarkdownFormatting(plainText.substring(lastIndex)));
    }
    
    return parts;
  };

  const renderLine = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const placeholderRegex = /___BLOCK_MATH_PLACEHOLDER_(\d+)___/g;
    let match;
    
    while ((match = placeholderRegex.exec(line)) !== null) {
      const matchIndex = match.index;
      const placeholderIndex = parseInt(match[1], 10);
      const mathObj = blockMaths[placeholderIndex];
      
      if (matchIndex > lastIndex) {
        const textBefore = line.substring(lastIndex, matchIndex);
        parts.push(...renderInlineMathAndText(textBefore));
      }
      
      parts.push(
        <div
          key={`block-placeholder-${matchIndex}`}
          className="my-6 w-full overflow-x-auto py-2 text-slate-800"
          dangerouslySetInnerHTML={{ __html: mathObj.html }}
        />
      );
      
      lastIndex = placeholderRegex.lastIndex;
    }
    
    if (lastIndex < line.length) {
      const textAfter = line.substring(lastIndex);
      parts.push(...renderInlineMathAndText(textAfter));
    }
    
    return parts;
  };

  // Split content by newlines and collapse multiple consecutive empty lines
  const rawParagraphs = preprocessedText.split("\n");
  const paragraphs: string[] = [];
  let lastWasEmpty = false;
  
  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) {
      if (!lastWasEmpty) {
        paragraphs.push("");
        lastWasEmpty = true;
      }
    } else {
      paragraphs.push(p);
      lastWasEmpty = false;
    }
  }

  // Define types for structured block rendering
  interface Block {
    type: "heading" | "horizontal-rule" | "list-unordered" | "list-ordered" | "blockquote" | "paragraph" | "empty" | "code-block";
    level?: number;
    content: string;
    items?: string[];
  }

  const blocks: Block[] = [];
  let currentList: { type: "unordered" | "ordered"; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type === "unordered" ? "list-unordered" : "list-ordered",
        content: "",
        items: currentList.items
      });
      currentList = null;
    }
  };

  for (const p of paragraphs) {
    const trimmed = p.trim();
    
    if (!trimmed) {
      flushList();
      blocks.push({ type: "empty", content: "" });
      continue;
    }

    // Check if it is a code block placeholder
    if (trimmed.startsWith("___CODE_BLOCK_PLACEHOLDER_")) {
      flushList();
      blocks.push({ type: "code-block", content: trimmed });
      continue;
    }

    // Check for headings: e.g. #, ##, ###, ####, followed by optional commas, spaces, and text
    const headingMatch = trimmed.match(/^(#{1,4})\s*,?\s*(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      let content = headingMatch[2].trim();
      
      // Clean up any leading/trailing commas or junk from heading content
      content = content.replace(/^,\s*/, "").replace(/,$/, "").trim();
      
      if (content) {
        blocks.push({ type: "heading", level, content });
      } else {
        blocks.push({ type: "paragraph", content: trimmed });
      }
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "horizontal-rule", content: trimmed });
      continue;
    }

    // Unordered list item: starts with "- " or "* "
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemContent = trimmed.substring(2).trim();
      if (currentList && currentList.type === "unordered") {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { type: "unordered", items: [itemContent] };
      }
      continue;
    }

    // Ordered list item: starts with digits followed by dot and space (e.g., "1. ")
    const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (orderedMatch) {
      const itemContent = orderedMatch[2].trim();
      if (currentList && currentList.type === "ordered") {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { type: "ordered", items: [itemContent] };
      }
      continue;
    }

    // Blockquote: starts with "> "
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push({ type: "blockquote", content: trimmed.substring(2).trim() });
      continue;
    }

    // Normal paragraph
    flushList();
    blocks.push({ type: "paragraph", content: p });
  }
  flushList();

  return (
    <div className="academic-body text-slate-700 leading-relaxed space-y-4">
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case "empty":
            return <div key={`empty-${bIdx}`} className="h-4" />;
            
          case "code-block": {
            const match = block.content.match(/___CODE_BLOCK_PLACEHOLDER_(\d+)___/);
            if (!match) return null;
            const codeIndex = parseInt(match[1], 10);
            const blockObj = codeBlocks[codeIndex];
            if (!blockObj) return null;

            return (
              <CustomCodeOrDiagram 
                key={`code-${bIdx}`}
                lang={blockObj.lang}
                code={blockObj.code}
              />
            );
          }

          case "heading": {
            const level = block.level || 3;
            if (level === 1) {
              return (
                <h1 key={`h1-${bIdx}`} className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-12 mb-6 tracking-tight border-b border-slate-100 pb-3">
                  {renderLine(block.content)}
                </h1>
              );
            }
            if (level === 2) {
              return (
                <h2 key={`h2-${bIdx}`} className="text-2xl md:text-3xl font-bold text-slate-900 mt-10 mb-4 font-display tracking-tight border-b border-slate-100 pb-2">
                  {renderLine(block.content)}
                </h2>
              );
            }
            if (level === 3) {
              return (
                <h3 key={`h3-${bIdx}`} className="text-xl md:text-2xl font-bold text-slate-900 mt-8 mb-4 font-display tracking-tight border-b border-slate-100 pb-2 flex items-center">
                  {renderLine(block.content)}
                </h3>
              );
            }
            return (
              <h4 key={`h4-${bIdx}`} className="text-lg md:text-xl font-bold text-slate-900 mt-6 mb-3 tracking-tight">
                {renderLine(block.content)}
              </h4>
            );
          }
          
          case "horizontal-rule":
            return <hr key={`hr-${bIdx}`} className="my-8 border-slate-200" />;
            
          case "list-unordered":
            return (
              <ul key={`ul-${bIdx}`} className="list-disc pl-6 space-y-2 my-4">
                {(block.items || []).map((item, iIdx) => (
                  <li key={`li-${iIdx}`} className="text-slate-700">{renderLine(item)}</li>
                ))}
              </ul>
            );
            
          case "list-ordered":
            return (
              <ol key={`ol-${bIdx}`} className="list-decimal pl-6 space-y-2 my-4">
                {(block.items || []).map((item, iIdx) => (
                  <li key={`li-${iIdx}`} className="text-slate-700">{renderLine(item)}</li>
                ))}
              </ol>
            );
            
          case "blockquote":
            return (
              <blockquote key={`quote-${bIdx}`} className="border-l-4 border-cyan-500 bg-slate-50 pl-4 py-3 pr-3 my-4 rounded-r-md italic text-slate-600 font-sans">
                {renderLine(block.content)}
              </blockquote>
            );
            
          case "paragraph":
          default:
            return (
              <div key={`p-${bIdx}`} className="mb-4 leading-relaxed">
                {renderLine(block.content)}
              </div>
            );
        }
      })}
    </div>
  );
};
