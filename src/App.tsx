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
import { db, handleFirestoreError, OperationType } from "./lib/googleAuth";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

export default function App() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [activeBlog, setActiveBlog] = useState<BlogPost | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeAudioBlog, setActiveAudioBlog] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);

  const handleDownloadPng = (blog: BlogPost) => {
    if (!blog?.bannerSvg) return;
    
    let svgString = blog.bannerSvg;
    if (!svgString.includes("xmlns=")) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
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
            URL.revokeObjectURL(pngUrl);
          }
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    
    img.onerror = (e) => {
      console.error("SVG to PNG conversion image failed to load:", e);
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  // Load preloaded articles and any custom user generated articles from Firestore, Server, and LocalStorage
  useEffect(() => {
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

      let firestoreBlogs: BlogPost[] = [];
      let firestoreError = false;

      // 2. Fetch custom blogs from secure Firestore cloud database
      try {
        const querySnapshot = await getDocs(collection(db, "blogs"));
        querySnapshot.forEach((docSnap) => {
          const blogData = docSnap.data() as BlogPost;
          if (blogData && blogData.id) {
            firestoreBlogs.push(blogData);
          }
        });
      } catch (err) {
        console.error("Failed to fetch custom blogs from Firestore:", err);
        firestoreError = true;
        handleFirestoreError(err, OperationType.GET, "blogs");
      }

      // 3. Merge lists using a Map keyed by id to avoid duplicates
      const mergedMap = new Map<string, BlogPost>();
      
      // Add local blogs first
      localCustomBlogs.forEach(blog => {
        mergedMap.set(blog.id, blog);
      });

      // Add firestore blogs (they take precedence or supplement)
      firestoreBlogs.forEach(blog => {
        mergedMap.set(blog.id, blog);
      });

      const mergedCustomBlogs = Array.from(mergedMap.values());

      // Sort them by id descending (newer timestamped generated IDs first)
      mergedCustomBlogs.sort((a, b) => {
        const timeA = parseInt(a.id.replace("generated-", "")) || 0;
        const timeB = parseInt(b.id.replace("generated-", "")) || 0;
        return timeB - timeA;
      });

      // 4. Proactively upload any local-only cache blogs to Firestore so they are never lost
      if (!firestoreError) {
        for (const blog of mergedCustomBlogs) {
          const isOnlyLocal = !firestoreBlogs.some(fb => fb.id === blog.id);
          if (isOnlyLocal) {
            try {
              await setDoc(doc(db, "blogs", blog.id), blog);
              console.log(`Successfully backed up local blog "${blog.title}" to cloud Firestore.`);
            } catch (err) {
              console.error(`Failed to back up local blog "${blog.title}" to Firestore:`, err);
              handleFirestoreError(err, OperationType.WRITE, `blogs/${blog.id}`);
            }
          }
        }
      }

      // Update state and local storage immediately with the synced list
      setBlogs([...mergedCustomBlogs, ...PRELOADED_BLOGS]);
      localStorage.setItem("meridian_blogs_saved", JSON.stringify(mergedCustomBlogs));

      // 5. Call the server sync endpoint to ensure the server's ephemeral JSON backup is also in sync
      try {
        await fetch("/api/blogs/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blogs: mergedCustomBlogs })
        });
      } catch (err) {
        console.error("Failed to sync server backup JSON:", err);
      }
    };

    loadBlogs();
  }, []);

  const handleBlogGenerated = async (newBlog: BlogPost) => {
    // 1. Save to cloud Firestore immediately
    try {
      await setDoc(doc(db, "blogs", newBlog.id), newBlog);
      console.log("Successfully saved new blog to Cloud Firestore.");
    } catch (err) {
      console.error("Failed to save new blog to Firestore:", err);
      handleFirestoreError(err, OperationType.WRITE, `blogs/${newBlog.id}`);
    }

    const updatedBlogs = [newBlog, ...blogs.filter(b => b.id !== newBlog.id)];
    setBlogs(updatedBlogs);
    
    // Save generated blogs to LocalStorage as a local backup
    const customBlogs = updatedBlogs.filter(b => !PRELOADED_BLOGS.some(pb => pb.id === b.id));
    localStorage.setItem("meridian_blogs_saved", JSON.stringify(customBlogs));
    
    setIsCreateOpen(false);
    setActiveBlog(newBlog); // Automatically open the new blog
  };

  const handleRemoveBlog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this generated blog post?")) {
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

      // 1. Delete from Cloud Firestore
      try {
        await deleteDoc(doc(db, "blogs", id));
        console.log("Successfully deleted blog from Cloud Firestore.");
      } catch (err) {
        console.error("Failed to delete blog from Firestore:", err);
        handleFirestoreError(err, OperationType.DELETE, `blogs/${id}`);
      }

      // 2. Delete from server persistent JSON fallback
      try {
        await fetch(`/api/blogs/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete blog from server JSON:", err);
      }
    }
  };

  // Get all unique tags from active blogs
  const allTags = Array.from(new Set(blogs.flatMap((b) => b.tags)));

  // Filtered list based on search and selected tags
  const filteredBlogs = blogs.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? b.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-neutral-200 selection:text-black pb-16">
      <Navbar onOpenCreate={() => setIsCreateOpen(true)} />

      {/* Main Content Body */}
      <main className="flex-1">
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
              <div className="text-center max-w-3xl mx-auto mb-14 space-y-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-50 border border-gray-100 rounded-full text-neutral-600 text-[10px] font-bold tracking-widest uppercase">
                  <Compass className="w-3.5 h-3.5 text-black animate-spin-slow" />
                  Active Peer-Reviewed Translations
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold italic text-black tracking-tight leading-[1.1]">
                  Symmetry-Preserving Research Blog
                </h1>
                <p className="text-gray-500 text-sm sm:text-base md:text-lg leading-relaxed font-light max-w-2xl mx-auto">
                  Bridging complex physics, deep learning, and advanced quantum optimization papers into highly visual, technical editorial publications.
                </p>
              </div>

              {/* Advanced Search and Filter Bar */}
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-12 flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search publications by keyword, equations, or models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-neutral-50/60 border border-gray-100 outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white text-sm transition-all"
                  />
                </div>
                
                {/* Scrollable tag list */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                      !selectedTag
                        ? "bg-black text-white shadow-sm"
                        : "bg-neutral-100 text-gray-600 hover:bg-neutral-200"
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
                          ? "bg-black text-white shadow-sm"
                          : "bg-neutral-100 text-gray-600 hover:bg-neutral-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid or Empty state layout */}
              <div className="max-w-7xl mx-auto w-full">
                <div className="space-y-8">
                  {filteredBlogs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredBlogs.map((blog) => (
                        <div key={blog.id} className="relative group">
                          <BlogPostCard blog={blog} onClick={() => {
                            setActiveBlog(blog);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }} />
                          {/* Delete button for custom generated blogs */}
                          {blog.id.startsWith("generated") && (
                            <button
                              onClick={(e) => handleRemoveBlog(blog.id, e)}
                              title="Delete generated post"
                              className="absolute top-4 right-4 p-2.5 bg-neutral-900/90 hover:bg-black text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-gray-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm">
                      <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-md font-bold text-gray-900 font-serif italic">No publications found</h3>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        We couldn't find any articles matching your filters. Try checking spelling or click below to generate a new post from arXiv.
                      </p>
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="mt-6 px-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 mx-auto cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 text-white fill-white/20" />
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
              <div className="w-full bg-white text-black py-12 md:py-16 relative overflow-hidden border-b border-gray-100">
                {/* Ambient soft vector grid background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  
                  {/* Floating Action Header Bar */}
                  <div className="flex items-center justify-between mb-10">
                    <button
                      onClick={() => setActiveBlog(null)}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-white hover:bg-neutral-50 rounded-full text-xs text-black transition-all font-mono font-bold uppercase tracking-wider border border-gray-200 shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Publications
                    </button>
                    
                    <span className="font-mono text-[10px] sm:text-xs text-black font-extrabold uppercase tracking-widest bg-neutral-100 px-3.5 py-1.5 rounded-full border border-gray-200">
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
                          const colors = idx % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600";
                          return (
                            <span
                              key={tag}
                              className={`px-3.5 py-1 ${colors} text-[10px] font-bold uppercase tracking-widest rounded-full`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>

                      {/* Header Title & Subtitle */}
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold italic tracking-tight leading-[1.1] text-black">
                        {activeBlog.title}
                      </h1>
                      
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed font-light">
                        {activeBlog.excerpt}
                      </p>

                      {/* Publication author details */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest pt-2">
                        <div>
                          <span className="text-gray-400 mr-1.5">Reviewer:</span>
                          <span className="text-black font-extrabold">{activeBlog.author}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 mr-1.5">Date:</span>
                          <span className="text-black">{activeBlog.date}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 mr-1.5">Duration:</span>
                          <span className="text-black">{activeBlog.readingTime}</span>
                        </div>
                      </div>

                      {/* CTA Action Buttons */}
                      <div className="flex flex-wrap items-center gap-4 pt-3">
                        <button
                          onClick={() => setActiveAudioBlog(activeBlog)}
                          className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Headset className="w-4 h-4 text-white fill-current" />
                          Listen to this Article
                        </button>
                        
                        <a
                          href={activeBlog.arxivLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 border border-black px-6 py-2.5 rounded-full text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4 text-black" />
                          Source arXiv Paper
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        </a>
                      </div>

                    </div>

                    {/* Right Column: Dynamic Glowing Banner SVG Illustration */}
                    <div className="lg:col-span-5 flex flex-col items-center gap-4 justify-center">
                      <div className="w-full max-w-[440px] h-auto p-2 bg-white rounded-3xl border border-gray-100 shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
                        <div 
                          className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-inner pointer-events-none"
                          dangerouslySetInnerHTML={{ __html: activeBlog.bannerSvg }}
                        />
                      </div>
                      
                      <div className="flex flex-col w-full max-w-[440px] gap-3">
                        <div className="grid grid-cols-2 gap-3 w-full">
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
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 hover:text-black rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer border border-neutral-200/60"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download SVG
                          </button>
                          
                          <button
                            onClick={() => handleDownloadPng(activeBlog)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PNG
                          </button>
                        </div>
                        
                        <button
                          onClick={() => setIsLinkedInModalOpen(true)}
                          className="flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-[#0077b5] hover:bg-[#006297] text-white rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer border border-[#0077b5]/10"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          Draft & Share on LinkedIn
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* MAIN SCHOLARLY ARTICLE BODY VIEW CONTAINER */}
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <article className="prose prose-slate max-w-none md:prose-lg bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/10 p-4 sm:p-12 relative overflow-hidden">
                  
                  {/* Abstract quote callout */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-black" />
                  
                  <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-black uppercase tracking-widest mb-6">
                    <Newspaper className="w-4 h-4 text-black" />
                    Full Editorial Analysis
                  </div>

                  {/* Render the math rich markdown article */}
                  <MathRenderer text={activeBlog.content} />
                  
                  {/* Article footer sign-off */}
                  <div className="border-t border-gray-100 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-md font-bold font-serif italic">M</div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">Meridian Research Editorial</p>
                        <p className="text-[10px] text-gray-400">Copyright © {new Date().getFullYear()} Meridian. All rights reserved.</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setActiveBlog(null);
                      }}
                      className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm"
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
          onClose={() => setIsCreateOpen(false)}
          onBlogGenerated={handleBlogGenerated}
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
          onDownloadPng={() => handleDownloadPng(activeBlog)}
        />
      )}
    </div>
  );
}
