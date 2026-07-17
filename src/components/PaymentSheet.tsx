/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CreditCard as CardIcon,
  Smartphone,
  Building,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Lock,
  ArrowRight,
  User,
  Calendar,
  KeyRound,
  Info,
  SmartphoneNfc
} from 'lucide-react';
import { Product, StoreConfig, GatewayConfig, Transaction, GatewayLog } from '../types';

interface PaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: { product: Product; quantity: number }[];
  storeConfig: StoreConfig;
  gatewayConfig: GatewayConfig;
  onPaymentComplete: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onAddLog: (log: Omit<GatewayLog, 'id' | 'timestamp'>) => void;
}

const TEST_CARDS = [
  { label: 'Visa (Succeeds)', number: '4242424242424242', exp: '12/28', cvv: '123', type: 'success' },
  { label: 'MasterCard (3D Secure)', number: '5105105105103001', exp: '08/29', cvv: '999', type: '3ds' },
  { label: 'Visa (Insufficient Funds)', number: '4111111111110001', exp: '04/27', cvv: '456', type: 'error_funds' },
  { label: 'Amex (Expired)', number: '378282246310002', exp: '01/24', cvv: '8432', type: 'error_expired' },
  { label: 'Discover (Incorrect CVV)', number: '6011111111110003', exp: '11/27', cvv: '000', type: 'error_cvv' }
];

const PRESET_BANKS = [
  { id: 'bank_chase', name: 'Chase Bank', icon: '🏦' },
  { id: 'bank_bofa', name: 'Bank of America', icon: '🇺🇸' },
  { id: 'bank_sbi', name: 'State Bank of India', icon: '🇮🇳' },
  { id: 'bank_barclays', name: 'Barclays', icon: '🇬🇧' },
  { id: 'bank_hsbc', name: 'HSBC', icon: '🇭🇰' }
];

