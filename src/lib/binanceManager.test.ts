import test from "node:test";
import assert from "node:assert";
import {
  generateHmacSha256Signature,
  buildSignedQueryString,
  formatToPrecision,
  validateLotSize,
  validatePriceFilter,
  validateMinNotional,
  calculateSma,
  calculateRsi,
  calculateOrderBookMetrics,
  calculatePortfolioMetrics,
  calculateTradeFee,
  previewOrder,
  generateAddressQrSvg,
  getPublicDonationAddresses,
  fetchLiveBinanceTickers,
  fetchLiveBinanceDepth,
  fetchLiveBinanceKlines,
  DEFAULT_TRACKED_SYMBOLS,
  DEFAULT_SYMBOL_RULES,
} from "./binanceManager";

test("generateHmacSha256Signature produces standard RFC 2104 compliant HMAC-SHA256 digests", () => {
  const secretKey = "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1eRYSjuCwsjGeneExjl1AwMbUmAWgah5";
  const queryString = "symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559";
  
  const signature = generateHmacSha256Signature(queryString, secretKey);
  
  assert.strictEqual(typeof signature, "string");
  assert.strictEqual(signature.length, 64); // 256 bits = 64 hex characters
  assert.strictEqual(signature, "286ee7017c749e6d873709bc75bc45f7209f0a5c099b33457664b6f68902930e");

  // Empty secret produces empty signature
  assert.strictEqual(generateHmacSha256Signature("foo=bar", ""), "");
});

test("buildSignedQueryString attaches timestamp, recvWindow, and computes valid signature", () => {
  const secretKey = "test_secret_key_12345";
  const params = { symbol: "BTCUSDT", side: "BUY", type: "MARKET", quantity: 0.05 };
  const customTimestamp = 1788000000000;
  
  const { queryString, signature, fullQuery } = buildSignedQueryString(params, secretKey, customTimestamp, 6000);
  
  assert.ok(queryString.includes("symbol=BTCUSDT"));
  assert.ok(queryString.includes("quantity=0.05"));
  assert.ok(queryString.includes("timestamp=1788000000000"));
  assert.ok(queryString.includes("recvWindow=6000"));
  assert.ok(fullQuery.startsWith(queryString));
  assert.ok(fullQuery.includes(`&signature=${signature}`));
  assert.strictEqual(signature.length, 64);
});

test("formatToPrecision rounds numbers according to lot/tick stepSize without floating precision artifacts", () => {
  assert.strictEqual(formatToPrecision(1.2345678, 0.001), "1.234");
  assert.strictEqual(formatToPrecision(0.00012345, 0.00001), "0.00012");
  assert.strictEqual(formatToPrecision(91850.559, 0.01), "91850.55");
  assert.strictEqual(formatToPrecision(100, 1), "100");
  assert.strictEqual(formatToPrecision(0.05, 0.01), "0.05");
  assert.strictEqual(formatToPrecision(0, 0.01), "0");
  assert.strictEqual(formatToPrecision(-5, 0.01), "0");
});

test("validateLotSize strictly validates minimum, maximum, and step size constraints", () => {
  const minQty = 0.001;
  const maxQty = 1000;
  const stepSize = 0.001;

  // Valid case
  const validRes = validateLotSize(0.5234, minQty, maxQty, stepSize);
  assert.strictEqual(validRes.valid, true);
  assert.strictEqual(validRes.formattedQty, 0.523);

  // Below minimum
  const belowMin = validateLotSize(0.0005, minQty, maxQty, stepSize);
  assert.strictEqual(belowMin.valid, false);
  assert.ok(belowMin.error?.includes("below minimum"));

  // Above maximum
  const aboveMax = validateLotSize(1500, minQty, maxQty, stepSize);
  assert.strictEqual(aboveMax.valid, false);
  assert.ok(aboveMax.error?.includes("exceeds maximum"));

  // Zero / negative
  const zeroVal = validateLotSize(0, minQty, maxQty, stepSize);
  assert.strictEqual(zeroVal.valid, false);
});

test("validatePriceFilter validates tick size, price caps, and floor limits", () => {
  const minPrice = 0.01;
  const maxPrice = 1000000;
  const tickSize = 0.01;

  const valid = validatePriceFilter(92450.789, minPrice, maxPrice, tickSize);
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.formattedPrice, 92450.78);

  const tooLow = validatePriceFilter(0.005, minPrice, maxPrice, tickSize);
  assert.strictEqual(tooLow.valid, false);
  assert.ok(tooLow.error?.includes("below minimum"));

  const tooHigh = validatePriceFilter(2000000, minPrice, maxPrice, tickSize);
  assert.strictEqual(tooHigh.valid, false);
  assert.ok(tooHigh.error?.includes("exceeds maximum"));
});

