import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI client safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI generation will fail.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Helper to extract arXiv ID
const extractArxivId = (input: string): string | null => {
  const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i);
  if (urlMatch) return urlMatch[1];
  const idMatch = input.match(/^(\d{4}\.\d{4,5})$/);
  if (idMatch) return idMatch[1];
  return null;
};

// Simple arXiv API fetcher
const fetchArxivMetadata = async (id: string) => {
  try {
    const url = `http://export.arxiv.org/api/query?id_list=${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch from arXiv API");
    const xml = await res.text();
    
    // Extract metadata using robust regexes
    const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/);
    const authorMatches = [...xml.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)];
    
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Unknown Paper Title";
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "";
    const authors = authorMatches.map(m => m[1].trim()).slice(0, 3).join(", ");
    
    return { title, summary, authors, arxivLink: `https://arxiv.org/abs/${id}` };
  } catch (error) {
    console.error("Error fetching arXiv metadata:", error);
    return null;
  }
};

const CUSTOM_BLOGS_FILE = path.join(process.cwd(), "custom_blogs.json");

const readCustomBlogs = (): any[] => {
  try {
    if (fs.existsSync(CUSTOM_BLOGS_FILE)) {
      const data = fs.readFileSync(CUSTOM_BLOGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading custom_blogs.json:", error);
  }
  return [];
};

const writeCustomBlogs = (blogs: any[]) => {
  try {
    fs.writeFileSync(CUSTOM_BLOGS_FILE, JSON.stringify(blogs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing custom_blogs.json:", error);
  }
};

// API: Get all custom blogs
app.get("/api/blogs", (req, res) => {
  const blogs = readCustomBlogs();
  res.json({ blogs });
});

// API: Delete a custom blog
app.delete("/api/blogs/:id", (req, res) => {
  const { id } = req.params;
  const password = req.headers["x-deletion-password"] || req.query.password || req.body?.password;
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect editor password." });
  }

  const blogs = readCustomBlogs();
  const filtered = blogs.filter((b: any) => b.id !== id);
  writeCustomBlogs(filtered);
  res.json({ success: true });
});

// API: Verify Editor Password
app.post("/api/verify-editor-password", (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  
  if (password === expectedPassword) {
    res.json({ success: true });
  } else {
    res.status(403).json({ error: "Incorrect password." });
  }
});

// API: Sync custom blogs from client and server
app.post("/api/blogs/sync", (req, res) => {
  const clientBlogs = req.body.blogs || [];
  const serverBlogs = readCustomBlogs();
  
  // Merge lists using a Map keyed by id to avoid duplicates
  const mergedMap = new Map<string, any>();
  
  // First add all server-side blogs
  serverBlogs.forEach((blog: any) => {
    if (blog && blog.id) {
      mergedMap.set(blog.id, blog);
    }
  });
  
  // Then add client-side blogs (which might have been created offline or saved in localStorage)
  clientBlogs.forEach((blog: any) => {
    if (blog && blog.id) {
      mergedMap.set(blog.id, blog);
    }
  });
  
  const mergedBlogs = Array.from(mergedMap.values());
  
  // Sort them so newer generated blogs are first
  mergedBlogs.sort((a: any, b: any) => {
    const timeA = parseInt(a.id.replace("generated-", "")) || 0;
    const timeB = parseInt(b.id.replace("generated-", "")) || 0;
    return timeB - timeA; // Newer first
  });
  
  writeCustomBlogs(mergedBlogs);
  res.json({ blogs: mergedBlogs });
});

// API: Verify GITHUB_TOKEN
app.get("/api/verify-github-token", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.json({
      valid: false,
      token_present: false,
      message: "No GITHUB_TOKEN found in environment variables. Please add it to your secrets panel."
    });
  }

  try {
    // Perform a tiny test call to the GitHub Models API (Azure AI Inference) to verify the token works
    const testResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "ping" }],
        model: "gpt-4o-mini",
        max_tokens: 1
      })
    });

    if (testResponse.ok) {
      return res.json({
        valid: true,
        token_present: true,
        message: "GITHUB_TOKEN is valid! Verified successfully with GitHub Models (gpt-4o-mini)."
      });
    } else {
      const errText = await testResponse.text();
      return res.json({
        valid: false,
        token_present: true,
        message: `GitHub Models API rejected the token. Status: ${testResponse.status}`,
        details: errText
      });
    }
  } catch (err: any) {
    return res.json({
      valid: false,
      token_present: true,
      message: `Failed to connect to GitHub Models API: ${err.message || err}`
    });
  }
});

