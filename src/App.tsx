/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  ShoppingBag,
  Sliders,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

import { Product, StoreConfig, GatewayConfig, Transaction, GatewayLog } from './types';
import Storefront from './components/Storefront';
import DevConsole from './components/DevConsole';
import Dashboard from './components/Dashboard';
import PaymentSheet from './components/PaymentSheet';

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_8J9K2L1P',
    amount: 199.00,
    currency: 'USD',
    status: 'succeeded',
    paymentMethod: 'card',
    paymentDetails: {
      cardBrand: 'Visa',
      last4: '4242'
    },
    customerEmail: 'alex.jones@sandbox.dev',
    customerName: 'Alex Jones',
    createdAt: '2026-07-16 14:32:01',
    metadata: { order_id: 'order_98725' }
  },
  {
    id: 'tx_3M4N5O6P',
    amount: 89.00,
    currency: 'USD',
    status: 'failed',
    paymentMethod: 'card',
    paymentDetails: {
      cardBrand: 'Amex',
      last4: '0002'
    },
    customerEmail: 'sarah.miller@sandbox.dev',
    customerName: 'Sarah Miller',
    errorMessage: 'The credit card has expired. Please verify date and year.',
    createdAt: '2026-07-16 11:15:40',
    metadata: { order_id: 'order_98721' }
  },
  {
    id: 'tx_7Q8R9S0T',
    amount: 249.00,
    currency: 'USD',
    status: 'refunded',
    paymentMethod: 'upi',
    paymentDetails: {
      upiId: 'johndoe@hdfc'
    },
    customerEmail: 'john.doe@sandbox.dev',
    customerName: 'John Doe',
    createdAt: '2026-07-15 09:44:12',
    metadata: { order_id: 'order_98710' }
  }
];

const INITIAL_LOGS: GatewayLog[] = [
  {
    id: 'log_init',
    timestamp: '04:26:40',
    type: 'system_event',
    method: 'SYSTEM',
    endpoint: 'server/boot',
    status: 200,
    payload: {
      service: 'SandboxPay Mock Payment Network',
      version: 'v2.4.0',
      ssl: 'active_256bit',
      latency: '24ms',
      node_env: 'production',
      host_port: '0.0.0.0:3000'
    },
    message: 'SandboxPay mock payment processing framework booted successfully.'
  }
];

