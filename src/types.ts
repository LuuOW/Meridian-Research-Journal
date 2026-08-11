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
  views?: number;
}

export interface GenerationRequest {
  arxivInput: string;
  rawText?: string;
}

export interface GenerationResponse {
  blog: BlogPost;
}

export type JobStatus = "queued" | "generating" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  arxivInput: string;
  status: JobStatus;
  currentStepIndex: number;
  currentStepMessage: string;
  progressPercent: number;
  startTime: number;
  completedTime?: number;
  error?: string;
  resultBlog?: BlogPost;
  dismissed?: boolean;
}
