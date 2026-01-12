// Mock data for the Forex Trading Application
import { User, Account, Position, PendingOrder, Trade, CurrencyPair, Transaction, PaymentMethod, Notification } from '../types';

export const mockUser: User = {
  id: '1',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-0123',
  dateOfBirth: '1990-05-15',
  nationality: 'United States',
  kycStatus: 'verified',
  accountLevel: 'premium',
  memberSince: '2024-01-15',
  preferredCurrency: 'USD',
  language: 'English'
};

export const mockAccount: Account = {
  id: '1',
  userId: '1',
  balance: 5432.50,
  equity: 5432.50,
  freeMargin: 4986.75,
  marginLevel: 109,
  currency: 'USD'
};

export const mockPositions: Position[] = [
  {
    id: '1',
    pair: 'EUR/USD',
    direction: 'buy',
    entryPrice: 1.08456,
    currentPrice: 1.08582,
    lotSize: 1.5,
    profitLoss: 188.90,
    profitLossPercent: 0.42,
    stopLoss: 1.08300,
    takeProfit: 1.08800,
    openedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    swap: 0,
    commission: 2.50
  },
  {
    id: '2',
    pair: 'GBP/USD',
    direction: 'sell',
    entryPrice: 1.26789,
    currentPrice: 1.26542,
    lotSize: 1.0,
    profitLoss: 247.00,
    profitLossPercent: 1.95,
    stopLoss: 1.27000,
    takeProfit: 1.26200,
    openedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    swap: -0.50,
    commission: 1.80
  },
  {
    id: '3',
    pair: 'USD/JPY',
    direction: 'buy',
    entryPrice: 149.234,
    currentPrice: 149.112,
    lotSize: 0.5,
    profitLoss: -61.00,
    profitLossPercent: -0.82,
    stopLoss: 148.800,
    takeProfit: 150.000,
    openedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    swap: 0,
    commission: 0.90
  }
];

