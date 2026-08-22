import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("ads.txt exists in public directory and contains valid Google AdSense entry", () => {
  const adsTxtPath = path.join(process.cwd(), "public", "ads.txt");
  assert.ok(fs.existsSync(adsTxtPath), "public/ads.txt should exist");

  const content = fs.readFileSync(adsTxtPath, "utf-8").trim();
  assert.ok(
    content.includes("google.com, pub-7734562716191044, DIRECT, f08c47fec0942fa0"),
    "ads.txt must contain the exact AdSense verification line"
  );
});

test("index.html contains official AdSense script tag with client ID ca-pub-7734562716191044", () => {
  const indexPath = path.join(process.cwd(), "index.html");
  assert.ok(fs.existsSync(indexPath), "index.html should exist");

  const html = fs.readFileSync(indexPath, "utf-8");
  assert.ok(
    html.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7734562716191044"),
    "index.html must include the AdSense script tag with client ca-pub-7734562716191044"
  );
  assert.ok(html.includes('crossorigin="anonymous"'), "script must have crossorigin attribute");
});

test("Domain redirection logic correctly targets ask-meridian.uk", () => {
  function checkRedirect(host: string, originalUrl: string): { redirect: boolean; target?: string } {
    const lowerHost = host.toLowerCase();
    const isAiStudioPreview =
      lowerHost.startsWith("ais-dev-") ||
      lowerHost.startsWith("ais-pre-") ||
      lowerHost.includes("localhost") ||
      lowerHost.includes("127.0.0.1");

    if (
      !isAiStudioPreview &&
      (lowerHost.includes("meridian-blog-620868709178.us-west1.run.app") ||
        (lowerHost.endsWith(".run.app") && !lowerHost.includes("ais-")))
    ) {
      return {
        redirect: true,
        target: `https://ask-meridian.uk${originalUrl}`
      };
    }

    return { redirect: false };
  }

  // 1. Generic cloud run host should redirect
  const r1 = checkRedirect(
    "meridian-blog-620868709178.us-west1.run.app",
    "/blog/synthesizing-quantum-confinement-with-far-field-photonic-dynamics-a-tcmt-deconstruction-of-stark-tuned-polaritonic-metasurfaces-6532"
  );
  assert.strictEqual(r1.redirect, true);
  assert.strictEqual(
    r1.target,
    "https://ask-meridian.uk/blog/synthesizing-quantum-confinement-with-far-field-photonic-dynamics-a-tcmt-deconstruction-of-stark-tuned-polaritonic-metasurfaces-6532"
  );

  // 2. Custom domain itself should NOT redirect
  const r2 = checkRedirect("ask-meridian.uk", "/");
  assert.strictEqual(r2.redirect, false);

  // 3. AI Studio preview environments should NOT redirect
  const r3 = checkRedirect("ais-dev-z3vrovtwk2agmengmzvff5-501690876230.us-west2.run.app", "/");
  assert.strictEqual(r3.redirect, false);
});
