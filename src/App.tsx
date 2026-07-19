import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Headset, ExternalLink, BookOpen, Sparkles, Compass, Search, Tag, Newspaper, Download } from "lucide-react";

import { BlogPost } from "./types";
import { PRELOADED_BLOGS } from "./data";
import { Navbar } from "./components/Navbar";
import { BlogPostCard } from "./components/BlogPostCard";
import { MathRenderer } from "./components/MathRenderer";
import { AudioPlayer } from "./components/AudioPlayer";
import { ArxivGenerator } from "./components/ArxivGenerator";

import { LinkedInShareModal } from "./components/LinkedInShareModal";
import { DeletePasswordModal } from "./components/DeletePasswordModal";
import { AboutModal } from "./components/AboutModal";
import { EditorPasswordModal } from "./components/EditorPasswordModal";
import { PasskeyPortal } from "./components/PasskeyPortal";
import { db, handleFirestoreError, OperationType } from "./lib/googleAuth";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

export default function App() {
  const [portalToken, setPortalToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("portal_token") || params.get("register_portal");
  });

  const [portalType, setPortalType] = useState<"register" | "auth">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("portal_type") === "auth" ? "auth" : "register";
  });

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [activeBlog, setActiveBlog] = useState<BlogPost | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialArxivId, setInitialArxivId] = useState<string>("");
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEditorMode, setIsEditorMode] = useState<boolean>(false);
  const [hiddenBlogIds, setHiddenBlogIds] = useState<string[]>([]);
  const [activeAudioBlog, setActiveAudioBlog] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [deleteBlogId, setDeleteBlogId] = useState<string | null>(null);
  const [isEditorPasswordModalOpen, setIsEditorPasswordModalOpen] = useState(false);
  const [editorPassword, setEditorPassword] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  // Keep HTML element sync'd with current theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Track scroll progress for the active blog
  useEffect(() => {
    if (!activeBlog) {
      setScrollProgress(0);
      return;
    }

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initialize on mount/change

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeBlog]);

  // Inactivity detection: Disable Editor Mode after 5 minutes of inactivity
  useEffect(() => {
    if (!isEditorMode) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsEditorMode(false);
        setEditorPassword("");
      }, 5 * 60 * 1000); // 5 minutes (300,000 ms)
    };

    // Initialize timer
    resetTimer();

    // Setup event listeners for user interaction
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isEditorMode]);

  const handleToggleEditorMode = () => {
    if (!isEditorMode) {
      setIsEditorPasswordModalOpen(true);
    } else {
      setIsEditorMode(false);
      setEditorPassword("");
    }
  };

  const handleDownloadPng = (blog: BlogPost) => {
    if (!blog?.bannerSvg) return;
    
    let svgString = blog.bannerSvg;
    
    // Parse and sanitize the SVG using a forgiving HTML DOMParser to ensure 100% standard compliance and fix any malformed XML automatically
    try {
      const parser = new DOMParser();
      // Pre-escape raw ampersands so they don't break the string serialization
      const escapedSvg = svgString.replace(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g, "&amp;");
      
      const doc = parser.parseFromString(escapedSvg, "text/html");
      const svgEl = doc.querySelector("svg");
      
      if (svgEl) {
        // Strip out any external stylesheet imports or font-face declarations inside <style> tags (they crash canvas/image loading)
        const styles = svgEl.querySelectorAll("style");
        styles.forEach(style => {
          if (style.textContent) {
            style.textContent = style.textContent
              .replace(/@import\s+[^;]+;/gi, "")
              .replace(/@font-face\s*\{[^}]*\}/gi, "")
              .replace(/url\(['"]?https?:\/\/[^'")]*['"]?\)/gi, "none");
          }
        });
        
        // Remove any <image> tags that have external sources to avoid tainting the canvas
        const images = svgEl.querySelectorAll("image");
        images.forEach(imgEl => {
          const href = imgEl.getAttribute("href") || imgEl.getAttribute("xlink:href") || "";
          if (href.startsWith("http://") || href.startsWith("https://")) {
            imgEl.remove(); // Remove external images entirely
          }
        });
        
        // Ensure standard namespace, width, and height are set on the root SVG
        if (!svgEl.getAttribute("xmlns")) {
          svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        }
        svgEl.setAttribute("width", "800");
        svgEl.setAttribute("height", "400");
        
        // Serialize the SVG element itself to produce 100% valid XML!
        let serialized = new XMLSerializer().serializeToString(svgEl);
        
        // Restore camelCase SVG element tag names
        const camelCaseElements = [
          "linearGradient", "radialGradient", "clipPath", "textPath", "foreignObject",
          "feGaussianBlur", "feOffset", "feBlend", "feMerge", "feMergeNode", 
          "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix",
          "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow",
          "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur",
          "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset",
          "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"
        ];
        
        camelCaseElements.forEach(tag => {
          const lowercase = tag.toLowerCase();
          const openRegex = new RegExp(`<${lowercase}\\b`, "g");
          const closeRegex = new RegExp(`</${lowercase}>`, "g");
          serialized = serialized.replace(openRegex, `<${tag}`);
          serialized = serialized.replace(closeRegex, `</${tag}>`);
        });
        
        // Restore camelCase SVG attributes
        const camelCaseAttributes = [
          "viewBox", "gradientTransform", "gradientUnits", "spreadMethod", 
          "clipPathUnits", "preserveAspectRatio", "patternUnits", "patternContentUnits", 
          "patternTransform", "attributeName", "attributeType", "keyTimes", "keySplines", 
          "repeatCount", "repeatDur", "stdDeviation", "specularConstant", "specularExponent",
          "surfaceScale", "targetX", "targetY", "limitingConeAngle", "diffuseConstant"
        ];
        
        camelCaseAttributes.forEach(attr => {
          const lowercase = attr.toLowerCase();
          const regex = new RegExp(`\\b${lowercase}=`, "gi");
          serialized = serialized.replace(regex, `${attr}=`);
        });
        
        svgString = serialized;
      }
    } catch (err) {
      console.error("DOMParser error:", err);
    }

    // Prepare fallbacks: Try Blob URL first, then Base64 Data URI, and finally direct SVG file download.
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    
    // Attempt base64 encoding as the second-layer fallback
    let dataUri = "";
    try {
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      dataUri = `data:image/svg+xml;base64,${base64}`;
    } catch (e) {
      console.warn("Base64 encoding failed for fallback:", e);
    }

    const tryLoadImage = (srcUrl: string, onDone: () => void, onFail: () => void) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // prevent potential tainted canvas issues where possible
      
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1200;
          canvas.height = 675;
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.fillStyle = "#090d16";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((pngBlob) => {
              if (pngBlob) {
                const pngUrl = URL.createObjectURL(pngBlob);
                const downloadLink = document.createElement("a");
                downloadLink.href = pngUrl;
                downloadLink.download = `${blog.slug || "meridian-banner"}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                setTimeout(() => URL.revokeObjectURL(pngUrl), 100);
                onDone();
              } else {
                onFail();
              }
            }, "image/png");
          } else {
            onFail();
          }
        } catch (err) {
          console.error("Error drawing image to canvas:", err);
          onFail();
        }
      };
      
      img.onerror = (e) => {
        console.warn("Image src load failed:", srcUrl.slice(0, 60), e);
        onFail();
      };
      
      img.src = srcUrl;
    };

    // Trigger sequential attempts
    tryLoadImage(blobUrl, 
      // Success with Blob URL
      () => {
        URL.revokeObjectURL(blobUrl);
      },
      // Fail with Blob URL -> Try Base64 Data URI
      () => {
        URL.revokeObjectURL(blobUrl);
        if (dataUri) {
          tryLoadImage(dataUri,
            // Success with Data URI
            () => {},
            // Fail with Data URI -> Final Fallback: Download as SVG
            () => triggerSvgDownload()
          );
        } else {
          triggerSvgDownload();
        }
      }
    );

    function triggerSvgDownload() {
      console.warn("PNG download completely failed. Falling back to direct SVG file download.");
      const fallbackBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      const a = document.createElement("a");
      a.href = fallbackUrl;
      a.download = `${blog.slug || "meridian-banner"}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(fallbackUrl), 100);
    }
  };

  // Load preloaded articles and any custom user generated articles from Firestore via Server API, and LocalStorage
  const loadBlogs = async () => {
    // 1. Get initial local custom blogs from localStorage as a local cache
    let localCustomBlogs: BlogPost[] = [];
    const saved = localStorage.getItem("meridian_blogs_saved");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BlogPost[];
        localCustomBlogs = parsed.filter(cb => cb && cb.id && !PRELOADED_BLOGS.some(pb => pb.id === cb.id));
      } catch (err) {
        console.error("Failed to parse local custom blogs:", err);
      }
    }

    // Immediately render local cache + preloaded blogs so the user sees blogs instantly
    const initialBlogs = [...localCustomBlogs, ...PRELOADED_BLOGS];
    setBlogs(initialBlogs);

    // Handle deep linking via path /blog/:id or query parameter on load (initial pass)
    const getBlogIdFromUrl = () => {
      const pathParts = window.location.pathname.split("/");
      if (pathParts[1] === "blog" && pathParts[2]) {
        return decodeURIComponent(pathParts[2]);
      }
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get("blog") || searchParams.get("id");
    };

    const blogId = getBlogIdFromUrl();
    if (blogId) {
      const found = initialBlogs.find(b => b.id === blogId || b.slug === blogId);
      if (found) {
        setActiveBlog(found);
      }
    }

    let serverBlogs: BlogPost[] = [];
    let fetchError = false;

    // 2. Fetch custom blogs from secure server-side API (which connects directly to Firestore securely)
    try {
      const response = await fetch("/api/blogs");
      if (response.ok) {
        const data = await response.json();
        serverBlogs = (data.blogs || []).filter((b: BlogPost) => b && b.id && !PRELOADED_BLOGS.some(pb => pb.id === b.id));
      } else {
        console.warn(`Server API responded with code ${response.status}. Using local cache fallback.`);
        fetchError = true;
      }
    } catch (err) {
      console.error("Failed to fetch custom blogs from server API:", err);
      fetchError = true;
    }

    // 3. Merge lists using a Map keyed by id to avoid duplicates
    const mergedMap = new Map<string, BlogPost>();
    
    // Add local blogs first
    localCustomBlogs.forEach(blog => {
      mergedMap.set(blog.id, blog);
    });

    // Add server blogs (they take precedence or supplement)
    serverBlogs.forEach(blog => {
      mergedMap.set(blog.id, blog);
    });

    const mergedCustomBlogs = Array.from(mergedMap.values());

    // Sort them by id descending (newer timestamped generated IDs first)
    mergedCustomBlogs.sort((a, b) => {
      const timeA = parseInt(a.id.replace("generated-", "")) || 0;
      const timeB = parseInt(b.id.replace("generated-", "")) || 0;
      return timeB - timeA;
    });

    // 4. Proactively call the server sync endpoint to sync Firestore and server-side cache with any local-only cache blogs
    if (!fetchError) {
      try {
        const response = await fetch("/api/blogs/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blogs: mergedCustomBlogs })
        });
        if (response.ok) {
          const data = await response.json();
          const syncedBlogs = (data.blogs || []).filter((b: BlogPost) => b && b.id && !PRELOADED_BLOGS.some(pb => pb.id === b.id));
          
          // Update state and local storage with the fully synced server list
          const allBlogs = [...syncedBlogs, ...PRELOADED_BLOGS];
          setBlogs(allBlogs);
          localStorage.setItem("meridian_blogs_saved", JSON.stringify(syncedBlogs));

          // Handle deep linking again in case new blogs were fetched from Firestore
          const refreshedBlogId = getBlogIdFromUrl();
          if (refreshedBlogId) {
            const found = allBlogs.find(b => b.id === refreshedBlogId || b.slug === refreshedBlogId);
            if (found) {
              setActiveBlog(found);
            }
          }
          return;
        }
      } catch (err) {
        console.error("Failed to sync server backup JSON:", err);
      }
    }

    // Fallback: update state and local storage with the merged local/offline list
    const allBlogs = [...mergedCustomBlogs, ...PRELOADED_BLOGS];
    setBlogs(allBlogs);
    localStorage.setItem("meridian_blogs_saved", JSON.stringify(mergedCustomBlogs));

    // Handle deep linking again
    const refreshedBlogId = getBlogIdFromUrl();
    if (refreshedBlogId) {
      const found = allBlogs.find(b => b.id === refreshedBlogId || b.slug === refreshedBlogId);
      if (found) {
        setActiveBlog(found);
      }
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // Check if there is a publish_draft URL parameter and publish it on load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const publishId = searchParams.get("publish_draft");
    if (publishId) {
      const handlePublishOnLoad = async () => {
        try {
          const res = await fetch("/api/blogs/publish-draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: publishId })
          });
          if (res.ok) {
            const data = await res.json();
            // Clear URL parameter
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, "", newUrl);
            await loadBlogs();
            if (data.blog) {
              setActiveBlog(data.blog);
            }
          }
        } catch (err) {
          console.error("Error publishing draft on load:", err);
        }
      };
      handlePublishOnLoad();
    }
  }, []);

  // Update URL pathname / search parameters when activeBlog changes
  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    
    if (activeBlog) {
      const targetPath = `/blog/${activeBlog.slug || activeBlog.id}`;
      // Push history only if path is different or we are switching away from search parameters
      if (currentPath !== targetPath || currentSearch !== "") {
        window.history.pushState({}, "", targetPath);
      }
    } else {
      const targetPath = "/";
      if (currentPath !== targetPath || currentSearch !== "") {
        window.history.pushState({}, "", targetPath);
      }
    }
  }, [activeBlog]);

  // Synchronize activeBlog with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (blogs.length === 0) return;
      const pathParts = window.location.pathname.split("/");
      let targetBlogId = "";
      if (pathParts[1] === "blog" && pathParts[2]) {
        targetBlogId = decodeURIComponent(pathParts[2]);
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        targetBlogId = searchParams.get("blog") || searchParams.get("id") || "";
      }

      if (targetBlogId) {
        const found = blogs.find(b => b.id === targetBlogId || b.slug === targetBlogId);
        if (found) {
          setActiveBlog(found);
          return;
        }
      }
      setActiveBlog(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [blogs]);

  // Load hidden blog IDs from LocalStorage
  useEffect(() => {
    const savedHidden = localStorage.getItem("meridian_hidden_blogs");
    if (savedHidden) {
      try {
        setHiddenBlogIds(JSON.parse(savedHidden));
      } catch (err) {
        console.error("Failed to parse hidden blog IDs:", err);
      }
    }
  }, []);

  const handleToggleHideBlog = (id: string) => {
    setHiddenBlogIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("meridian_hidden_blogs", JSON.stringify(updated));
      return updated;
    });
  };

  const handleBlogGenerated = async (newBlog: BlogPost) => {
    const updatedBlogs = [newBlog, ...blogs.filter(b => b.id !== newBlog.id)];
    setBlogs(updatedBlogs);
    
    // Save generated blogs to LocalStorage as a local backup
    const customBlogs = updatedBlogs.filter(b => !PRELOADED_BLOGS.some(pb => pb.id === b.id));
    localStorage.setItem("meridian_blogs_saved", JSON.stringify(customBlogs));
    
    // Proactively trigger sync to the server API and Firestore securely in the background
    try {
      await fetch("/api/blogs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogs: customBlogs })
      });
      console.log("Successfully synced generated blog to the server/Firestore");
    } catch (err) {
      console.error("Failed to sync generated blog to server/Firestore:", err);
    }
    
    setIsCreateOpen(false);
    setActiveBlog(newBlog); // Automatically open the new blog
  };

  const handleRemoveBlog = async (id: string, password?: string): Promise<boolean> => {
    // Delete from server-side fallback JSON and secure Firestore via Server API
    try {
      const response = await fetch(`/api/blogs/${id}`, { 
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Deletion-Password": password || ""
        }
      });
      if (!response.ok) {
        return false;
      }
    } catch (err) {
      console.error("Failed to delete blog from server:", err);
      return false;
    }

    const updatedBlogs = blogs.filter(b => b.id !== id);
    setBlogs(updatedBlogs);
    const customBlogs = updatedBlogs.filter(b => !PRELOADED_BLOGS.some(pb => pb.id === b.id));
    localStorage.setItem("meridian_blogs_saved", JSON.stringify(customBlogs));
    if (activeBlog?.id === id) {
      setActiveBlog(null);
    }
    if (activeAudioBlog?.id === id) {
      setActiveAudioBlog(null);
    }
    return true;
  };

  // Get all unique tags from active blogs
  const allTags = Array.from(new Set(blogs.flatMap((b) => b.tags)));

  // Filtered list of blogs based on search and selected tag
  const filteredBlogs = blogs.filter((b) => {
    // Skip hidden blogs from the public feed unless in editor mode
    if (!isEditorMode && hiddenBlogIds.includes(b.id)) return false;

    // Skip draft options (they are published via the daily dispatch flow)
    if (b.status === "draft_option") return false;

    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? b.tags.includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  });

  if (portalToken) {
    return (
      <PasskeyPortal 
        token={portalToken} 
        type={portalType} 
        onClose={() => {
          setPortalToken(null);
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 flex flex-col font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 selection:text-black dark:selection:text-white pb-16 text-neutral-900 dark:text-neutral-100 transition-colors duration-300 relative overflow-hidden">
      {/* Technical background grid & ambient light accents */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808007_1px,transparent_1px),linear-gradient(to_bottom,#80808007_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-neutral-200/15 via-transparent to-transparent dark:from-neutral-900/10 pointer-events-none -z-10 blur-3xl" />

      <Navbar 
        onOpenCreate={() => setIsCreateOpen(true)} 
        onOpenAbout={() => setIsAboutOpen(true)} 
        isEditorMode={isEditorMode}
        onToggleEditorMode={handleToggleEditorMode}
        onHome={() => setActiveBlog(null)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === "light" ? "dark" : "light")}
      />

      {/* Dynamic Scroll Progress Indicator for active blog reading */}
      {activeBlog && (
        <div className="fixed top-20 left-0 w-full h-[3.5px] bg-neutral-100/70 dark:bg-neutral-900/50 z-50 pointer-events-none shadow-sm">
          <div 
            className="h-full bg-gradient-to-r from-neutral-800 via-neutral-950 to-black dark:from-neutral-400 dark:via-neutral-200 dark:to-white transition-all duration-100 ease-out rounded-r-full"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {!activeBlog ? (
            /* HOMEPAGE VIEW: Grid list of publications */
            <motion.div
              key="grid-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              {/* Scholarly Hero Header */}
              <div className="text-center max-w-3xl mx-auto mb-14 space-y-6 relative">
                {/* Micro Ambient Glow */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-neutral-200/40 dark:bg-neutral-800/10 rounded-full blur-3xl -z-10 pointer-events-none" />

                <div className="neon-ring-wrapper">
                  <div className="neon-ring-content gap-2 px-4 py-1.5 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold tracking-widest uppercase">
                    <Compass className="w-3.5 h-3.5 text-black dark:text-white animate-spin-slow" />
                    Active Peer-Reviewed Translations
                  </div>
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold italic text-black dark:text-white tracking-tight leading-[1.12]">
                  Symmetry-Preserving <span className="not-italic font-sans font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400">Research</span> Journal
                </h1>
                
                <div className="glitch-wrapper">
                  <div className="glitch-text" data-text="Code is Abundant. Operational Stability is Scarce.">
                    Code is Abundant. Operational Stability is Scarce.
                  </div>
                </div>
                
                <p className="text-gray-500 dark:text-neutral-400 text-sm sm:text-base md:text-lg leading-relaxed font-light max-w-2xl mx-auto mt-2">
                  Bridging complex physics, deep learning, and advanced quantum optimization papers into highly visual, technical editorial publications.
                </p>

                {/* Elegant academic dual rule separator */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="h-[1px] w-12 bg-neutral-200 dark:bg-neutral-800" />
                  <div className="w-1.5 h-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent" />
                  <div className="h-[1px] w-12 bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>

              {/* Simplified Search and Topic Filter Bar */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm mb-12">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <div className="relative w-full lg:flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search publications by keyword, equations, or models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-neutral-50/60 dark:bg-neutral-950/40 border border-gray-100 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-neutral-700 focus:bg-white dark:focus:bg-neutral-950 text-sm transition-all dark:text-neutral-100 dark:placeholder-neutral-500"
                    />
                  </div>
                  
                  {/* Scrollable tag list */}
                  <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto no-scrollbar py-1">
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                        !selectedTag
                          ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                          : "bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-750"
                      }`}
                    >
                      All Topics
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                          selectedTag === tag
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                            : "bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-750"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid or Empty state layout */}
              <div className="max-w-7xl mx-auto w-full relative">
                <div className="space-y-8">
                  {filteredBlogs.length > 0 ? (
                    <>
                      {/* Premium Featured Section (Only when no search or topic filter is active) */}
                      {!searchQuery && !selectedTag && (
                        <div className="mb-12">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">
                              Featured Editorial Publication
                            </h4>
                          </div>

                          {(() => {
                            const blog = filteredBlogs[0];
                            const isHidden = hiddenBlogIds.includes(blog.id);
                            const isPreloaded = !blog.id.startsWith("generated");
                            return (
                              <div className={`relative group transition-all duration-300 ${isHidden ? "opacity-60 saturate-50" : ""}`}>
                                <div
                                  onClick={() => {
                                    setActiveBlog(blog);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }}
                                  className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-5 md:p-6 flex flex-col lg:flex-row gap-6 items-stretch cursor-pointer shadow-[0_2px_12px_-3px_rgba(0,0,0,0.015)]"
                                >
                                  {/* Featured Graphic Thumbnail */}
                                  <div className="w-full lg:w-[32%] rounded-xl overflow-hidden bg-[#0a1128] flex-shrink-0 aspect-[16/10] lg:aspect-auto flex items-center justify-center relative min-h-[180px]">
                                    <div 
                                      className="w-full h-full transform group-hover:scale-[1.02] transition-transform duration-500 pointer-events-none"
                                      dangerouslySetInnerHTML={{ __html: blog.bannerSvg }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                                  </div>

                                  {/* Featured Content details */}
                                  <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div className="space-y-3">
                                      {/* Tags and badge */}
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-extrabold uppercase tracking-widest rounded-full border border-amber-500/10">
                                          ★ Current Issue
                                        </span>
                                        {blog.tags.slice(0, 2).map((tag) => (
                                          <span
                                            key={tag}
                                            className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[8px] font-extrabold uppercase tracking-widest rounded-full border border-neutral-200/20"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Title */}
                                      <h3 className="text-xl sm:text-2xl font-serif font-bold italic tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white transition-colors leading-[1.25]">
                                        {blog.title}
                                      </h3>

                                      {/* Excerpt */}
                                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-light line-clamp-3">
                                        {blog.excerpt}
                                      </p>
                                    </div>

                                    {/* Footer Details */}
                                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-4 flex flex-wrap gap-4 items-center justify-between text-[9px] font-bold font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                      <div className="flex gap-4">
                                        <span>{blog.date}</span>
                                        <span>•</span>
                                        <span>{blog.readingTime}</span>
                                      </div>
                                      <span className="text-[11px] font-bold text-black dark:text-white border-b-2 border-transparent group-hover:border-black dark:group-hover:border-white transition-all flex items-center gap-1.5 pb-0.5 font-sans">
                                        Read Featured Publication
                                        <BookOpen className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Hidden Status indicator badge */}
                                {isHidden && (
                                  <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500/90 text-white text-[9px] font-extrabold rounded-full font-mono uppercase tracking-widest shadow-sm pointer-events-none z-10">
                                    Hidden from Feed
                                  </div>
                                )}

                                {/* Editor Actions Overlay */}
                                {isEditorMode && (
                                  <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10 animate-fade-in">
                                    {isPreloaded ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleHideBlog(blog.id);
                                        }}
                                        title={isHidden ? "Restore/Unhide publication" : "Hide publication"}
                                        className={`p-2.5 rounded-full shadow-lg border cursor-pointer transition-all ${
                                          isHidden
                                            ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700"
                                            : "bg-neutral-900/90 border-neutral-800 text-white hover:bg-black"
                                        }`}
                                      >
                                        {isHidden ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteBlogId(blog.id);
                                        }}
                                        title="Delete custom publication"
                                        className="p-2.5 bg-red-600 border border-red-500 hover:bg-red-700 text-white rounded-full shadow-lg cursor-pointer transition-colors"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Heading for other publications */}
                      {!searchQuery && !selectedTag && filteredBlogs.length > 1 && (
                        <div className="flex items-center gap-3 pt-6 pb-2">
                          <h4 className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">
                            Recent Publications ({filteredBlogs.length - 1})
                          </h4>
                          <div className="flex-1 h-[1px] bg-neutral-200/60 dark:bg-neutral-800" />
                        </div>
                      )}

                      {/* Standard Grid mapping */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {( !searchQuery && !selectedTag
                          ? filteredBlogs.slice(1)
                          : filteredBlogs
                        ).map((blog) => {
                          const isHidden = hiddenBlogIds.includes(blog.id);
                          const isPreloaded = !blog.id.startsWith("generated");
                          return (
                            <div 
                              key={blog.id} 
                              className={`relative group transition-all duration-300 ${
                                isHidden ? "opacity-60 saturate-50" : ""
                              }`}
                            >
                              <BlogPostCard blog={blog} onClick={() => {
                                setActiveBlog(blog);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }} />

                              {/* Hidden Status indicator badge */}
                              {isHidden && (
                                <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500/90 text-white text-[9px] font-extrabold rounded-full font-mono uppercase tracking-widest shadow-sm pointer-events-none z-10">
                                  Hidden from Feed
                                </div>
                              )}

                              {/* Action overlay controls when Editor Mode is active */}
                              {isEditorMode && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10 animate-fade-in">
                                  {isPreloaded ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleHideBlog(blog.id);
                                      }}
                                      title={isHidden ? "Restore/Unhide publication" : "Hide publication"}
                                      className={`p-2.5 rounded-full shadow-lg border cursor-pointer transition-all ${
                                        isHidden
                                          ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700"
                                          : "bg-neutral-900/90 border-neutral-800 text-white hover:bg-black"
                                      }`}
                                    >
                                      {isHidden ? (
                                        // Unhide/restore icon (eye)
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      ) : (
                                        // Trash/hide icon
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteBlogId(blog.id);
                                      }}
                                      title="Delete custom publication"
                                      className="p-2.5 bg-red-600 border border-red-500 hover:bg-red-700 text-white rounded-full shadow-lg cursor-pointer transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm">
                      <Newspaper className="w-12 h-12 text-gray-300 dark:text-neutral-700 mx-auto mb-4" />
                      <h3 className="text-md font-bold text-gray-900 dark:text-neutral-100 font-serif italic">No publications found</h3>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2 leading-relaxed">
                        We couldn't find any articles matching your filters. Try checking spelling or click below to generate a new post from arXiv.
                      </p>
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="mt-6 px-6 py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-full text-xs font-bold transition-all flex items-center gap-2 mx-auto cursor-pointer shadow-sm active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-white dark:text-black fill-white/20" />
                        Generate brand new post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* DETAILED SINGLE PUBLICATION SHEET VIEW */
            <motion.div
              key="article-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col"
            >
              
              {/* PREMIUM SCHOLARLY FULL-BLEED HEADER BANNER */}
              <div className="w-full bg-white dark:bg-neutral-900/20 text-black dark:text-white py-12 md:py-16 relative overflow-hidden border-b border-gray-100 dark:border-neutral-900 transition-colors">
                {/* Ambient soft vector grid background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  
                  {/* Floating Action Header Bar */}
                  <div className="flex items-center justify-between mb-10">
                    <button
                      onClick={() => setActiveBlog(null)}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-full text-xs text-black dark:text-white transition-all font-mono font-bold uppercase tracking-wider border border-gray-200 dark:border-neutral-800 shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Publications
                    </button>
                    
                    <span className="font-mono text-[10px] sm:text-xs text-black dark:text-white font-extrabold uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-neutral-800 transition-colors">
                      MERIDIAN PUBLICATION REVIEW // PEER TRANSLATED
                    </span>
                  </div>

                  {/* Two-Column Responsive Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    
                    {/* Left Column: Metadata & Title info */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Tags chips */}
                      <div className="flex flex-wrap gap-2">
                        {activeBlog.tags.map((tag, idx) => {
                          const colors = idx % 2 === 0 ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300" : "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300";
                          return (
                            <span
                              key={tag}
                              className={`px-3.5 py-1 ${colors} text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>

                      {/* Header Title & Subtitle */}
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold italic tracking-tight leading-[1.1] text-black dark:text-white">
                        {activeBlog.title}
                      </h1>
                      
                      <p className="text-gray-600 dark:text-neutral-300 text-sm sm:text-base leading-relaxed font-light">
                        {activeBlog.excerpt}
                      </p>

                      {/* Publication author details */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold font-mono text-gray-400 dark:text-neutral-500 uppercase tracking-widest pt-2">
                        <div>
                          <span className="text-gray-400 dark:text-neutral-500 mr-1.5">Reviewer:</span>
                          <span className="text-black dark:text-white font-extrabold">{activeBlog.author}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 dark:text-neutral-500 mr-1.5">Date:</span>
                          <span className="text-black dark:text-white">{activeBlog.date}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 dark:text-neutral-500 mr-1.5">Duration:</span>
                          <span className="text-black dark:text-white">{activeBlog.readingTime}</span>
                        </div>
                      </div>

                      {/* CTA Action Buttons */}
                      <div className="flex flex-wrap items-center gap-4 pt-3">
                        <button
                          onClick={() => setActiveAudioBlog(activeBlog)}
                          className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Headset className="w-4 h-4 text-white dark:text-black fill-current" />
                          Listen to this Article
                        </button>
                        
                        <a
                          href={activeBlog.arxivLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 border border-black dark:border-neutral-700 px-6 py-2.5 rounded-full text-xs font-bold hover:bg-gray-50 dark:hover:bg-neutral-900 text-black dark:text-white transition-all cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4 text-black dark:text-white" />
                          Source arXiv Paper
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400" />
                        </a>
                      </div>

                    </div>

                    {/* Right Column: Dynamic Glowing Banner SVG Illustration */}
                    <div className="lg:col-span-5 flex flex-col items-center gap-4 justify-center">
                      <div className="w-full max-w-[440px] h-auto p-2 bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
                        <div 
                          className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-inner pointer-events-none"
                          dangerouslySetInnerHTML={{ __html: activeBlog.bannerSvg }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-center gap-2 w-full max-w-[440px]">
                        <button
                          onClick={() => {
                            if (!activeBlog?.bannerSvg) return;
                            const blob = new Blob([activeBlog.bannerSvg], { type: "image/svg+xml" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${activeBlog.slug || "meridian-banner"}.svg`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          title="Download banner as SVG"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
                        >
                          <Download className="w-3.5 h-3.5" />
                          SVG
                        </button>
                        
                        <button
                          onClick={() => handleDownloadPng(activeBlog)}
                          title="Download banner as PNG"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PNG
                        </button>

                        <button
                          onClick={() => setIsLinkedInModalOpen(true)}
                          title="Draft & Share on LinkedIn"
                          className="p-2.5 bg-[#0077b5] hover:bg-[#006297] text-white rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer border border-[#0077b5]/10 flex items-center justify-center shrink-0"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* MAIN SCHOLARLY ARTICLE BODY VIEW CONTAINER */}
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <article className="prose prose-slate max-w-none md:prose-lg bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-xl shadow-gray-200/10 dark:shadow-none p-4 sm:p-12 relative overflow-hidden transition-colors">
                  
                  {/* Abstract quote callout */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-black dark:bg-white" />
                  
                  <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-black dark:text-white uppercase tracking-widest mb-6">
                    <Newspaper className="w-4 h-4 text-black dark:text-white" />
                    Full Editorial Analysis
                  </div>

                  {/* Render the math rich markdown article */}
                  <MathRenderer text={activeBlog.content} />
                  
                  {/* Article footer sign-off */}
                  <div className="border-t border-gray-100 dark:border-neutral-800 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black dark:bg-neutral-800 flex items-center justify-center text-white dark:text-neutral-100 text-md font-bold font-serif italic">M</div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-neutral-200">Meridian Research Editorial</p>
                        <p className="text-[10px] text-gray-400 dark:text-neutral-500">Copyright © {new Date().getFullYear()} Meridian. All rights reserved.</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setActiveBlog(null);
                      }}
                      className="px-6 py-2.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Back to Publications
                    </button>
                  </div>
                </article>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING AUDIO TTS VOICE PLAYER BAR */}
      {activeAudioBlog && (
        <AudioPlayer
          blog={activeAudioBlog}
          onClose={() => setActiveAudioBlog(null)}
        />
      )}

      {/* CREATION/GENERATOR DIALOG PANEL OVERLAY */}
      {isCreateOpen && (
        <ArxivGenerator
          onClose={() => {
            setIsCreateOpen(false);
            setInitialArxivId("");
          }}
          onBlogGenerated={handleBlogGenerated}
          editorPassword={editorPassword}
          initialArxivId={initialArxivId}
          historyCount={blogs.length}
        />
      )}

      {/* LINKEDIN SHARE COMPANION OVERLAY */}
      {activeBlog && (
        <LinkedInShareModal
          isOpen={isLinkedInModalOpen}
          onClose={() => setIsLinkedInModalOpen(false)}
          title={activeBlog.title}
          excerpt={activeBlog.excerpt}
          arxivLink={activeBlog.arxivLink}
          blogId={activeBlog.slug || activeBlog.id}
          onDownloadPng={() => handleDownloadPng(activeBlog)}
        />
      )}

      {/* DELETION PASSWORD VERIFICATION MODAL */}
      <DeletePasswordModal
        isOpen={deleteBlogId !== null}
        onClose={() => setDeleteBlogId(null)}
        onConfirm={async (password) => {
          if (!deleteBlogId) return false;
          return await handleRemoveBlog(deleteBlogId, password);
        }}
      />

      {/* ABOUT MODAL DETAIL */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        isEditorMode={isEditorMode}
      />

      {/* EDITOR PASSWORD MODAL */}
      <EditorPasswordModal
        isOpen={isEditorPasswordModalOpen}
        onClose={() => setIsEditorPasswordModalOpen(false)}
        titleText="Activate Editor Mode"
        onConfirm={(pwd) => {
          setIsEditorMode(true);
          setEditorPassword(pwd);
          setIsEditorPasswordModalOpen(false);
        }}
      />
    </div>
  );
}
