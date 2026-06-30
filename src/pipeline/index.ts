import { FastRouter } from './router';
import { ToolExecutor } from './executor';
import { ResponseGenerator } from './generator';
import { detectLanguage } from '../utils/language-detector';
import { buildVendorCard } from '../utils/vendor-card';
import { logger } from '../utils/logger';
import { getOrCreateSession, addMessage, updatePreferences } from '../memory/session';
import { LocationTool } from '../tools/location.tool';
import type { ChatRequest, ChatResponse } from '../types/agent.types';

export class Pipeline {
  static async process(request: ChatRequest, onStream?: (event: string, data: any) => void): Promise<ChatResponse> {
    const startTime = Date.now();
    const sessionId = request.sessionId || `sess-${Date.now()}`;
    const session = await getOrCreateSession(sessionId);

    // 1. Language Detection (Fast heuristic first)
    const language = await detectLanguage(request.message);
    if (language !== session.preferences.language) {
      await updatePreferences(sessionId, { language });
      session.preferences.language = language;
    }

    // 2. Fast Intent Routing
    const routerStart = Date.now();
    const route = await FastRouter.route(request.message);
    const intentTime = Date.now() - routerStart;
    
    logger.info('Pipeline routed', { intent: route.intent, confidence: route.confidence, timeMs: intentTime });

    // Handle Greetings immediately (<100ms)
    if (route.intent === 'greeting') {
      const responseText = "Hello 👋 How can I help you today?";
      if (onStream) {
        onStream('token', { content: responseText });
        onStream('done', { sessionId, language, intent: 'greeting' });
      }
      return { sessionId, message: responseText, language, agentUsed: 'pipeline' as any };
    }

    // 3. Parallel Tool Execution
    const toolStart = Date.now();
    if (onStream) onStream('thinking', { status: 'Analyzing request...' });

    let lat = request.latitude || session.preferences.latitude;
    let lng = request.longitude || session.preferences.longitude;

    if (!lat || !lng) {
      const coords = await LocationTool.geocode(request.message);
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    }

    const execution = await ToolExecutor.execute({
      message: request.message,
      intent: route.intent,
      latitude: lat,
      longitude: lng
    });
    
    // Save location to preferences if we found one
    if (lat && lng) {
      await updatePreferences(sessionId, { latitude: lat, longitude: lng });
    }

    const toolTime = Date.now() - toolStart;

    // Handle missing location
    if (execution.needsLocation) {
      const locationReq = "I need your location to find the best vendors near you. Please share your location or tell me your city.";
      if (onStream) {
        onStream('token', { content: locationReq });
        onStream('location_request', { required: true });
        onStream('done', { sessionId, language, intent: route.intent });
      }
      return { sessionId, message: locationReq, language, agentUsed: 'pipeline' as any };
    }

    // 4. LLM Generation
    const llmStart = Date.now();
    if (onStream) onStream('thinking', { status: 'Generating response...' });

    let fullMessage = '';

    await ResponseGenerator.generate({
      message: request.message,
      intent: route.intent,
      toolData: execution.toolData,
      language,
    }, (token) => {
      fullMessage += token;
      if (onStream) onStream('token', { content: token });
    });

    const llmTime = Date.now() - llmStart;

    // Stream out rich data (Vendor Cards, etc)
    const vendorCards: any[] = [];
    if (execution.toolData.vendors && execution.toolData.vendors.length > 0) {
      for (const v of execution.toolData.vendors) {
        const card = buildVendorCard(v);
        vendorCards.push(card);
        if (onStream) onStream('vendor_card', { vendor: card });
      }
    }

    if (onStream) onStream('done', { sessionId, language, intent: route.intent });

    const totalTime = Date.now() - startTime;
    logger.info('Pipeline completed', { intentTime, toolTime, llmTime, totalTime });

    // Save to memory asynchronously
    addMessage(sessionId, { role: 'user', content: request.message, timestamp: Date.now() }).catch(() => {});
    addMessage(sessionId, { role: 'assistant', content: fullMessage, timestamp: Date.now() }).catch(() => {});

    return {
      sessionId,
      message: fullMessage,
      language,
      vendorCards,
      agentUsed: 'pipeline' as any,
    };
  }
}
