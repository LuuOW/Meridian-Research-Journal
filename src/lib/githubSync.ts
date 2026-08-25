import fs from "fs";
import path from "path";
import { BlogPost } from "../types";

export interface GitHubSyncConfig {
  token: string;
  repo: string; // "owner/repo"
  branch: string;
  authorName: string;
  authorEmail: string;
  configured: boolean;
}

export interface GitHubSyncResult {
  success: boolean;
  message: string;
  filesUpdated: string[];
  commitUrls?: string[];
  timestamp: number;
  error?: string;
}

export function getGitHubSyncConfig(): GitHubSyncConfig {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const rawRepo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || "LuuOW/Meridian-Research-Journal";
  const cleanRepo = rawRepo.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").trim();
  const branch = process.env.GITHUB_BRANCH || "main";
  const authorName = process.env.GITHUB_AUTHOR_NAME || "Meridian Research";
  const authorEmail = process.env.GITHUB_AUTHOR_EMAIL || "bot@ask-meridian.uk";

  return {
    token,
    repo: cleanRepo || "LuuOW/Meridian-Research-Journal",
    branch,
    authorName,
    authorEmail,
    configured: Boolean(token && (cleanRepo || "LuuOW/Meridian-Research-Journal"))
  };
}

/**
 * Regenerates the src/data.ts TypeScript content with all blogs embedded
 */
export function generateDataTsContent(blogs: BlogPost[]): string {
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

/**
 * Updates custom_blogs.json on local disk (without touching src/data.ts during runtime to avoid triggering Vite dev server reloads)
 */
export function writeLocalBlogFiles(blogs: BlogPost[]): boolean {
  try {
    const customBlogsPath = path.join(process.cwd(), "custom_blogs.json");
    fs.writeFileSync(customBlogsPath, JSON.stringify(blogs, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write local blog files:", err);
    return false;
  }
}

/**
 * Fetches the current SHA of a file in the GitHub repository
 */
async function getFileSha(owner: string, repo: string, filePath: string, branch: string, token: string): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Meridian-Research-Sync"
      }
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`GitHub API getFileSha error (${res.status}): ${errorText}`);
      return null;
    }

    const data: any = await res.json();
    return data.sha || null;
  } catch (err) {
    console.error(`Error checking SHA for ${filePath} on GitHub:`, err);
    return null;
  }
}

/**
 * Commits multiple files atomically to GitHub using the Git Data API (Tree + Commit + Ref Update).
 * This eliminates race conditions, blob SHA conflicts, and creates a clean single commit for all updated files.
 */
export async function commitFilesAtomicallyToGitHub(params: {
  owner: string;
  repo: string;
  branch: string;
  files: { path: string; content: string }[];
  message: string;
  token: string;
  authorName: string;
  authorEmail: string;
}): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  const { owner, repo, branch, files, message, token, authorName, authorEmail } = params;

  // Retry up to 3 times in case of transient branch updates
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Meridian-Research-Sync"
      };

      // 1. Get latest commit SHA for the target branch
      const refRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}?_t=${Date.now()}`,
        { headers, cache: "no-store" }
      );

      if (!refRes.ok) {
        const errText = await refRes.text();
        // If ref doesn't exist or repo is empty, try contents API fallback
        if (refRes.status === 404) {
          return await commitFilesSequentiallyFallback(params);
        }
        return { success: false, error: `Failed to fetch branch ref: ${errText}` };
      }

      const refData: any = await refRes.json();
      const latestCommitSha = refData.object?.sha;
      if (!latestCommitSha) {
        return { success: false, error: "Could not resolve latest commit SHA on branch." };
      }

      // 2. Get tree SHA of the latest commit
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}?_t=${Date.now()}`,
        { headers, cache: "no-store" }
      );
      if (!commitRes.ok) {
        const errText = await commitRes.text();
        return { success: false, error: `Failed to fetch commit object: ${errText}` };
      }
      const commitData: any = await commitRes.json();
      const baseTreeSha = commitData.tree?.sha;

      // 3. Create a new Tree containing the updated files
      const treeItems = files.map((file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content
      }));

      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems
        })
      });

      if (!treeRes.ok) {
        const errJson: any = await treeRes.json().catch(() => ({}));
        const errMsg = errJson.message || `Tree creation failed (HTTP ${treeRes.status})`;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return { success: false, error: errMsg };
      }

      const treeData: any = await treeRes.json();
      const newTreeSha = treeData.sha;

      // 4. Create a new Commit
      const nowIso = new Date().toISOString();
      const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message,
          tree: newTreeSha,
          parents: [latestCommitSha],
          author: {
            name: authorName,
            email: authorEmail,
            date: nowIso
          },
          committer: {
            name: authorName,
            email: authorEmail,
            date: nowIso
          }
        })
      });

      if (!newCommitRes.ok) {
        const errJson: any = await newCommitRes.json().catch(() => ({}));
        const errMsg = errJson.message || `Commit creation failed (HTTP ${newCommitRes.status})`;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return { success: false, error: errMsg };
      }

      const newCommitData: any = await newCommitRes.json();
      const newCommitSha = newCommitData.sha;

      // 5. Update branch reference to point to the new commit
      let updateRefRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            sha: newCommitSha,
            force: attempt > 1 // Use force update on retries if fast-forward had concurrency conflict
          })
        }
      );

      if (!updateRefRes.ok) {
        const errJson: any = await updateRefRes.json().catch(() => ({}));
        const errMsg = errJson.message || `Branch ref update failed (HTTP ${updateRefRes.status})`;

        // If non-fast-forward error, try one immediate force update with this fresh commit
        if (errMsg.includes("not a fast forward") || updateRefRes.status === 422) {
          const forceRefRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                sha: newCommitSha,
                force: true
              })
            }
          );
          if (forceRefRes.ok) {
            const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommitSha}`;
            return { success: true, commitUrl };
          }
        }

        // Concurrency conflict - retry with fresh ref from origin
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return { success: false, error: errMsg };
      }

      const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommitSha}`;
      return { success: true, commitUrl };
    } catch (err: any) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      return { success: false, error: err.message || String(err) };
    }
  }

  return { success: false, error: "Exceeded max commit retry attempts" };
}

