import test from "node:test";
import assert from "node:assert";
import { loadStoredJobs, saveStoredJobs, createGenerationJob, completeJob, failJob } from "../src/lib/pipelineUtils";
import { generateCorpusBannerSvg } from "../src/lib/corpusBannerAlgorithm";
import { ensureAnimatedSvg } from "../src/lib/svgUtils";
import { readCustomBlogs } from "../src/lib/persistenceManager";
import { resolveBlogSlugOrId } from "../src/lib/slugResolver";

test("loadStoredJobs auto-dismisses finished and stale jobs so badges never linger across days", () => {
  const now = Date.now();
  const mockStorage: Record<string, string> = {};

  // Mock window.localStorage
  const originalWindow = globalThis.window;
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; }
    }
  };

  try {
    const freshGeneratingJob = {
      id: "job-fresh",
      arxivInput: "2610.12345",
      targetTitle: "Fresh Paper",
      status: "generating" as const,
      currentStepIndex: 1,
      currentStepMessage: "Analyzing",
      progressPercent: 30,
      startTime: now - 30 * 1000, // 30s ago
      dismissed: false
    };

    const staleGeneratingJob = {
      id: "job-stale-generating",
      arxivInput: "2610.99999",
      targetTitle: "Old Generating Paper",
      status: "generating" as const,
      currentStepIndex: 2,
      currentStepMessage: "Running",
      progressPercent: 50,
      startTime: now - 24 * 60 * 60 * 1000, // 1 day ago
      dismissed: false
    };

    const staleCompletedJob = {
      id: "job-stale-completed",
      arxivInput: "2610.88888",
      targetTitle: "Completed Days Ago",
      status: "completed" as const,
      currentStepIndex: 4,
      currentStepMessage: "Done",
      progressPercent: 100,
      startTime: now - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      completedTime: now - 3 * 24 * 60 * 60 * 1000,
      dismissed: false
    };

    mockStorage["meridian_generation_pipeline_jobs"] = JSON.stringify([
      freshGeneratingJob,
      staleGeneratingJob,
      staleCompletedJob
    ]);

    const loaded = loadStoredJobs();
    
    // Fresh generating job remains active and NOT dismissed
    const fresh = loaded.find(j => j.id === "job-fresh");
    assert.ok(fresh, "Fresh job should be loaded");
    assert.strictEqual(fresh.dismissed, false, "Fresh job should remain active");

    // Stale generating job must be marked failed AND dismissed
    const staleGen = loaded.find(j => j.id === "job-stale-generating");
    if (staleGen) {
      assert.strictEqual(staleGen.dismissed, true, "Stale generating job must be dismissed");
      assert.strictEqual(staleGen.status, "failed");
    }

    // Stale completed job from days ago must be marked dismissed (or purged)
    const staleComp = loaded.find(j => j.id === "job-stale-completed");
    if (staleComp) {
      assert.strictEqual(staleComp.dismissed, true, "Stale completed job must be dismissed");
    }
  } finally {
    if (originalWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  }
});

test("Manual generation banner synthesis generates elite, animated, ray-traced vector banner", () => {
  const corpus = readCustomBlogs();
  const testArticle = {
    id: "blog-test-neutrino",
    title: "Novel dependence between neutrino mass splittings strongly supported by initial JUNO results",
    excerpt: "Theoretical neutrino mass spectrum constraint supported by JUNO oscillation data.",
    content: "## Neutrino Oscillations and JUNO Measurements\n\n$$\\frac{\\sqrt{\\Delta m^2_{31}}+\\sqrt{\\Delta m^2_{21}}}{\\sqrt{\\Delta m^2_{31}}-\\sqrt{\\Delta m^2_{21}}} = \\sqrt{2}$$",
    tags: ["Neutrino Physics", "Quantum States", "JUNO Experiment"]
  };

  const rawBanner = generateCorpusBannerSvg(testArticle, corpus, 6738);
  const animatedBanner = ensureAnimatedSvg(rawBanner);

  assert.ok(animatedBanner.includes("<svg"), "Banner should be valid SVG");
  assert.ok(animatedBanner.includes("</svg>"), "Banner should end with </svg>");
  assert.ok(animatedBanner.length > 2000, `Banner should be high-fidelity (got ${animatedBanner.length} chars)`);
  assert.ok(animatedBanner.includes("mrd-svg-animations"), "Banner must embed CSS keyframes animation style block");
  assert.ok(animatedBanner.includes("linearGradient"), "Banner must include rich gradients");
  assert.ok(animatedBanner.includes("glow_"), "Banner must include ray-traced glowing optical filters");
});

test("Recovered article novel-dependence-between-neutrino-mass-splittings-strongly-suppor-6738 exists and resolves", () => {
  const blogs = readCustomBlogs();
  const found = resolveBlogSlugOrId("novel-dependence-between-neutrino-mass-splittings-strongly-suppor-6738", blogs);

  assert.ok(found, "Article must be found in custom blogs");
  assert.strictEqual(found.slug, "novel-dependence-between-neutrino-mass-splittings-strongly-suppor-6738");
  assert.ok(found.title.includes("Novel dependence between neutrino mass splittings"));
  assert.ok(found.bannerSvg.includes("<svg") && found.bannerSvg.length > 2000, "Banner must be a full-fledged vector SVG");
  assert.ok(found.bannerSvg.includes("mrd-svg-animations"), "Banner must have embedded animations");
});
