import express from "express";
import path from "path";
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

// API: Generate Blog Post from arXiv
app.post("/api/blog/generate", async (req, res) => {
  const { arxivInput, rawText } = req.body;

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text returned from Gemini API");
    }

    const parsedBlog = JSON.parse(resultText.trim());
    
    // Add stable ID and slug
    const timestamp = Date.now();
    const slug = parsedBlog.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const newBlog = {
      id: `generated-${timestamp}`,
      slug: `${slug}-${timestamp.toString().slice(-4)}`,
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      ...parsedBlog
    };

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
