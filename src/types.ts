export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  readingTime: string;
  arxivLink: string;
  bannerSvg: string;
  content: string;
  author: string;
  tags: string[];
  status?: string;
  optionType?: string;
  ragAlignment?: string;
  timestamp?: number;
}

export interface GenerationRequest {
  arxivInput: string;
  rawText?: string;
}

export interface GenerationResponse {
  blog: BlogPost;
}
