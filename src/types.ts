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
  isEditorEdition?: boolean;
}

export interface GenerationRequest {
  arxivInput: string;
  rawText?: string;
}

export interface GenerationResponse {
  blog: BlogPost;
}

export type JobStatus = "queued" | "generating" | "completed" | "failed";
export type JobType = "article" | "banner_regen" | "article_regen";

export interface JobStepLog {
  timestamp: number;
  message: string;
}

export interface GenerationJob {
  id: string;
  arxivInput: string;
  jobType?: JobType;
  targetTitle?: string;
  status: JobStatus;
  currentStepIndex: number;
  currentStepMessage: string;
  progressPercent: number;
  startTime: number;
  completedTime?: number;
  error?: string;
  resultBlog?: BlogPost;
  dismissed?: boolean;
  stepLogs?: JobStepLog[];
}