/**
 * Fallback sequential committer using Contents API with dynamic SHA resolution
 */
async function commitFilesSequentiallyFallback(params: {
  owner: string;
  repo: string;
  branch: string;
  files: { path: string; content: string }[];
  message: string;
  token: string;
  authorName: string;
  authorEmail: string;
}): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  const { owner, repo, branch, files, message, token, authorName, authorEmail } = params;
  let lastCommitUrl: string | undefined;

  for (const file of files) {
    const res = await commitFileWithAutoShaRetry({
      owner,
      repo,
      branch,
      filePath: file.path,
      content: file.content,
      message,
      token,
      authorName,
      authorEmail
    });

    if (!res.success) {
      return res;
    }
    if (res.commitUrl) lastCommitUrl = res.commitUrl;
  }

  return { success: true, commitUrl: lastCommitUrl };
}

/**
 * Commits a single file directly with automatic SHA conflict extraction & retry
 */
export async function commitFileWithAutoShaRetry(params: {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  token: string;
  authorName: string;
  authorEmail: string;
}): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  const { owner, repo, branch, filePath, content, message, token, authorName, authorEmail } = params;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sha = await getFileSha(owner, repo, filePath, branch, token);
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const encodedContent = Buffer.from(content, "utf-8").toString("base64");

      const payload: any = {
        message,
        content: encodedContent,
        branch,
        committer: { name: authorName, email: authorEmail },
        author: { name: authorName, email: authorEmail }
      };

      if (sha) {
        payload.sha = sha;
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Meridian-Research-Sync"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        const errMsg = errJson.message || `GitHub returned HTTP ${res.status}`;

        // If error contains the actual SHA (e.g. "is at <sha> but expected <sha>"), extract and retry
        const shaMatch = errMsg.match(/is at ([a-f0-9]{40})/i);
        if (shaMatch && shaMatch[1] && attempt < 3) {
          console.log(`[GitHub Sync] Retrying with actual SHA ${shaMatch[1]} for ${filePath}...`);
          payload.sha = shaMatch[1];
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        if (attempt < 3 && res.status === 409) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        return { success: false, error: errMsg };
      }

      const result: any = await res.json();
      const commitUrl = result.commit?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
      return { success: true, commitUrl };
    } catch (err: any) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      return { success: false, error: err.message || String(err) };
    }
  }

  return { success: false, error: `Failed to commit ${filePath} after retries.` };
}

/**
 * Verifies if GitHub token and repo connection are valid and have write permissions
 */