test("validateMinNotional verifies total order value against minimum threshold ($5.00)", () => {
  const minNotional = 5.0;

  // $92,000 * 0.0001 = $9.20 (> $5.00)
  const pass = validateMinNotional(0.0001, 92000, minNotional);
  assert.strictEqual(pass.valid, true);
  assert.strictEqual(pass.notional, 9.2);

  // $92,000 * 0.00004 = $3.68 (< $5.00)
  const fail = validateMinNotional(0.00004, 92000, minNotional);
  assert.strictEqual(fail.valid, false);
  assert.ok(fail.error?.includes("below minimum required notional"));
});

test("calculateSma calculates moving average series correctly with initial padding", () => {
  const prices = [10, 20, 30, 40, 50, 60, 70];
  const sma3 = calculateSma(prices, 3);

  assert.strictEqual(sma3[0], null);
  assert.strictEqual(sma3[1], null);
  assert.strictEqual(sma3[2], (10 + 20 + 30) / 3); // 20
  assert.strictEqual(sma3[3], (20 + 30 + 40) / 3); // 30
  assert.strictEqual(sma3[4], (30 + 40 + 50) / 3); // 40
  assert.strictEqual(sma3[5], (40 + 50 + 60) / 3); // 50
  assert.strictEqual(sma3[6], (50 + 60 + 70) / 3); // 60
});

test("calculateRsi produces normalized momentum values within [0, 100]", () => {
  const uptrend = [100, 102, 104, 103, 106, 108, 107, 110, 112, 114, 113, 116, 118, 120, 122, 125];
  const rsi = calculateRsi(uptrend, 14);

  const lastRsi = rsi[rsi.length - 1];
  assert.ok(lastRsi !== null);
  assert.ok(lastRsi! > 50, "Strong uptrend RSI should be > 50");
  assert.ok(lastRsi! <= 100, "RSI must be <= 100");

  for (const val of rsi) {
    if (val !== null) {
      assert.ok(val >= 0 && val <= 100, `RSI value ${val} must be in [0, 100]`);
    }
  }
});

test("calculateOrderBookMetrics computes spread, depths, and buy/sell pressure ratio", () => {
  const rawBids: [number, number][] = [
    [92000, 1.5],
    [91990, 2.0],
    [91980, 3.0],
  ];
  const rawAsks: [number, number][] = [
    [92010, 1.0],
    [92020, 2.5],
    [92030, 4.0],
  ];

  const book = calculateOrderBookMetrics(rawBids, rawAsks, "BTCUSDT");

  assert.strictEqual(book.bestBid, 92000);
  assert.strictEqual(book.bestAsk, 92010);
  assert.strictEqual(book.spread, 10);
  assert.ok(book.spreadPercent > 0 && book.spreadPercent < 0.1);

  // Depths
  const expectedBidDepth = 92000 * 1.5 + 91990 * 2.0 + 91980 * 3.0; // 138000 + 183980 + 275940 = 597920
  const expectedAskDepth = 92010 * 1.0 + 92020 * 2.5 + 92030 * 4.0; // 92010 + 230050 + 368120 = 690180

  assert.strictEqual(book.bidDepthUsd, expectedBidDepth);
  assert.strictEqual(book.askDepthUsd, expectedAskDepth);
  assert.ok(book.imbalanceRatio >= 0 && book.imbalanceRatio <= 1);
});

test("calculatePortfolioMetrics computes USD/BTC valuation and ensures 100% allocation sum", () => {
  const rawBalances = [
    { asset: "BTC", free: "0.5", locked: "0.0" },
    { asset: "ETH", free: "4.0", locked: "1.0" },
    { asset: "USDT", free: "5000.0", locked: "500.0" },
    { asset: "DOGE", free: "0.0", locked: "0.0" }, // Should be excluded (zero balance)
  ];

  const pricesMap = {
    BTC: 90000,
    ETH: 3000,
    USDT: 1.0,
  };

  const account = calculatePortfolioMetrics(rawBalances, pricesMap);

  assert.strictEqual(account.nonZeroCount, 3);
  // Total USD: (0.5 * 90000) + (5.0 * 3000) + (5500 * 1) = 45000 + 15000 + 5500 = 65500
  assert.strictEqual(account.totalUsdValue, 65500);
  assert.strictEqual(account.totalBtcValue, 65500 / 90000);

  // Check allocation sum = 100%
  const allocationSum = account.balances.reduce((acc, b) => acc + b.allocationPercent, 0);
  assert.ok(Math.abs(allocationSum - 100) < 0.001, "Allocations should sum to 100%");

  // BTC should be largest holding (45000 / 65500 = ~68.7%)
  assert.strictEqual(account.balances[0].asset, "BTC");
  assert.ok(account.balances[0].allocationPercent > 68);
});

