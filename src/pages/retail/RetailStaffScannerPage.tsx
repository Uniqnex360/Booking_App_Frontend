import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Store,
  Tag,
  ArrowLeft,
  Search,
  Check,
  Receipt,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import {
  retailApi,
  StoreBranch,
  CouponValidationResult,
  CouponRedemptionResult,
} from '@/api/retail.api';

export default function RetailStaffScannerPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [stores, setStores] = useState<StoreBranch[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [codeInputValue, setCodeInputValue] = useState<string>('');
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<CouponValidationResult | null>(null);

  // Redemption inputs
  const [billNumber, setBillNumber] = useState<string>('');
  const [billAmount, setBillAmount] = useState<string>('');
  const [redeeming, setRedeeming] = useState<boolean>(false);
  const [redemptionResult, setRedemptionResult] = useState<CouponRedemptionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    loadStores();
    return () => {
      stopCamera();
    };
  }, []);

  const loadStores = async () => {
    try {
      // First try to load partner stores if authenticated partner
      const myStores = await retailApi.getMyStores().catch(() => []);
      if (myStores.length > 0) {
        setStores(myStores);
        setSelectedStoreId(myStores[0].id);
      } else {
        // Fallback: load offers and gather unique stores for staff demo
        const offers = await retailApi.getOffers();
        const allStoresMap = new Map<string, StoreBranch>();
        offers.forEach((o) => {
          o.stores.forEach((s) => allStoresMap.set(s.id, s));
        });
        const storesList = Array.from(allStoresMap.values());
        setStores(storesList);
        if (storesList.length > 0) {
          setSelectedStoreId(storesList[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load stores automatically', err);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Camera stop error', err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraActive(true);
    setValidationResult(null);
    setRedemptionResult(null);
    setErrorMessage(null);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        let cameraConfig: string | { facingMode: string } = { facingMode: 'environment' };
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('environment') ||
                c.label.toLowerCase().includes('rear')
            );
            cameraConfig = backCam ? backCam.id : cameras[0].id;
          }
        } catch (e) {
          console.warn('Could not enumerate cameras, using default facingMode', e);
        }

        await scanner.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success QR Scan
            stopCamera();
            handleValidate(decodedText);
          },
          () => {} // scan frame error, ignore
        );
      } catch (err: any) {
        console.error('Failed to start camera', err);
        setErrorMessage('Camera access failed. Please use manual code entry.');
        setCameraActive(false);
      }
    }, 200);
  };

  const handleValidate = async (rawCode?: string) => {
    const code = rawCode || codeInputValue.trim();
    if (!code) {
      setErrorMessage('Please enter or scan a coupon code');
      return;
    }

    try {
      setValidating(true);
      setErrorMessage(null);
      setRedemptionResult(null);

      const result = await retailApi.validateCoupon({
        code_or_payload: code,
        store_id: selectedStoreId || undefined,
      });

      setValidationResult(result);
      if (!result.is_valid) {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      console.error('Validation error', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to validate coupon');
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRedeem = async () => {
    if (!validationResult || !validationResult.customer_coupon_id) return;
    if (!selectedStoreId) {
      setErrorMessage('Please select the current showroom branch');
      return;
    }

    try {
      setRedeeming(true);
      setErrorMessage(null);

      const result = await retailApi.redeemCoupon({
        code_or_payload: validationResult.coupon_code || codeInputValue,
        store_id: selectedStoreId,
        bill_reference_number: billNumber || undefined,
        bill_amount: billAmount ? parseFloat(billAmount) : undefined,
      });

      setRedemptionResult(result);
      if (!result.success) {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      console.error('Redemption error', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to redeem coupon');
    } finally {
      setRedeeming(false);
    }
  };

  const handleReset = () => {
    setValidationResult(null);
    setRedemptionResult(null);
    setErrorMessage(null);
    setCodeInputValue('');
    setBillNumber('');
    setBillAmount('');
  };

  const isStaffAuthorized =
    isAuthenticated &&
    ['PARTNER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'OPERATIONS_ADMIN'].includes(user?.role || '');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8 pt-28 sm:pt-36 lg:pt-40">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isStaffAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-4 pt-28 sm:pt-36 lg:pt-40">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Staff Authentication Required</h2>
          <p className="text-sm text-slate-400">
            This QR scanner terminal is strictly for authorized showroom billing staff and partner cashiers. Customer coupon redemption must be handled by staff at checkout.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => navigate('/partner/dashboard')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7B1E3D] to-rose-700 text-white font-bold text-sm shadow-lg hover:brightness-110 transition cursor-pointer"
            >
              Partner Dashboard
            </button>
            <button
              onClick={() => navigate('/fashion')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition cursor-pointer"
            >
              Browse Offers
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6 pt-28 sm:pt-36 lg:pt-40">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/fashion')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-pink-400" />
                <span>In-Store Staff Coupon Validator</span>
              </h1>
              <p className="text-xs text-slate-400">
                Scan customer QR code or enter coupon code to verify and apply discount.
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Reset Terminal"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Store Branch Selector */}
        <div className="bg-slate-900/80 rounded-2xl border border-white/10 p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-pink-400" />
            <span>Current Showroom Branch</span>
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-medium outline-none focus:border-pink-500"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name} ({s.city}) - {s.store_code}
              </option>
            ))}
          </select>
        </div>

        {/* Redemption Success Banner */}
        {redemptionResult && redemptionResult.success && (
          <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-3xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Redemption Successful
              </span>
              <h2 className="text-2xl font-black text-white mt-1">Discount Applied!</h2>
              <p className="text-xs text-emerald-200 mt-1">{redemptionResult.message}</p>
            </div>

            <div className="bg-black/40 rounded-2xl p-4 max-w-sm mx-auto text-left text-xs space-y-1.5 border border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400">Coupon Code:</span>
                <span className="font-mono font-bold text-amber-400">
                  {redemptionResult.coupon_code}
                </span>
              </div>
              {redemptionResult.bill_reference_number && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bill No:</span>
                  <span className="font-mono text-white">
                    {redemptionResult.bill_reference_number}
                  </span>
                </div>
              )}
              {redemptionResult.discount_applied && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Discount:</span>
                  <span className="font-bold text-emerald-400">
                    ₹{redemptionResult.discount_applied}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Store:</span>
                <span className="text-white">{redemptionResult.store_name}</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
            >
              Scan Next Customer
            </button>
          </div>
        )}

        {/* Step 1: Scan or Input Code (Hidden if redeemed successfully) */}
        {(!redemptionResult || !redemptionResult.success) && (
          <div className="bg-slate-900/80 rounded-3xl border border-white/10 p-5 sm:p-6 space-y-6 shadow-xl">
            {/* Camera Viewport */}
            {cameraActive ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto border-2 border-pink-500">
                  <div id="qr-reader" className="w-full h-full" />
                </div>
                <div className="text-center">
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold"
                  >
                    <CameraOff className="w-4 h-4" />
                    <span>Cancel Camera</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="p-6 rounded-2xl bg-gradient-to-br from-pink-950/40 via-slate-800 to-slate-900 border border-pink-500/30 hover:border-pink-500/60 transition flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center group-hover:scale-110 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-white">Scan Customer QR</span>
                  <span className="text-[11px] text-slate-400">Uses mobile or web camera</span>
                </button>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 flex flex-col justify-between space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block">
                      Manual Code Entry
                    </label>
                    <p className="text-[10px] text-slate-400">Type coupon code from customer phone</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. FABFEST20 or VYB-..."
                      value={codeInputValue}
                      onChange={(e) => setCodeInputValue(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 uppercase outline-none focus:border-pink-500"
                    />
                    <button
                      onClick={() => handleValidate()}
                      disabled={validating || !codeInputValue.trim()}
                      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 active:scale-95 text-white font-bold text-xs disabled:opacity-50 transition"
                    >
                      {validating ? 'Checking...' : 'Validate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 2: Read-Only Validation Result Card */}
            {validationResult && (
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  validationResult.is_valid
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {validationResult.is_valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                        {validationResult.is_valid ? 'Valid Coupon' : 'Invalid / Ineligible'}
                      </span>
                      <p className="text-[11px] text-slate-400">{validationResult.message}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-300 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                    {validationResult.coupon_code}
                  </span>
                </div>

                {validationResult.is_valid && (
                  <>
                    {/* Offer Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Offer</span>
                        <span className="font-bold text-white">{validationResult.offer_title}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Brand</span>
                        <span className="font-bold text-pink-300">{validationResult.brand_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Discount Value</span>
                        <span className="font-bold text-emerald-400">
                          {validationResult.offer_type === 'PERCENTAGE'
                            ? `${validationResult.offer_value}% OFF`
                            : `₹${validationResult.offer_value} OFF`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Min. Purchase</span>
                        <span className="font-bold text-white">
                          {validationResult.min_purchase_amount
                            ? `₹${validationResult.min_purchase_amount}`
                            : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Masked Customer Privacy Info */}
                    {validationResult.customer_masked && (
                      <div className="flex items-center justify-between text-xs bg-slate-900/60 px-3 py-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Customer: {validationResult.customer_masked.name}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {validationResult.customer_masked.phone}
                        </span>
                      </div>
                    )}

                    {/* Step 3: Cashier Final Redemption Confirmation */}
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-pink-400" />
                        <span>Billing Details (Optional)</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Bill / Invoice Number (e.g. INV-4921)"
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                        />
                        <input
                          type="number"
                          placeholder="Final Bill Amount (₹)"
                          value={billAmount}
                          onChange={(e) => setBillAmount(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                        />
                      </div>

                      <button
                        onClick={handleRedeem}
                        disabled={redeeming}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{redeeming ? 'Redeeming...' : 'Confirm & Redeem Coupon'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
