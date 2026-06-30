import type OpenAI from 'openai';

// ============================================
// Agent System Types
// ============================================

export type AgentName =
  | 'supervisor'
  | 'customer_support'
  | 'vendor_discovery'
  | 'knowledge'
  | 'api_execution'
  | 'recommendation'
  | 'human_handoff'
  | 'pipeline';

export type Language = 'en' | 'hi' | 'or';

export type IntentCategory =
  | 'faq'
  | 'vendor_search'
  | 'recommendation'
  | 'policy_query'
  | 'booking_help'
  | 'complaint'
  | 'escalation'
  | 'greeting'
  | 'general'
  | 'vendor_comparison'
  | 'coupon_inquiry'
  | 'location_search';

export interface AgentContext {
  sessionId: string;
  message: string;
  language: Language;
  intent: IntentCategory;
  conversationHistory: ChatMessage[];
  userPreferences: UserPreferences;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  agentName: AgentName;
  message: string;
  vendorCards?: import('./vendor.types').VendorCard[];
  sources?: string[];
  followUpSuggestions?: string[];
  shouldEscalate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentRoutingDecision {
  primaryAgent: AgentName;
  supportingAgents?: AgentName[];
  reasoning: string;
  detectedLanguage: Language;
  detectedIntent: IntentCategory;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentName?: AgentName;
  timestamp: number;
  vendorCards?: import('./vendor.types').VendorCard[];
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  language: Language;
  vendorCards?: import('./vendor.types').VendorCard[];
  sources?: string[];
  followUpSuggestions?: string[];
  agentUsed: AgentName;
}

// ============================================
// Memory Types
// ============================================

export interface UserPreferences {
  language: Language;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  budget?: {
    min: number;
    max: number;
  };
  gender?: 'men' | 'women' | 'children';
  preferredCategories?: string[];
  preferredTags?: string[];
  lastVendorIds?: string[];
  conversationSummary?: string;
}

export interface SessionData {
  sessionId: string;
  preferences: UserPreferences;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Streaming Event Types (SSE)
// ============================================

export type SSEEventType =
  | 'thinking'
  | 'token'
  | 'vendor_card'
  | 'source'
  | 'suggestion'
  | 'error'
  | 'done';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

// ============================================
// Tool Execution Types
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export type OpenAITool = OpenAI.ChatCompletionTool;
export type OpenAIMessage = OpenAI.ChatCompletionMessageParam;
