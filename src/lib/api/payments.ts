import { jsonFetch, formFetch } from './client';

export type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  isActive: boolean;
  displayOrder: number;
  currencies: string[];
  fees: { deposit: number | string; withdrawal: number | string };
  limits: { deposit: { min: number; max: number }; withdrawal: { min: number; max: number } };
  processingTime?: string;
  requiresDocuments?: boolean;
  requiresVerification?: boolean;
  minUserLevel?: string;
  bankDetails?: {
    accountName?: string;
    bankName?: string;
    bankAddress?: string;
    instructions?: string;
    accountNumber?: string; // masked
    routingNumber?: string;
    swiftCode?: string;
  };
  cryptoDetails?: { usdt?: { trc20Address: string; minConfirmations: number; instructions?: string } };
};

export async function getMethods(includeDetails = true): Promise<PaymentMethod[]> {
  const res = await jsonFetch(`/api/v1/payments/methods${includeDetails ? '?includeDetails=true' : ''}`);
  return res.data as PaymentMethod[];
}

export async function getBankDetails(currency = 'USD') {
  const res = await jsonFetch(`/api/v1/payments/bank-details?currency=${encodeURIComponent(currency)}`);
  return res.data;
}

export async function getCryptoDetails(asset = 'USDT', chain = 'TRC20') {
  const res = await jsonFetch(`/api/v1/payments/crypto-details?asset=${asset}&chain=${chain}`);
  return res.data;
}

export async function calculateFees(params: { amount: number; type: 'deposit' | 'withdrawal'; method: 'stripe' | 'paypal' | 'bank_transfer' | 'crypto'; currency?: string }) {
  const q = new URLSearchParams({ amount: String(params.amount), type: params.type, method: params.method, currency: params.currency || 'USD' });
  const res = await jsonFetch(`/api/v1/payments/calculate-fees?${q.toString()}`);
  return res.data as { amount: number; fee: number; total: number; netAmount: number; currency: string };
}

export async function deposit(payload: { amount: number; currency?: string; paymentMethod: string; paymentDetails?: any }) {
  const res = await jsonFetch(`/api/v1/payments/deposit`, { method: 'POST', body: JSON.stringify(payload) });
  return res.data as { transaction: any; newWalletBalance?: number };
}

export async function withdraw(payload: { amount: number; currency?: string; paymentMethod: string; paymentDetails: any }) {
  const res = await jsonFetch(`/api/v1/payments/withdraw`, { method: 'POST', body: JSON.stringify(payload) });
  return res.data as { transaction: any; newWalletBalance?: number };
}

export async function uploadPaymentScreenshot(file: File) {
  const form = new FormData();
  form.append('file', file);
  return await formFetch(`/api/v1/payments/upload/payment-screenshot`, form);
}

export async function uploadUtrDocument(file: File) {
  const form = new FormData();
  form.append('file', file);
  return await formFetch(`/api/v1/payments/upload/utr-document`, form);
}

export async function attachScreenshotToTransaction(transactionId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return await formFetch(`/api/v1/payments/transactions/${transactionId}/upload-screenshot`, form);
}

export async function attachUtrToTransaction(transactionId: string, file: File, utrNumber: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('utrNumber', utrNumber);
  return await formFetch(`/api/v1/payments/transactions/${transactionId}/upload-utr`, form);
}

export async function submitVerification(transactionId: string, body: { utrNumber?: string; notes?: string }) {
  const res = await jsonFetch(`/api/v1/payments/transactions/${transactionId}/submit-verification`, { method: 'POST', body: JSON.stringify(body) });
  return res.data as { transactionId: string; verificationStatus: string; hasDocuments: boolean; documentCount: number };
}
