import fs from "fs";
import path from "path";

async function pullProdBlogs() {
  const prodUrl = process.env.PROD_URL || "https://ask-meridian.uk/api/blogs";
  console.log(`[Sync] Fetching published articles from ${prodUrl}...`);

  try {
    const res = await fetch(prodUrl, {
      headers: { "User-Agent": "Meridian-AIStudio-CLI-Sync" },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`Production server returned status HTTP ${res.status}`);
    }

    const data = await res.json();
    const blogs = data.blogs || [];

    if (!Array.isArray(blogs) || blogs.length === 0) {
      throw new Error("No articles returned from production.");
    }

    console.log(`[Sync] Received ${blogs.length} articles from production.`);

    // 1. Write custom_blogs.json
    const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
    fs.writeFileSync(customBlogsPath, JSON.stringify(blogs, null, 2), "utf-8");
    console.log(`[Sync] Updated ${customBlogsPath}`);

    // 2. Write src/data.ts
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
    console.log(`[Sync] Updated ${dataTsPath}`);

    console.log(`[Sync] Complete! AI Studio workspace is now 100% matched with production (${blogs.length} articles).`);
  } catch (err) {
    console.error(`[Sync] Failed to sync articles from production:`, err.message || err);
    process.exit(1);
  }
}

pullProdBlogs();
