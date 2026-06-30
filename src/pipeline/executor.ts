import { VendorTool } from '../tools/vendor.tool';
import { SupportTool } from '../tools/support.tool';
import { pgClient } from '../db/postgres.client';
import { vectorClient } from '../db/vector.client';
import { WebScraper } from '../api/web-scraper';
import type { Intent } from './router';

export interface ExecutorContext {
  message: string;
  intent: Intent;
  latitude?: number;
  longitude?: number;
  onStream?: (event: string, data: any) => void;
}

export interface ExecutionResult {
  toolData: Record<string, any>;
  needsLocation?: boolean;
}

export class ToolExecutor {
  static async execute(context: ExecutorContext): Promise<ExecutionResult> {
    const result: ExecutionResult = { toolData: {} };

    // 1. Specific routing for Vendors (Live API)
    if (context.intent === 'vendor_search') {
      if (!context.latitude || !context.longitude) {
        return { toolData: {}, needsLocation: true };
      }
      result.toolData.vendors = await VendorTool.searchVendors({
        searchQuery: context.message,
        latitude: context.latitude,
        longitude: context.longitude,
        limit: 5
      });
      return result;
    }

    // Diagnostic / Troubleshooting specific intent
    if (context.intent === 'diagnostic') {
       result.toolData.diagnostic = true;
       return result; // Handled directly in generator prompt
    }

    // 2. KNOWLEDGE GAP FILLING WATERFALL
    
    // Step A: Search Relational DB (PostgreSQL) for exact factual matches
    const dbAnswer = await pgClient.searchFactualAnswer(context.message);
    if (dbAnswer) {
      result.toolData.exactAnswer = dbAnswer;
      return result;
    }

    // Step B: Search Vector DB (ChromaDB) for semantic/policy matches
    const semanticAnswer = await vectorClient.searchSemanticAnswer(context.message);
    if (semanticAnswer) {
      result.toolData.faqInfo = semanticAnswer;
      return result;
    }

    // Step C: Fallback to old SupportTool (Local Rules / Knowledge Base)
    const localFaq = await SupportTool.searchFAQ(context.message);
    if (localFaq) {
      result.toolData.faqInfo = localFaq;
      return result;
    }

    // Step D: Live Web Scraping for dynamic data (Categories, Coupons, etc)
    if (context.onStream) context.onStream('thinking', { status: 'Checking latest information on our website...' });
    const webAnswer = await WebScraper.searchWebsite(context.message);
    
    if (webAnswer) {
      result.toolData.webAnswer = webAnswer;
      // Save newly discovered data back to PostgreSQL for future users
      await pgClient.saveNewAnswer(context.message, webAnswer);
      return result;
    }

    // If all fail, return empty. The LLM handles the final fallback gracefully.
    return result;
  }
}
