import { test } from "node:test";
import assert from "node:assert";
import { generateScientificArticleFromArxiv, createBespokeExcerpt, cleanLatexForPlainText } from "./paperGenerationEngine";
import { generateCorpusBannerSvg, classifyArticleArchetype, deriveCorpusProfile } from "./corpusBannerAlgorithm";

test("Manual Generation: D-Meson neutrinophilic scalar (arXiv:2610.08606) produces accurate collider kinematics", () => {
  const title = "Missing Mass Matters: Neutrinophilic Scalar in $D$-Meson Decays";
  const abstract = "A light neutrinophilic scalar φ, which couples predominantly to neutrinos, can be probed through leptonic meson decays for scalar masses 10 MeV ≲ m_φ ≲ 100 MeV. We study neutrinophilic-scalar emission in D-meson decays at BESIII and the future Super Tau-Charm Facility (STCF), focusing on D^+ -> e^+ nu_bar_alpha phi. Accounting for the m_φ-dependent missing-mass squared (M_miss^2) distribution within the experimentally selected region, we find the resulting D^+ constraint to be substantially weaker than previous estimates based on the integrated three-body decay rate.";
  
  const article = generateScientificArticleFromArxiv(title, abstract, "https://arxiv.org/abs/2610.08606", "Jin-Man Cai, Gang Li", 101);
  
  // Verify content has domain-specific mathematical formulation, not Cherenkov or Frank-Tamm
  assert.ok(article.content.includes("M^2_{\\text{miss}}") || article.content.includes("M_{\\rm miss}^2") || article.content.includes("missing-mass"), "Must contain missing-mass squared formula");
  assert.ok(article.content.includes("STCF") || article.content.includes("BESIII"), "Must reference STCF or BESIII");
  assert.strictEqual(article.content.includes("Frank-Tamm"), false, "Must NOT contain unrelated Frank-Tamm relation");
  assert.strictEqual(article.content.includes("MCP-PMT matrix yields a 59% enhancement"), false, "Must NOT contain hardcoded water Cherenkov detector template");
  
  // Verify bespoke excerpt does not contain generic boilerplate
  assert.strictEqual(article.excerpt.includes("transformative implications of"), false, "Must not contain template boilerplate in excerpt");
  assert.ok(article.excerpt.length > 35, "Excerpt must be substantial");

  // Verify banner archetype is MESON_DECAY_AND_COLLIDER_PHYSICS
  const archetype = classifyArticleArchetype(article);
  assert.strictEqual(archetype, "MESON_DECAY_AND_COLLIDER_PHYSICS");
  
  const banner = generateCorpusBannerSvg(article, [], 101);
  assert.ok(banner.includes("STCF / BESIII"), "Banner must render STCF / BESIII vertex geometry");
  assert.ok(banner.includes("PRECISION FLAVOR & MESON DECAYS"), "Banner must render precision flavor badge");
});

