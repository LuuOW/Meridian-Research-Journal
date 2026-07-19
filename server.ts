import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import nodemailer from "nodemailer";
import { extractArxivId, cleanJsonText, generateSlug, parseArxivXml, parseArxivFeedXml } from "./src/lib/arxivUtils";
import {
  PortalTokenData,
  validatePasskeyCredential,
  generatePortalToken,
  cleanExpiredTokens,
  verifyPortalToken,
  pollAuthToken
} from "./src/lib/passkeyManager";

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

// Simple arXiv API fetcher
const fetchArxivMetadata = async (id: string) => {
  try {
    const url = `http://export.arxiv.org/api/query?id_list=${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch from arXiv API");
    const xml = await res.text();
    
    // Extract metadata using robust helper function
    const { title, summary, authors } = parseArxivXml(xml);
    
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

const DISPATCHED_EMAILS_FILE = path.join(process.cwd(), "dispatched_emails.json");
const SMTP_CONFIG_FILE = path.join(process.cwd(), "smtp_config.json");

const readDispatchedEmails = (): any[] => {
  try {
    if (fs.existsSync(DISPATCHED_EMAILS_FILE)) {
      const data = fs.readFileSync(DISPATCHED_EMAILS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading dispatched_emails.json:", error);
  }
  return [];
};

const writeDispatchedEmails = (emails: any[]) => {
  try {
    fs.writeFileSync(DISPATCHED_EMAILS_FILE, JSON.stringify(emails, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing dispatched_emails.json:", error);
  }
};

const PASSKEYS_FILE = path.join(process.cwd(), "passkeys.json");

const readPasskeys = (): any[] => {
  try {
    if (fs.existsSync(PASSKEYS_FILE)) {
      const data = fs.readFileSync(PASSKEYS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading passkeys.json:", error);
  }
  return [];
};

const writePasskeys = (passkeys: any[]) => {
  try {
    fs.writeFileSync(PASSKEYS_FILE, JSON.stringify(passkeys, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing passkeys.json:", error);
  }
};

// Store temporary portal tokens for passkey device registration/authentication
const portalTokens = new Map<string, PortalTokenData>();

const readSmtpConfig = (): any => {
  try {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
      const data = fs.readFileSync(SMTP_CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading smtp_config.json:", error);
  }
  // Fallback to environment variables
  return {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587") || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Meridian Research <no-reply@ask-meridian.uk>",
    recipient: process.env.USER_EMAIL || "lucas.kempe@icloud.com",
    twilioSid: process.env.TWILIO_ACCOUNT_SID || "",
    twilioToken: process.env.TWILIO_AUTH_TOKEN || "",
    twilioFrom: process.env.TWILIO_FROM_NUMBER || "+14155238886",
    whatsappRecipient: process.env.WHATSAPP_RECIPIENT || "1170666236"
  };
};

const writeSmtpConfig = (config: any) => {
  try {
    fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing smtp_config.json:", error);
  }
};

// Initialize Firestore on Server Side
let db: any = null;
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;

if (fs.existsSync(CONFIG_FILE)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch (err) {
    console.error("Failed to parse firebase-applet-config.json:", err);
  }
}

if (firebaseConfig && firebaseConfig.projectId) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Firestore successfully initialized on Server!");
  } catch (error) {
    console.error("Failed to initialize Firebase on Server:", error);
  }
}

// Get all blogs, with fallback to local JSON file
const getBlogs = async (): Promise<any[]> => {
  const localBlogs = readCustomBlogs();
  if (!db) {
    return localBlogs;
  }
  try {
    const querySnapshot = await getDocs(collection(db, "blogs"));
    const firestoreBlogs: any[] = [];
    querySnapshot.forEach((doc) => {
      firestoreBlogs.push(doc.data());
    });

    if (firestoreBlogs.length === 0 && localBlogs.length > 0) {
      // Seed Firestore with local blogs if Firestore is completely empty
      console.log(`Firestore blogs collection is empty. Seeding with ${localBlogs.length} local blogs...`);
      for (const blog of localBlogs) {
        if (blog && blog.id) {
          await setDoc(doc(db, "blogs", blog.id), blog);
        }
      }
      return localBlogs;
    }

    // Sort newer first based on the generation timestamp in ID (e.g. generated-1234567890)
    firestoreBlogs.sort((a: any, b: any) => {
      const timeA = parseInt(a.id?.replace("generated-", "")) || 0;
      const timeB = parseInt(b.id?.replace("generated-", "")) || 0;
      return timeB - timeA;
    });

    return firestoreBlogs;
  } catch (error) {
    console.error("Error reading from Firestore, falling back to local file:", error);
    return localBlogs;
  }
};

// Save a single blog to local file and Firestore
const saveBlog = async (blog: any) => {
  // Save locally
  const localBlogs = readCustomBlogs();
  const isDuplicate = localBlogs.some((b: any) => b.id === blog.id);
  if (!isDuplicate) {
    localBlogs.push(blog);
    writeCustomBlogs(localBlogs);
  }

  // Save to Firestore
  if (db && blog && blog.id) {
    try {
      await setDoc(doc(db, "blogs", blog.id), blog);
      console.log(`Blog "${blog.title}" successfully written to Firestore.`);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  }
};

// Save multiple blogs to local file and Firestore
const saveBlogs = async (blogs: any[]) => {
  // Save locally
  writeCustomBlogs(blogs);

  // Save to Firestore
  if (db) {
    try {
      console.log(`Syncing ${blogs.length} blogs to Firestore...`);
      await Promise.all(
        blogs.map(async (blog) => {
          if (blog && blog.id) {
            await setDoc(doc(db, "blogs", blog.id), blog);
          }
        })
      );
      console.log("Sync to Firestore complete!");
    } catch (error) {
      console.error("Error syncing to Firestore:", error);
    }
  }
};

// Delete a blog from local file and Firestore
const deleteBlog = async (id: string): Promise<boolean> => {
  // Delete locally
  const localBlogs = readCustomBlogs();
  const filtered = localBlogs.filter((b: any) => b.id !== id);
  writeCustomBlogs(filtered);

  // Delete from Firestore
  if (db) {
    try {
      await deleteDoc(doc(db, "blogs", id));
      console.log(`Blog ${id} successfully deleted from Firestore.`);
      return true;
    } catch (error) {
      console.error("Error deleting from Firestore:", error);
      return false;
    }
  }
  return true;
};

// API: Get all custom blogs
app.get("/api/blogs", async (req, res) => {
  const blogs = await getBlogs();
  res.json({ blogs });
});

// API: Delete a custom blog
app.delete("/api/blogs/:id", async (req, res) => {
  const { id } = req.params;
  const password = req.headers["x-deletion-password"] || req.query.password || req.body?.password;
  const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "Unauthorized: Incorrect editor password." });
  }

  const success = await deleteBlog(id);
  res.json({ success });
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

// API: Get registered passkeys
app.get("/api/passkeys/list", (req, res) => {
  const passkeys = readPasskeys();
  res.json({ passkeys });
});

// API: Register a passkey
app.post("/api/passkeys/register", async (req, res) => {
  const { credential, deviceName, token } = req.body;

  if (!token) {
    return res.status(403).json({ error: "Unauthorized: Portal token is required for registration." });
  }

  const tokenData = portalTokens.get(token);
  if (!tokenData || tokenData.type !== "register") {
    return res.status(403).json({ error: "Unauthorized: Invalid or expired registration portal token." });
  }

  if (!validatePasskeyCredential(credential)) {
    return res.status(400).json({ error: "Invalid credential data" });
  }

  const passkeys = readPasskeys();
  const exists = passkeys.some((p: any) => p.id === credential.id);
  
  if (!exists) {
    const newPasskey = {
      id: credential.id,
      publicKey: credential.publicKey || "",
      deviceName: deviceName || "My Registered Device",
      createdAt: Date.now()
    };
    passkeys.push(newPasskey);
    writePasskeys(passkeys);

    // Sync to Firestore if db is available
    if (db) {
      try {
        await setDoc(doc(db, "passkeys", credential.id), newPasskey);
        console.log(`Passkey ${credential.id} successfully written to Firestore.`);
      } catch (err) {
        console.error("Error saving passkey to Firestore:", err);
      }
    }
  }

  res.json({ success: true });
});

// API: Generate a portal token
app.post("/api/passkeys/generate-portal", (req, res) => {
  const { type, password } = req.body; // "register" | "auth"

  if (type === "register") {
    const expectedPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
    if (!password || password !== expectedPassword) {
      return res.status(403).json({ error: "Unauthorized: Incorrect editor password to authorize passkey registration." });
    }
  }

  const token = generatePortalToken(type, portalTokens);
  cleanExpiredTokens(portalTokens);
  res.json({ token });
});

// API: Verify and Authorize a Portal Token
app.post("/api/passkeys/verify-portal", (req, res) => {
  const { token, success } = req.body;
  const editorPassword = process.env.EDITOR_PASSWORD || process.env.GENERATION_PASSWORD || "meridian";
  const result = verifyPortalToken(token, success, portalTokens, editorPassword);
  
  if (result.success) {
    return res.json({ success: true });
  }
  
  res.status(result.error === "Token not found or expired" ? 404 : 400).json({ error: result.error });
});

// API: Poll for Portal Token authorization status
app.get("/api/passkeys/poll-auth", (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }

  const result = pollAuthToken(token, portalTokens);
  if (result.error) {
    return res.status(result.error === "Token not found or expired" ? 404 : 400).json({ error: result.error });
  }

  if (result.authorized) {
    return res.json({ authorized: true, password: result.password });
  }

  res.json({ authorized: false });
});

// API: Sync custom blogs from client and server
app.post("/api/blogs/sync", async (req, res) => {
  const clientBlogs = req.body.blogs || [];
  const serverBlogs = await getBlogs();
  
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
  
  await saveBlogs(mergedBlogs);
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
      "gemini-2.5-flash",
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

    let parsedBlog;
    try {
      const sanitizedText = cleanJsonText(resultText);
      parsedBlog = JSON.parse(sanitizedText);
    } catch (parseError: any) {
      console.error("JSON parsing failed. Raw response length:", resultText.length);
      console.error("Snippet of raw response (start):", resultText.slice(0, 500));
      console.error("Snippet of raw response (end):", resultText.slice(-500));
      throw new Error(`Failed to parse AI response as valid JSON: ${parseError.message || parseError}`);
    }
    
    // Add stable ID and slug
    const timestamp = Date.now();
    const slug = generateSlug(parsedBlog.title);

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

    // Save generated blog using saveBlog and getBlogs
    const blogs = await getBlogs();
    const isDuplicate = blogs.some((b: any) => 
      (b.arxivLink && b.arxivLink === newBlog.arxivLink) || 
      (b.title && b.title.toLowerCase() === newBlog.title.toLowerCase())
    );
    
    if (!isDuplicate) {
      await saveBlog(newBlog);
    } else {
      console.log("Duplicate blog detected (by title or arxivLink), skipping append");
    }

    res.json({ blog: newBlog });
  } catch (error: any) {
    console.error("Error generating blog:", error);
    res.status(500).json({ error: error.message || "Failed to generate blog post" });
  }
});

// API: Predict Daily Recommended Paper in Optics and Quantum Physics based on user's blog history
app.post("/api/blog/predict", async (req, res) => {
  try {
    // 1. Get history of blogs
    const blogs = await getBlogs();
    const historyList = blogs.map((b: any) => ({
      title: b.title,
      excerpt: b.excerpt,
      tags: b.tags || []
    })).slice(0, 10); // Take top 10 most recent for context to stay within token limits cleanly
    
    // 2. Fetch recent papers in optics and quantum physics from arXiv
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=cat:physics.optics+OR+cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=25`;
    const response = await fetch(arxivUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch recent papers from arXiv: ${response.statusText}`);
    }
    const xml = await response.text();
    const candidates = parseArxivFeedXml(xml);
    
    if (candidates.length === 0) {
      return res.status(404).json({ error: "No papers found in optics or quantum physics categories on arXiv." });
    }
    
    // 3. Call Gemini to predict/recommend the best paper
    const ai = getGeminiClient();
    
    const systemInstruction = `You are "Meridian AI Advisor", a state-of-the-art predictive scientific recommendation agent.
Your goal is to analyze the user's reading/writing history of academic blog publications, and select the single most compelling and mathematically fitting next paper from a list of recent arXiv papers.
Your recommended paper must belong strictly to the Optics (physics.optics) or Quantum Physics (quant-ph) categories.
You must generate a captivating, intellectually mature scientific explanation of why this specific paper is today's top predicted article, explaining how it bridges or extends the theories, math, or models found in their past publications.`;

    const prompt = `Here is the user's publication history (recent articles they have read or written reviews for):
${JSON.stringify(historyList, null, 2)}

And here is the feed of today's recent, real arXiv papers in Optics and Quantum Physics:
${JSON.stringify(candidates.map((c, idx) => ({ index: idx, id: c.id, title: c.title, summary: c.summary, authors: c.authors })), null, 2)}

Analyze the user's history, find common research interest themes (e.g., specific math structures, physical phenomena, machine learning techniques applied to physics), and select the single BEST matching paper from the arXiv feed.
Generate a personalized, highly inspiring, and technical AI reasoning explanation (3-4 sentences, elegant, in Ask Meridian style) explaining how this paper is the perfect next step in their academic journey.

The response must be valid JSON according to the schema.`;

    const modelResult = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectedIndex: { type: Type.INTEGER, description: "The index of the selected paper in the provided arXiv list (0-based)" },
            reasoning: { type: Type.STRING, description: "A beautifully composed, technically mature 3-4 sentence explanation of why this paper is recommended, citing specific concepts from their past articles." }
          },
          required: ["selectedIndex", "reasoning"]
        }
      }
    });

    const resultText = modelResult.text;
    if (!resultText) {
      throw new Error("Empty response from prediction model");
    }

    const sanitizedText = cleanJsonText(resultText);
    const parsedPrediction = JSON.parse(sanitizedText);
    const selectedIdx = parsedPrediction.selectedIndex;
    
    if (selectedIdx < 0 || selectedIdx >= candidates.length) {
      throw new Error(`Invalid selected index: ${selectedIdx}`);
    }
    
    const predictedPaper = candidates[selectedIdx];
    
    res.json({
      predictedPaper,
      reasoning: parsedPrediction.reasoning,
      predictedAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error("Error predicting blog recommendation:", error);
    res.status(500).json({ error: error.message || "Failed to make scientific paper prediction" });
  }
});

