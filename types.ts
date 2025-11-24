
export enum TopicStatus {
  PENDING = 'PENDING',
  AI_APPROVED = 'AI_APPROVED',
  AI_REJECTED = 'AI_REJECTED',
  HUMAN_APPROVED = 'HUMAN_APPROVED',
  HUMAN_REJECTED = 'HUMAN_REJECTED',
  CONTENT_GENERATED = 'CONTENT_GENERATED',
  ARTICLE_DRAFT = 'ARTICLE_DRAFT',
  ARTICLE_REJECTED = 'ARTICLE_REJECTED',
}

// --- Validator Data Structures ---
export interface ValidatorScores {
  b2b_tone: number;
  brand_alignment: number;
  structure: number;
  accuracy: number;
  enterprise_relevance: number;
}

export interface ValidatorResult {
  status: string;
  summary: string;
  reasons: string[];
  recommendations: string[];
  scores: ValidatorScores;
}

export interface ValidatorData {
  validated_at: string;
  result: ValidatorResult;
}

// --- Content Data Structures ---
export interface ContentSection {
  heading: string;
  key_points: string[];
}

export interface FAQItem {
  q: string;
  a_outline: string[];
}

export interface GeneratedContentData {
  title: string;
  h1: string;
  slug: string;
  sections: ContentSection[];
  faq: FAQItem[];
  focus_keyword: string;
  related_keywords: string[];
  seo_title: string;
  meta_description: string;
  content_html: string;
  featured_image?: string;
}

// --- Main Topic Interface ---
export interface Topic {
  id: string;
  keyword: string;
  product: string;
  pageId?: string; // ID associated with the product
  title: string;
  angle: string;
  searchIntent: string;
  whyRelevant: string;
  aiReason: string; 
  status: TopicStatus;
  createdAt: string;
  
  // New Fields for Rich Content
  generatedContent?: GeneratedContentData;
  validatorData?: ValidatorData;
  htmlContent?: string;
}

export interface GenerationRequest {
  keyword: string;
  product: string;
  url: string;
  preferredAngles: string[];
  unpreferredAngles: string[];
}

export interface MakeResponse {
  topics: Array<{
    title?: string;
    topic?: string;
    angle: string;
    search_intent: string;
    why_relevant: string;
    primary_faq?: string;
    status?: '✅' | '❌';
    reasons?: string | string[];
  }>;
}

export interface ProductDef {
  name: string;
  id: string;
}

export type ViewState = 'dashboard' | 'results' | 'configuration' | 'settings' | 'generated_content';