// API: Generate Blog Post from arXiv
app.post("/api/blog/generate", async (req, res) => {
  const { arxivInput, rawText, password } = req.body;

  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect editor password." });
  }

  if (!arxivInput && !rawText) {
    return res.status(400).json({ error: "Missing arXiv input or raw text" });
  }

  try {
    let paperTitle = "";
    let paperSummary = "";
    let paperAuthors = "ArXiv Authors";
    let arxivLink = "";

    const arxivId = extractArxivId(arxivInput || "");
    if (arxivId) {
      const meta = await fetchArxivMetadata(arxivId);
      if (meta) {
        paperTitle = meta.title;
        paperSummary = meta.summary;
        paperAuthors = meta.authors;
        arxivLink = meta.arxivLink;
      }
    }

    // Fallbacks if metadata fetch failed or was skipped
    if (!paperTitle && rawText) {
      paperTitle = "Pasted Paper Analysis";
      paperSummary = rawText.slice(0, 2000); // chunk of raw text for context
      arxivLink = arxivInput || "https://arxiv.org";
    } else if (!paperTitle) {
      paperTitle = arxivInput;
      paperSummary = rawText || arxivInput;
      arxivLink = arxivInput.startsWith("http") ? arxivInput : `https://arxiv.org/abs/${arxivInput}`;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a world-class academic blogger and science communicator. 
Your task is to translate an academic paper (based on its title, abstract, or full text) into a gorgeous, highly polished, comprehensive, and technical blog article.
The article must match the editorial style of "Ask Meridian" (https://ask-meridian.uk/blog/).
This means it should be:
- Deeply analytical, authoritative, and scientifically rigorous (no high-level fluffy generic summaries).
- Accessible but mathematically mature.
- Broken down into structured sections: "Introduction", "Key Concepts & Physics", "The Theoretical/Mathematical Formulation", "Architecture or Methodology", "Key Results & Findings", and "Scientific or Practical Implications".
- It MUST include a minimum of 3 detailed mathematical formulas formatted in standard LaTeX. Use "$formula$" for inline math and "$$formula$$" for block equations. Make sure the math is beautiful, highly relevant to the paper, and nicely spaced.
- Generate a beautiful, custom, fully scalable inline SVG vector code string for the "bannerSvg". The SVG should represent the paper's core scientific concept in an abstract, modern, and aesthetically elite way (e.g., neural nodes, quantum wave tunnels, lattice grids, vector fields, molecules). 
  - Use a dark canvas theme: dark navy background (#0a1128 or #080f1e).
  - Use glowing neon accents: electric cyan (#00f2fe), hot pink (#ff007f), purple (#8b5cf6), or emerald (#38ef7d).
  - It must be self-contained, responsive (viewBox="0 0 800 400"), have no external font dependencies, and look completely professional (not basic or cluttered).`;

    const prompt = `Please generate an exquisite Ask Meridian-style academic blog post based on the following paper details:
Title: ${paperTitle}
Authors/Context: ${paperAuthors}
Link: ${arxivLink}
Source Text/Abstract: ${paperSummary}

The response must be valid JSON according to the schema provided. Make sure the 'content' field contains rich, deeply written Markdown text with multiple sections, technical explanations, and the required LaTeX equations.`;

    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];

    let response = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting blog generation with model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Highly engaging, academic blog title" },
                excerpt: { type: Type.STRING, description: "A highly polished, captivating 1-sentence excerpt summarizing the post" },
                readingTime: { type: Type.STRING, description: "Reading time estimate, e.g. '8 min read'" },
                arxivLink: { type: Type.STRING, description: "Link to the source Arxiv paper" },
                bannerSvg: { type: Type.STRING, description: "Complete responsive SVG code string starting with <svg viewBox='0 0 800 400'> and ending with </svg>. Dark space/navy background (#0a1128) with neon-glow geometric accents." },
                content: { type: Type.STRING, description: "Comprehensive, publication-grade scholarly blog content in Markdown format, containing sections, paragraphs, bullet points, and at least 3 typeset LaTeX formulas." },
                author: { type: Type.STRING, description: "Author name, default to 'Meridian Research'" },
                tags: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "3-5 relevant technical tags, e.g., ['Quantum Computing', 'Physics']"
                }
              },
              required: ["title", "excerpt", "readingTime", "arxivLink", "bannerSvg", "content", "author", "tags"]
            }
          }
        });
        
        if (response && response.text) {
          console.log(`Successfully generated content using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or was overloaded:`, err.message || err);
        lastError = err;
      }
    }

    let resultText = "";
    if (response && response.text) {
      resultText = response.text;
    } else if (process.env.GITHUB_TOKEN) {
      console.log("Gemini models failed or overloaded. Attempting fallback via GitHub Models (Azure AI Inference)...");
      try {
        const githubResponse = await fetch("https://models.inference.ai.azure.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }
          })
        });

        if (githubResponse.ok) {
          const data: any = await githubResponse.json();
          if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            resultText = data.choices[0].message.content;
            console.log("Successfully generated content using GitHub Models (gpt-4o-mini)");
          } else {
            console.warn("Invalid response structure from GitHub Models:", data);
            throw new Error("Invalid response structure from GitHub Models");
          }
        } else {
          const errText = await githubResponse.text();
          console.warn(`GitHub Models API returned status ${githubResponse.status}: ${errText}`);
          throw new Error(`GitHub Models API error: ${errText}`);
        }
      } catch (githubErr: any) {
        console.error("Failed to query GitHub Models API:", githubErr);
        throw lastError || githubErr || new Error("All fallback models are currently experiencing high demand. Please try again shortly.");
      }
    } else {
      throw lastError || new Error("All fallback models are currently experiencing high demand. Please provide a GITHUB_TOKEN in your secrets panel for robust fallback or try again shortly.");
    }

    if (!resultText) {
      throw new Error("No text returned from API generators");
    }

    const parsedBlog = JSON.parse(resultText.trim());
    
    // Add stable ID and slug
    const timestamp = Date.now();
    const slug = parsedBlog.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newBlog = {
      ...parsedBlog,
      id: `generated-${timestamp}`,
      slug: `${slug}-${timestamp.toString().slice(-4)}`,
      date: parsedBlog.date || new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    };

    // Save generated blog to server-side JSON file
    const blogs = readCustomBlogs();
    const isDuplicate = blogs.some((b: any) => 
      (b.arxivLink && b.arxivLink === newBlog.arxivLink) || 
      (b.title && b.title.toLowerCase() === newBlog.title.toLowerCase())
    );
    
    if (!isDuplicate) {
      blogs.push(newBlog);
      writeCustomBlogs(blogs);
    } else {
      console.log("Duplicate blog detected (by title or arxivLink), skipping append to custom_blogs.json");
    }

    res.json({ blog: newBlog });
  } catch (error: any) {
    console.error("Error generating blog:", error);
    res.status(500).json({ error: error.message || "Failed to generate blog post" });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
