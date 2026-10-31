export type SocialPlatform =
  | 'Facebook'
  | 'TikTok'
  | 'Instagram'
  | 'YouTube'
  | 'Telegram'
  | 'Shopee'
  | 'Twitter'
  | 'Other';

export type ServiceType = 'Default' | 'Custom Comments' | 'Package' | 'Subscriptions';

export type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'In progress'
  | 'Completed'
  | 'Partial'
  | 'Canceled'
  | 'Refunded';

export interface ApiProvider {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  currency: string;
  balance: number;
  exchangeRate: number;
  priceMarkupPercent: number;
  useSandbox: boolean;
  status: 'Connected' | 'Error' | 'Untested';
  lastSyncedAt?: string;
  lastError?: string;
}

export interface BankConfig {
  bankName: string;
  bankShortCode: string;
  accountNumber: string;
  accountHolder: string;
  transferPrefix: string;
  minDeposit: number;
}

export interface SmmService {
  service: number;
  providerId: string;
  providerServiceId: number;
  platform: SocialPlatform;
  category: string;
  name: string;
  type: ServiceType;
  originalRate: number;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
  averageTime: string;
  description: string;
  active: boolean;
}

export interface SmmOrder {
  id: number;
  userId: string;
  providerId: string;
  providerName: string;
  providerOrderId: number;
  serviceId: number;
  serviceName: string;
  platform: SocialPlatform;
  link: string;
  quantity: number;
  charge: number;
  originalCost: number;
  start_count: number;
  remains: number;
  status: OrderStatus;
  currency: string;
  comments?: string;
  runs?: number;
  interval?: number;
  refillSupported: boolean;
  cancelSupported: boolean;
  refillId?: number;
  refillStatus?: 'Pending' | 'In progress' | 'Completed' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'order_spend' | 'order_refund' | 'admin_adjust';
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'customer' | 'admin';
  tier: 'Member' | 'Collaborator' | 'Agency' | 'Admin';
  discountPercent: number;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  apiKey: string;
}

export interface AppStateResponse {
  activeUser: UserAccount;
  users: UserAccount[];
  providers: ApiProvider[];
  bankConfig: BankConfig;
  services: SmmService[];
  orders: SmmOrder[];
  transactions: WalletTransaction[];
}
