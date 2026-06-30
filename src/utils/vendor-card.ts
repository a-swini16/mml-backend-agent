// ============================================
// Vendor Card Builder
// Transforms raw MML API data → clean VendorCard for AI responses
// ============================================

import { config } from '../config';
import type { MMLVendorResult, VendorCard } from '../types/vendor.types';

/**
 * Convert raw API vendor result into a clean VendorCard
 */
export function buildVendorCard(raw: MMLVendorResult): VendorCard {
  const org = raw?.organization || ({} as any);
  const distanceMeters = raw?.dist?.calculated || 0;

  return {
    id: raw?._id || '',
    name: org?.name || 'Unknown',
    type: org?.type || 'vendor',
    category: raw?.category?.name || 'Unknown',
    categoryDescription: raw?.category?.description || '',
    service: raw?.orgSubCategory?.displayName || raw?.subCategory?.name || '',
    serviceDescription: raw?.orgSubCategory?.displayDescription || raw?.subCategory?.description || '',
    rating: raw?.rating || 0,
    totalRatings: raw?.totalNumberOfRatings || 0,
    price: raw?.price || raw?.orgSubCategory?.price || org?.minimumPrice || 0,
    priceWithTax: raw?.orgSubCategory?.priceWithTax || 0,
    discountedPrice: raw?.orgSubCategory?.discountedPrice || 0,
    duration: raw?.orgSubCategory?.duration || raw?.subCategory?.duration || 0,
    distance: distanceMeters,
    distanceFormatted: formatDistance(distanceMeters),
    city: raw?.city || org?.city || '',
    state: raw?.state || org?.state || '',
    locality: raw?.locality || org?.locality || '',
    address: org?.address || '',
    amenities: org?.amenities || [],
    serviceFor: raw?.serviceFor || org?.serviceFor || [],
    providesHomeService: raw?.providesHomeService || false,
    isHomeServiceAllow: raw?.isHomeServiceAllow || false,
    homeServiceRadius: org?.homeServiceMaxRadiusInKm || 0,
    tags: raw?.vendorTag || org?.tags || [],
    openingTime: formatTime(org?.openingTime || ''),
    closingTime: formatTime(org?.closingTime || ''),
    weeklyOffDay: org?.weeklyOffDay || 'None',
    avatar: org?.avatar ? buildImageUrl(org.avatar) : undefined,
    slug: org?.slug || '',
    bookingUrl: org?.slug ? `${config.mmlApi.websiteUrl}/vendor/${org.slug}` : '',
    coupon: raw.bestCoupon
      ? {
          code: raw.bestCoupon.code,
          description: raw.bestCoupon.description,
          discountType: raw.bestCoupon.discountType,
          discountValue: raw.bestCoupon.discountValue,
          minimumAmount: raw.bestCoupon.minimumBookingAmount,
          terms: raw.bestCoupon.termsAndConditions,
        }
      : undefined,
  };
}

/**
 * Build multiple vendor cards from API response
 */
export function buildVendorCards(results: MMLVendorResult[]): VendorCard[] {
  return results.map(buildVendorCard);
}

/**
 * Format distance from meters to human-readable string
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Format ISO time string to human-readable time
 */
function formatTime(isoTime: string): string {
  if (!isoTime) return '';
  try {
    const date = new Date(isoTime);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  } catch {
    return isoTime;
  }
}

/**
 * Build full S3 image URL from path
 */
function buildImageUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `https://prod-mml.s3.ap-south-1.amazonaws.com/${path}`;
}

/**
 * Format vendor card as a text summary for AI context
 */
export function vendorCardToText(card: VendorCard): string {
  const lines: string[] = [
    `🏪 ${card.name}`,
    `📍 ${card.locality}, ${card.city} (${card.distanceFormatted})`,
    `⭐ ${card.rating}/5 (${card.totalRatings} reviews)`,
    `💰 ₹${card.price}${card.discountedPrice > 0 ? ` (was ₹${card.discountedPrice})` : ''}`,
    `🔧 ${card.service}${card.serviceDescription ? ` — ${card.serviceDescription}` : ''}`,
    `📂 ${card.category}`,
  ];

  if (card.duration > 0) {
    lines.push(`⏱️ ${card.duration} mins`);
  }

  if (card.providesHomeService) {
    lines.push(`🏠 Home service available (${card.homeServiceRadius} km radius)`);
  }

  if (card.amenities.length > 0) {
    lines.push(`✨ ${card.amenities.join(', ')}`);
  }

  if (card.coupon) {
    lines.push(`🎁 Coupon: ${card.coupon.code} — ${card.coupon.description}`);
  }

  lines.push(`🔗 Book: ${card.bookingUrl}`);

  return lines.join('\n');
}

/**
 * Format multiple vendor cards as text
 */
export function vendorCardsToText(cards: VendorCard[]): string {
  return cards
    .map((card, i) => `--- Vendor ${i + 1} ---\n${vendorCardToText(card)}`)
    .join('\n\n');
}
