import { mmlClient } from '../api/mml-client';
import { cacheManager, CACHE_TTL } from '../cache/cache-manager';
import { buildVendorCard } from '../utils/vendor-card';
import type { VendorCard } from '../types/vendor.types';

export interface VendorSearchParams {
  searchQuery?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
  category?: string;
}

export class VendorTool {
  static async searchVendors(params: VendorSearchParams): Promise<VendorCard[]> {
    const { searchQuery, latitude, longitude, limit = 5, category } = params;

    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.append('search', searchQuery);
    if (latitude) queryParams.append('latitude', latitude.toString());
    if (longitude) queryParams.append('longitude', longitude.toString());
    if (category) queryParams.append('categoryId', category);
    queryParams.append('resultFor', 'vendor');
    queryParams.append('$limit', limit.toString());
    queryParams.append('$sortBy', 'createdAt_desc');

    const cacheKey = `vendor_search:${JSON.stringify(params)}`;
    const cached = await cacheManager.get<VendorCard[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await mmlClient.searchVendors({
        latitude: latitude!,
        longitude: longitude!,
        searchQuery: searchQuery,
        limit,
        category
      });
      const data = response.data || [];
      const cards = data.map(v => buildVendorCard(v));
      
      await cacheManager.set(cacheKey, cards, { ttlSeconds: CACHE_TTL.VENDOR });
      return cards;
    } catch (error) {
      console.error('VendorTool search failed:', error);
      return [];
    }
  }

}
