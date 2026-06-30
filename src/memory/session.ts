import { v4 as uuidv4 } from 'uuid';
import { getRedis } from '../config/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { LRUCache } from 'lru-cache';
import type { ChatMessage, UserPreferences } from '../types/agent.types';

export interface SessionData {
  sessionId: string;
  preferences: UserPreferences;
  messages: ChatMessage[];
}

// In-Memory Fallback Session Store
const memorySessions = new LRUCache<string, SessionData>({
  max: 5000,
  ttl: config.session.ttl * 1000,
});

function getMemorySession(sessionId: string): SessionData {
  const session = memorySessions.get(sessionId);
  if (session) return session;

  const newSession: SessionData = {
    sessionId,
    preferences: { language: 'en' },
    messages: [],
  };
  memorySessions.set(sessionId, newSession);
  return newSession;
}

export async function getOrCreateSession(sessionId?: string): Promise<SessionData> {
  const id = sessionId || uuidv4();
  const prefsKey = `session:prefs:${id}`;
  const msgsKey = `session:msgs:${id}`;

  try {
    const redis = getRedis();
    const [prefsRaw, msgsRaw] = await Promise.all([
      redis.get(prefsKey),
      redis.lrange(msgsKey, 0, -1),
    ]);

    const preferences: UserPreferences = prefsRaw ? JSON.parse(prefsRaw) : { language: 'en' };
    const messages: ChatMessage[] = msgsRaw ? msgsRaw.map(m => JSON.parse(m)) : [];

    // Sync to memory
    const sessionData = { sessionId: id, preferences, messages };
    memorySessions.set(id, sessionData);

    return sessionData;
  } catch (error) {
    logger.warn('Redis unavailable, using in-memory session', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: id,
    });
    return getMemorySession(id);
  }
}

export async function addMessage(sessionId: string, message: ChatMessage): Promise<void> {
  const msgsKey = `session:msgs:${sessionId}`;
  
  // Update memory store
  const session = getMemorySession(sessionId);
  session.messages.push(message);
  if (session.messages.length > config.session.maxMessages) {
    session.messages.shift();
  }
  memorySessions.set(sessionId, session);

  // Update Redis
  try {
    const redis = getRedis();
    const messageStr = JSON.stringify(message);

    const pipeline = redis.pipeline();
    pipeline.rpush(msgsKey, messageStr);
    pipeline.ltrim(msgsKey, -config.session.maxMessages, -1);
    pipeline.expire(msgsKey, config.session.ttl);
    await pipeline.exec();
  } catch (error) {
    // Silently fallback to memory
  }
}

export async function updatePreferences(sessionId: string, updates: Partial<UserPreferences>): Promise<void> {
  const prefsKey = `session:prefs:${sessionId}`;

  // Update memory store
  const session = getMemorySession(sessionId);
  session.preferences = { ...session.preferences, ...updates };
  memorySessions.set(sessionId, session);

  // Update Redis
  try {
    const redis = getRedis();
    const prefsRaw = await redis.get(prefsKey);
    const existing = prefsRaw ? JSON.parse(prefsRaw) : {};
    
    const newPrefs = { ...existing, ...updates };
    await redis.setex(prefsKey, config.session.ttl, JSON.stringify(newPrefs));
  } catch (error) {
    // Silently fallback to memory
  }
}