export default function App() {
  const [viewMode, setViewMode] = useState<'split' | 'storefront' | 'developer'>('split');
  
  // App States
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [logs, setLogs] = useState<GatewayLog[]>(INITIAL_LOGS);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [activeCart, setActiveCart] = useState<{ product: Product; quantity: number }[]>([]);

  // Configurations
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    name: 'NeoGlow Electronics',
    primaryColor: '#4f46e5', // Indigo
    logoUrl: null,
    currency: 'USD',
    themeMode: 'light'
  });

  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({
    force3DS: false,
    forceError: 'none',
    apiKey: 'sk_test_51NpxJ5eA6H7zQ8k0v4s8m2l1p6',
    webhookUrl: 'https://api.neoglow.dev/webhooks/pay',
    enabledMethods: {
      card: true,
      upi: true,
      netbanking: true,
      gpay: true
    }
  });

  // Action Handlers
  const addLog = (log: Omit<GatewayLog, 'id' | 'timestamp'>) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newLog: GatewayLog = {
      ...log,
      id: 'log_' + Math.random().toString(36).substring(2, 11),
      timestamp: timeStr
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleUpdateStoreConfig = (config: Partial<StoreConfig>) => {
    setStoreConfig((prev) => ({ ...prev, ...config }));
  };

  const handleUpdateGatewayConfig = (config: Partial<GatewayConfig>) => {
    setGatewayConfig((prev) => ({ ...prev, ...config }));
  };

  const handleTriggerCheckout = (cartItems: { product: Product; quantity: number }[]) => {
    setActiveCart(cartItems);
    setIsPaymentSheetOpen(true);
    addLog({
      type: 'api_request',
      method: 'POST',
      endpoint: '/v1/checkout/sessions',
      status: 201,
      payload: {
        success_url: 'https://sandboxpay.dev/checkout/success',
        cancel_url: 'https://sandboxpay.dev/checkout/cancel',
        line_items: cartItems.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          amount_cents: Math.round(item.product.price * 100)
        }))
      },
      message: 'Created Stripe-compatible Checkout Session (Status 201)'
    });
  };

  const handlePaymentComplete = (newTx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const txId = 'tx_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const transaction: Transaction = {
      ...newTx,
      id: txId,
      createdAt: dateStr,
      metadata: { order_id: 'order_987' + Math.floor(Math.random() * 100) }
    };

    setTransactions((prev) => [transaction, ...prev]);
  };

  const handleTriggerRefund = (transactionId: string) => {
    const target = transactions.find((t) => t.id === transactionId);
    if (!target) return;

    // Dispatch logs for PATCH refund request
    addLog({
      type: 'api_request',
      method: 'POST',
      endpoint: `/v1/refunds`,
      status: 200,
      payload: {
        charge_id: transactionId,
        amount_cents: Math.round(target.amount * 100),
        reason: 'requested_by_customer'
      },
      message: `Initiated refund request for charge ${transactionId}`
    });

    // Update transactions list
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, status: 'refunded' as const } : t))
    );

    // Dispatch webhook for refund succeeding
    setTimeout(() => {
      addLog({
        type: 'webhook_dispatched',
        method: 'POST',
        endpoint: gatewayConfig.webhookUrl || 'https://api.neoglow.dev/webhooks/pay',
        status: 200,
        payload: {
          id: 'evt_' + Math.random().toString(36).substring(2, 11),
          object: 'event',
          type: 'charge.refunded',
          created: Math.floor(Date.now() / 1000),
          data: {
            charge: transactionId,
            refund_id: 're_' + Math.random().toString(36).substring(2, 11),
            amount: Math.round(target.amount * 100),
            status: 'succeeded'
          }
        },
        message: `Dispatched refund webhook event: charge.refunded`
      });
    }, 1200);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Get current cart totals
  const currentCartTotal = activeCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Dynamic Master Top Navigation Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        {/* Logo and Status */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-md">
                SandboxPay Checkout Gateway
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Interactive payment developer integration & testing playground
            </p>
          </div>
        </div>

        {/* Perspective View Switcher Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/40">
          <button
            id="view-btn-split"
            onClick={() => setViewMode('split')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'split'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Interactive Split Mode</span>
          </button>
          <button
            id="view-btn-storefront"
            onClick={() => setViewMode('storefront')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'storefront'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>🛍️ Full Storefront</span>
          </button>
          <button
            id="view-btn-developer"
            onClick={() => setViewMode('developer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'developer'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>💻 Developer Portal</span>
          </button>
        </div>
      </header>

      {/* Main Sandbox Layout Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full min-h-0">
        <AnimatePresence mode="wait">
          {/* PERSPECTIVE 1: Split Sandbox Mode */}
          {viewMode === 'split' && (
            <motion.div
              key="split-sandbox-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full items-stretch"
            >
              {/* Left 7 Columns: Customized Storefront Preview */}
              <div className="xl:col-span-8 overflow-y-auto">
                <Storefront
                  storeConfig={storeConfig}
                  onUpdateConfig={handleUpdateStoreConfig}
                  onTriggerCheckout={handleTriggerCheckout}
                />
              </div>

              {/* Right 5 Columns: Dev Console Output & Webhooks */}
              <div className="xl:col-span-4 h-full xl:sticky xl:top-[100px] max-h-[calc(100vh-140px)]">
                <DevConsole
                  logs={logs}
                  onClearLogs={clearLogs}
                  apiKey={gatewayConfig.apiKey}
                  cartTotal={currentCartTotal || 199.00}
                  currency={storeConfig.currency}
                />
              </div>
            </motion.div>
          )}

          {/* PERSPECTIVE 2: Full Screen Customer Storefront */}
          {viewMode === 'storefront' && (
            <motion.div
              key="storefront-only-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto w-full"
            >
              <Storefront
                storeConfig={storeConfig}
                onUpdateConfig={handleUpdateStoreConfig}
                onTriggerCheckout={handleTriggerCheckout}
              />
            </motion.div>
          )}

          {/* PERSPECTIVE 3: Full Screen Developer Portal */}
          {viewMode === 'developer' && (
            <motion.div
              key="developer-dashboard-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header with quick tip */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500 to-slate-900 text-white rounded-xl p-5 shadow-md">
                <div>
                  <h2 className="text-lg font-bold tracking-tight font-sans">
                    Gateway Integration Dashboard
                  </h2>
                  <p className="text-xs text-white/80 mt-1 max-w-xl font-sans">
                    Manage sandbox API keys, monitor transaction captures, toggle OTP requirements, and trigger sandbox refunds for full developer loop testing.
                  </p>
                </div>
                <div className="flex items-center space-x-1 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border border-white/20">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>v2.4.0 (SANDBOX)</span>
                </div>
              </div>

              <Dashboard
                transactions={transactions}
                gatewayConfig={gatewayConfig}
                storeConfig={storeConfig}
                onUpdateGatewayConfig={handleUpdateGatewayConfig}
                onTriggerRefund={handleTriggerRefund}
                onAddLog={addLog}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Interactive Checkout Overlay Modal */}
      <PaymentSheet
        isOpen={isPaymentSheetOpen}
        onClose={() => setIsPaymentSheetOpen(false)}
        cartItems={activeCart}
        storeConfig={storeConfig}
        gatewayConfig={gatewayConfig}
        onPaymentComplete={handlePaymentComplete}
        onAddLog={addLog}
      />

      {/* Small informative bottom footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-400 font-sans flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 shrink-0">
        <span className="flex items-center text-[11px] font-medium text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 mr-1 animate-pulse" />
          Designed & built as a sandbox checkout simulation. All transactions are simulated in local client state.
        </span>
        <div className="flex items-center space-x-4">
          <span className="text-[10px] font-bold text-slate-400 flex items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" /> Live Development Dev Port 3000
          </span>
        </div>
      </footer>
    </div>
  );
}
