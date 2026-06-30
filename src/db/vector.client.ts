import { ChromaClient, Collection } from 'chromadb';
import { logger } from '../utils/logger';

class VectorClient {
  private client: ChromaClient | null = null;
  private collection: Collection | null = null;

  constructor() {
    try {
      this.client = new ChromaClient({ path: process.env.CHROMADB_URL || 'http://localhost:8000' });
      this.initCollection();
    } catch (err) {
      logger.warn('ChromaDB initialization failed. Running in fallback mode.', err);
    }
  }

  private async initCollection() {
    if (!this.client) return;
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: process.env.CHROMADB_COLLECTION || 'mml_knowledge',
      });
    } catch (err) {
      logger.error('Error initializing Chroma collection:', err);
    }
  }

  async searchSemanticAnswer(query: string): Promise<string | null> {
    // If real ChromaDB is not running, we'll return a mock semantic match for demo
    if (!this.collection) {
      return this.mockSemanticSearch(query);
    }

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: 1,
      });

      if (results.distances && results.distances[0] && results.distances[0][0] < 0.5) {
        return results.documents[0]?.[0] || null;
      }
    } catch (err) {
      logger.error('Error searching Vector DB:', err);
    }
    
    return null;
  }

  private mockSemanticSearch(query: string): string | null {
    const lower = query.toLowerCase();
    if (lower.includes('refund') || lower.includes('cancel')) {
      return `Refund & Cancellation Policy:
- Free cancellation up to 4 hours before the appointment.
- Cancellations within 4 hours will incur a 50% charge.
- Refunds for eligible cancellations are processed within 3-5 business days.`;
    }
    return null;
  }
}

export const vectorClient = new VectorClient();
