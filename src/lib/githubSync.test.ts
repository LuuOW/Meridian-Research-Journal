import test from "node:test";
import assert from "node:assert";
import {
  getGitHubSyncConfig,
  generateDataTsContent,
  commitFilesAtomicallyToGitHub,
  commitFileWithAutoShaRetry
} from "./githubSync.js";
import { BlogPost } from "../types";

const mockBlogs: BlogPost[] = [
  {
    id: "quantum-optics-2026",
    title: "Quantum Frequency Combs in Microresonators",
    slug: "quantum-frequency-combs",
    excerpt: "Soliton dynamics and Kerr nonlinearity in integrated silicon nitride waveguides.",
    content: "# Soliton Microcombs\n\nMode-locked optical frequency combs provide chip-scale metrology.",
    author: "Lucas Kempe",
    tags: ["Quantum", "Photonics", "Nonlinear Optics"],
    arxivLink: "https://arxiv.org/abs/2608.12345",
    date: "2026-08-14",
    readingTime: "6 min read",
    bannerSvg: "<svg viewBox=\"0 0 800 400\"><circle cx=\"400\" cy=\"200\" r=\"50\" fill=\"#00f\"/></svg>"
  },
  {
    id: "topological-insulator-2026",
    title: "Floquet Topological Insulators Under Ultrafast Laser Driving",
    slug: "floquet-topological-insulators",
    excerpt: "Non-equilibrium phase transitions and protected chiral edge modes.",
    content: "# Floquet Engineering\n\nPeriodic driving opens nontrivial topological band gaps.",
    author: "Lucas Kempe",
    tags: ["Condensed Matter", "Topology"],
    arxivLink: "https://arxiv.org/abs/2608.54321",
    date: "2026-08-12",
    readingTime: "8 min read",
    bannerSvg: "<svg viewBox=\"0 0 800 400\"><rect width=\"800\" height=\"400\" fill=\"#111\"/></svg>"
  }
];

test("getGitHubSyncConfig resolves default repository and branch", () => {
  const config = getGitHubSyncConfig();
  assert.ok(typeof config.repo === "string");
  assert.ok(config.repo.length > 0);
  assert.strictEqual(config.branch, "main");
  assert.ok(typeof config.configured === "boolean");
  assert.strictEqual(config.authorName, "Meridian Research");
});

test("generateDataTsContent produces valid TypeScript code with imports and PRELOADED_BLOGS", () => {
  const tsCode = generateDataTsContent(mockBlogs);
  
  assert.ok(tsCode.includes('import { BlogPost } from "./types";'));
  assert.ok(tsCode.includes('import { ensureAnimatedSvg } from "./lib/svgUtils";'));
  assert.ok(tsCode.includes('export const PRELOADED_BLOGS: BlogPost[] ='));
  assert.ok(tsCode.includes("Quantum Frequency Combs in Microresonators"));
  assert.ok(tsCode.includes("Floquet Topological Insulators Under Ultrafast Laser Driving"));
});

test("generateDataTsContent correctly serializes JSON payload without syntax errors", () => {
  const tsCode = generateDataTsContent(mockBlogs);
  
  // Extract JSON payload between RAW_PRELOADED_BLOGS: BlogPost[] = and const today =
  const jsonMatch = tsCode.match(/const RAW_PRELOADED_BLOGS: BlogPost\[\] =\s*(\[[\s\S]*?\]);\s*const today/);
  assert.ok(jsonMatch, "Should locate RAW_PRELOADED_BLOGS JSON array in generated TS");
  
  const parsed = JSON.parse(jsonMatch[1]);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].id, "quantum-optics-2026");
  assert.strictEqual(parsed[1].id, "topological-insulator-2026");
});

test("generateDataTsContent escapes and handles multi-line content safely", () => {
  const complexBlog: BlogPost = {
    id: "latex-escape-test",
    title: 'Testing "Quotes" & Special <Characters> \\LaTeX',
    slug: "testing-quotes-latex",
    excerpt: "Line 1\nLine 2\n$$H = \\hbar \\omega (a^\\dagger a + 1/2)$$",
    content: "```typescript\nconsole.log(\"Hello\");\n```\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$",
    author: "Lucas Kempe",
    tags: ["Test", "LaTeX"],
    arxivLink: "https://arxiv.org/abs/2608.11111",
    date: "2026-08-17",
    readingTime: "4 min read",
    bannerSvg: "<svg><text>Special &amp; Entity</text></svg>"
  };

  const tsCode = generateDataTsContent([complexBlog]);
  assert.ok(tsCode.includes("latex-escape-test"));
  assert.ok(tsCode.includes("Testing \\\"Quotes\\\""));
});

test("commitFilesAtomicallyToGitHub gracefully handles invalid tokens or network errors without crashing", async () => {
  const result = await commitFilesAtomicallyToGitHub({
    owner: "LuuOW",
    repo: "Meridian-Research-Journal",
    branch: "main",
    files: [{ path: "test.json", content: "{}" }],
    message: "test commit",
    token: "invalid_test_token_123",
    authorName: "Test Bot",
    authorEmail: "bot@test.com"
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.error !== undefined);
  assert.ok(typeof result.error === "string");
});

test("commitFileWithAutoShaRetry handles failure gracefully with invalid credentials", async () => {
  const result = await commitFileWithAutoShaRetry({
    owner: "LuuOW",
    repo: "Meridian-Research-Journal",
    branch: "main",
    filePath: "nonexistent.json",
    content: "{}",
    message: "test",
    token: "invalid_test_token_123",
    authorName: "Test",
    authorEmail: "test@test.com"
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.error !== undefined);
});
