/**
 * MERIDIAN BINANCE TREASURY MICROSERVICE
 * 
 * Headless quantitative treasury & telemetry service: HMAC-SHA256 authenticated
 * requests, market depth feeds, technical indicator computations, order pre-flight math,
 * and research donation registry.
 */

import crypto from "crypto";
import { IMicroservice, ServiceHealth } from "./types";
import {
  fetchLiveBinanceTickers,
  fetchLiveBinanceDepth,
  fetchLiveBinanceKlines,
  fetchBinanceAccountInfo,
  fetchBinanceOpenOrders,
  previewOrder,
  executeBinanceTestOrder,
  getPublicDonationAddresses,
  BinanceTicker24hr,
  BinanceOrderBook,
  BinanceKline,
  BinanceOrderPreview,
  DonationAddress
} from "../lib/binanceManager";

export class BinanceTreasuryMicroservice implements IMicroservice {
  public readonly serviceName = "BinanceTreasuryMicroservice";
  public readonly version = "2.5.0";

  private startTime: number = Date.now();
  private lastHeartbeat: number = Date.now();

  private cachedTickers: BinanceTicker24hr[] = [];
  private lastTickersFetch: number = 0;

  public async initialize(): Promise<boolean> {
    this.lastHeartbeat = Date.now();
    return true;
  }

  public async getHealth(): Promise<ServiceHealth> {
    this.lastHeartbeat = Date.now();
    const hasKeys = Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY);
    return {
      serviceName: this.serviceName,
      status: "healthy",
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastHeartbeat: this.lastHeartbeat,
      version: this.version,
      details: {
        apiKeysConfigured: hasKeys,
        cachedTickersCount: this.cachedTickers.length
      }
    };
  }

  public async shutdown(): Promise<boolean> {
    return true;
  }

  public async getMarketTickers(symbols?: string[]): Promise<BinanceTicker24hr[]> {
    const now = Date.now();
    if (this.cachedTickers.length > 0 && now - this.lastTickersFetch < 10000 && !symbols) {
      return this.cachedTickers;
    }
    const tickers = await fetchLiveBinanceTickers(symbols);
    if (!symbols) {
      this.cachedTickers = tickers;
      this.lastTickersFetch = now;
    }
    return tickers;
  }

  public async getMarketDepth(symbol: string = "BTCUSDT", limit: number = 20): Promise<BinanceOrderBook> {
    return fetchLiveBinanceDepth(symbol, limit);
  }

  public async getKlines(symbol: string = "BTCUSDT", interval: string = "1h", limit: number = 24): Promise<BinanceKline[]> {
    return fetchLiveBinanceKlines(symbol, interval, limit);
  }

  public async getAccountData(apiKey?: string, secretKey?: string) {
    const key = apiKey || process.env.BINANCE_API_KEY;
    const secret = secretKey || process.env.BINANCE_SECRET_KEY;

    if (!key || !secret) {
      const tickers = await this.getMarketTickers();
      const btcPrice = tickers.find((t) => t.symbol === "BTCUSDT")?.price || 91850;
      const ethPrice = tickers.find((t) => t.symbol === "ETHUSDT")?.price || 2680;
      const solPrice = tickers.find((t) => t.symbol === "SOLUSDT")?.price || 194.5;
      const bnbPrice = tickers.find((t) => t.symbol === "BNBUSDT")?.price || 648.2;

      const simulatedBalances = [
        { asset: "BTC", free: 0.125, locked: 0.0, total: 0.125, usdPrice: btcPrice, usdValue: 0.125 * btcPrice, btcValue: 0.125, allocationPercent: 55.4 },
        { asset: "ETH", free: 1.85, locked: 0.0, total: 1.85, usdPrice: ethPrice, usdValue: 1.85 * ethPrice, btcValue: (1.85 * ethPrice) / btcPrice, allocationPercent: 24.1 },
        { asset: "SOL", free: 12.0, locked: 0.0, total: 12.0, usdPrice: solPrice, usdValue: 12.0 * solPrice, btcValue: (12.0 * solPrice) / btcPrice, allocationPercent: 11.3 },
        { asset: "BNB", free: 2.5, locked: 0.0, total: 2.5, usdPrice: bnbPrice, usdValue: 2.5 * bnbPrice, btcValue: (2.5 * bnbPrice) / btcPrice, allocationPercent: 7.8 },
        { asset: "USDT", free: 320.0, locked: 0.0, total: 320.0, usdPrice: 1.0, usdValue: 320.0, btcValue: 320 / btcPrice, allocationPercent: 1.4 },
      ];

      const totalUsd = simulatedBalances.reduce((acc, b) => acc + b.usdValue, 0);
      const totalBtc = totalUsd / btcPrice;

      return {
        isSimulation: true,
        account: {
          makerCommission: 10,
          takerCommission: 10,
          canTrade: true,
          canWithdraw: false,
          canDeposit: true,
          updateTime: Date.now(),
          accountType: "SPOT (SIMULATION)",
          balances: simulatedBalances,
          totalUsdValue: totalUsd,
          totalBtcValue: totalBtc,
          nonZeroCount: simulatedBalances.length
        }
      };
    }

    const account = await fetchBinanceAccountInfo(key, secret);
    return { isSimulation: false, account };
  }

  public async previewTradeOrder(
    symbol: string,
    side: "BUY" | "SELL",
    type: "LIMIT" | "MARKET",
    quantity: number,
    price?: number
  ): Promise<BinanceOrderPreview> {
    const tickers = await this.getMarketTickers([symbol, "BNBUSDT"]);
    const currentPrice = tickers.find((t) => t.symbol === symbol)?.price || price || 91850;
    const bnbPrice = tickers.find((t) => t.symbol === "BNBUSDT")?.price || 648.2;
    return previewOrder(symbol, side, type, quantity, price, currentPrice, undefined, bnbPrice);
  }

  public async executeTestOrder(
    order: {
      symbol: string;
      side: "BUY" | "SELL";
      type: "LIMIT" | "MARKET";
      quantity: number;
      price?: number;
      timeInForce?: "GTC" | "IOC" | "FOK";
    },
    apiKey?: string,
    secretKey?: string
  ) {
    const key = apiKey || process.env.BINANCE_API_KEY || "";
    const secret = secretKey || process.env.BINANCE_SECRET_KEY || "";
    return executeBinanceTestOrder(key, secret, order);
  }

  public getDonations(): DonationAddress[] {
    return getPublicDonationAddresses();
  }
}
