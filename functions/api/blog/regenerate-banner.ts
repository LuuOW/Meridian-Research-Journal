import { CloudflareEnv, jsonResponse } from "../_utils";
import { generateCorpusBannerSvg } from "../../../src/lib/corpusBannerAlgorithm";
import { ensureAnimatedSvg } from "../../../src/lib/svgUtils";
import { BlogPost } from "../../../src/types";

function encodeBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    // Fallback if Buffer is available
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str, "utf-8").toString("base64");
    }
    return btoa(str);
  }
}

function generateDataTsContent(blogs: BlogPost[]): string {
  return `import { BlogPost } from "./types";
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
}

async function commitFilesToGitHub(params: {
  token: string;
  repo: string;
  branch: string;
  files: { path: string; content: string }[];
  message: string;
  authorName: string;
  authorEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  const { token, repo, branch, files, message, authorName, authorEmail } = params;
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return { success: false, error: "Invalid repository format" };
  }

  for (const file of files) {
    let sha: string | undefined;
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "Meridian-Research-Cloudflare",
            Accept: "application/vnd.github+json"
          }
        }
      );
      if (getRes.ok) {
        const getData: any = await getRes.json();
        sha = getData.sha;
      }
    } catch {}

    const encoded = encodeBase64(file.content);
    const payload: any = {
      message,
      content: encoded,
      branch,
      committer: { name: authorName, email: authorEmail },
      author: { name: authorName, email: authorEmail }
    };
    if (sha) payload.sha = sha;

    try {
      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "Meridian-Research-Cloudflare",
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json"
          },
          body: JSON.stringify(payload)
        }
      );
      if (!putRes.ok) {
        console.warn(`[GitHub Commit] Warning updating ${file.path}: HTTP ${putRes.status}`);
      }
    } catch (err: any) {
      console.warn(`[GitHub Commit] Error committing ${file.path}:`, err?.message);
    }
  }

  return { success: true };
}

export const onRequestPost = async (context: {
  request: Request;
  env: CloudflareEnv;
}) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as {
      blogId?: string;
      title?: string;
      excerpt?: string;
      content?: string;
      tags?: string[];
      seed?: number;
      password?: string;
    };

    const blogId = body?.blogId || "";
    const title = body?.title || "Research Investigation";
    const excerpt = body?.excerpt || "";
    const content = body?.content || "";
    const tags = Array.isArray(body?.tags) ? body.tags : [];
    const seed = (body?.seed ? Number(body.seed) : Date.now()) + Math.floor(Math.random() * 100000);

    // 1. Fetch current corpus
    let corpus: BlogPost[] = [];
    try {
      const url = new URL(request.url);
      const customBlogsUrl = new URL("/custom_blogs.json", url.origin);
      const res = await fetch(customBlogsUrl.toString());
      if (res.ok) {
        const data: any = await res.json();
        corpus = Array.isArray(data) ? data : (data.blogs || []);
      }
    } catch (e) {
      console.warn("Failed to fetch current corpus from custom_blogs.json:", e);
    }

    // 2. Identify target article in corpus or create working object
    let targetIdx = -1;
    if (blogId) {
      targetIdx = corpus.findIndex(
        (b) => b.id === blogId || b.slug === blogId || (b.id && b.id.includes(blogId))
      );
    }
    if (targetIdx === -1 && title) {
      targetIdx = corpus.findIndex(
        (b) => b.title && b.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
    }

    let targetBlog: BlogPost;
    let otherBlogs: BlogPost[] = [];

    if (targetIdx !== -1) {
      targetBlog = {
        ...corpus[targetIdx],
        ...(title ? { title } : {}),
        ...(excerpt ? { excerpt } : {}),
        ...(content ? { content } : {}),
        ...(tags.length > 0 ? { tags } : {})
      };
      otherBlogs = corpus.filter((_, i) => i !== targetIdx);
    } else {
      targetBlog = {
        id: blogId || `blog-${Date.now()}`,
        title,
        excerpt,
        content,
        tags,
        date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        readingTime: "6 min read",
        arxivLink: "",
        slug: blogId || `article-${Date.now()}`,
        author: "Meridian Research Staff",
        bannerSvg: ""
      };
      otherBlogs = corpus;
    }

    // 3. Generate genuine scientific corpus-aware banner SVG
    let cleanSvg = generateCorpusBannerSvg(targetBlog, otherBlogs, seed);
    cleanSvg = ensureAnimatedSvg(cleanSvg);
    targetBlog.bannerSvg = cleanSvg;

    // 4. Update in local corpus array
    if (targetIdx !== -1) {
      corpus[targetIdx] = targetBlog;
    } else {
      corpus.unshift(targetBlog);
    }

    // 5. If GitHub integration is configured on Cloudflare, commit changes directly
    let syncedToGithub = false;
    const token = env.GITHUB_TOKEN || env.GH_TOKEN;
    const repo = env.GITHUB_REPO || env.GITHUB_REPOSITORY || "LuuOW/Meridian-Research-Journal";
    const branch = env.GITHUB_BRANCH || "main";
    const authorName = env.GITHUB_AUTHOR_NAME || "Meridian Research";
    const authorEmail = env.GITHUB_AUTHOR_EMAIL || "bot@ask-meridian.uk";

    if (token) {
      const customBlogsJson = JSON.stringify(corpus, null, 2);
      const dataTsContent = generateDataTsContent(corpus);
      const commitMessage = `feat(artwork): regenerate banner artwork for "${targetBlog.title.slice(0, 50)}" [skip ci]`;

      const commitRes = await commitFilesToGitHub({
        token,
        repo,
        branch,
        files: [
          { path: "custom_blogs.json", content: customBlogsJson },
          { path: "public/custom_blogs.json", content: customBlogsJson },
          { path: "src/data.ts", content: dataTsContent }
        ],
        message: commitMessage,
        authorName,
        authorEmail
      });
      syncedToGithub = commitRes.success;
    }

    return jsonResponse({
      success: true,
      bannerSvg: cleanSvg,
      blog: targetBlog,
      syncedToGithub,
      source: "cloudflare-backend"
    });
  } catch (err: any) {
    console.error("Banner regeneration error:", err);
    return jsonResponse({ error: err?.message || "Banner error" }, 500);
  }
};
