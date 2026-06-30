import { cacheManager, CACHE_TTL } from '../cache/cache-manager';

// Mock RAG Knowledge Base for phase 1
const KNOWLEDGE_BASE = {
  cancellation: `Cancellation Policy:
- Free cancellation up to 4 hours before the appointment.
- Cancellations within 4 hours will incur a 50% charge.
- No-shows are charged 100% of the service fee.`,
  
  refund: `Refund Policy:
- Refunds for eligible cancellations are processed within 3-5 business days.
- If you are unsatisfied with a service, contact support within 24 hours for a resolution or partial refund.`,

  payment: `Payment Options:
- We accept UPI, Credit/Debit cards (Visa, Mastercard, RuPay), and MakeMyLook Wallet.
- Pay-at-salon is available for selected vendors.`,
};

export class SupportTool {
  static async searchFAQ(query: string): Promise<string> {
    const cacheKey = `faq_search:${query.toLowerCase()}`;
    const cached = await cacheManager.get<string>(cacheKey);
    if (cached) return cached;

    const lowerQuery = query.toLowerCase();
    let result = '';

    if (lowerQuery.includes('cancel')) {
      result = KNOWLEDGE_BASE.cancellation;
    } else if (lowerQuery.includes('refund')) {
      result = KNOWLEDGE_BASE.refund;
    } else if (lowerQuery.includes('pay') || lowerQuery.includes('upi')) {
      result = KNOWLEDGE_BASE.payment;
    }

    if (result) {
      await cacheManager.set(cacheKey, result, { ttlSeconds: CACHE_TTL.FAQ });
    }
    
    return result;
  }
}
