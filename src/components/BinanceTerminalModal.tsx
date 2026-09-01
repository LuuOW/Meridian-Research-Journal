import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  Wallet,
  Coins,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Activity,
  RefreshCw,
  Sliders,
  ArrowUpRight,
  Lock,
  AlertCircle,
  Sparkles,
  Calculator,
  BarChart2,
  ArrowDownRight,
  HelpCircle,
  Send,
  Zap,
} from "lucide-react";
import {
  BinanceTicker24hr,
  BinanceOrderBook,
  BinanceKline,
  BinanceAccountInfo,
  BinanceOrderPreview,
  DonationAddress,
  BinanceSystemStatus,
  DEFAULT_TRACKED_SYMBOLS,
} from "../lib/binanceManager";

interface BinanceTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditorMode?: boolean;
  initialTab?: "market" | "portfolio" | "order" | "donation";
}

export const BinanceTerminalModal: React.FC<BinanceTerminalModalProps> = ({
  isOpen,
  onClose,
  isEditorMode = false,
  initialTab = "market",
}) => {
  const [activeTab, setActiveTab] = useState<"market" | "portfolio" | "order" | "donation">(initialTab);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [tickers, setTickers] = useState<BinanceTicker24hr[]>([]);
  const [orderBook, setOrderBook] = useState<BinanceOrderBook | null>(null);
  const [klines, setKlines] = useState<BinanceKline[]>([]);
  const [account, setAccount] = useState<BinanceAccountInfo | null>(null);
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [status, setStatus] = useState<BinanceSystemStatus | null>(null);
  const [donations, setDonations] = useState<DonationAddress[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<DonationAddress | null>(null);
  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Order calculator state
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [orderQty, setOrderQty] = useState<string>("0.01");
  const [orderPrice, setOrderPrice] = useState<string>("");
  const [orderPreview, setOrderPreview] = useState<BinanceOrderPreview | null>(null);
  const [isTestingOrder, setIsTestingOrder] = useState<boolean>(false);
  const [testOrderResult, setTestOrderResult] = useState<{ success: boolean; message: string } | null>(null);

  // Escape key handler for effortless skipping
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Sync initial tab when changed
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch initial status and public donations
  useEffect(() => {
    if (!isOpen) return;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Status
        const statusRes = await fetch("/api/binance/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData);
        }

        // Donations
        const donRes = await fetch("/api/binance/donations");
        if (donRes.ok) {
          const donData = await donRes.json();
          setDonations(donData.donations || []);
          if (donData.donations && donData.donations.length > 0) {
            setSelectedDonation(donData.donations[0]);
          }
        }

        // Tickers
        await fetchMarketData();
      } catch (err) {
        console.error("Failed to load initial Binance data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [isOpen]);

  // Fetch market data for selected symbol
  const fetchMarketData = async () => {
    try {
      const [tickersRes, depthRes, klinesRes] = await Promise.all([
        fetch("/api/binance/market/tickers"),
        fetch(`/api/binance/market/depth?symbol=${selectedSymbol}&limit=15`),
        fetch(`/api/binance/market/klines?symbol=${selectedSymbol}&interval=1h&limit=24`),
      ]);

      if (tickersRes.ok) {
        const tData = await tickersRes.json();
        setTickers(tData.tickers || []);
        
        // Auto-fill price if empty
        const current = tData.tickers?.find((t: BinanceTicker24hr) => t.symbol === selectedSymbol);
        if (current && !orderPrice) {
          setOrderPrice(current.price.toString());
        }
      }

      if (depthRes.ok) {
        const dData = await depthRes.json();
        setOrderBook(dData.depth || null);
      }

      if (klinesRes.ok) {
        const kData = await klinesRes.json();
        setKlines(kData.klines || []);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Market fetch error:", err);
    }
  };

  // Fetch account portfolio data
  const fetchAccountData = async () => {
    try {
      const res = await fetch("/api/binance/account");
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account || null);
        setIsSimulation(Boolean(data.isSimulation));
      }
    } catch (err) {
      console.error("Account fetch error:", err);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "portfolio") {
      fetchAccountData();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (isOpen) {
      fetchMarketData();
    }
  }, [selectedSymbol]);

  // Recalculate order preview on input changes
  useEffect(() => {
    const qtyNum = parseFloat(orderQty);
    const priceNum = orderType === "LIMIT" ? parseFloat(orderPrice) : undefined;

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setOrderPreview(null);
      return;
    }

    const currentTicker = tickers.find((t) => t.symbol === selectedSymbol);
    const currentPrice = currentTicker?.price || 91850;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/binance/order/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: selectedSymbol,
            side: orderSide,
            type: orderType,
            quantity: qtyNum,
            price: priceNum,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setOrderPreview(data.preview);
        }
      } catch (_) {}
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedSymbol, orderSide, orderType, orderQty, orderPrice, tickers]);

  const handleCopyAddress = (id: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddressId(id);
    setTimeout(() => setCopiedAddressId(null), 2500);
  };

  const handleExecuteTestOrder = async () => {
    if (!orderPreview || !orderPreview.isValid) return;
    setIsTestingOrder(true);
    setTestOrderResult(null);

    try {
      const res = await fetch("/api/binance/order/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: orderSide,
          type: orderType,
          quantity: orderPreview.formattedQty,
          price: orderPreview.formattedPrice,
        }),
      });

      const data = await res.json();
      setTestOrderResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "Test order verified successfully." : "Order validation failed."),
      });
    } catch (err: any) {
      setTestOrderResult({
        success: false,
        message: err.message || "Failed to communicate with order engine.",
      });
    } finally {
      setIsTestingOrder(false);
    }
  };

  if (!isOpen) return null;

  const currentTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-sm p-2.5 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="binance-terminal-modal"
        className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold font-mono">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Binance Terminal &amp; Treasury
                </h2>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    status?.configured
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  {status?.configured ? "● Live API Linked" : "● Telemetry & Test Desk"}
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
                Real-time spot telemetry, order calculator, and research treasury.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMarketData}
              disabled={isLoading}
              title="Refresh telemetry"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <span className="hidden sm:inline-block text-[9px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              ESC
            </span>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 px-6 bg-white dark:bg-neutral-900 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            id="tab-btn-market"
            onClick={() => setActiveTab("market")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "market"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Market Pulse &amp; Depth
          </button>
          <button
            id="tab-btn-portfolio"
            onClick={() => setActiveTab("portfolio")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "portfolio"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Portfolio &amp; Treasury Balances
          </button>
          <button
            id="tab-btn-order"
            onClick={() => setActiveTab("order")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "order"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Pre-flight Order Desk
          </button>
          <button
            id="tab-btn-donation"
            onClick={() => setActiveTab("donation")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "donation"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Public Research Donations
          </button>
        </div>

        {/* Modal Body Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: MARKET PULSE & DEPTH */}
          {activeTab === "market" && (
            <div className="space-y-6">
              {/* Ticker Cards Carousel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tickers.map((t) => {
                  const isSelected = t.symbol === selectedSymbol;
                  const isPositive = t.priceChangePercent >= 0;
                  return (
                    <button
                      key={t.symbol}
                      onClick={() => {
                        setSelectedSymbol(t.symbol);
                        setOrderPrice(t.price.toString());
                      }}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                          : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                        <span>{t.name}</span>
                        <span className="font-mono text-[10px]">{t.symbol.replace("USDT", "")}</span>
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
                        ${t.price >= 1 ? t.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : t.price}
                      </div>
                      <div className={`mt-1 flex items-center gap-1 text-[10px] font-mono font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isPositive ? "+" : ""}{t.priceChangePercent.toFixed(2)}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Asset Deep Dive: Chart & Order Book */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Candlestick & Technical Wave Display */}
                <div className="lg:col-span-7 bg-neutral-50 dark:bg-neutral-950/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{currentTicker?.name || selectedSymbol} 24h Candlestick &amp; SMA Profile</span>
                        <span className="text-[10px] font-mono text-neutral-400">1h Intervals</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        High: ${currentTicker?.highPrice.toLocaleString()} · Low: ${currentTicker?.lowPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-neutral-400">Volume: </span>
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">
                        {currentTicker?.volume ? Math.round(currentTicker.volume).toLocaleString() : "45,000"}
                      </span>
                    </div>
                  </div>

                  {/* SVG Candle Chart */}
                  <div className="h-44 w-full relative bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800 flex items-end justify-between gap-1 overflow-hidden">
                    {klines.map((k, idx) => {
                      const isUp = k.close >= k.open;
                      const maxPrice = Math.max(...klines.map((x) => x.high));
                      const minPrice = Math.min(...klines.map((x) => x.low));
                      const range = maxPrice - minPrice || 1;

                      const bodyTop = ((maxPrice - Math.max(k.open, k.close)) / range) * 100;
                      const bodyHeight = Math.max(4, (Math.abs(k.open - k.close) / range) * 100);
                      const wickTop = ((maxPrice - k.high) / range) * 100;
                      const wickHeight = Math.max(8, ((k.high - k.low) / range) * 100);

                      return (
                        <div key={idx} className="flex-1 h-full relative flex items-center justify-center group">
                          {/* Wick */}
                          <div
                            style={{ top: `${wickTop}%`, height: `${wickHeight}%` }}
                            className={`absolute w-[1px] ${isUp ? "bg-emerald-500/70" : "bg-red-500/70"}`}
                          />
                          {/* Body */}
                          <div
                            style={{ top: `${bodyTop}%`, height: `${bodyHeight}%` }}
                            className={`absolute w-full max-w-[8px] rounded-sm ${
                              isUp ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {/* Hover Tooltip */}
                          <div className="absolute -top-8 bg-black text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap">
                            ${k.close.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Technical Indicators summary */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span>SMA(7): <strong className="text-neutral-800 dark:text-neutral-200">${klines[klines.length - 1]?.sma7?.toFixed(2) || currentTicker?.price.toFixed(2)}</strong></span>
                      <span>SMA(25): <strong className="text-neutral-800 dark:text-neutral-200">${klines[klines.length - 1]?.sma25?.toFixed(2) || (currentTicker?.price * 0.995).toFixed(2)}</strong></span>
                    </div>
                    <div>
                      <span>RSI(14): <strong className="text-amber-600 dark:text-amber-400">{klines[klines.length - 1]?.rsi14?.toFixed(1) || "54.2"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Real-time Order Book Depth */}
                <div className="lg:col-span-5 bg-neutral-50 dark:bg-neutral-950/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      Order Book &amp; Depth Spread
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Spread: ${orderBook?.spread.toFixed(2)} ({orderBook?.spreadPercent.toFixed(3)}%)
                    </span>
                  </div>

                  {/* Buy/Sell Pressure Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                      <span className="text-emerald-500">Bids: {((orderBook?.imbalanceRatio || 0.5) * 100).toFixed(1)}%</span>
                      <span className="text-red-500">Asks: {((1 - (orderBook?.imbalanceRatio || 0.5)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(orderBook?.imbalanceRatio || 0.5) * 100}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                      />
                      <div
                        style={{ width: `${(1 - (orderBook?.imbalanceRatio || 0.5)) * 100}%` }}
                        className="bg-red-500 h-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Micro Order Book Table */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {/* Bids */}
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Bid Price (USD)</div>
                      {orderBook?.bids.slice(0, 5).map(([p, q], i) => (
                        <div key={i} className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 py-0.5 px-1 rounded bg-emerald-500/5">
                          <span>${p.toFixed(2)}</span>
                          <span className="text-neutral-400">{q.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Asks */}
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Ask Price (USD)</div>
                      {orderBook?.asks.slice(0, 5).map(([p, q], i) => (
                        <div key={i} className="flex items-center justify-between text-red-600 dark:text-red-400 py-0.5 px-1 rounded bg-red-500/5">
                          <span>${p.toFixed(2)}</span>
                          <span className="text-neutral-400">{q.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PORTFOLIO & TREASURY BALANCES */}
          {activeTab === "portfolio" && (
            <div className="space-y-6">
              {/* Account Overview Card */}
              <div className="p-6 rounded-3xl bg-neutral-900 text-white border border-neutral-800 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Coins className="w-48 h-48" />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
                      Aggregate Spot Portfolio Valuation
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight mt-1 text-white">
                      ${account?.totalUsdValue ? account.totalUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "21,450.80"}
                    </div>
                    <div className="text-xs font-mono text-neutral-400 mt-1 flex items-center gap-2">
                      <span>≈ {account?.totalBtcValue ? account.totalBtcValue.toFixed(4) : "0.2335"} BTC</span>
                      <span className="text-neutral-600">·</span>
                      <span className="text-emerald-400">Maker/Taker: 0.075% (with BNB discount)</span>
                    </div>
                  </div>

                  {isSimulation && (
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-neutral-300 text-[11px] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>Sandbox &amp; Read-Only Telemetry Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Allocation Breakdown */}
              <div className="bg-neutral-50 dark:bg-neutral-950/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono">
                    Asset Holdings &amp; Distribution
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {account?.balances.length || 5} active currencies
                  </span>
                </div>

                <div className="space-y-3">
                  {account?.balances.map((b) => (
                    <div key={b.asset} className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                          {b.asset}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {b.asset}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Free: {b.free.toLocaleString()} · Locked: {b.locked.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-neutral-900 dark:text-neutral-100">
                          ${b.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {b.allocationPercent.toFixed(1)}% of portfolio
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRE-FLIGHT ORDER DESK */}
          {activeTab === "order" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Controls */}
                <div className="lg:col-span-6 bg-neutral-50 dark:bg-neutral-950/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-500" />
                      Spot Trade Calculator
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">{selectedSymbol}</span>
                  </div>

                  {/* Side Switch */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOrderSide("BUY")}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        orderSide === "BUY"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      }`}
                    >
                      Buy {selectedSymbol.replace("USDT", "")}
                    </button>
                    <button
                      onClick={() => setOrderSide("SELL")}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        orderSide === "SELL"
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      }`}
                    >
                      Sell {selectedSymbol.replace("USDT", "")}
                    </button>
                  </div>

                  {/* Type Switch */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOrderType("LIMIT")}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        orderType === "LIMIT"
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-transparent text-neutral-500"
                      }`}
                    >
                      Limit Order
                    </button>
                    <button
                      onClick={() => setOrderType("MARKET")}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        orderType === "MARKET"
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-transparent text-neutral-500"
                      }`}
                    >
                      Market Order
                    </button>
                  </div>

                  {/* Quantity Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                      Quantity ({selectedSymbol.replace("USDT", "")})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="0.01"
                    />
                  </div>

                  {/* Limit Price Input */}
                  {orderType === "LIMIT" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                        Limit Price (USDT)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder={currentTicker?.price.toString() || "91850"}
                      />
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={handleExecuteTestOrder}
                    disabled={!orderPreview?.isValid || isTestingOrder}
                    className="w-full py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    {isTestingOrder ? "Validating with Binance..." : "Run Pre-Flight Test Order"}
                  </button>

                  {testOrderResult && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                        testOrderResult.success
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20"
                      }`}
                    >
                      {testOrderResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <span>{testOrderResult.message}</span>
                    </div>
                  )}
                </div>

                {/* Pre-flight Audit & Fee Preview */}
                <div className="lg:col-span-6 bg-neutral-50 dark:bg-neutral-950/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono">
                      Pre-flight Validation &amp; Fees
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        orderPreview?.isValid
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {orderPreview?.isValid ? "PASSED FILTERS" : "FILTER REJECTED"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-500">Order Notional:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        ${orderPreview?.totalNotionalUsd.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-500">Formatted Lot Quantity:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {orderPreview?.formattedQty || "0"} {selectedSymbol.replace("USDT", "")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-500">Est. Taker Fee (0.075%):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ${orderPreview?.estimatedFeeUsd.toFixed(4) || "0.0000"} (~{orderPreview?.estimatedFeeBnb.toFixed(5)} BNB)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-500">BNB 25% Discount Savings:</span>
                      <span className="font-bold text-amber-500">
                        +${orderPreview?.bnbDiscountSavingsUsd.toFixed(4) || "0.0000"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-neutral-500">Min Notional Satisfied ($5.00):</span>
                      <span className={orderPreview?.satisfiesMinNotional ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                        {orderPreview?.satisfiesMinNotional ? "YES" : "NO (< $5.00)"}
                      </span>
                    </div>
                  </div>

                  {orderPreview && !orderPreview.isValid && orderPreview.validationErrors.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs space-y-1">
                      <div className="font-bold">Validation Errors:</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {orderPreview.validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PUBLIC RESEARCH DONATION REGISTRY */}
          {activeTab === "donation" && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Support Meridian Independent Research</div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                    Meridian is an open-access scientific publication and synthesis engine. Contributions directly fund distributed compute nodes, arXiv translation pipelines, and open scholarship.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left: Chain Select List */}
                <div className="md:col-span-5 space-y-2">
                  <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-mono px-1">
                    Select Network / Currency
                  </div>
                  {donations.map((d) => {
                    const isSelected = selectedDonation?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDonation(d)}
                        className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500 text-neutral-900 dark:text-neutral-100 shadow-sm"
                            : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold font-mono text-xs">
                            {d.symbol}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{d.currencyName}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">{d.network}</div>
                          </div>
                        </div>
                        {d.recommended && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">
                            Low Fee
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right: QR Code & Address Display */}
                {selectedDonation && (
                  <div className="md:col-span-7 bg-neutral-50 dark:bg-neutral-950/60 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
                    {/* SVG QR Code */}
                    <div className="w-44 h-44 mx-auto p-3 bg-white rounded-2xl shadow-md border border-neutral-200 flex items-center justify-center text-black">
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedDonation.qrSvg }}
                        className="w-full h-full"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {selectedDonation.currencyName} ({selectedDonation.symbol})
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        Network: <strong>{selectedDonation.network}</strong>
                      </div>
                    </div>

                    {/* Address String Box */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 text-left">
                      <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300 break-all select-all font-semibold">
                        {selectedDonation.address}
                      </div>
                      <button
                        onClick={() => handleCopyAddress(selectedDonation.id, selectedDonation.address)}
                        className="px-3 py-1.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm active:scale-95"
                      >
                        {copiedAddressId === selectedDonation.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs">
                      <a
                        href={selectedDonation.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-bold text-[11px]"
                      >
                        View on Block Explorer
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Discrete Footer Bar */}
        <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-500">
              Press <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded font-bold text-[9px] text-neutral-700 dark:text-neutral-300">Esc</kbd> or click outside to dismiss
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-black rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
