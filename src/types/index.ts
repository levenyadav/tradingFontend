// Core types for the Forex Trading Application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  accountLevel: 'basic' | 'premium' | 'vip';
  memberSince: string;
  preferredCurrency: string;
  language: string;
}

export interface Account {
  id: string;
  userId: string;
  balance: number;
  equity: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
}

export interface Position {
  id: string;
  pair: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  profitLoss: number;
  profitLossPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
  swap: number;
  commission: number;
}

export interface PendingOrder {
  id: string;
  pair: string;
  type: 'limit' | 'stop';
  direction: 'buy' | 'sell';
  triggerPrice: number;
  lotSize: number;
  stopLoss?: number;
  takeProfit?: number;
  expiration: 'gtc' | 'gfd' | 'gtd';
  expirationDate?: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  profitLoss: number;
  swap: number;
  commission: number;
  openedAt: string;
  closedAt: string;
}

export interface CurrencyPair {
  pair: string;
  name: string;
  bidPrice: number;
  askPrice: number;
  spread: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  category: 'forex' | 'commodities' | 'indices' | 'crypto';
  isFavorite: boolean;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'bonus';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  method: string;
  description: string;
  createdAt: string;
  reference?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'ewallet';
  name: string;
  last4: string;
  expiry?: string;
  isDefault: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface OrderFormData {
  pair: string;
  type: 'market' | 'limit' | 'stop';
  direction: 'buy' | 'sell';
  lotSize: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  expiration?: 'gtc' | 'gfd' | 'gtd';
  expirationDate?: string;
}

export interface KYCData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    employmentStatus: string;
    industry?: string;
    occupation: string;
  };
  documents: {
    idType?: 'passport' | 'national_id' | 'drivers_license' | 'residence_permit';
    idDocument?: File;
    selfiePhoto?: File;
  };
  verificationStatus: {
    accountCreated: boolean;
    personalInfoSubmitted: boolean;
    documentVerified: boolean;
    facialRecognitionComplete: boolean;
    backgroundCheckComplete: boolean;
  };
}

// Referral Program Types
export interface ReferralStats {
  referralCode: string;
  total: number;
  pending: number;
  qualified: number;
  rewarded: number;
  rejected: number;
  expired: number;
  totalEarnings: number;
  settings: {
    enabled: boolean;
    minDeposit: number;
    rewardAmount: number;
    requireKYC: boolean;
    maxReferrals: number;
  };
}

export interface ReferralHistoryItem {
  id: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'rejected' | 'expired';
  referredUser: {
    email: string;
    name: string;
    signupDate: string;
    kycStatus?: string;
  };
  depositAmount: number;
  depositDate?: string;
  rewardAmount: number;
  rewardedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ReferralValidation {
  valid: boolean;
  message?: string;
  referrer?: {
    firstName: string;
    lastName: string;
  };
}

// Admin Referral Types
export interface AdminReferralStats {
  total: number;
  pending: number;
  qualified: number;
  rewarded: number;
  rejected: number;
  expired: number;
  totalRewardsPaid: number;
  totalDepositsFromReferrals: number;
}

export interface AdminReferralItem {
  id: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'rejected' | 'expired';
  referrer: {
    id: string;
    email: string;
    name: string;
    walletBalance: number;
  };
  referredUser: {
    id: string;
    email: string;
    name: string;
    kycStatus: string;
    signupDate: string;
  };
  depositAmount: number;
  depositDate?: string;
  rewardAmount: number;
  rewardedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ReferralLeaderboardItem {
  userId: string;
  name: string;
  email: string;
  totalReferrals: number;
  totalEarnings: number;
  rank: number;
}

export interface ReferralSettings {
  minDepositAmount: number;
  rewardAmount: number;
  referredUserBonus: number;
  maxReferralsPerUser: number;
  expiryDays: number;
  requireKYC: boolean;
  requireReferrerKYC: boolean;
  minAccountAgeDays: number;
  requireActiveAccount: boolean;
  enabled: boolean;
  autoProcessRewards: boolean;
  termsAndConditions?: string;
  customMessage?: string;
  allowedCountries: string[];
  blockedCountries: string[];
}
