import { openai } from '../config/openai';
import { config } from '../config';
import { buildVendorCard } from '../utils/vendor-card';
import type { Intent } from './router';

export interface GeneratorContext {
  message: string;
  intent: Intent;
  toolData: Record<string, any>;
  language: string;
}

export class ResponseGenerator {
  static async generate(context: GeneratorContext, onStream: (token: string) => void): Promise<void> {
    const { intent, toolData, language, message } = context;

    let systemPrompt = `You are the MakeMyLook AI. Respond in ${language}. Be concise, friendly, and natural.`;
    let userPrompt = message;

    if (intent === 'vendor_search') {
      const vendors = toolData.vendors || [];
      if (vendors.length === 0) {
        systemPrompt += `\nTell the user politely that you couldn't find any vendors matching their request in their area.`;
      } else {
        const vendorSummary = vendors.map((v: any) => `- ${v.name} (Rating: ${v.rating || 'New'})`).join('\n');
        systemPrompt += `\nPresent these vendors to the user:\n${vendorSummary}\nDon't list all details, just warmly introduce them.`;
      }
    }

    if (intent === 'diagnostic') {
      systemPrompt += `\nThe user is experiencing a booking issue. Ask them these diagnostic questions:\n- Which city are you booking in?\n- Which service are you trying to book?\n- Are you seeing an error message?\nDo not guess the solution yet.`;
    }

    if (toolData.exactAnswer) {
      systemPrompt += `\nUse this exact data to answer the user's question directly:\n${toolData.exactAnswer}`;
    } else if (toolData.faqInfo) {
      systemPrompt += `\nUse this info to answer the user:\n${toolData.faqInfo}`;
    } else if (toolData.webAnswer) {
      systemPrompt += `\nUse this information retrieved from the MakeMyLook website to answer the user:\n${toolData.webAnswer}`;
    } else if (intent === 'support_faq' || intent === 'count' || intent === 'coupons' || intent === 'services') {
      systemPrompt += `\nIf you don't have the specific answer, politely explain the general available options or suggest checking the MakeMyLook website directly. Avoid immediately redirecting to support unless it is an account-specific issue.`;
    }

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      max_tokens: 300,
      temperature: 0.7,
    });

    for await (const chunk of response) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        onStream(token);
      }
    }
  }
}
