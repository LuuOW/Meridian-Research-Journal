import React from "react";
import { BlogPost } from "../types";
import { BookOpen, Calendar, Clock } from "lucide-react";

interface BlogPostCardProps {
  blog: BlogPost;
}

export const BlogPostCard: React.FC<BlogPostCardProps & { onClick: () => void }> = ({ blog, onClick }) => {
  return (
    <article
      onClick={onClick}
      className="group bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer"
    >
      
      {/* Banner / Graphic Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0a1128] flex-shrink-0">
        <div 
          className="w-full h-full transform group-hover:scale-[1.03] transition-transform duration-500 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: blog.bannerSvg }}
        />
        {/* Soft overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Content panel */}
      <div className="p-7 flex flex-col flex-grow">
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-[10px] font-bold font-mono text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-3.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-300 dark:text-neutral-700" />
            {blog.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-neutral-700" />
            {blog.readingTime}
          </span>
        </div>

        {/* Title and Excerpt */}
        <h3 className="text-xl font-serif font-bold italic tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white transition-colors leading-[1.25] mb-3">
          {blog.title}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-neutral-400 leading-relaxed mb-6 flex-grow line-clamp-3">
          {blog.excerpt}
        </p>

        {/* Divider & Footer Tags */}
        <div className="border-t border-gray-100 dark:border-neutral-800 pt-5 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {blog.tags.slice(0, 2).map((tag) => {
              // Alternate tag background/colors to feel artistic
              const isFirst = blog.tags.indexOf(tag) === 0;
              return (
                <span
                  key={tag}
                  className={`px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full transition-colors ${
                    isFirst 
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300" 
                      : "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300"
                  }`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
          <span className="text-xs font-bold text-black dark:text-white border-b-2 border-transparent group-hover:border-black dark:group-hover:border-white transition-all flex items-center gap-1 pb-0.5">
            Read Publication
            <BookOpen className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

      </div>
    </article>
  );
};
