import { cacheManager, CACHE_TTL } from '../cache/cache-manager';
import { logger } from '../utils/logger';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Ultra-fast <1ms lookup for major cities MakeMyLook operates in
const CITY_COORDINATES: Record<string, Coordinates> = {
  'bhubaneswar': { latitude: 20.2961, longitude: 85.8245 },
  'cuttack': { latitude: 20.4625, longitude: 85.8830 },
  'puri': { latitude: 19.8135, longitude: 85.8312 },
  'raipur': { latitude: 21.2514, longitude: 81.6296 },
  'bhilai': { latitude: 21.1938, longitude: 81.3509 },
  'delhi': { latitude: 28.7041, longitude: 77.1025 },
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'pune': { latitude: 18.5204, longitude: 73.8567 },
};

export class LocationTool {
  static async geocode(query: string): Promise<Coordinates | null> {
    const cleanQuery = query.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
    
    // 1. O(1) Fast lookup
    for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
      if (cleanQuery.includes(city)) {
        return coords;
      }
    }

    // 2. Cache lookup for external API
    const cacheKey = `geocode:${cleanQuery.replace(/\s+/g, '_')}`;
    const cached = await cacheManager.get<Coordinates>(cacheKey);
    if (cached) return cached;

    // 3. Fallback to Nominatim OpenStreetMap (Free, no API key)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'MakeMyLook-AI-Agent/1.0' }
      });

      if (!response.ok) return null;

      const data = await response.json() as any[];
      if (data && data.length > 0) {
        const coords = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
        // Cache indefinitely (geocodes don't change often)
        await cacheManager.set(cacheKey, coords, { ttlSeconds: CACHE_TTL.FAQ });
        return coords;
      }
    } catch (error) {
      logger.warn('Geocoding failed', { query, error });
    }

    return null;
  }
}
