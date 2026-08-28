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
  createdAt?: number;
  views?: number;
  isEditorEdition?: boolean;
}

export interface GenerationRequest {
  arxivInput: string;
  rawText?: string;
  password?: string;
}

export interface GenerationResponse {
  blog: BlogPost;
  executionRecord?: PipelineExecutionRecord;
}

export type JobStatus = "queued" | "generating" | "completed" | "failed";
export type JobType = "article" | "banner_regen" | "article_regen";

export interface JobStepLog {
  timestamp: number;
  message: string;
}

export interface PipelineStepMetric {
  stepId: number;
  stepName: string;
  category: "ingestion" | "analysis" | "prompt_prep" | "ai_inference" | "ast_validation" | "banner_synthesis" | "persistence" | "indexing";
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime: number;
  endTime?: number;
  durationMs?: number;
  details?: string;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
  metrics?: Record<string, any>;
}

export interface PipelineExecutionRecord {
  jobId: string;
  triggerId: number;
  arxivInput: string;
  arxivId?: string;
  paperTitle: string;
  authors?: string;
  status: "running" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  modelUsed?: string;
  provider?: "gemini" | "github_models" | "procedural";
  tokenUsage: {
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
    estimatedCostUsd?: number;
  };
  steps: PipelineStepMetric[];
  resultingBlog?: {
    id: string;
    slug: string;
    title: string;
    contentLength: number;
    latexFormulaCount: number;
    tags: string[];
  };
  persistenceStatus: {
    customBlogsJson: boolean;
    dataTs: boolean;
    journalJsonl: boolean;
    firestore: boolean;
    gitHubMirror: boolean;
    sitemapXml: boolean;
  };
  error?: string;
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
  metrics?: PipelineExecutionRecord;
}

