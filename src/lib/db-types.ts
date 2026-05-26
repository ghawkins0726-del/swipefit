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