export async function testGitHubConnection(): Promise<{
  connected: boolean;
  repo?: string;
  branch?: string;
  user?: string;
  message: string;
}> {
  const config = getGitHubSyncConfig();
  if (!config.configured) {
    return {
      connected: false,
      message: "GitHub synchronization is not fully configured. Set GITHUB_TOKEN and GITHUB_REPO."
    };
  }

  const [owner, repoName] = config.repo.split("/");
  if (!owner || !repoName) {
    return {
      connected: false,
      message: `Invalid repository format "${config.repo}". Expected "owner/repo" (e.g. "lucaskempe/ask-meridian").`
    };
  }

  try {
    // 1. Check user token
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Meridian-Research-Sync"
      }
    });

    if (!userRes.ok) {
      return {
        connected: false,
        message: `Invalid GitHub Token (HTTP ${userRes.status}). Ensure your token is valid and not expired.`
      };
    }

    const userData: any = await userRes.json();
    const username = userData.login || "Unknown";

    // 2. Check repo access
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Meridian-Research-Sync"
      }
    });

    if (!repoRes.ok) {
      return {
        connected: false,
        user: username,
        message: `Cannot access repository "${config.repo}" (HTTP ${repoRes.status}). Check if repo exists and token has access.`
      };
    }

    const repoData: any = await repoRes.json();
    const canPush = repoData.permissions?.push !== false;

    if (!canPush) {
      return {
        connected: false,
        user: username,
        repo: config.repo,
        message: `Token for user "${username}" lacks write/push permissions to "${config.repo}". Please grant 'Contents: Read and write' permissions.`
      };
    }

    return {
      connected: true,
      user: username,
      repo: config.repo,
      branch: config.branch,
      message: `Successfully connected to github.com/${config.repo} on branch "${config.branch}" as @${username}!`
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Network error verifying GitHub connection: ${err.message || err}`
    };
  }
}

/**
 * Synchronizes all blogs directly to GitHub repository (both custom_blogs.json and src/data.ts)
 */
export async function syncAllBlogsToGitHub(
  blogs: BlogPost[],
  reason: string = "sync articles"
): Promise<GitHubSyncResult> {
  const timestamp = Date.now();
  
  // 1. Always update local files on disk first
  writeLocalBlogFiles(blogs);

  const config = getGitHubSyncConfig();
  if (!config.configured) {
    return {
      success: true,
      message: `Updated ${blogs.length} articles locally. To mirror directly to your GitHub repo on each publish, provide GITHUB_TOKEN and GITHUB_REPO.`,
      filesUpdated: ["custom_blogs.json", "src/data.ts"],
      timestamp
    };
  }

  const [owner, repoName] = config.repo.split("/");
  if (!owner || !repoName) {
    return {
      success: false,
      message: `Invalid GITHUB_REPO format "${config.repo}". Expected "owner/repo".`,
      filesUpdated: ["custom_blogs.json", "src/data.ts"],
      timestamp,
      error: "Invalid repository format"
    };
  }

  const commitUrls: string[] = [];
  const updatedFiles: string[] = [];
  const customBlogsJson = JSON.stringify(blogs, null, 2);
  const dataTsContent = generateDataTsContent(blogs);

  console.log(`[GitHub Sync] Mirroring ${blogs.length} articles to GitHub (${config.repo}#${config.branch})... Reason: ${reason}`);

  const commitMessage = `feat(blog): sync ${blogs.length} articles (${reason}) [skip ci]`;
  const atomicResult = await commitFilesAtomicallyToGitHub({
    owner,
    repo: repoName,
    branch: config.branch,
    files: [
      { path: "custom_blogs.json", content: customBlogsJson },
      { path: "src/data.ts", content: dataTsContent }
    ],
    message: commitMessage,
    token: config.token,
    authorName: config.authorName,
    authorEmail: config.authorEmail
  });

  if (atomicResult.success) {
    updatedFiles.push("custom_blogs.json", "src/data.ts");
    if (atomicResult.commitUrl) commitUrls.push(atomicResult.commitUrl);
  } else {
    console.warn(`[GitHub Sync] Atomic commit attempt failed (${atomicResult.error}), falling back to sequential commits...`);
    
    // Fallback to sequential auto-retry committer
    const fallbackResult = await commitFilesSequentiallyFallback({
      owner,
      repo: repoName,
      branch: config.branch,
      files: [
        { path: "custom_blogs.json", content: customBlogsJson },
        { path: "src/data.ts", content: dataTsContent }
      ],
      message: commitMessage,
      token: config.token,
      authorName: config.authorName,
      authorEmail: config.authorEmail
    });

    if (fallbackResult.success) {
      updatedFiles.push("custom_blogs.json", "src/data.ts");
      if (fallbackResult.commitUrl) commitUrls.push(fallbackResult.commitUrl);
    } else {
      console.error(`[GitHub Sync] Fallback commit also failed:`, fallbackResult.error);
    }
  }

  const allSuccess = updatedFiles.length > 0;
  return {
    success: allSuccess,
    message: allSuccess
      ? `Successfully mirrored ${blogs.length} articles directly to https://github.com/${config.repo} (${updatedFiles.join(", ")})!`
      : `Failed to push to GitHub: ${atomicResult.error}`,
    filesUpdated: updatedFiles,
    commitUrls,
    timestamp,
    error: allSuccess ? undefined : atomicResult.error
  };
}