// API: Get SMTP & WhatsApp configuration
app.get("/api/dispatch/config", (req, res) => {
  const config = readSmtpConfig();
  res.json({
    host: config.host || "",
    port: config.port || 587,
    user: config.user || "",
    pass: config.pass ? "********" : "",
    from: config.from || "Meridian Research <no-reply@ask-meridian.uk>",
    recipient: config.recipient || "lucas.kempe@icloud.com",
    twilioSid: config.twilioSid || "",
    twilioToken: config.twilioToken ? "********" : "",
    twilioFrom: config.twilioFrom || "+14155238886",
    whatsappRecipient: config.whatsappRecipient || "1170666236"
  });
});

// API: Update SMTP & WhatsApp configuration
app.post("/api/dispatch/config", (req, res) => {
  const { host, port, user, pass, from, recipient, twilioSid, twilioToken, twilioFrom, whatsappRecipient } = req.body;
  const currentConfig = readSmtpConfig();
  
  const updated = {
    host: host !== undefined ? host : currentConfig.host,
    port: port !== undefined ? parseInt(port) || 587 : currentConfig.port,
    user: user !== undefined ? user : currentConfig.user,
    pass: pass !== undefined && pass !== "********" ? pass : currentConfig.pass,
    from: from !== undefined ? from : currentConfig.from,
    recipient: recipient !== undefined ? recipient : currentConfig.recipient,
    twilioSid: twilioSid !== undefined ? twilioSid : currentConfig.twilioSid,
    twilioToken: twilioToken !== undefined && twilioToken !== "********" ? twilioToken : currentConfig.twilioToken,
    twilioFrom: twilioFrom !== undefined ? twilioFrom : currentConfig.twilioFrom,
    whatsappRecipient: whatsappRecipient !== undefined ? whatsappRecipient : currentConfig.whatsappRecipient
  };

  writeSmtpConfig(updated);
  res.json({ success: true, message: "SMTP & WhatsApp configuration updated successfully." });
});