test("Manual Generation: Fermion electromagnetic moments (arXiv:2610.09974) produces one-loop dipole formulations", () => {
  const title = "General one-loop expressions for the diagonal and transition electromagnetic moments of spin-1/2 fermions";
  const abstract = "Electrically neutral spin-1/2 fermions can interact via Yukawa or gauge couplings with electrically charged particles, leading to quantum-induced couplings between the neutral fermion and the photon. In this paper, we present general expressions for the diagonal and transition electromagnetic moments of Dirac and Majorana spin-1/2 fermions generated at the one-loop level. We also briefly discuss the implications of these results for several neutral spin-1/2 fermions of phenomenological interest, such as neutral components of SU(2)_L multiplets or Standard Model neutrinos.";
  
  const article = generateScientificArticleFromArxiv(title, abstract, "https://arxiv.org/abs/2610.09974", "Alejandro Ibarra, Merlin Reichard", 202);
  
  // Verify mathematical content
  assert.ok(article.content.includes("Passarino-Veltman") || article.content.includes("F_M(q^2)") || article.content.includes("dipole"), "Must contain loop integral and dipole formulation");
  assert.strictEqual(article.content.includes("Cherenkov"), false, "Must NOT contain Cherenkov detection in loop calculation paper");
  
  // Verify archetype is FERMION_MOMENTS_AND_LOOP_PHYSICS
  const archetype = classifyArticleArchetype(article);
  assert.strictEqual(archetype, "FERMION_MOMENTS_AND_LOOP_PHYSICS");

  const banner = generateCorpusBannerSvg(article, [], 202);
  assert.ok(banner.includes("FERMION MOMENTS & LOOP QED"), "Banner must render loop QED badge");
  assert.ok(banner.includes("ONE-LOOP VERTEX"), "Banner must render one-loop Feynman vertex");
  
  // Verify title wrapping in SVG: long title should wrap across 2 lines without mid-word cutting
  assert.strictEqual(banner.includes("General one-loop expressions for the diagonal and tr..."), false, "Must not cut off words abruptly");
  assert.ok(banner.includes("<text x=\"50\" y=\"324\""), "Must have multi-line title line 1");
  assert.ok(banner.includes("<text x=\"50\" y=\"345\""), "Must have multi-line title line 2");
});

test("Manual Generation: Magnus neutrino probabilities (arXiv:2610.07159) produces Magnus expansion formulation", () => {
  const title = "Magnus: neutrino oscillation probabilities for any Hermitian Hamiltonian, any number of flavors, and any matter profile";
  const abstract = "Interpreting neutrino oscillation measurements requires computing the probability that a neutrino born with one flavor is detected with another. In vacuum and in matter of constant density, this probability has exact formulas. Where the density varies along the path, as in the Earth, the Sun, or a supernova, it does not. We present Magnus, an open-source Python code that avoids these limitations. It uses the Magnus expansion, whose error falls as a high power of its step width and whose cost is set by how fast the density varies, not by how many oscillations the path holds. Magnus accepts any density profile, any number of flavors, and any Hermitian Hamiltonian.";
  
  const article = generateScientificArticleFromArxiv(title, abstract, "https://arxiv.org/abs/2610.07159", "Mauricio Bustamante", 303);
  
  // Verify mathematical content
  assert.ok(article.content.includes("Magnus expansion") || article.content.includes("\\Omega(t)"), "Must contain Magnus expansion formulation");
  assert.strictEqual(article.content.includes("Frank-Tamm"), false, "Must NOT contain Frank-Tamm relation");
  
  // Verify archetype is NEUTRINO_OSCILLATIONS_AND_MATTER
  const archetype = classifyArticleArchetype(article);
  assert.strictEqual(archetype, "NEUTRINO_OSCILLATIONS_AND_MATTER");

  const banner = generateCorpusBannerSvg(article, [], 303);
  assert.ok(banner.includes("NEUTRINO OSCILLATIONS & PROFILES"), "Banner must render neutrino oscillations & profiles badge");
  assert.ok(banner.includes("MAGNUS EXPANSION"), "Banner must render Magnus expansion geometry");
});

test("createBespokeExcerpt cleans LaTeX, avoids template boilerplate, and extracts key thesis", () => {
  const title = "Novel dependence between neutrino mass splittings strongly supported by initial JUNO results";
  const summary = "In the standard three-flavor paradigm, two of the three neutrino mass-squared differences are independent. The existence of an additional dependence between these oscillation parameters was recently predicted on empirical grounds, taking the form $f(\\Delta m^2) = \\sqrt{2}$. The JUNO Collaboration has now reported the most precise measurements to date. We demonstrate that this relation is in excellent agreement with the experimental data.";
  
  const excerpt = createBespokeExcerpt(title, summary);
  assert.strictEqual(excerpt.includes("transformative implications of"), false);
  assert.strictEqual(excerpt.includes("$"), false);
  assert.ok(excerpt.length > 25);
});
