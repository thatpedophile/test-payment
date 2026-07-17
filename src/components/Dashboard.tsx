/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Key,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  Send,
  History,
  TrendingUp,
  Coins,
  Ban,
  Webhook,
  CheckCircle,
  HelpCircle,
  Search,
  ChevronDown
} from 'lucide-react';
import { Transaction, GatewayConfig, StoreConfig, GatewayLog } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  gatewayConfig: GatewayConfig;
  storeConfig: StoreConfig;
  onUpdateGatewayConfig: (config: Partial<GatewayConfig>) => void;
  onTriggerRefund: (transactionId: string) => void;
  onAddLog: (log: Omit<GatewayLog, 'id' | 'timestamp'>) => void;
}

export default function Dashboard({
  transactions,
  gatewayConfig,
  storeConfig,
  onUpdateGatewayConfig,
  onTriggerRefund,
  onAddLog
}: DashboardProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [webhookTestStatus, setWebhookTestStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Math calculation
  const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' };
  const currencySymbol = CURRENCY_SYMBOLS[storeConfig.currency] || '$';

  const succeededTransactions = transactions.filter((t) => t.status === 'succeeded');
  const totalVolume = succeededTransactions.reduce((acc, t) => acc + t.amount, 0);
  const refundsCount = transactions.filter((t) => t.status === 'refunded').length;

  const filteredTransactions = transactions.filter(
    (t) => t.customerEmail.toLowerCase().includes(searchEmail.toLowerCase()) || t.id.includes(searchEmail)
  );

  const handleRollKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 24; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newKey = `sk_test_${rand}`;
    onUpdateGatewayConfig({ apiKey: newKey });

    onAddLog({
      type: 'system_event',
      method: 'SYSTEM',
      endpoint: 'security/api_keys',
      status: 200,
      payload: { oldKey: `${gatewayConfig.apiKey.substring(0, 10)}...`, newKey: `${newKey.substring(0, 10)}...` },
      message: 'Revoked old test API key and generated a new master credentials key'
    });
  };

  const handleTestWebhook = () => {
    setWebhookTestStatus('sending');
    onAddLog({
      type: 'api_request',
      method: 'POST',
      endpoint: 'sandbox/webhooks/test_ping',
      status: 200,
      payload: { url: gatewayConfig.webhookUrl },
      message: 'Sending webhook test ping request...'
    });

    setTimeout(() => {
      setWebhookTestStatus('sent');
      onAddLog({
        type: 'webhook_dispatched',
        method: 'POST',
        endpoint: gatewayConfig.webhookUrl || 'https://api.merchant.com/webhooks',
        status: 200,
        payload: {
          id: 'evt_' + Math.random().toString(36).substring(2, 11),
          object: 'event',
          type: 'webhook.ping',
          created: Math.floor(Date.now() / 1000),
          data: {
            url: gatewayConfig.webhookUrl,
            connection: 'active_success'
          }
        },
        message: 'Successfully dispatched mock test webhook'
      });

      setTimeout(() => setWebhookTestStatus('idle'), 3000);
    }, 1200);
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'succeeded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider font-mono">Succeeded</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 uppercase tracking-wider font-mono">Failed</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider font-mono">Refunded</span>;
      case 'processing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider font-mono animate-pulse">Processing</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100 uppercase tracking-wider font-mono">Pending</span>;
    }
  };

  return (
    <div id="developer-dashboard-layout" className="space-y-6">
      {/* 1. Metric Counter Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="metrics-cards-grid">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-sans font-medium uppercase tracking-wider">Captured Volume</span>
            <p className="text-2xl font-bold font-mono mt-1 text-slate-800">
              {currencySymbol}
              {totalVolume.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-sans font-medium uppercase tracking-wider">Total Transactions</span>
            <p className="text-2xl font-bold font-mono mt-1 text-slate-800">{transactions.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-sans font-medium uppercase tracking-wider">Refunds Issued</span>
            <p className="text-2xl font-bold font-mono mt-1 text-slate-800">{refundsCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-sans font-medium uppercase tracking-wider">Gateway State</span>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mt-2 font-mono flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 animate-pulse" /> ONLINE (SANDBOX)
            </p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
            <Sliders className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Sliders Config and Credentials Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Gateway Rules Panel */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sliders className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
              Sandbox Configuration Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3DS verification rule toggle */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <input
                id="checkbox-force-3ds"
                type="checkbox"
                checked={gatewayConfig.force3DS}
                onChange={(e) => onUpdateGatewayConfig({ force3DS: e.target.checked })}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
              />
              <label htmlFor="checkbox-force-3ds" className="select-none cursor-pointer">
                <span className="block text-xs font-bold text-slate-800 font-sans">
                  Force 3D Secure verification
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                  Forces an OTP SMS window challenge on Card purchases to test second-factor integration responses.
                </span>
              </label>
            </div>

            {/* Force Gateway Error type */}
            <div className="flex flex-col space-y-1 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <label htmlFor="select-force-error" className="text-xs font-bold text-slate-800 font-sans">
                Force Routing Declines
              </label>
              <select
                id="select-force-error"
                value={gatewayConfig.forceError}
                onChange={(e) => onUpdateGatewayConfig({ forceError: e.target.value as any })}
                className="w-full mt-1.5 p-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="none">No Error (Succeeds normally)</option>
                <option value="insufficient_funds">Insufficient Funds (Card)</option>
                <option value="expired_card">Expired Card (Card)</option>
                <option value="incorrect_cvv">Incorrect CVV Code (Card)</option>
                <option value="lost_card">Lost or Stolen Card (Card)</option>
                <option value="api_rate_limit">API Rate Limit Exceeded (HTTP 429)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 leading-relaxed font-sans">
                Triggers visual card declines and precise API fail codes to test webhook and failure sheets.
              </span>
            </div>
          </div>

          {/* Webhooks Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide font-sans">
              Webhook Endpoint Integrator
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="webhook-url-input"
                  type="text"
                  value={gatewayConfig.webhookUrl}
                  onChange={(e) => onUpdateGatewayConfig({ webhookUrl: e.target.value })}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-600"
                  placeholder="https://api.yourserver.com/webhooks/pay"
                />
                <Webhook className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                id="test-webhook-btn"
                onClick={handleTestWebhook}
                disabled={webhookTestStatus !== 'idle'}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600 border border-slate-200/50 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                <span>{webhookTestStatus === 'sending' ? 'Sending...' : webhookTestStatus === 'sent' ? 'Dispatched' : 'Test Ping'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Every checkout success or failure dispatches events (e.g. `payment_intent.succeeded`) to this URL, printed on the right console.
            </p>
          </div>

          {/* Enabled Payment Methods Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide font-sans">
              Toggle Supported Payment Methods
            </span>
            <div className="flex flex-wrap gap-4" id="methods-checklist">
              {([
                { id: 'card', name: 'Credit/Debit Card' },
                { id: 'upi', name: 'UPI (India)' },
                { id: 'netbanking', name: 'NetBanking' },
                { id: 'gpay', name: 'Google Pay' }
              ] as const).map((method) => (
                <div key={method.id} className="flex items-center space-x-1.5 text-xs">
                  <input
                    id={`checkbox-method-${method.id}`}
                    type="checkbox"
                    checked={gatewayConfig.enabledMethods[method.id] !== false}
                    onChange={(e) => {
                      const enabled = { ...gatewayConfig.enabledMethods, [method.id]: e.target.checked };
                      onUpdateGatewayConfig({ enabledMethods: enabled });
                    }}
                    className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                  />
                  <label htmlFor={`checkbox-method-${method.id}`} className="font-medium text-slate-700 cursor-pointer select-none">
                    {method.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Credentials and Keys Column */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Key className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
              API Credentials & Integration Keys
            </h3>
          </div>

          {/* Public Key display */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Publishable Key (Client SDKs)
            </label>
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-600 select-all flex justify-between items-center">
              <span>pk_test_51NpxJ5eA6H7zQ8k0s1p2o3d</span>
              <span className="text-[10px] bg-slate-200/60 font-semibold px-1 py-0.5 rounded text-slate-500">Public</span>
            </div>
          </div>

          {/* Private Key display with show/hide toggle */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Secret Key (Backend API Requests)
              </label>
              <button
                id="toggle-secret-key-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-slate-400 hover:text-indigo-600 text-xs flex items-center space-x-1 font-sans"
              >
                {showApiKey ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-600 select-all flex justify-between items-center">
              <span className="truncate max-w-[200px]">
                {showApiKey ? gatewayConfig.apiKey : 'sk_test_••••••••••••••••••••' + gatewayConfig.apiKey.slice(-4)}
              </span>
              <button
                id="roll-api-key-btn"
                onClick={handleRollKey}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 rounded"
                title="Roll secret API Key"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs text-slate-500 leading-relaxed font-sans flex items-start space-x-2">
            <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              Your secret key must only be stored on secure backends (like your custom server). Never hardcode secrets in client browsers to prevent identity theft.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Transaction History Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-4">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
              Sandbox Transactions Database
            </h3>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <input
              id="search-transactions-input"
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by ID or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-sans text-sm">
              No matching sandbox transaction logs located in database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="transactions-db-table">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer Email</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100/60">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 shrink-0 select-all">{tx.id}</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] font-sans shrink-0">{tx.createdAt}</td>
                    <td className="py-3 px-3 text-slate-600 font-sans truncate max-w-[120px]">{tx.customerEmail}</td>
                    <td className="py-3 px-3 font-sans font-medium capitalize text-slate-600">
                      {tx.paymentMethod}
                      {tx.paymentDetails?.last4 && (
                        <span className="text-[10px] text-slate-400 ml-1">(*{tx.paymentDetails.last4})</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold font-mono text-slate-700">
                      {currencySymbol}
                      {tx.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(tx.status)}</td>
                    <td className="py-3 px-3 text-right">
                      {tx.status === 'succeeded' ? (
                        <button
                          id={`refund-trigger-btn-${tx.id}`}
                          onClick={() => onTriggerRefund(tx.id)}
                          className="px-2 py-1 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-sans font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-2xs cursor-pointer"
                        >
                          Refund Charge
                        </button>
                      ) : tx.status === 'refunded' ? (
                        <span className="text-[10px] font-bold text-slate-400 font-sans italic">Refunded</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 font-sans">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