export default function PaymentSheet({
  isOpen,
  onClose,
  cartItems,
  storeConfig,
  gatewayConfig,
  onPaymentComplete,
  onAddLog
}: PaymentSheetProps) {
  // Navigation states
  const [activeMethod, setActiveMethod] = useState<'card' | 'upi' | 'netbanking' | 'gpay'>('card');
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'processing' | 'otp' | 'success' | 'failure'>('form');

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('user@paytm');
  const [selectedBank, setSelectedBank] = useState('bank_chase');
  const [otpCode, setOtpCode] = useState('');

  // Processing detail states
  const [processStatus, setProcessStatus] = useState('');
  const [upiCountdown, setUpiCountdown] = useState(300); // 5 mins
  const [resolvedTransaction, setResolvedTransaction] = useState<Omit<Transaction, 'id' | 'createdAt'> | null>(null);

  // Cart total math
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 15.0 : 0.0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' };
  const currencySymbol = CURRENCY_SYMBOLS[storeConfig.currency] || '$';

  // UPI Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && activeMethod === 'upi' && checkoutStep === 'form') {
      timer = setInterval(() => {
        setUpiCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, activeMethod, checkoutStep]);

  // Handle auto-filling test cards
  const handleAutoFill = (card: typeof TEST_CARDS[0]) => {
    setCardNumber(card.number);
    setCardExp(card.exp);
    setCardCvv(card.cvv);
    if (!cardName) setCardName('Jane Doe');
    
    onAddLog({
      type: 'system_event',
      method: 'SYSTEM',
      endpoint: 'sandbox/autofill_card',
      status: 200,
      payload: { selectedCard: card.label, cardNumber: card.number.substring(0, 4) + ' **** **** ' + card.number.slice(-4) },
      message: `Auto-filled test card: ${card.label}`
    });
  };

  // Helper to format card number
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted.substring(0, 19)); // 16 digits + 3 spaces
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardExp(value.substring(0, 5));
  };

  // Detect card network
  const getCardBrand = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'MasterCard';
    if (cleaned.startsWith('3')) return 'American Express';
    if (cleaned.startsWith('6')) return 'Discover';
    return 'Generic';
  };

  // Handle submission
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();

    // Log the API payment intent creation
    onAddLog({
      type: 'api_request',
      method: 'POST',
      endpoint: '/v1/payment_intents',
      status: 200,
      payload: {
        amount: Math.round(total * 100),
        currency: storeConfig.currency.toLowerCase(),
        payment_method_types: [activeMethod],
        metadata: {
          store_name: storeConfig.name,
          customer_email: 'customer@sandbox.dev'
        }
      },
      message: 'Initiated POST /v1/payment_intents'
    });

    // Start checkout processing state machine
    setCheckoutStep('processing');
    executePaymentFlow();
  };

  const executePaymentFlow = () => {
    const sequence = [
      { text: 'Initializing terminal session...', delay: 600 },
      { text: 'Decrypting checkout payloads...', delay: 1200 },
      { text: 'Submitting secure gateway request...', delay: 2000 },
      { text: 'Contacting issuing bank network...', delay: 2800 }
    ];

    sequence.forEach((step) => {
      setTimeout(() => {
        setProcessStatus(step.text);
        onAddLog({
          type: 'system_event',
          method: 'SYSTEM',
          endpoint: 'gateway/process_step',
          status: 200,
          payload: { status: step.text },
          message: step.text
        });
      }, step.delay);
    });

    // Check configuration and card triggers
    setTimeout(() => {
      // 1. Force error check in dashboard configuration
      if (gatewayConfig.forceError !== 'none') {
        triggerGatewayError(gatewayConfig.forceError);
        return;
      }

      // 2. Check card details for specific failure numbers
      const cleanedNum = cardNumber.replace(/\D/g, '');
      if (activeMethod === 'card') {
        if (cleanedNum.endsWith('0001')) {
          triggerGatewayError('insufficient_funds');
          return;
        }
        if (cleanedNum.endsWith('0002')) {
          triggerGatewayError('expired_card');
          return;
        }
        if (cleanedNum.endsWith('0003')) {
          triggerGatewayError('incorrect_cvv');
          return;
        }
        if (cleanedNum.endsWith('0004')) {
          triggerGatewayError('lost_card');
          return;
        }
      }

      // 3. Determine if 3DS (OTP) challenge is needed
      const isCard3DS = activeMethod === 'card' && (cleanedNum.includes('3001') || gatewayConfig.force3DS);
      if (isCard3DS) {
        onAddLog({
          type: 'api_response',
          method: 'POST',
          endpoint: '/v1/payment_intents/confirm',
          status: 302,
          payload: {
            status: 'requires_action',
            next_action: {
              type: 'use_stripe_sdk',
              stripe_js: 'https://js.stripe.com/v3/3ds-challenge'
            }
          },
          message: '3D Secure Verification Required (302 Redirect)'
        });
        setCheckoutStep('otp');
      } else {
        // Direct success
        triggerPaymentSuccess();
      }
    }, 3800);
  };

  const triggerGatewayError = (errorType: string) => {
    let code = 'card_error';
    let message = 'An error occurred while routing the transaction.';
    let httpStatus = 402;

    switch (errorType) {
      case 'insufficient_funds':
        code = 'insufficient_funds';
        message = 'Your credit card has insufficient funds to fulfill this charge.';
        break;
      case 'expired_card':
        code = 'expired_card';
        message = 'The credit card has expired. Please verify date and year.';
        break;
      case 'incorrect_cvv':
        code = 'incorrect_cvv';
        message = 'The security code (CVV) entered is incorrect for this card.';
        break;
      case 'lost_card':
        code = 'lost_card';
        message = 'This card is flagged as lost or stolen by the issuing bank.';
        break;
      case 'api_rate_limit':
        code = 'rate_limit';
        message = 'Sandbox API rate limits exceeded. Please throttle concurrent client requests.';
        httpStatus = 429;
        break;
    }

    const mockTx: Omit<Transaction, 'id' | 'createdAt'> = {
      amount: total,
      currency: storeConfig.currency,
      status: 'failed',
      paymentMethod: activeMethod,
      paymentDetails: getPaymentDetailsObj(),
      customerEmail: 'customer@sandbox.dev',
      customerName: cardName || 'Jane Doe',
      errorMessage: message,
      metadata: { order_id: 'order_98725' }
    };

    onAddLog({
      type: 'api_response',
      method: 'POST',
      endpoint: '/v1/payment_intents/confirm',
      status: httpStatus,
      payload: {
        error: {
          type: 'card_error',
          code,
          message,
          doc_url: `https://api.sandboxpay.dev/errors/${code}`
        }
      },
      message: `Payment failed: ${message}`
    });

    // Send mock failed webhook
    dispatchWebhook('payment_intent.failed', {
      amount: Math.round(total * 100),
      currency: storeConfig.currency,
      error_code: code,
      error_message: message
    });

    setResolvedTransaction(mockTx);
    onPaymentComplete(mockTx);
    setCheckoutStep('failure');
  };

  const triggerPaymentSuccess = () => {
    const mockTx: Omit<Transaction, 'id' | 'createdAt'> = {
      amount: total,
      currency: storeConfig.currency,
      status: 'succeeded',
      paymentMethod: activeMethod,
      paymentDetails: getPaymentDetailsObj(),
      customerEmail: 'customer@sandbox.dev',
      customerName: cardName || 'Jane Doe',
      metadata: { order_id: 'order_98725' }
    };

    onAddLog({
      type: 'api_response',
      method: 'POST',
      endpoint: '/v1/payment_intents/confirm',
      status: 200,
      payload: {
        id: 'pi_' + Math.random().toString(36).substring(2, 11),
        amount: Math.round(total * 100),
        currency: storeConfig.currency.toLowerCase(),
        status: 'succeeded',
        payment_method_details: getPaymentDetailsObj(),
        charges: {
          data: [{ id: 'ch_' + Math.random().toString(36).substring(2, 11), paid: true, captured: true }]
        }
      },
      message: 'POST /v1/payment_intents/confirm - Success 200'
    });

    // Send mock success webhook
    dispatchWebhook('payment_intent.succeeded', {
      amount: Math.round(total * 100),
      currency: storeConfig.currency,
      payment_method: activeMethod,
      card_details: getPaymentDetailsObj()
    });

    setResolvedTransaction(mockTx);
    onPaymentComplete(mockTx);
    setCheckoutStep('success');
  };

  const handleOTPVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('processing');
    setProcessStatus('Validating 3D Secure verification OTP token...');

    setTimeout(() => {
      if (otpCode === '123456' || otpCode.trim() === '') {
        onAddLog({
          type: 'system_event',
          method: 'SYSTEM',
          endpoint: '3ds/verify_token',
          status: 200,
          payload: { otpCode, validated: true },
          message: '3D Secure token successfully authenticated!'
        });
        triggerPaymentSuccess();
      } else {
        onAddLog({
          type: 'system_event',
          method: 'SYSTEM',
          endpoint: '3ds/verify_token',
          status: 400,
          payload: { otpCode, validated: false },
          message: 'Incorrect 3D Secure OTP code.'
        });
        triggerGatewayError('incorrect_cvv');
      }
    }, 1500);
  };

  const getPaymentDetailsObj = () => {
    switch (activeMethod) {
      case 'card':
        return {
          cardBrand: getCardBrand(cardNumber),
          last4: cardNumber.replace(/\s+/g, '').slice(-4) || '4242'
        };
      case 'upi':
        return { upiId };
      case 'netbanking':
        const bank = PRESET_BANKS.find((b) => b.id === selectedBank)?.name || 'Chase Bank';
        return { bankName: bank };
      case 'gpay':
        return { cardBrand: 'Visa (Google Pay)', last4: '8810' };
    }
  };

  const dispatchWebhook = (event: string, data: any) => {
    setTimeout(() => {
      onAddLog({
        type: 'webhook_dispatched',
        method: 'POST',
        endpoint: gatewayConfig.webhookUrl || 'https://api.merchant.com/webhooks',
        status: 200,
        payload: {
          id: 'evt_' + Math.random().toString(36).substring(2, 11),
          object: 'event',
          type: event,
          api_version: '2025-05-01',
          created: Math.floor(Date.now() / 1000),
          data: {
            object: data
          }
        },
        message: `Dispatched webhook event: ${event}`
      });
    }, 1500);
  };

  // Theme settings
  const getThemeStyles = () => {
    if (storeConfig.themeMode === 'dark') {
      return {
        bg: 'bg-slate-900 text-slate-100 border-slate-800',
        input: 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500',
        methodTab: 'border-slate-800 text-slate-400 hover:bg-slate-800/40',
        selectedMethod: 'bg-slate-800 text-white border-indigo-500',
        summaryBg: 'bg-slate-950 border-slate-800/80'
      };
    } else if (storeConfig.themeMode === 'glass') {
      return {
        bg: 'bg-white/90 backdrop-blur-lg text-slate-900 border-white/60',
        input: 'bg-slate-50/50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500',
        methodTab: 'border-slate-200/60 text-slate-500 hover:bg-slate-50/50',
        selectedMethod: 'bg-white text-slate-900 border-indigo-500 shadow-sm',
        summaryBg: 'bg-slate-50/60 backdrop-blur-sm border-slate-100'
      };
    } else {
      return {
        bg: 'bg-white text-slate-900 border-slate-200',
        input: 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500',
        methodTab: 'border-slate-100 text-slate-500 hover:bg-slate-50',
        selectedMethod: 'bg-slate-50 text-indigo-900 border-indigo-600 font-bold',
        summaryBg: 'bg-slate-50 border-slate-100'
      };
    }
  };

  const themeStyles = getThemeStyles();

  if (!isOpen) return null;

  return (
    <div id="payment-sheet-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Modal Container */}
      <div
        id="payment-modal-card"
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col relative my-8 ${themeStyles.bg}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center space-x-2.5">
            {storeConfig.logoUrl ? (
              <img
                referrerPolicy="no-referrer"
                src={storeConfig.logoUrl}
                alt="Store Logo"
                className="max-h-6 object-contain"
              />
            ) : (
              <div className="flex items-center space-x-1.5 font-bold tracking-tight text-sm">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: storeConfig.primaryColor }} />
                <span>{storeConfig.name || 'Store Checkout'}</span>
              </div>
            )}
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
              Sandbox
            </span>
          </div>
          <button
            id="close-payment-sheet-btn"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Stages */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[80vh] space-y-5">
          {checkoutStep === 'form' && (
            <>
              {/* Checkout Method Tabs */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'card', name: 'Card', icon: CardIcon },
                  { id: 'upi', name: 'UPI', icon: Smartphone },
                  { id: 'netbanking', name: 'NetBank', icon: Building },
                  { id: 'gpay', name: 'GPay', icon: SmartphoneNfc }
                ].map((method) => {
                  const Icon = method.icon;
                  const isEnabled = (gatewayConfig.enabledMethods as any)[method.id] !== false;
                  if (!isEnabled) return null;

                  return (
                    <button
                      key={method.id}
                      onClick={() => setActiveMethod(method.id as any)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                        activeMethod === method.id ? themeStyles.selectedMethod : themeStyles.methodTab
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 mb-1.5" style={{ color: activeMethod === method.id ? storeConfig.primaryColor : undefined }} />
                      <span className="font-semibold">{method.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Order total header */}
              <div className={`p-4 rounded-xl border text-center flex items-center justify-between ${themeStyles.summaryBg}`}>
                <div className="text-left">
                  <span className="text-xs text-slate-500 font-sans">Payment Amount</span>
                  <p className="text-xl font-extrabold font-mono" style={{ color: storeConfig.primaryColor }}>
                    {currencySymbol}
                    {total.toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400 flex items-center space-x-1 font-sans">
                  <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium text-emerald-600 dark:text-emerald-500">256-Bit SSL Secured</span>
                </div>
              </div>

              {/* TAB 1: CARD FORM */}
              {activeMethod === 'card' && (
                <form id="card-checkout-form" onSubmit={handleSubmitPayment} className="space-y-4">
                  {/* Dynamic Card Graphic Illustration */}
                  <div
                    id="simulated-visa-card"
                    className="relative w-full aspect-[1.6/1] rounded-2xl p-6 text-white shadow-lg overflow-hidden flex flex-col justify-between"
                    style={{
                      background: `linear-gradient(135deg, ${storeConfig.primaryColor} 0%, #111827 100%)`
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] tracking-widest font-mono text-white/60">SANDBOX TEST CARD</span>
                        <span className="text-sm font-bold truncate mt-1">
                          {storeConfig.name || 'Store Account'}
                        </span>
                      </div>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 bg-white/20 rounded">
                        {getCardBrand(cardNumber)}
                      </span>
                    </div>

                    <p className="text-lg md:text-xl font-mono tracking-widest text-center py-2 text-white/90">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </p>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-mono text-white/50">CARDHOLDER</span>
                        <span className="text-xs font-semibold truncate max-w-[150px] font-mono">
                          {cardName.toUpperCase() || 'JANE DOE'}
                        </span>
                      </div>
                      <div className="flex justify-between space-x-6 font-mono">
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-white/50">EXPIRY</span>
                          <span className="text-xs font-semibold">{cardExp || 'MM/YY'}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-white/50">CVV</span>
                          <span className="text-xs font-semibold">{cardCvv || '•••'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="card-number-field" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          id="card-number-field"
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-all font-mono ${themeStyles.input}`}
                          placeholder="4242 4242 4242 4242"
                          required
                        />
                        <CardIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="card-exp-field" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Expiration
                        </label>
                        <div className="relative">
                          <input
                            id="card-exp-field"
                            type="text"
                            value={cardExp}
                            onChange={handleExpChange}
                            className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-all font-mono ${themeStyles.input}`}
                            placeholder="MM/YY"
                            required
                          />
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="card-cvv-field" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Security Code (CVV)
                        </label>
                        <div className="relative">
                          <input
                            id="card-cvv-field"
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
                            className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-all font-mono ${themeStyles.input}`}
                            placeholder="•••"
                            required
                          />
                          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="card-name-field" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Cardholder Name
                      </label>
                      <div className="relative">
                        <input
                          id="card-name-field"
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${themeStyles.input}`}
                          placeholder="Jane Doe"
                          required
                        />
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Clickable quick test card options */}
                  <div className="space-y-1.5 pt-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <Info className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                      Auto-Fill Sandbox Test Cards:
                    </span>
                    <div className="flex flex-wrap gap-1.5" id="test-cards-wrapper">
                      {TEST_CARDS.map((card) => (
                        <button
                          key={card.label}
                          type="button"
                          id={`autofill-btn-${card.type}`}
                          onClick={() => handleAutoFill(card)}
                          className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-700 font-sans font-medium transition-colors"
                        >
                          {card.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="submit-card-payment-btn"
                    type="submit"
                    className="w-full py-3 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center space-x-1.5 mt-4"
                    style={{ backgroundColor: storeConfig.primaryColor }}
                  >
                    <span>Submit Payment of {currencySymbol}{total.toFixed(2)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {/* TAB 2: UPI FORM */}
              {activeMethod === 'upi' && (
                <form id="upi-checkout-form" onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center py-6">
                    {/* Simulated QR Code using scalable SVG elements */}
                    <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                      <svg id="mock-qr-code" className="h-32 w-32 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M5 5h30v30H5zm5 5h20v20H10zm55-5h30v30H65zm5 5h20v20H70zM5 65h30v30H5zm5 5h20v20H10zm45-15h5v5h-5zm10 0h5v5h-5zm5-10h5v5h-5zm-15-10h5v5h-5zm20 5h5v5h-5zm0-15h5v5h-5zm-10 10h5v5h-5zm-10-10h5v5h-5zm30 30h5v5h-5zm-5 10h5v5h-5zm-10 10h5v5h-5zm15-5h5v5h-5zm-5 5h5v5h-5zm-10 5h5v5h-5zm20-15h5v5h-5zm-5 10h5v5h-5zm10 5h5v5h-5z" />
                      </svg>
                    </div>

                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-3 font-sans">
                      Scan QR Code using any UPI App
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-slate-400" />
                      QR expires in {Math.floor(upiCountdown / 60)}:{(upiCountdown % 60).toString().padStart(2, '0')}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="upi-id-field" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Or Enter UPI ID (Virtual Payment Address)
                    </label>
                    <div className="relative">
                      <input
                        id="upi-id-field"
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-all font-mono ${themeStyles.input}`}
                        placeholder="username@bank"
                        required
                      />
                      <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <button
                    id="submit-upi-payment-btn"
                    type="submit"
                    className="w-full py-3 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center space-x-1.5"
                    style={{ backgroundColor: storeConfig.primaryColor }}
                  >
                    <span>Simulate UPI Payment</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {/* TAB 3: NETBANKING FORM */}
              {activeMethod === 'netbanking' && (
                <form id="netbanking-checkout-form" onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Select Your Financial Institution
                    </label>
                    <div className="grid grid-cols-1 gap-2" id="bank-select-grid">
                      {PRESET_BANKS.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          id={`bank-select-${bank.id}`}
                          onClick={() => setSelectedBank(bank.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                            selectedBank === bank.id
                              ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-bold dark:border-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400'
                              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 font-medium">
                            <span className="text-lg">{bank.icon}</span>
                            <span>{bank.name}</span>
                          </div>
                          {selectedBank === bank.id && (
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: storeConfig.primaryColor }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="submit-netbanking-payment-btn"
                    type="submit"
                    className="w-full py-3 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center space-x-1.5"
                    style={{ backgroundColor: storeConfig.primaryColor }}
                  >
                    <span>Proceed to Simulated Bank Gateway</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {/* TAB 4: GOOGLE PAY */}
              {activeMethod === 'gpay' && (
                <div id="gpay-checkout-pane" className="space-y-4 py-3 text-center">
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80">
                    <SmartphoneNfc className="h-10 w-10 text-slate-600 dark:text-slate-400 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      This will simulate the express native system wallet verification popup (Apple Pay / Google Pay) on compatible devices.
                    </p>
                  </div>

                  <button
                    id="submit-gpay-payment-btn"
                    onClick={handleSubmitPayment}
                    className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
                  >
                    <span className="text-white">Pay with</span>
                    <span className="font-sans font-extrabold tracking-tight">Google Pay</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* STAGE 2: PROCESSING SCREEN */}
          {checkoutStep === 'processing' && (
            <div id="payment-processing-stage" className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <Loader2
                  className="h-16 w-16 animate-spin text-indigo-600"
                  style={{ color: storeConfig.primaryColor }}
                />
                <ShieldCheck className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-sans">
                  Processing Gateway Request
                </h3>
                <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                  {processStatus || 'Submitting secure authorization tokens...'}
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs font-sans mt-2">
                  This simulated terminal routes directly to mock Adyen & Stripe processing endpoints. View live console logs on the right pane!
                </p>
              </div>
            </div>
          )}

          {/* STAGE 3: 3D SECURE OTP SCREEN */}
          {checkoutStep === 'otp' && (
            <form id="otp-verification-form" onSubmit={handleOTPVerify} className="space-y-5 py-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
                <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold font-sans">3D Secure Authenticated Challenge Required</p>
                  <p className="mt-0.5">
                    Your issuing card has requested a second-factor password token. For testing, enter{' '}
                    <code className="font-bold bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">123456</code> or press bypass button.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <label htmlFor="otp-input-field" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  One-Time Verification Password
                </label>
                <input
                  id="otp-input-field"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className={`w-40 text-center py-2 text-lg tracking-[0.4em] font-mono font-bold rounded-lg border focus:outline-none focus:border-indigo-500 border-slate-300 ${themeStyles.input}`}
                  placeholder="••••••"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  id="bypass-otp-btn"
                  type="button"
                  onClick={() => {
                    setOtpCode('123456');
                    setTimeout(() => {
                      setCheckoutStep('processing');
                      triggerPaymentSuccess();
                    }, 200);
                  }}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 font-sans"
                >
                  Bypass with Code
                </button>
                <button
                  id="submit-otp-btn"
                  type="submit"
                  className="flex-1 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  style={{ backgroundColor: storeConfig.primaryColor }}
                >
                  Verify Code
                </button>
              </div>
            </form>
          )}

          {/* STAGE 4: SUCCESS CARD */}
          {checkoutStep === 'success' && resolvedTransaction && (
            <div id="payment-success-card" className="py-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-500">
                <CheckCircle className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-sans">
                  Payment Succeeded!
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Your simulated purchase was captured and processed securely.
                </p>
              </div>

              {/* Transaction receipt */}
              <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 font-sans">TRANSACTION ID</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    tx_{Math.random().toString(36).substring(2, 10).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Payment Method</span>
                  <span className="capitalize font-medium font-sans">
                    {resolvedTransaction.paymentMethod}
                    {resolvedTransaction.paymentDetails?.last4 && ` (ending in ${resolvedTransaction.paymentDetails.last4})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Status</span>
                  <span className="text-emerald-600 dark:text-emerald-500 font-bold font-sans flex items-center">
                    Captured (Settled)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Customer</span>
                  <span className="font-medium font-sans">{resolvedTransaction.customerName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/50 dark:border-slate-800 pt-2 font-bold text-slate-800 dark:text-slate-200">
                  <span className="font-sans">Amount Billed</span>
                  <span className="font-mono">
                    {currencySymbol}
                    {resolvedTransaction.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                id="success-done-btn"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl font-bold text-xs shadow-md transition-all"
              >
                Return to Storefront
              </button>
            </div>
          )}

          {/* STAGE 5: FAILURE CARD */}
          {checkoutStep === 'failure' && resolvedTransaction && (
            <div id="payment-failure-card" className="py-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="h-16 w-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-sans">
                  Transaction Declined
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold font-mono">
                  ERROR_CODE: {resolvedTransaction.errorMessage ? 'CARD_ROUTE_DECLINED' : 'API_GATEWAY_FAILURE'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm font-sans">
                  {resolvedTransaction.errorMessage || 'The bank returned a generic card declined code.'}
                </p>
              </div>

              {/* Troubleshooting tip */}
              <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4 text-xs text-left">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 font-sans flex items-center">
                  <Info className="h-4 w-4 mr-1 text-indigo-500" /> Sandbox Debug Guide:
                </p>
                <p className="text-slate-500 font-sans leading-relaxed">
                  In a real gateway, this error triggers code-level integration responses. You can change forced failure rules on the **Developer Dashboard** or use the{' '}
                  <code className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">Visa (Succeeds)</code> card to proceed.
                </p>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  id="failure-retry-btn"
                  onClick={() => setCheckoutStep('form')}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
                >
                  Try Another Card
                </button>
                <button
                  id="failure-close-btn"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black shadow-md transition-all"
                >
                  Close Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
