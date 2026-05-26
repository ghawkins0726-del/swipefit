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
