import fs from "fs";
import path from "path";

async function runCorpusKeywordAudit() {
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    console.error("Error: XAI_API_KEY / GROK_API_KEY is missing from environment.");
    process.exit(1);
  }

  // 1. Ingest all published articles
  const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  const blogs = JSON.parse(fs.readFileSync(customBlogsPath, "utf-8"));

  console.log(`[xAI Audit Engine] Ingested ${blogs.length} published articles from ${customBlogsPath}`);

  // Prepare structured ingest data
  const ingestCorpus = blogs.map((b, idx) => ({
    index: idx + 1,
    id: b.id,
    arxivLink: b.arxivLink || "N/A",
    title: b.title,
    date: b.date,
    tags: b.tags || [],
    excerpt: b.excerpt ? b.excerpt.slice(0, 220) : "",
    slug: b.slug || b.id
  }));

  // 2. Prepare algorithmic code context for the audit
  const codeContext = {
    currentDailyQueryUrl: "https://export.arxiv.org/api/query?search_query=cat:physics.optics+OR+cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=30",
    currentFallbackScrapeUrls: [
      "https://arxiv.org/list/physics.optics/recent",
      "https://arxiv.org/list/quant-ph/recent"
    ],
    currentCategoryBalanceAlgorithm: `
function analyzeCorpusHistory(allBlogs) {
  let opticsCount = 0, quantPhCount = 0;
  validBlogs.forEach(blog => {
    const text = (blog.title + " " + blog.excerpt + " " + blog.tags.join(" ")).toLowerCase();
    const isOptics = text.includes("optics") || text.includes("photonic") || text.includes("laser") || text.includes("waveguide") || text.includes("metasurface") || text.includes("interferom");
    const isQuantPh = text.includes("quantum") || text.includes("qubit") || text.includes("entangle") || text.includes("superconduct") || text.includes("hamiltonian") || text.includes("topolog");
    if (isOptics && !isQuantPh) opticsCount++;
    else if (isQuantPh && !isOptics) quantPhCount++;
    else { opticsCount += 0.5; quantPhCount += 0.5; }
  });
  const recommendedCategory = opticsRatio <= quantPhRatio ? "physics.optics" : "quant-ph";
  return { opticsRatio, quantPhRatio, recommendedCategory };
}
    `,
    currentScoringAlgorithm: `
function scoreArxivCandidate(paper, corpus, existingArxivIds) {
  // Disqualifications: blocklist check, already published (-100), purely non-physics (-1000), neither optics nor quant-ph (-500)
  let score = 50; // Base score
  if (category === corpus.recommendedCategory) score += 20; // Category balance bonus
  if (hasMathRigors) score += 15; // Hamiltonian, eigenvalue, operator, manifold, etc.
  if (hasBreakthroughKeywords) score += 12; // topological, squeezed, non-hermitian, berry phase, etc.
  if (overlapsWithLast5Titles) score -= 15; // Penalize recent repetition
  if (summaryLength > 300) score += 10;
  return { score, category };
}
    `
  };

  const auditPrompt = `
You are Grok, xAI's leading scientific reasoning and research evaluation engine, serving as the Lead Theoretical Physicist and Autonomous Ingestion Auditor for Meridian (a specialized academic publication tracking optics and quantum physics).

You are conducting an EXTENSIVE, EXHAUSTIVE, MATHEMATICALLY RIGOROUS AUDIT of the mechanisms and algorithms used when choosing search keywords, category recommendations, and candidate selection queries for arXiv preprints each day across both categories:
1. "physics.optics" (Optics, Photonics, Waveguides, Metasurfaces, Non-Hermitian Optics)
2. "quant-ph" (Quantum Physics, Quantum Information, Quantum States, Many-Body Systems, Quantum Optics)

We are providing you with the ENTIRE PUBLISHED CORPUS of Meridian (${ingestCorpus.length} articles) as the foundational ingest dataset, alongside the exact TypeScript algorithms currently executing in production.

---
### INGEST DATA: ALL ${ingestCorpus.length} PUBLISHED MERIDIAN ARTICLES
${JSON.stringify(ingestCorpus, null, 2)}

---
### CURRENT RECRUITMENT & QUERY ALGORITHMS IN PRODUCTION
${JSON.stringify(codeContext, null, 2)}

---
### AUDIT DIRECTIVES & REQUIRED SECTIONS:

Please deliver an in-depth, authoritative, publication-grade scientific audit report organized into the following comprehensive sections:

1. **EXECUTIVE CORPUS INGEST & TOPICAL TAXONOMY AUDIT**
   - Deep structural analysis of the 114 published articles.
   - Exact breakdown of thematic clusters in "physics.optics" vs "quant-ph" vs intersectional/hybrid topics.
   - Mathematical and physical sophistication profile (e.g., differential geometry, topology, open quantum systems, non-Hermitian spectral theory, quantum state tomography).
   - Identification of saturated sub-topics (e.g., topics that appear frequently) vs critical blind spots / frontier domains that have been neglected.

2. **ROOT-CAUSE AUDIT OF THE QUERY GENERATION MECHANISM & ALGORITHMIC BOTTLENECKS**
   - Critical evaluation of the current arXiv query:
     \`cat:physics.optics+OR+cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=30\`
   - Why relying solely on \`cat:\` without subfield-specific semantic keywords exposes the pipeline to:
     a) Cross-listed noise and predatory/parasite preprints (such as computer science / machine learning / LLM evaluation preprints cross-listed or fetched via loose searches).
     b) Volume truncation: arXiv publishes 50-100+ papers/day in these categories; a static \`max_results=30\` without keyword targeting samples only a tiny arbitrary slice.
     c) Subfield starvation: how specific vital frontiers get missed when querying without targeted subfield tokens.
   - Analysis of \`analyzeCorpusHistory()\`: Limitations of naive substring matching (\`laser\`, \`qubit\`, \`photonic\`) for high-level research categorization.
   - Analysis of \`scoreArxivCandidate()\`: Vulnerabilities in the +20/-15 heuristic weighting system.

3. **CATEGORY-BY-CATEGORY KEYWORD & SEMANTIC MATRIX SPECIFICATION**
   - Provide a mathematically precise, multi-tier keyword architecture tailored specifically to the Meridian corpus for:
     A. **physics.optics Category Keyword Clusters**:
        - Cluster 1: Topological Photonics & Berry Curvature
        - Cluster 2: Non-Hermitian Optics & Bound States in the Continuum (BICs)
        - Cluster 3: Metasurfaces, Chiral Light-Matter & Polaritonics
        - Cluster 4: Structured Beams, Phase Singularities & Waveguide Dynamics
        - Cluster 5: Microcavity QED & Nonlinear Optics
     B. **quant-ph Category Keyword Clusters**:
        - Cluster 1: Quantum State Tomography & Measurement Bases
        - Cluster 2: Many-Body Entanglement & Quantum Circuit Complexity
        - Cluster 3: Continuous-Variable Quantum Information & Squeezed States
        - Cluster 4: Open Quantum Systems, Dissipation & Non-Hermitian Hamiltonians
        - Cluster 5: Rydberg Sensors, Quantum Metrology & Cavity Optomechanics
   - Include exact Boolean query patterns, primary category constraints, and negative constraint filters (e.g. \`ANDNOT\` cs.AI, cs.LG, etc.).

4. **DYNAMIC CORPUS-AWARE DAILY QUERY ALGORITHM (MATHEMATICAL FORMULATION)**
   - Propose a mathematical and algorithmic specification for how daily query keywords should be dynamically synthesized each morning:
     - Vector/embedding or TF-IDF/thematic distance from recent published papers.
     - Inverse topic frequency / novelty boost: prioritizing underrepresented subfields while preventing repetitive cluster fatigue.
     - Day-of-week thematic schedule or adaptive rotation between fundamental theoretical physics and experimental photonics.
     - Hard gate invariants: category validation, negative term sanitization, KaTeX equation density heuristics.

5. **CONCRETE RECOMMENDATIONS & ACTION PLAN FOR MERIDIAN'S CODEBASE**
   - Specific actionable code adjustments for \`DailyScheduleDaemon.ts\`, \`dailyEditorialEngine.ts\`, and the arXiv pipeline.

Execute this audit with the highest degree of theoretical rigor, citing specific papers and trends from the ingest data.
`;

  console.log("[xAI Audit Engine] Calling xAI Grok API (grok-4.20-0309-non-reasoning)...");
  
  const startTime = Date.now();
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.20-0309-non-reasoning",
      messages: [
        {
          role: "system",
          content: "You are Grok, an expert autonomous theoretical physicist and AI systems architect auditing academic ingestion pipelines for quantum physics and optics journals.",
        },
        {
          role: "user",
          content: auditPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  const durationMs = Date.now() - startTime;
  console.log(`[xAI Audit Engine] xAI API responded in ${durationMs}ms with HTTP ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API call failed: HTTP ${response.status} - ${errorText}`);
  }

  const rawData = await response.json();
  const content = rawData.choices?.[0]?.message?.content || "";
  const usage = rawData.usage;

  console.log(`[xAI Audit Engine] Audit completed successfully! Tokens used: Prompt=${usage?.prompt_tokens}, Completion=${usage?.completion_tokens}, Total=${usage?.total_tokens}`);

  // Save audit output to files
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const reportPath = path.join(dataDir, "xai_keyword_query_audit_report.md");
  fs.writeFileSync(reportPath, content, "utf-8");
  console.log(`[xAI Audit Engine] Full report written to ${reportPath}`);

  const metaPath = path.join(dataDir, "xai_keyword_query_audit_meta.json");
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        model: "grok-4.20-0309-non-reasoning",
        articlesIngested: ingestCorpus.length,
        durationMs,
        usage,
        reportPath,
      },
      null,
      2
    ),
    "utf-8"
  );

  return { content, usage, reportPath };
}

runCorpusKeywordAudit()
  .then((res) => {
    console.log("=== AUDIT SUMMARY PREVIEW ===");
    console.log(res.content.slice(0, 1500));
    console.log("...\n[Preview truncated for CLI log]");
  })
  .catch((err) => {
    console.error("[xAI Audit Engine] Error executing audit:", err);
    process.exit(1);
  });
