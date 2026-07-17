/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Code, Copy, Check, Trash2, ChevronDown, ChevronRight, Webhook, RefreshCw } from 'lucide-react';
import { GatewayLog } from '../types';

interface DevConsoleProps {
  logs: GatewayLog[];
  onClearLogs: () => void;
  apiKey: string;
  cartTotal: number;
  currency: string;
}

type SnippetLanguage = 'curl' | 'javascript' | 'python' | 'go';

export default function DevConsole({ logs, onClearLogs, apiKey, cartTotal, currency }: DevConsoleProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'snippets'>('logs');
  const [snippetLang, setSnippetLang] = useState<SnippetLanguage>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCodeSnippet = (lang: SnippetLanguage) => {
    const amountInCents = Math.round(cartTotal * 100);
    const currLower = currency.toLowerCase();

    switch (lang) {
      case 'curl':
        return `curl https://api.sandboxpay.dev/v1/payment_intents \\
  -u ${apiKey.substring(0, 12)}...: \\
  -d amount=${amountInCents} \\
  -d currency="${currLower}" \\
  -d "payment_method_types[]"="card" \\
  -d "metadata[order_id]"="order_98725" \\
  -d "description"="Storefront checkout payment"`;

      case 'javascript':
        return `import Stripe from 'stripe';
const stripe = new Stripe('${apiKey.substring(0, 12)}...');

const paymentIntent = await stripe.paymentIntents.create({
  amount: ${amountInCents},
  currency: '${currLower}',
  payment_method_types: ['card', 'upi'],
  metadata: { order_id: 'order_98725' },
});

console.log('Payment Intent Created:', paymentIntent.client_secret);`;

      case 'python':
        return `import stripe
stripe.api_key = "${apiKey.substring(0, 12)}..."

intent = stripe.PaymentIntent.create(
    amount=${amountInCents},
    currency="${currLower}",
    payment_method_types=["card", "upi"],
    metadata={"order_id": "order_98725"},
)`;

      case 'go':
        return `package main

import (
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/paymentintent"
)

func main() {
	stripe.Key = "${apiKey.substring(0, 12)}..."

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(${amountInCents}),
		Currency: stripe.String("${currLower}"),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
			"upi",
		}),
	}
	params.AddMetadata("order_id", "order_98725")

	pi, _ := paymentintent.New(params)
}
`;
    }
  };

  const toggleExpandLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div id="dev-console-container" className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-sm">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
        <div className="flex space-x-2">
          <button
            id="tab-btn-logs"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-teal-400 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Developer Logs</span>
            {logs.length > 0 && (
              <span className="ml-1 bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full text-xs">
                {logs.length}
              </span>
            )}
          </button>
          <button
            id="tab-btn-snippets"
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'snippets'
                ? 'bg-slate-800 text-teal-400 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>API Snippets</span>
          </button>
        </div>
        
        {activeTab === 'logs' && (
          <button
            id="clear-logs-btn"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center space-x-1 text-xs text-slate-500 hover:text-red-400 disabled:opacity-35 disabled:hover:text-slate-500 px-2 py-1 rounded transition-colors"
            title="Clear Console Logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {activeTab === 'logs' ? (
          logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-center">
              <Terminal className="h-12 w-12 text-slate-700 mb-3 animate-pulse" />
              <p className="text-sm max-w-xs font-sans">
                Console is idle. Launch checkout, choose payment options, or trigger custom errors on the storefront to see live API call streaming.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const statusColor =
                  log.status >= 200 && log.status < 300
                    ? 'text-emerald-400'
                    : log.status >= 300 && log.status < 400
                    ? 'text-blue-400'
                    : 'text-red-400';

                const typeColor =
                  log.type === 'api_request'
                    ? 'text-teal-400 bg-teal-500/10'
                    : log.type === 'api_response'
                    ? 'text-indigo-400 bg-indigo-500/10'
                    : log.type === 'webhook_dispatched'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-400 bg-slate-800';

                return (
                  <div
                    key={log.id}
                    className="border border-slate-800 bg-slate-950/50 rounded-lg overflow-hidden hover:border-slate-700 transition-colors"
                  >
                    <div
                      onClick={() => toggleExpandLog(log.id)}
                      className="flex items-center justify-between p-3 cursor-pointer select-none text-xs hover:bg-slate-900/40"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {log.timestamp}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${typeColor}`}>
                          {log.type === 'webhook_dispatched' ? 'webhook' : log.method}
                        </span>
                        <span className={`font-semibold shrink-0 ${statusColor}`}>
                          {log.status}
                        </span>
                        <span className="text-slate-300 font-medium truncate">
                          {log.endpoint}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px] shrink-0 font-sans ml-2">
                        {log.message}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-900 bg-slate-950 px-4 py-3 text-xs overflow-x-auto text-slate-300">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500 text-[10px]">PAYLOAD & DETAILS</span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(log.payload, null, 2))}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded bg-slate-900"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy JSON</span>
                          </button>
                        </div>
                        <pre className="text-[11px] text-teal-300 leading-relaxed max-h-60 overflow-y-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* API SNIPPETS */
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-sans">
                Sample API calls dynamically synced with current cart state:
              </span>
              <div className="flex space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                {(['curl', 'javascript', 'python', 'go'] as SnippetLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSnippetLang(lang)}
                    className={`px-2 py-1 rounded text-xs transition-all uppercase ${
                      snippetLang === lang
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-1 bg-slate-900/50 rounded-lg border border-slate-800 p-4 overflow-y-auto">
              <button
                onClick={() => copyToClipboard(getCodeSnippet(snippetLang))}
                className="absolute top-3 right-3 p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-teal-400 rounded-md border border-slate-800 hover:border-slate-700 transition-all flex items-center space-x-1"
                title="Copy code snippet"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400 animate-scale" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="text-xs font-sans">{copiedCode ? 'Copied!' : 'Copy'}</span>
              </button>

              <pre className="text-teal-300 text-xs overflow-x-auto select-all leading-relaxed whitespace-pre font-mono pt-6">
                {getCodeSnippet(snippetLang)}
              </pre>
            </div>

            <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800/60 flex items-start space-x-2.5 text-xs text-slate-400 font-sans">
              <Webhook className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Handling Webhooks</p>
                <p className="mt-0.5">
                  Always verify webhook signatures on your backend. Standard event payload structures like{' '}
                  <code className="text-amber-400 font-mono">payment_intent.succeeded</code> and{' '}
                  <code className="text-amber-400 font-mono">payment_intent.failed</code> will be triggered automatically and can be tested under the Developer Dashboard Tab.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