test("calculateTradeFee correctly factors Binance 25% BNB fee discount reduction", () => {
  const notional = 10000; // $10,000 trade
  const standardFeeRate = 0.001; // 0.1%

  // Standard fee: $10,000 * 0.001 = $10.00
  // With BNB discount (25% off): $10.00 * 0.75 = $7.50
  // Savings = $2.50
  const feeData = calculateTradeFee(notional, standardFeeRate, true, 650);

  assert.strictEqual(feeData.standardFeeUsd, 10.0);
  assert.strictEqual(feeData.actualFeeUsd, 7.5);
  assert.strictEqual(feeData.discountSavingsUsd, 2.5);
  assert.strictEqual(feeData.feeBnb, 7.5 / 650);

  // Without BNB discount
  const noDiscount = calculateTradeFee(notional, standardFeeRate, false, 650);
  assert.strictEqual(noDiscount.actualFeeUsd, 10.0);
  assert.strictEqual(noDiscount.discountSavingsUsd, 0.0);
});

test("previewOrder provides rigorous pre-flight validation and fee calculations", () => {
  const symbol = "BTCUSDT";
  const currentPrice = 92000;

  // Valid limit buy
  const validPreview = previewOrder(symbol, "BUY", "LIMIT", 0.05, 91500, currentPrice);
  assert.strictEqual(validPreview.isValid, true);
  assert.strictEqual(validPreview.formattedQty, 0.05);
  assert.strictEqual(validPreview.formattedPrice, 91500);
  assert.strictEqual(validPreview.totalNotionalUsd, 0.05 * 91500);
  assert.strictEqual(validPreview.satisfiesMinNotional, true);
  assert.strictEqual(validPreview.validationErrors.length, 0);

  // Invalid: too small notional
  const invalidNotional = previewOrder(symbol, "BUY", "LIMIT", 0.00001, 10000, currentPrice);
  assert.strictEqual(invalidNotional.isValid, false);
  assert.ok(invalidNotional.validationErrors.some((e) => e.includes("below minimum required notional")));
});

test("generateAddressQrSvg creates valid, clean XML SVG vector graphics", () => {
  const address = "0x71C87560B9b71eC36154628E35B8999335f60682";
  const svg = generateAddressQrSvg(address, 240);

  assert.strictEqual(typeof svg, "string");
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.endsWith("</svg>"));
  assert.ok(svg.includes('viewBox="0 0 240 240"'));
  assert.ok(svg.includes("<rect"));
  assert.ok(svg.includes("fill=\"currentColor\""));
});

test("getPublicDonationAddresses returns verified multi-network cryptocurrency addresses", () => {
  const addresses = getPublicDonationAddresses();

  assert.ok(addresses.length >= 5);

  const evmBep20 = addresses.find((a) => a.id === "usdt-bep20");
  assert.ok(evmBep20);
  assert.strictEqual(evmBep20!.address.startsWith("0x"), true);
  assert.strictEqual(evmBep20!.address.length, 42);
  assert.ok(evmBep20!.explorerUrl.includes("bscscan.com"));
  assert.ok(evmBep20!.qrSvg.includes("<svg"));

  const btc = addresses.find((a) => a.id === "btc-native");
  assert.ok(btc);
  assert.strictEqual(btc!.address.startsWith("bc1"), true);
  assert.ok(btc!.explorerUrl.includes("mempool.space"));

  const sol = addresses.find((a) => a.id === "sol-native");
  assert.ok(sol);
  assert.ok(sol!.explorerUrl.includes("solscan.io"));
});

test("fetchLiveBinanceTickers returns populated tickers with 24hr statistics and sparklines", async () => {
  const tickers = await fetchLiveBinanceTickers();

  assert.ok(tickers.length > 0);
  for (const t of tickers) {
    assert.ok(t.symbol.length > 0);
    assert.ok(t.price > 0);
    assert.ok(t.highPrice >= t.lowPrice);
    assert.ok(Array.isArray(t.sparkline) && t.sparkline.length > 0);
  }
});

test("fetchLiveBinanceDepth returns valid order book depth and spreads", async () => {
  const depth = await fetchLiveBinanceDepth("BTCUSDT", 10);

  assert.strictEqual(depth.symbol, "BTCUSDT");
  assert.ok(depth.bids.length > 0);
  assert.ok(depth.asks.length > 0);
  assert.ok(depth.bestAsk >= depth.bestBid);
  assert.ok(depth.spread >= 0);
  assert.ok(depth.imbalanceRatio >= 0 && depth.imbalanceRatio <= 1);
});

test("fetchLiveBinanceKlines returns candles with technical indicators (SMA & RSI)", async () => {
  const klines = await fetchLiveBinanceKlines("BTCUSDT", "1h", 24);

  assert.ok(klines.length > 0);
  for (const k of klines) {
    assert.ok(k.open > 0);
    assert.ok(k.high >= k.low);
    assert.ok(k.close > 0);
  }
});