// API: Get email dispatch logs
app.get("/api/dispatch/emails", (req, res) => {
  const emails = readDispatchedEmails();
  res.json({ emails });
});

// API: Publish a specific draft option
app.post("/api/blogs/publish-draft", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing draft ID" });
  }

  try {
    const blogs = await getBlogs();
    const draftIndex = blogs.findIndex((b: any) => b.id === id);
    if (draftIndex === -1) {
      return res.status(404).json({ error: "Draft blog option not found in database." });
    }

    // Set the status of the selected blog to published
    const updatedBlog = {
      ...blogs[draftIndex],
      status: "published",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    };

    // Update the list of blogs
    const updatedBlogs = blogs.map((b: any) => b.id === id ? updatedBlog : b);
    await saveBlogs(updatedBlogs);

    res.json({ success: true, blog: updatedBlog });
  } catch (error: any) {
    console.error("Error publishing draft:", error);
    res.status(500).json({ error: error.message || "Failed to publish draft option" });
  }
});

// API: Generate daily dual publication drafts & dispatch email (RAG + Algebra Focus)
app.post("/api/dispatch/generate-options", async (req, res) => {
  try {
    // 1. Get user blog history (RAG Context)
    const blogs = await getBlogs();
    const published = blogs.filter((b: any) => b.status !== "draft_option");
    const historyList = published.map((b: any) => ({
      title: b.title,
      excerpt: b.excerpt,
      tags: b.tags || [],
      contentSnippet: b.content ? b.content.slice(0, 400) : ""
    })).slice(0, 6);

    // 2. Fetch recent arXiv preprints from cat:physics.optics and cat:quant-ph
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=cat:physics.optics+OR+cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=15`;
    const response = await fetch(arxivUrl);
    if (!response.ok) {
      throw new Error(`arXiv API fetch failed: ${response.statusText}`);
    }
    const xml = await response.text();
    const candidates = parseArxivFeedXml(xml);

    if (candidates.length === 0) {
      return res.status(404).json({ error: "No recent preprints found on arXiv." });
    }

    // 3. Call Gemini to predict/recommend and write TWO distinct blog drafts
    const ai = getGeminiClient();
    const systemInstruction = `You are "Meridian AI Advisor", a state-of-the-art predictive scientific recommendation and authoring agent.
Your task is to review the user's publication history, and today's arXiv papers feed in Optics (physics.optics) and Quantum Physics (quant-ph).
You must select exactly TWO papers from the feed and author two full publication-ready blog drafts:
- Option A (Optics/Quantum Focus): Select a paper focusing on optics or quantum optics. Write a highly detailed academic blog post with deep technical reasoning, equations, and insights.
- Option B (Algebra/Mathematical Focus): Select a different paper focusing on mathematical foundations, algebraic structures, operator algebras, or linear algebra in optics/quantum physics. Write a deeply mathematical analysis, showing full derivations and equations.

For both options, you must write a comprehensive, long-form academic blog post (content) in markdown format. You must embed rich, professionally-crafted KaTeX/LaTeX math equations (use inline $...$ and block $$...$$) to describe the physics and derivations.`;

    const prompt = `Here is the user's publication history (recent blogs):
${JSON.stringify(historyList, null, 2)}

Here is the feed of today's arXiv papers:
${JSON.stringify(candidates.map((p, i) => ({ index: i, id: p.id, title: p.title, summary: p.summary, authors: p.authors })), null, 2)}

Choose exactly TWO distinct papers from the feed.
- Assign one to Option A (Optics/Quantum Focus).
- Assign another to Option B (Algebra/Mathematical Focus).

For each option, generate:
1. arxivId: The actual arXiv ID of the paper (e.g. "2304.12345").
2. title: A catchy but serious academic title for the blog post.
3. excerpt: A compelling 1-2 sentence subtitle/summary.
4. tags: Array of 3-4 relevant tags (e.g. ["Optics", "Quantum", "Algebra", "Squeezed Light", "Lie Groups"]).
5. ragAlignment: A 2-sentence explanation of why this paper was selected and how it extends themes in the user's reading history.
6. content: A long, detailed academic blog post in Markdown format (~400-600 words) summarizing the paper's findings, highlighting the technical and mathematical innovations, showing full mathematical derivations or formulations using LaTeX/KaTeX (enclosed in $...$ and $$...$$).

Respond strictly with valid JSON conforming to the response schema.`;

    const modelResult = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optionA: {
              type: Type.OBJECT,
              properties: {
                arxivId: { type: Type.STRING },
                title: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                ragAlignment: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["arxivId", "title", "excerpt", "tags", "ragAlignment", "content"]
            },
            optionB: {
              type: Type.OBJECT,
              properties: {
                arxivId: { type: Type.STRING },
                title: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                ragAlignment: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["arxivId", "title", "excerpt", "tags", "ragAlignment", "content"]
            }
          },
          required: ["optionA", "optionB"]
        }
      }
    });

    const resultText = modelResult.text;
    if (!resultText) {
      throw new Error("Empty response from prediction model");
    }

    const sanitizedText = cleanJsonText(resultText);
    const parsedData = JSON.parse(sanitizedText);

    // Create Draft Objects
    const timestamp = Date.now();
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    const draftA = {
      id: `draft-optics-${timestamp}`,
      slug: `draft-optics-${timestamp.toString().slice(-4)}`,
      title: parsedData.optionA.title,
      excerpt: parsedData.optionA.excerpt,
      content: parsedData.optionA.content,
      tags: parsedData.optionA.tags || ["Optics"],
      status: "draft_option",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      arxivLink: `https://arxiv.org/abs/${parsedData.optionA.arxivId}`,
      ragAlignment: parsedData.optionA.ragAlignment,
      category: "Optics Focus"
    };

    const draftB = {
      id: `draft-algebra-${timestamp}`,
      slug: `draft-algebra-${timestamp.toString().slice(-4)}`,
      title: parsedData.optionB.title,
      excerpt: parsedData.optionB.excerpt,
      content: parsedData.optionB.content,
      tags: parsedData.optionB.tags || ["Algebra"],
      status: "draft_option",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      arxivLink: `https://arxiv.org/abs/${parsedData.optionB.arxivId}`,
      ragAlignment: parsedData.optionB.ragAlignment,
      category: "Algebra Focus"
    };

    await saveBlog(draftA);
    await saveBlog(draftB);

    // Create high-fidelity HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Publications Dispatch</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #030712;
      color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #1f2937;
      padding-bottom: 30px;
      margin-bottom: 30px;
    }
    .logo {
      font-family: Georgia, serif;
      font-size: 28px;
      font-style: italic;
      color: #06b6d4;
      text-decoration: none;
      font-weight: bold;
    }
    .subtitle {
      font-size: 12px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
    }
    .intro {
      font-size: 15px;
      line-height: 1.6;
      color: #d1d5db;
      margin-bottom: 30px;
    }
    .card {
      background-color: #0b1329;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: bold;
      background-color: #0f172a;
      color: #38bdf8;
      border: 1px solid #1e293b;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .card-title {
      font-family: Georgia, serif;
      font-size: 20px;
      color: #f3f4f6;
      margin: 0 0 10px 0;
      line-height: 1.3;
    }
    .card-excerpt {
      font-size: 14px;
      color: #9ca3af;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .alignment {
      font-size: 12px;
      color: #06b6d4;
      background-color: rgba(6, 182, 212, 0.05);
      border-left: 3px solid #06b6d4;
      padding: 10px;
      margin-bottom: 20px;
      border-radius: 0 8px 8px 0;
    }
    .btn {
      display: inline-block;
      background-color: #06b6d4;
      color: #030712;
      font-weight: bold;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      text-align: center;
    }
    .btn:hover {
      background-color: #22d3ee;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      margin-top: 40px;
      border-top: 1px solid #1f2937;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${appUrl}" class="logo">Meridian Research</a>
      <div class="subtitle">AI Advisor Daily Dispatch</div>
    </div>
    
    <div class="intro">
      Dear Lucas,<br><br>
      We have completed today's predictive RAG pathways analysis. Based on your reading history, we have compiled exactly two peer-reviewed arXiv preprints into custom, publication-ready review articles. Select one below to instantly authorize and publish it to the main feed.
    </div>
    
    <div class="card">
      <div class="tag">OPTION A: OPTICS / QUANTUM FOCUS</div>
      <h3 class="card-title">${draftA.title}</h3>
      <p class="card-excerpt">${draftA.excerpt}</p>
      <div class="alignment">
        <strong>Advisor Alignment:</strong> ${draftA.ragAlignment}
      </div>
      <a href="${appUrl}/?publish_draft=${draftA.id}" class="btn">Authenticate & Publish Option A</a>
    </div>
    
    <div class="card" style="border-color: #334155;">
      <div class="tag" style="color: #a855f7; background-color: #1e1b4b; border-color: #3b0764;">OPTION B: ALGEBRA / MATHEMATICAL FOCUS</div>
      <h3 class="card-title">${draftB.title}</h3>
      <p class="card-excerpt">${draftB.excerpt}</p>
      <div class="alignment" style="color: #a855f7; border-left-color: #a855f7; background-color: rgba(168, 85, 247, 0.05);">
        <strong>Advisor Alignment:</strong> ${draftB.ragAlignment}
      </div>
      <a href="${appUrl}/?publish_draft=${draftB.id}" class="btn" style="background-color: #a855f7; color: #ffffff;">Authenticate & Publish Option B</a>
    </div>
    
    <div class="footer">
      This is an automated dispatch from your personalized Meridian AI Advisor. <br>
      To manage your integration, visit the Dispatch Credentials tab on your dashboard.<br><br>
      © 2026 Meridian Research. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    const smtp = readSmtpConfig();
    let dispatchStatus = "Simulated Dispatch (No SMTP credentials configured)";

    if (smtp.host && smtp.user && smtp.pass) {
      try {
        console.log(`Attempting real email dispatch to ${smtp.recipient}...`);
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: {
            user: smtp.user,
            pass: smtp.pass
          }
        });

        await transporter.sendMail({
          from: smtp.from,
          to: smtp.recipient,
          subject: `[Meridian Advisor] Select Today's Publication: Optics vs Quantum Physics`,
          html: emailHtml
        });

        dispatchStatus = `Successfully Dispatched via SMTP to ${smtp.recipient}`;
        console.log("Real email sent successfully!");
      } catch (smtpErr: any) {
        console.error("Failed to send real email via SMTP:", smtpErr);
        dispatchStatus = `SMTP failure: ${smtpErr.message || smtpErr}`;
      }
    } else {
      console.log(`[SIMULATED EMAIL DISPATCH] to ${smtp.recipient}`);
    }

    // Send WhatsApp via Twilio if configured, or log high-fidelity simulation
    let whatsappStatus = "Simulated WhatsApp Dispatch (No Twilio credentials configured)";
    const waMsgBody = `*Meridian AI Advisor: Daily Forecast* 🌟\n\nDear Lucas, we have executed our daily RAG predictive analysis. Two custom publication-ready drafts are compiled in your database:\n\n*Option A: ${draftA.title}*\n• arXiv: ${parsedData.optionA.arxivId}\n• Alignment: ${draftA.ragAlignment.slice(0, 100)}...\n👉 Publish Option A: ${appUrl}/?publish_draft=${draftA.id}\n\n*Option B: ${draftB.title}*\n• arXiv: ${parsedData.optionB.arxivId}\n• Alignment: ${draftB.ragAlignment.slice(0, 100)}...\n👉 Publish Option B: ${appUrl}/?publish_draft=${draftB.id}\n\nSelect either link to authenticate & publish instantly to Ask Meridian!`;

    let rawRecipient = smtp.whatsappRecipient || "1170666236";
    let formattedRecipient = rawRecipient.trim();
    if (!formattedRecipient.startsWith("+")) {
      if (formattedRecipient.startsWith("11")) {
        formattedRecipient = "+549" + formattedRecipient;
      } else {
        formattedRecipient = "+" + formattedRecipient;
      }
    }

    if (smtp.twilioSid && smtp.twilioToken && smtp.twilioFrom) {
      try {
        console.log(`Attempting to send real WhatsApp message to ${formattedRecipient} via Twilio...`);
        const twilioSid = smtp.twilioSid;
        const twilioToken = smtp.twilioToken;
        const twilioFrom = smtp.twilioFrom;

        const twilioFromFormatted = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
        const twilioToFormatted = `whatsapp:${formattedRecipient}`;
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

        const twilioBody = new URLSearchParams({
          From: twilioFromFormatted,
          To: twilioToFormatted,
          Body: waMsgBody
        });

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: twilioBody.toString()
        });

        if (twilioRes.ok) {
          whatsappStatus = `Successfully Sent Real WhatsApp via Twilio to ${formattedRecipient}`;
          console.log("Real WhatsApp sent successfully via Twilio!");
        } else {
          const errData: any = await twilioRes.json();
          console.error("Twilio WhatsApp API error:", errData);
          whatsappStatus = `Twilio API failed: ${errData.message || twilioRes.statusText}`;
        }
      } catch (waErr: any) {
        console.error("Failed to send real WhatsApp via Twilio:", waErr);
        whatsappStatus = `Twilio network failure: ${waErr.message || waErr}`;
      }
    } else {
      console.log(`[SIMULATED WHATSAPP DISPATCH] to ${formattedRecipient}`);
    }

    // Save Dispatch Log entry
    const dispatched = readDispatchedEmails();
    const newDispatch = {
      id: `log-${timestamp}`,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      recipient: smtp.recipient || "lucas.kempe@icloud.com",
      status: dispatchStatus,
      whatsappRecipient: formattedRecipient,
      whatsappStatus: whatsappStatus,
      whatsappMessage: waMsgBody,
      subject: `[Meridian Advisor] Select Today's Publication: Optics vs Quantum Physics`,
      html: emailHtml,
      options: {
        optionA: { id: draftA.id, title: draftA.title, excerpt: draftA.excerpt },
        optionB: { id: draftB.id, title: draftB.title, excerpt: draftB.excerpt }
      }
    };
    dispatched.unshift(newDispatch);
    writeDispatchedEmails(dispatched.slice(0, 50));

    res.json({
      success: true,
      dispatchStatus,
      whatsappStatus,
      drafts: {
        optionA: { id: draftA.id, title: draftA.title },
        optionB: { id: draftB.id, title: draftB.title }
      }
    });

  } catch (error: any) {
    console.error("Error generating options:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily options" });
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
