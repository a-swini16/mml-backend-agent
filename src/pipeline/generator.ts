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

    if (intent === 'support_faq') {
      if (toolData.faqInfo) {
        systemPrompt += `\nUse this policy info to answer the user:\n${toolData.faqInfo}`;
      } else {
        systemPrompt += `\nApologize and say you don't have that specific policy info, but they can email support@makemylook.beauty.`;
      }
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
