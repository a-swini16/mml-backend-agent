import { openai } from '../config/openai';
import { config } from '../config';
import { logger } from '../utils/logger';

export type Intent = 'greeting' | 'vendor_search' | 'support_faq' | 'coupons' | 'services' | 'diagnostic' | 'count' | 'unknown';

export interface RouteResult {
  intent: Intent;
  confidence: number;
  extractedKeywords?: string[];
}

export class FastRouter {
  private static greetingPattern = /^(hi|hello|hey|hii|heya|namaste|pranam|hello+)\b/i;
  private static vendorPattern = /\b(salon|spa|makeup|bridal|hair|cut|tattoo|mehendi|threading|massage|facial|beauty|parlor|find|search)\b/i;
  private static supportPattern = /\b(refund|cancel|payment|upi|policy|money|return)\b/i;
  private static couponPattern = /\b(coupon|coupons|discount|offer|promo)\b/i;
  private static servicePattern = /\b(service|services|what do you do)\b/i;
  private static diagnosticPattern = /\b(book|booking error|cant book|can't book|unable to book)\b/i;
  private static countPattern = /\b(how many|count)\b/i;

  static async route(message: string): Promise<RouteResult> {
    const text = message.trim();
    
    // 1. Fast Regex Classification
    if (this.greetingPattern.test(text) && text.split(' ').length <= 4) {
      return { intent: 'greeting', confidence: 1.0 };
    }

    if (this.countPattern.test(text)) return { intent: 'count', confidence: 0.9 };
    if (this.couponPattern.test(text)) return { intent: 'coupons', confidence: 0.9 };
    if (this.servicePattern.test(text)) return { intent: 'services', confidence: 0.9 };
    if (this.diagnosticPattern.test(text)) return { intent: 'diagnostic', confidence: 0.9 };
    if (this.supportPattern.test(text)) return { intent: 'support_faq', confidence: 0.9 };
    if (this.vendorPattern.test(text)) return { intent: 'vendor_search', confidence: 0.7 };

    // 2. LLM Fallback (only if confidence < 0.8 / unknown)
    return this.llmRoute(text);
  }

  private static async llmRoute(message: string): Promise<RouteResult> {
    const start = Date.now();
    try {
      const response = await openai.chat.completions.create({
        model: config.openai.routerModel,
        messages: [
          {
            role: 'system',
            content: `Classify the user intent into one of: ["greeting", "vendor_search", "support_faq", "coupons", "services", "diagnostic", "count"]. Output ONLY the intent word.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase() || '';
      const intent = (['greeting', 'vendor_search', 'support_faq'].includes(result) ? result : 'unknown') as Intent;

      logger.info('LLM Router Fallback executed', { intent, duration: Date.now() - start });
      return { intent, confidence: 0.9 };
    } catch (error) {
      logger.error('LLM Router failed', { error });
      return { intent: 'unknown', confidence: 0 };
    }
  }
}
