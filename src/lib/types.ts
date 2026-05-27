export interface Item {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  subcategory: string;
  styles: string[];
  colors: string[];
  size: string;
  brand: string;
  condition: 'new' | 'like_new' | 'good' | 'fair';
  priceRange: number; // 0=budget(<$25), 1=mid($25-75), 2=upper($75-200), 3=premium($200-500), 4=luxury($500+)
  createdAt: number;
  likes: number;
  views: number;
  sold: boolean;
}

export interface SwipeRecord {
  id: string;
  userId: string;
  itemId: string;
  action: 'like' | 'dislike' | 'superlike' | 'purchase';
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  createdAt: number;
  totalLikes: number;
  totalListings: number;
  isPremium: boolean;
  premiumUntil?: number;
  stripeCustomerId?: string;
  /** Stripe Connect Express account id (acct_...). Set when the user starts seller onboarding. */
  stripeAccountId?: string;
  /** True once Stripe confirms the connected account can accept charges + payouts. */
  stripeAccountReady?: boolean;
}

export interface UserPreferences {
  categories: Record<string, number>;
  styles: Record<string, number>;
  colors: Record<string, number>;
  brands: Record<string, number>;
  priceRanges: number[];
  avgPriceRange: number;
}

export interface RecommendationScore {
  itemId: string;
  score: number;
  reason: 'personalized' | 'trending' | 'new' | 'explore';
}
