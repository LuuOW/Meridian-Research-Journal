import test from "node:test";
import assert from "node:assert";
import { generateScientificArticleFromArxiv } from "./paperGenerationEngine";

test("generateScientificArticleFromArxiv classifies bound states in continuum domain", () => {
  const title = "Anisotropic Bound States in the Continuum for Subwavelength Grating Waveguides";
  const summary = "We present subwavelength grating (SWG) metamaterials enabling polarization-engineered bound states in continuum (BIC) with ultra-high quality factors.";
  const link = "https://arxiv.org/abs/2608.10001";
  const author = "Dr. Elena Vance";

  const result = generateScientificArticleFromArxiv(title, summary, link, author, 42);

  assert.strictEqual(result.title, title);
  assert.strictEqual(result.arxivLink, link);
  assert.strictEqual(result.author, author);
  assert.ok(result.tags.includes("Bound States in Continuum"));
  assert.ok(result.tags.includes("Anisotropic Metamaterials"));
  assert.ok(result.content.includes("## Key Theoretical Formulations & Anisotropic BIC Physics"));
  assert.ok(result.content.includes("Helmholtz eigenvalue problem"));
  assert.ok(result.content.includes("$$\\bar{\\bar{\\varepsilon}} ="));
  assert.ok(result.content.includes("## Architecture & Metamaterial Engineering Paradigm"));
  assert.ok(result.content.includes("## Key Results & Empirical Findings"));
  assert.ok(result.content.includes("## Scientific Implications & Horizon"));
  assert.ok(result.readingTime.includes("min read"));
});

test("generateScientificArticleFromArxiv classifies QED vacuum non-linearity domain", () => {
  const title = "Probing Vacuum Non-Linearity and Birefringence with Non-Classical Squeezed Photons";
  const summary = "Investigating quantum electrodynamics (QED) photon-photon scattering and vacuum birefringence in relativistic laser fields.";
  const link = "https://arxiv.org/abs/2608.20002";
  const author = "Prof. Marcus Thorne";

  const result = generateScientificArticleFromArxiv(title, summary, link, author, 100);

  assert.ok(result.tags.includes("Quantum Electrodynamics"));
  assert.ok(result.tags.includes("Vacuum Birefringence"));
  assert.ok(result.tags.includes("Squeezed Light"));
  assert.ok(result.content.includes("Euler-Heisenberg effective Lagrangian"));
  assert.ok(result.content.includes("\\mathcal{L}_{\\text{EH}}"));
  assert.ok(result.content.includes("Schwinger"));
  assert.ok(result.content.includes("Heisenberg bound"));
});

test("generateScientificArticleFromArxiv classifies two-photon scattering correction domain", () => {
  const title = "DeepFOCUS: Deep-Brain In Vivo Scattering Correction for Two-Photon Microscopy Beyond 1 mm";
  const summary = "Deep neural spatial modulation corrects optical scattering in biological neural tissue, enabling deep-brain imaging beyond 1 mm cortical depth.";
  const link = "https://arxiv.org/abs/2608.30003";

  const result = generateScientificArticleFromArxiv(title, summary, link, "DeepFOCUS Collaboration", 77);

  assert.ok(result.tags.includes("Two-Photon Microscopy"));
  assert.ok(result.tags.includes("Deep-Brain Imaging"));
  assert.ok(result.tags.includes("Scattering Correction"));
  assert.ok(result.content.includes("Beer-Lambert scattering length"));
  assert.ok(result.content.includes("S_{\\text{2PEF}}"));
  assert.ok(result.content.includes("DeepFOCUS"));
  assert.ok(result.content.includes("hippocampal"));
});

test("generateScientificArticleFromArxiv classifies vanishing distance wavefront shaping domain", () => {
  const title = "Analytical Bounds on Vanishing Distance in Dynamic Wavefront Shaping";
  const summary = "Establishing fundamental boundaries where coherent ballistic transmission vanishes relative to diffuse speckle background noise.";
  const link = "https://arxiv.org/abs/2608.40004";

  const result = generateScientificArticleFromArxiv(title, summary, link, "Optics Group", 12);

  assert.ok(result.tags.includes("Wavefront Shaping"));
  assert.ok(result.tags.includes("Dynamic Scattering"));
  assert.ok(result.tags.includes("Ballistic Boundary"));
  assert.ok(result.content.includes("vanishing distance"));
  assert.ok(result.content.includes("z_{\\text{vanish}}"));
  assert.ok(result.content.includes("speckle"));
});

test("generateScientificArticleFromArxiv classifies topological pseudoangular momentum domain", () => {
  const title = "Pseudoangular Momentum and Valley Polarized Surface Lattice Resonances";
  const summary = "Topological valley polarization and pseudoangular momentum conservation in symmetry-broken honeycomb metasurfaces.";
  const link = "https://arxiv.org/abs/2608.50005";

  const result = generateScientificArticleFromArxiv(title, summary, link, "Nanophotonics Lab", 88);

  assert.ok(result.tags.includes("Surface Lattice Resonances"));
  assert.ok(result.tags.includes("Topological Photonics"));
  assert.ok(result.tags.includes("Pseudoangular Momentum"));
  assert.ok(result.content.includes("Pseudoangular Momentum (PAM)"));
  assert.ok(result.content.includes("Berry curvature"));
  assert.ok(result.content.includes("Chern number"));
});

test("generateScientificArticleFromArxiv classifies fault-tolerant quantum error correction domain", () => {
  const title = "Fault-Tolerant Quantum Circuits via 3D Subsystem Product Codes in Adversarial Regimes";
  const summary = "Constructing 3D subsystem product codes with high threshold and single-shot syndrome extraction under non-Markovian noise.";
  const link = "https://arxiv.org/abs/2608.60006";

  const result = generateScientificArticleFromArxiv(title, summary, link, "Quantum Architectures Group", 99);

  assert.ok(result.tags.includes("Fault-Tolerant Computing"));
  assert.ok(result.tags.includes("Quantum Error Correction"));
  assert.ok(result.tags.includes("Subsystem Product Codes"));
  assert.ok(result.content.includes("Knill-Laflamme error correction condition"));
  assert.ok(result.content.includes("stabilizer group"));
  assert.ok(result.content.includes("threshold"));
});

test("generateScientificArticleFromArxiv handles empty and fallback inputs gracefully", () => {
  const result = generateScientificArticleFromArxiv("", "", "", "");

  assert.ok(result.title.length > 0);
  assert.ok(result.excerpt.length > 0);
  assert.ok(result.readingTime.length > 0);
  assert.ok(result.arxivLink.startsWith("https://"));
  assert.strictEqual(result.author, "Meridian Research");
  assert.ok(result.content.includes("Executive Abstract"));
});

test("generateScientificArticleFromArxiv calculates excerpt and reading time accurately", () => {
  const result = generateScientificArticleFromArxiv("Quantum Paper", "Summary snippet", "https://arxiv.org", "Author");

  assert.ok(result.excerpt.includes("Quantum Paper"));
  assert.ok(result.readingTime.endsWith("min read"));
});