export const mockPendingOrders: PendingOrder[] = [
  {
    id: '1',
    pair: 'EUR/GBP',
    type: 'limit',
    direction: 'buy',
    triggerPrice: 0.85500,
    lotSize: 1.0,
    stopLoss: 0.85200,
    takeProfit: 0.86000,
    expiration: 'gtc',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockTrades: Trade[] = [
  {
    id: '1',
    pair: 'EUR/USD',
    type: 'buy',
    entryPrice: 1.08234,
    exitPrice: 1.08456,
    lotSize: 2.0,
    profitLoss: 444.00,
    swap: -0.25,
    commission: 3.50,
    openedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    pair: 'GBP/JPY',
    type: 'sell',
    entryPrice: 189.456,
    exitPrice: 189.123,
    lotSize: 0.5,
    profitLoss: 166.50,
    swap: 0.75,
    commission: 1.20,
    openedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    pair: 'USD/CAD',
    type: 'buy',
    entryPrice: 1.36789,
    exitPrice: 1.36234,
    lotSize: 1.0,
    profitLoss: -555.00,
    swap: -0.50,
    commission: 1.80,
    openedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  }
];

export const mockCurrencyPairs: CurrencyPair[] = [
  {
    pair: 'EUR/USD',
    name: 'Euro / US Dollar',
    bidPrice: 1.08452,
    askPrice: 1.08460,
    spread: 0.8,
    change24h: 0.0048,
    changePercent24h: 0.44,
    high24h: 1.08892,
    low24h: 1.08123,
    volume: 2456789,
    category: 'forex',
    isFavorite: true
  },
  {
    pair: 'GBP/USD',
    name: 'British Pound / US Dollar',
    bidPrice: 1.26542,
    askPrice: 1.26558,
    spread: 1.6,
    change24h: -0.0123,
    changePercent24h: -0.96,
    high24h: 1.27234,
    low24h: 1.26234,
    volume: 1876543,
    category: 'forex',
    isFavorite: true
  },
  {
    pair: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    bidPrice: 149.112,
    askPrice: 149.134,
    spread: 2.2,
    change24h: 1.234,
    changePercent24h: 0.83,
    high24h: 150.456,
    low24h: 148.123,
    volume: 3234567,
    category: 'forex',
    isFavorite: true
  },
  {
    pair: 'USD/CHF',
    name: 'US Dollar / Swiss Franc',
    bidPrice: 0.88234,
    askPrice: 0.88256,
    spread: 2.2,
    change24h: 0.0034,
    changePercent24h: 0.39,
    high24h: 0.88567,
    low24h: 0.87923,
    volume: 987654,
    category: 'forex',
    isFavorite: false
  },
  {
    pair: 'AUD/USD',
    name: 'Australian Dollar / US Dollar',
    bidPrice: 0.65432,
    askPrice: 0.65448,
    spread: 1.6,
    change24h: -0.0089,
    changePercent24h: -1.34,
    high24h: 0.66234,
    low24h: 0.65123,
    volume: 1234567,
    category: 'forex',
    isFavorite: true
  },
  {
    pair: 'USD/CAD',
    name: 'US Dollar / Canadian Dollar',
    bidPrice: 1.36234,
    askPrice: 1.36256,
    spread: 2.2,
    change24h: 0.0156,
    changePercent24h: 1.16,
    high24h: 1.36789,
    low24h: 1.35678,
    volume: 876543,
    category: 'forex',
    isFavorite: false
  },
  {
    pair: 'NZD/USD',
    name: 'New Zealand Dollar / US Dollar',
    bidPrice: 0.60123,
    askPrice: 0.60145,
    spread: 2.2,
    change24h: 0.0045,
    changePercent24h: 0.75,
    high24h: 0.60567,
    low24h: 0.59876,
    volume: 654321,
    category: 'forex',
    isFavorite: false
  },
  {
    pair: 'XAU/USD',
    name: 'Gold / US Dollar',
    bidPrice: 2034.56,
    askPrice: 2035.12,
    spread: 0.56,
    change24h: 12.34,
    changePercent24h: 0.61,
    high24h: 2045.67,
    low24h: 2023.45,
    volume: 456789,
    category: 'commodities',
    isFavorite: true
  },
  {
    pair: 'XAG/USD',
    name: 'Silver / US Dollar',
    bidPrice: 24.567,
    askPrice: 24.589,
    spread: 0.022,
    change24h: -0.456,
    changePercent24h: -1.82,
    high24h: 25.123,
    low24h: 24.345,
    volume: 234567,
    category: 'commodities',
    isFavorite: false
  },
  {
    pair: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    bidPrice: 43567.89,
    askPrice: 43589.12,
    spread: 21.23,
    change24h: 1234.56,
    changePercent24h: 2.91,
    high24h: 44234.56,
    low24h: 42123.45,
    volume: 987654321,
    category: 'crypto',
    isFavorite: false
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'deposit',
    amount: 5000.00,
    currency: 'USD',
    status: 'completed',
    method: 'Credit Card (Visa ****4242)',
    description: 'Deposit - Card',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reference: 'DEP-2024-001234'
  },
  {
    id: '2',
    type: 'withdrawal',
    amount: -1000.00,
    currency: 'USD',
    status: 'completed',
    method: 'Bank Transfer',
    description: 'Withdrawal - Bank Transfer',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reference: 'WD-2024-005678'
  },
  {
    id: '3',
    type: 'trade',
    amount: 444.00,
    currency: 'USD',
    status: 'completed',
    method: 'EUR/USD Trade',
    description: 'Trading Profit',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    type: 'bonus',
    amount: 500.00,
    currency: 'USD',
    status: 'completed',
    method: 'Welcome Bonus',
    description: 'Welcome Bonus',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    type: 'deposit',
    amount: 2000.00,
    currency: 'USD',
    status: 'pending',
    method: 'E-Wallet (PayPal)',
    description: 'Deposit - PayPal',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reference: 'DEP-2024-007890'
  }
];

export const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    name: 'Visa',
    last4: '4242',
    expiry: '12/25',
    isDefault: true
  },
  {
    id: '2',
    type: 'bank',
    name: 'Chase Bank',
    last4: '9876',
    isDefault: false
  },
  {
    id: '3',
    type: 'ewallet',
    name: 'PayPal',
    last4: '',
    isDefault: false
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Trade Closed',
    message: 'Your EUR/USD trade closed with +$444.00 profit',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    title: 'Deposit Confirmed',
    message: 'Your deposit of $2,000.00 has been confirmed',
    type: 'info',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'Margin Warning',
    message: 'Your margin level is approaching 110%',
    type: 'warning',
    read: true,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    title: 'Price Alert',
    message: 'EUR/USD reached your target price of 1.0850',
    type: 'info',
    read: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

// Helper function to generate realistic price movements
export function generatePriceData(basePrice: number, points: number = 50): Array<{ time: number; value: number }> {
  const data = [];
  let currentPrice = basePrice;
  const now = Date.now();
  
  for (let i = points; i >= 0; i--) {
    const change = (Math.random() - 0.5) * (basePrice * 0.002); // 0.2% max change
    currentPrice += change;
    data.push({
      time: now - i * 60000, // 1 minute intervals
      value: parseFloat(currentPrice.toFixed(5))
    });
  }
  
  return data;
}

// Calculate total P&L for positions
export function calculateTotalPL(positions: Position[]): number {
  return positions.reduce((total, position) => total + position.profitLoss, 0);
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format price with appropriate decimal places
export function formatPrice(price: number, pair: string): string {
  const s = pair.toUpperCase();
  let decimalPlaces = 5;
  if (s.includes('JPY')) {
    decimalPlaces = 3;
  } else if (s.startsWith('BTC/') || s.endsWith('/BTC')) {
    decimalPlaces = 2;
  }
  return price.toFixed(decimalPlaces);
}

// Format date and time
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Format relative time (e.g., "2h ago")
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDateTime(dateString);
}
