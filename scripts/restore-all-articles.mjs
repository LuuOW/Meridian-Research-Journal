import fs from "fs";
import path from "path";

function restoreAllArticles() {
  const snapPath = path.join(process.cwd(), "data", "snapshots", "snapshot_1788300423558.json");
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));

  let current = [];
  try {
    current = JSON.parse(fs.readFileSync(path.join(process.cwd(), "custom_blogs.json"), "utf8"));
  } catch (e) {}

  const map = new Map();

  // Add all current first (if any new ones exist)
  for (const b of current) {
    const key = b.slug || b.id || b.title;
    if (key) map.set(key, b);
  }

  // Add all snapshot articles
  for (const b of snap) {
    const key = b.slug || b.id || b.title;
    if (key) {
      if (!map.has(key)) {
        map.set(key, b);
      } else {
        // Merge preferring rich content
        const existing = map.get(key);
        map.set(key, {
          ...b,
          ...existing,
          content: existing.content && existing.content.length > (b.content?.length || 0) ? existing.content : b.content,
          bannerSvg: existing.bannerSvg || b.bannerSvg,
        });
      }
    }
  }

  const allBlogs = Array.from(map.values());

  // Sort by createdAt / date descending
  allBlogs.sort((a, b) => {
    const timeA = a.createdAt || (a.date ? new Date(a.date).getTime() : 0) || 0;
    const timeB = b.createdAt || (b.date ? new Date(b.date).getTime() : 0) || 0;
    return timeB - timeA;
  });

  console.log(`[Restore] Restoring ${allBlogs.length} articles across all tiers...`);

  // 1. Write custom_blogs.json
  const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
  fs.writeFileSync(customBlogsPath, JSON.stringify(allBlogs, null, 2), "utf8");
  console.log(`[Restore] Updated ${customBlogsPath}`);

  // 2. Write src/data.ts
  const dataTsPath = path.join(process.cwd(), "src", "data.ts");
  const dataTsContent = `import { BlogPost } from "./types";
import { ensureAnimatedSvg } from "./lib/svgUtils";

const RAW_PRELOADED_BLOGS: BlogPost[] = ${JSON.stringify(allBlogs, null, 2)};

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
  fs.writeFileSync(dataTsPath, dataTsContent, "utf8");
  console.log(`[Restore] Updated ${dataTsPath}`);

  // 3. Generate comprehensive sitemap.xml
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ask-meridian.uk/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${allBlogs
  .map((blog) => {
    const slug = blog.slug || blog.id;
    const lastmod = blog.date && !isNaN(new Date(blog.date).getTime())
      ? new Date(blog.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    return `  <url>
    <loc>https://ask-meridian.uk/blog/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join("\n")}
</urlset>
`;

  fs.writeFileSync(path.join(process.cwd(), "sitemap.xml"), sitemapXml, "utf8");
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
  console.log(`[Restore] Generated sitemaps with all ${allBlogs.length} articles.`);

  // 4. Save new definitive snapshot
  const snapshotFile = path.join(process.cwd(), "data", "snapshots", `snapshot_${Date.now()}_complete_restore.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify(allBlogs, null, 2), "utf8");
  console.log(`[Restore] Created snapshot: ${snapshotFile}`);
}

restoreAllArticles();
