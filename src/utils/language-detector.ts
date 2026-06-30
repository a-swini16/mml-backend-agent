// ============================================
// Language Detector
// Detects English, Hindi (including Roman Hindi), and Odia (including Roman Odia)
// ============================================

import { openai } from '../config/openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { Language } from '../types/agent.types';

// Common Hindi words in Roman script
const HINDI_MARKERS = new Set([
  'mujhe', 'chahiye', 'karna', 'karni', 'karao', 'hai', 'hain',
  'kya', 'hoga', 'hogi', 'nahi', 'mera', 'meri', 'mere',
  'aap', 'aapka', 'aapki', 'yahan', 'wahan', 'kitna', 'kitni',
  'paisa', 'rupaye', 'salon', 'booking', 'karwana', 'dikhao',
  'batao', 'bolo', 'sunao', 'samjhao', 'dijiye', 'kijiye',
  'accha', 'theek', 'sahi', 'galat', 'zaruri', 'zaroorat',
  'chahte', 'chahti', 'lagega', 'lagegi', 'milega', 'milegi',
  'kaisa', 'kaisi', 'kaise', 'bahut', 'thoda', 'bohot',
  'sabse', 'sasta', 'mehnga', 'nazdeek', 'dur', 'paas',
  'madad', 'sahayata', 'seva', 'suvidha', 'cancel', 'wapas',
  'refund', 'bhugtan', 'baat', 'problem', 'dikkat', 'samasya',
]);

// Common Odia words in Roman script
const ODIA_MARKERS = new Set([
  'mate', 'darkar', 'karibaku', 'achhi', 'paduni', 'heigala',
  'kariba', 'kari', 'debi', 'debu', 'hebu', 'heba',
  'mote', 'mora', 'mo', 'tume', 'tumara', 'tumaku',
  'ethare', 'sethare', 'kete', 'kemiti', 'kahin', 'kahaku',
  'paisa', 'tanka', 'salon', 'booking', 'karibe', 'dekhao',
  'kaha', 'kahu', 'suno', 'bujhao', 'diantu', 'karantu',
  'bhala', 'thik', 'ghoda', 'galat', 'aabashyak', 'lagiba',
  'chahanti', 'chahuchi', 'laguchi', 'miliba', 'miluchi',
  'kemiti', 'bada', 'chhota', 'sasta', 'mahanga', 'nikata',
  'sahajya', 'sahayata', 'seva', 'cancel', 'pheribi', 'pherapaibe',
  'samasya', 'asubidha', 'kathare', 'boli', 'kichi', 'emiti',
  'kemiti', 'kouthi', 'kebe', 'ebe', 'hau', 'nahin',
  'heli', 'kintu', 'tathapi', 'ebam', 'ara', 'au',
  'heuchhi', 'karuchhi', 'jauchu', 'asuchu', 'dekhuchi',
]);

// Devanagari Unicode range
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
// Odia Unicode range
const ODIA_SCRIPT_REGEX = /[\u0B00-\u0B7F]/;

/**
 * Detect language from user message
 * Supports: English, Hindi (Devanagari + Roman), Odia (Odia script + Roman)
 */
export async function detectLanguage(message: string): Promise<Language> {
  // Step 1: Check for native scripts (fastest, most accurate)
  if (ODIA_SCRIPT_REGEX.test(message)) {
    logger.debug('Language detected via Odia script');
    return 'or';
  }
  if (DEVANAGARI_REGEX.test(message)) {
    logger.debug('Language detected via Devanagari script');
    return 'hi';
  }

  // Step 2: Check for Romanized Hindi/Odia markers
  const words = message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  let hindiScore = 0;
  let odiaScore = 0;

  for (const word of words) {
    if (HINDI_MARKERS.has(word)) hindiScore++;
    if (ODIA_MARKERS.has(word)) odiaScore++;
  }

  // If we have clear markers, use them
  if (odiaScore > 0 && odiaScore >= hindiScore) {
    logger.debug(`Language detected via Odia markers (score: ${odiaScore})`);
    return 'or';
  }
  if (hindiScore >= 2) {
    logger.debug(`Language detected via Hindi markers (score: ${hindiScore})`);
    return 'hi';
  }

  // Step 3: For ambiguous single-word markers or pure English, use heuristic
  if (hindiScore === 1 && words.length <= 5) {
    // Short message with one Hindi word — could be mixed
    logger.debug('Language detected as Hindi (single marker in short message)');
    return 'hi';
  }

  // Step 4: If purely Latin characters and no markers detected, assume English
  if (hindiScore === 0 && odiaScore === 0) {
    logger.debug('Language detected as English (no markers)');
    return 'en';
  }

  // Step 5: For truly ambiguous cases, use GPT-4o-mini for fast classification
  try {
    const response = await openai.chat.completions.create({
      model: config.openai.routerModel,
      messages: [
        {
          role: 'system',
          content: `Classify the language of the user message. Respond with ONLY one of: "en" (English), "hi" (Hindi, including Roman Hindi), "or" (Odia, including Roman Odia). Consider that Indian users often write Hindi/Odia in Roman/Latin script.`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0,
      max_tokens: 5,
    });

    const detected = response.choices[0]?.message?.content?.trim().toLowerCase();
    if (detected === 'hi' || detected === 'or' || detected === 'en') {
      logger.debug(`Language detected via LLM: ${detected}`);
      return detected as Language;
    }
  } catch (err) {
    logger.warn('LLM language detection failed, defaulting to English');
  }

  return 'en';
}

/**
 * Get the language name for display
 */
export function getLanguageName(lang: Language): string {
  const names: Record<Language, string> = {
    en: 'English',
    hi: 'Hindi',
    or: 'Odia',
  };
  return names[lang] || 'English';
}
