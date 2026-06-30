// ============================================
// Vendor Types — mapped from MakeMyLook API
// GET /explore/vendor response structure
// ============================================

export interface MMLApiResponse {
  total: number;
  limit: number;
  skip: number;
  data: MMLVendorResult[];
}

export interface MMLVendorResult {
  _id: string;
  organization: MMLOrganization;
  totalNumberOfRatings: number;
  rating: number;
  providesHomeService: boolean;
  orgSubCategory: MMLOrgSubCategory;
  category: MMLCategory;
  vendorTag: string[];
  subCategory: MMLSubCategory;
  serviceFor: string[];
  isHomeServiceAllow: boolean;
  available: boolean;
  price: number;
  dist: {
    calculated: number; // distance in meters
  };
  city: string;
  state: string;
  locality: string;
  bestCoupon?: MMLCoupon;
}

export interface MMLOrganization {
  _id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: number;
  address: string;
  city: string;
  state: string;
  cityId: string;
  locality: string;
  active: boolean;
  isOffline: boolean;
  isBlocked: boolean;
  proffesionalVisiblity: boolean;
  amenities: string[];
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  serviceFor: string[];
  isAcceptOfflinePayment: boolean;
  isKycCompleted: boolean;
  isFeatured: boolean;
  totalNumberOfRatings: number;
  tags: string[];
  rating: number;
  autoConfirmBooking: boolean;
  homeServiceMaxRadiusInKm: number;
  advanceBookingWindow: {
    unit: string;
    value: number;
  };
  type: 'vendor' | 'freelancer';
  bookingCancellationBeforeTime: number; // minutes
  images: string[];
  createdAt: string;
  updatedAt: string;
  vendorId: string;
  alternativePhone?: number | null;
  closingTime: string;
  description: string;
  openingTime: string;
  tagline: string;
  weeklyOffDay: string;
  minimumPrice: number;
  providesHomeService: boolean;
  avatar?: string;
  slug: string;
}

export interface MMLOrgSubCategory {
  _id: string;
  category: string;
  orgCategory: string;
  subCategory: string;
  organization: string;
  displayName: string;
  available: boolean;
  displayDescription: string;
  price: number;
  discountedPrice: number;
  serviceFor: string[];
  gst: number;
  priceWithTax: number;
  duration: number; // minutes
  isHomeServiceAllow: boolean;
  sequencePosition: number;
  createdAt: string;
  updatedAt: string;
}

export interface MMLCategory {
  _id: string;
  name: string;
  vendorTag: string[];
  icon: string;
  showOnHome: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MMLSubCategory {
  _id: string;
  name: string;
  icon: string;
  category: string;
  duration: number;
  subTitle: string[];
  serviceFor: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MMLCoupon {
  _id: string;
  name: string;
  code: string;
  description: string;
  type: string;
  discountType: 'Flat' | 'Percentage';
  discountValue: number;
  minimumBookingAmount: number;
  startDate: string;
  endDate: string;
  termsAndConditions: string;
}

// ============================================
// Processed Vendor Card — what the AI returns
// ============================================

export interface VendorCard {
  id: string;
  name: string;
  type: 'vendor' | 'freelancer';
  category: string;
  categoryDescription: string;
  service: string;
  serviceDescription: string;
  rating: number;
  totalRatings: number;
  price: number;
  priceWithTax: number;
  discountedPrice: number;
  duration: number; // minutes
  distance: number; // meters
  distanceFormatted: string; // "2.9 km"
  city: string;
  state: string;
  locality: string;
  address: string;
  amenities: string[];
  serviceFor: string[];
  providesHomeService: boolean;
  isHomeServiceAllow: boolean;
  homeServiceRadius: number;
  tags: string[];
  openingTime: string;
  closingTime: string;
  weeklyOffDay: string;
  avatar?: string;
  slug: string;
  bookingUrl: string;
  coupon?: {
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    minimumAmount: number;
    terms: string;
  };
}

// ============================================
// API Query Parameters
// ============================================

export interface VendorSearchParams {
  latitude: number;
  longitude: number;
  limit?: number;
  skip?: number;
  sortBy?: string;
  resultFor?: string;
  category?: string;
  subCategory?: string;
  serviceFor?: string;
  minPrice?: number;
  maxPrice?: number;
  providesHomeService?: boolean;
  tags?: string[];
  searchQuery?: string;
}
