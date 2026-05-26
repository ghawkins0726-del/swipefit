export interface Offer {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  payload: string;
  createdAt: number;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  amount: number;
  status: 'pending_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: string;
  trackingNumber?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationPreview {
  itemId: string;
  itemTitle: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageAt: number;
  unread: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  itemId: string;
  text: string;
  read: boolean;
  createdAt: number;
}

// ─── Recommendation engine ─────────────────────────────────────────────────────

export interface TasteProfile {
  userId: string;
  // Style affinities (0–1)
  outdoorScore: number;
  streetwearScore: number;
  luxuryScore: number;
  minimalScore: number;
  preppyScore: number;
  vintageScore: number;
  // Category affinities
  topsScore: number;
  bottomsScore: number;
  dressesScore: number;
  outerwearScore: number;
  shoesScore: number;
  accessoriesScore: number;
  // Price tier affinities
  budgetScore: number;
  midrangeScore: number;
  premiumScore: number;
  luxuryTierScore: number;
  // Condition affinities
  mintConditionScore: number;
  excellentConditionScore: number;
  goodConditionScore: number;
  fairConditionScore: number;
  // Meta
  totalInteractions: number;
  lastInteractionAt: number | null;
  updatedAt: number;
}

export type PriceTier = 'budget' | 'midrange' | 'premium' | 'luxury';

export interface ItemClassification {
  itemId: string;
  sellerId: string;
  primaryStyle: string;
  category: string;
  priceTier: PriceTier;
  condition: string;
  // Style confidences (0–1)
  outdoorConfidence: number;
  streetwearConfidence: number;
  luxuryConfidence: number;
  minimalConfidence: number;
  preppyConfidence: number;
  vintageConfidence: number;
  // Quality signals
  brandTierScore: number;  // 0–1, higher = more aspirational
  trendScore: number;      // 0–1
  classifiedAt: number;
  aiAssisted: boolean;
}
