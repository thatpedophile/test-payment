/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash,
  Palette,
  Globe,
  UploadCloud,
  Check,
  Store,
  X,
  CreditCard,
  Grid,
  Sparkles
} from 'lucide-react';
import { Product, StoreConfig } from '../types';

interface StorefrontProps {
  storeConfig: StoreConfig;
  onUpdateConfig: (config: Partial<StoreConfig>) => void;
  onTriggerCheckout: (cartItems: { product: Product; quantity: number }[]) => void;
}

const PRESET_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Acoustic-X Wireless Headphones',
    price: 199.0,
    description: 'Next-generation active noise cancellation with 40-hour deep ambient audio reproduction.',
    image: '🎧',
    category: 'Electronics'
  },
  {
    id: 'prod_2',
    name: 'Metropolitan Leather Folio',
    price: 89.0,
    description: 'Handcrafted full-grain Italian leather organizer with specialized accessory compartments.',
    image: '💼',
    category: 'Accessories'
  },
  {
    id: 'prod_3',
    name: 'Quantum Chrono Smartwatch',
    price: 249.0,
    description: 'Minimalist titanium casing featuring continuous vital telemetry and always-on display.',
    image: '⌚',
    category: 'Wearables'
  }
];

const COLOR_PALETTES = [
  { name: 'Indigo Sleek', value: '#4f46e5', bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600' },
  { name: 'Emerald Mint', value: '#059669', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600' },
  { name: 'Amber Glow', value: '#d97706', bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-600' },
  { name: 'Rose Quartz', value: '#e11d48', bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600' },
  { name: 'Carbon Black', value: '#1f2937', bg: 'bg-gray-800', hover: 'hover:bg-gray-900', text: 'text-gray-800' },
  { name: 'Sky Tech', value: '#0284c7', bg: 'bg-sky-600', hover: 'hover:bg-sky-700', text: 'text-sky-600' }
];

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' }
];

export default function Storefront({ storeConfig, onUpdateConfig, onTriggerCheckout }: StorefrontProps) {
  const [cart, setCart] = useState<{ [productId: string]: number }>({
    prod_1: 1
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cart math
  const cartItems = PRESET_PRODUCTS.map((prod) => ({
    product: prod,
    quantity: cart[prod.id] || 0
  })).filter((item) => item.quantity > 0);

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const currencySymbol = CURRENCIES.find((c) => c.code === storeConfig.currency)?.symbol || '$';
  const shipping = subtotal > 0 ? 15.0 : 0.0;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Drag & Drop logo upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processLogoFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processLogoFile(files[0]);
    }
  };

  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onUpdateConfig({ logoUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateConfig({ logoUrl: null });
  };

  const getThemeClass = () => {
    switch (storeConfig.themeMode) {
      case 'dark':
        return 'bg-slate-900 text-slate-100 border-slate-800';
      case 'glass':
        return 'bg-white/70 backdrop-blur-md text-slate-900 border-white/50';
      case 'light':
      default:
        return 'bg-white text-slate-900 border-slate-100';
    }
  };

  return (
    <div id="storefront-designer-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      {/* LEFT COLUMN: Customizer Sidebar */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-md p-5 space-y-6">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <Palette className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900 font-sans uppercase tracking-wide">
            Storefront Customizer
          </h2>
        </div>

        {/* Store Name input */}
        <div className="space-y-1.5">
          <label htmlFor="store-name-input" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Store Name
          </label>
          <div className="relative">
            <input
              id="store-name-input"
              type="text"
              value={storeConfig.name}
              onChange={(e) => onUpdateConfig({ name: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              placeholder="e.g. Minimalist Wear"
            />
            <Store className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Currency selection */}
        <div className="space-y-1.5">
          <label htmlFor="currency-select-box" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Store Currency
          </label>
          <div className="grid grid-cols-5 gap-1" id="currency-select-box">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                onClick={() => onUpdateConfig({ currency: curr.code })}
                className={`py-1.5 text-xs font-bold rounded-md border transition-all ${
                  storeConfig.currency === curr.code
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-extrabold'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                title={`${curr.code} (${curr.symbol})`}
              >
                {curr.code}
              </button>
            ))}
          </div>
        </div>

        {/* Theme mode options */}
        <div className="space-y-1.5">
          <label htmlFor="theme-select-box" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Checkout Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5" id="theme-select-box">
            {(['light', 'dark', 'glass'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onUpdateConfig({ themeMode: mode })}
                className={`py-1.5 text-xs font-medium rounded-md border transition-all capitalize ${
                  storeConfig.themeMode === mode
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Brand color selector */}
        <div className="space-y-1.5">
          <label htmlFor="brand-color-grid" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Brand Accent Color
          </label>
          <div className="grid grid-cols-3 gap-2" id="brand-color-grid">
            {COLOR_PALETTES.map((color) => {
              const isSelected = storeConfig.primaryColor === color.value;
              return (
                <button
                  key={color.name}
                  onClick={() => onUpdateConfig({ primaryColor: color.value })}
                  className={`flex items-center space-x-1.5 p-2 rounded-lg border text-left transition-all ${
                    isSelected ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full shrink-0 ${color.bg}`} />
                  <span className="text-[11px] font-medium text-slate-700 truncate">{color.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* File upload for custom logo (drag & drop + select) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Custom Logo Upload
          </label>
          <div
            id="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileBrowser}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]'
                : storeConfig.logoUrl
                ? 'border-indigo-100 bg-slate-50/50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
              id="file-logo-uploader"
            />
            {storeConfig.logoUrl ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="relative p-2 bg-white rounded-lg shadow-sm border border-slate-100 max-w-[120px] max-h-[50px] flex items-center justify-center overflow-hidden">
                  <img
                    referrerPolicy="no-referrer"
                    src={storeConfig.logoUrl}
                    alt="Store Logo"
                    className="max-h-8 object-contain"
                  />
                  <button
                    id="remove-logo-btn"
                    onClick={removeLogo}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md hover:scale-115 transition-transform"
                    title="Remove Logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1" /> Customized Active Logo
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <UploadCloud className="h-7 w-7 mx-auto text-slate-400" />
                <div className="text-xs text-slate-600 font-medium">
                  <span className="text-indigo-600 underline">Click to select</span> or drag logo image here
                </div>
                <p className="text-[10px] text-slate-400">PNG, JPG or SVG up to 1MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Tip */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-500 leading-relaxed font-sans flex items-start space-x-2">
          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
          <span>
            This customizer controls both the client storefront brand experience and the colors loaded by the checkout payment sheet. Try testing different settings!
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Live Storefront Preview */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">
              Live Sandbox Preview (Iframe Safe)
            </span>
          </div>
          {cartItems.length > 0 && (
            <button
              id="clear-cart-btn"
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-500 font-sans transition-colors flex items-center space-x-1"
            >
              <Trash className="h-3.5 w-3.5" />
              <span>Empty Cart</span>
            </button>
          )}
        </div>

        {/* Store Window Container */}
        <div className={`rounded-xl border shadow-xl overflow-hidden transition-all duration-300 ${getThemeClass()}`}>
          {/* Mock Store Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
            <div className="flex items-center space-x-3">
              {storeConfig.logoUrl ? (
                <img
                  referrerPolicy="no-referrer"
                  src={storeConfig.logoUrl}
                  alt={storeConfig.name}
                  className="max-h-7 object-contain"
                />
              ) : (
                <div className="flex items-center space-x-1.5 font-bold tracking-tight text-lg">
                  <ShoppingBag className="h-5 w-5" style={{ color: storeConfig.primaryColor }} />
                  <span>{storeConfig.name || 'Storefront'}</span>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200/40">
                <ShoppingBag className="h-3.5 w-3.5 mr-1" style={{ color: storeConfig.primaryColor }} />
                <span>{cartItems.reduce((acc, item) => acc + item.quantity, 0)} items</span>
              </div>
            </div>
          </div>

          {/* Store Banner */}
          <div className="relative overflow-hidden py-10 px-6 border-b border-inherit bg-gradient-to-r from-slate-50/50 via-indigo-50/10 to-slate-50/50 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center text-center">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-sans">
              Summer Equipment Collection
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Upgrade your setup with precision-engineered products. Tested and certified in our sandbox environment.
            </p>
          </div>

          {/* Grid of Products */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRESET_PRODUCTS.map((prod) => {
              const inCartQty = cart[prod.id] || 0;
              return (
                <div
                  key={prod.id}
                  className="group relative bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-4 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Aspect */}
                    <div className="aspect-square rounded-lg bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center text-4xl mb-4 group-hover:scale-102 transition-transform">
                      {prod.image}
                    </div>

                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {prod.category}
                      </span>
                      <span className="text-sm font-bold font-mono">
                        {currencySymbol}
                        {prod.price.toFixed(2)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                      {prod.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {prod.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    {inCartQty > 0 ? (
                      <div className="flex items-center justify-between">
                        <button
                          id={`qty-minus-${prod.id}`}
                          onClick={() => updateCartQuantity(prod.id, -1)}
                          className="h-7 w-7 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold font-mono">{inCartQty}</span>
                        <button
                          id={`qty-plus-${prod.id}`}
                          onClick={() => updateCartQuantity(prod.id, 1)}
                          className="h-7 w-7 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`add-to-cart-${prod.id}`}
                        onClick={() => updateCartQuantity(prod.id, 1)}
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center space-x-1"
                        style={{ backgroundColor: storeConfig.primaryColor }}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary & Pay Actions */}
          <div className="p-6 bg-slate-50/50 dark:bg-slate-950/40 border-t border-inherit">
            <div className="max-w-md ml-auto space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Simulated Shipping</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {currencySymbol}
                  {shipping.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Calculated Tax (8%)</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {currencySymbol}
                  {tax.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2 text-base font-bold text-slate-800 dark:text-slate-100">
                <span>Total Amount</span>
                <span className="font-mono" style={{ color: storeConfig.primaryColor }}>
                  {currencySymbol}
                  {total.toFixed(2)}
                </span>
              </div>

              <div className="pt-4">
                {cartItems.length > 0 ? (
                  <button
                    id="trigger-checkout-btn"
                    onClick={() => onTriggerCheckout(cartItems)}
                    className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
                    style={{ backgroundColor: storeConfig.primaryColor }}
                  >
                    <CreditCard className="h-4.5 w-4.5" />
                    <span>Proceed to Sandbox Checkout</span>
                  </button>
                ) : (
                  <div className="text-center py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-400">
                    Your cart is empty. Add items above to test the payment sheet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
