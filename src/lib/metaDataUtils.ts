import { BlogPost } from "../types";

export interface ArticleJsonLd {
  "@context": string;
  "@type": string;
  headline: string;
  description: string;
  author: {
    "@type": string;
    name: string;
  };
  publisher: {
    "@type": string;
    name: string;
    url: string;
  };
  datePublished: string;
  mainEntityOfPage: string;
  keywords: string[];
}

/**
 * Generates Schema.org Article JSON-LD structured data object for SEO.
 */
export function generateArticleJsonLd(post: BlogPost, siteUrl: string = "https://meridian-journal.org"): ArticleJsonLd {
  const url = `${siteUrl}/post/${post?.slug || post?.id || "article"}`;
  const cleanTags = (post?.tags || []).map((t) => t.replace(/^#+/, "").trim());

  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: post?.title || "Untitled Article",
    description: post?.excerpt || "",
    author: {
      "@type": "Person",
      name: post?.author || "Meridian Research Journal"
    },
    publisher: {
      "@type": "Organization",
      name: "Meridian Research Journal",
      url: siteUrl
    },
    datePublished: post?.date || new Date().toISOString().split("T")[0],
    mainEntityOfPage: url,
    keywords: cleanTags
  };
}

export interface OpenGraphMeta {
  "og:title": string;
  "og:description": string;
  "og:type": string;
  "og:url": string;
  "og:site_name": string;
  "twitter:card": string;
  "twitter:title": string;
  "twitter:description": string;
}

/**
 * Generates OpenGraph and Twitter card metadata key-value pairs.
 */
export function generateOpenGraphMeta(post: BlogPost, siteUrl: string = "https://meridian-journal.org"): OpenGraphMeta {
  const url = `${siteUrl}/post/${post?.slug || post?.id || "article"}`;
  const title = post?.title || "Meridian Research Journal";
  const description = post?.excerpt || "Peer-reviewed research insights.";

  return {
    "og:title": title,
    "og:description": description,
    "og:type": "article",
    "og:url": url,
    "og:site_name": "Meridian Research Journal",
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description
  };
}
