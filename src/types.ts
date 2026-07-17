/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
}

export interface StoreConfig {
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  currency: string;
  themeMode: 'light' | 'dark' | 'glass';
}

export type PaymentStatus = 'pending' | 'processing' | 'requires_action' | 'succeeded' | 'failed' | 'refunded';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'gpay' | null;
  paymentDetails: {
    cardBrand?: string;
    last4?: string;
    upiId?: string;
    bankName?: string;
  };
  customerEmail: string;
  customerName: string;
  errorMessage?: string;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface GatewayConfig {
  force3DS: boolean;
  forceError: 'none' | 'insufficient_funds' | 'expired_card' | 'incorrect_cvv' | 'lost_card' | 'api_rate_limit';
  apiKey: string;
  webhookUrl: string;
  enabledMethods: {
    card: boolean;
    upi: boolean;
    netbanking: boolean;
    gpay: boolean;
  };
}

export interface GatewayLog {
  id: string;
  timestamp: string;
  type: 'api_request' | 'api_response' | 'webhook_dispatched' | 'system_event';
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'SYSTEM';
  endpoint: string;
  status: number;
  payload: any;
  message: string;
}
