/**
 * MERIDIAN MICROSERVICE REGISTRY & CONTAINER
 * 
 * Central dependency injection container, lifecycle coordinator, service health monitor,
 * and event bus across Meridian backend microservices.
 */

import { IMicroservice, ServiceHealth } from "./types";
import { PersistenceMicroservice } from "./PersistenceMicroservice";
import { CrossDeviceAuthMicroservice } from "./CrossDeviceAuthMicroservice";
import { ArxivPipelineMicroservice } from "./ArxivPipelineMicroservice";
import { DispatchMicroservice } from "./DispatchMicroservice";
import { BinanceTreasuryMicroservice } from "./BinanceTreasuryMicroservice";

export class MicroserviceRegistry {
  private static instance: MicroserviceRegistry;

  public readonly persistence: PersistenceMicroservice;
  public readonly auth: CrossDeviceAuthMicroservice;
  public readonly arxiv: ArxivPipelineMicroservice;
  public readonly dispatch: DispatchMicroservice;
  public readonly binance: BinanceTreasuryMicroservice;

  private services: Map<string, IMicroservice> = new Map();
  private eventListeners: Map<string, Array<(payload: any) => void>> = new Map();

  private constructor() {
    this.persistence = new PersistenceMicroservice();
    this.auth = new CrossDeviceAuthMicroservice();
    this.arxiv = new ArxivPipelineMicroservice(this.persistence);
    this.dispatch = new DispatchMicroservice(this.persistence);
    this.binance = new BinanceTreasuryMicroservice();

    this.registerService(this.persistence);
    this.registerService(this.auth);
    this.registerService(this.arxiv);
    this.registerService(this.dispatch);
    this.registerService(this.binance);
  }

  public static getInstance(): MicroserviceRegistry {
    if (!MicroserviceRegistry.instance) {
      MicroserviceRegistry.instance = new MicroserviceRegistry();
    }
    return MicroserviceRegistry.instance;
  }

  public registerService(service: IMicroservice): void {
    this.services.set(service.serviceName, service);
  }

  public getService<T extends IMicroservice>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T | undefined;
  }

  public getPersistence(): PersistenceMicroservice {
    return this.getService<PersistenceMicroservice>("PersistenceMicroservice")!;
  }

  public getPersistenceService(): PersistenceMicroservice {
    return this.getPersistence();
  }

  public getAuth(): CrossDeviceAuthMicroservice {
    return this.getService<CrossDeviceAuthMicroservice>("CrossDeviceAuthMicroservice")!;
  }

  public getAuthService(): CrossDeviceAuthMicroservice {
    return this.getAuth();
  }

  public getArxiv(): ArxivPipelineMicroservice {
    return this.getService<ArxivPipelineMicroservice>("ArxivPipelineMicroservice")!;
  }

  public getArxivService(): ArxivPipelineMicroservice {
    return this.getArxiv();
  }

  public getDispatch(): DispatchMicroservice {
    return this.getService<DispatchMicroservice>("DispatchMicroservice")!;
  }

  public getDispatchService(): DispatchMicroservice {
    return this.getDispatch();
  }

  public getTreasury(): BinanceTreasuryMicroservice {
    return this.getService<BinanceTreasuryMicroservice>("BinanceTreasuryMicroservice")!;
  }

  public getTreasuryService(): BinanceTreasuryMicroservice {
    return this.getTreasury();
  }

  public async initializeAll(): Promise<{ initialized: string[]; failed: string[] }> {
    const initialized: string[] = [];
    const failed: string[] = [];

    for (const [name, svc] of this.services.entries()) {
      try {
        const ok = await svc.initialize();
        if (ok) {
          initialized.push(name);
        } else {
          failed.push(name);
        }
      } catch (err) {
        console.error(`[MicroserviceRegistry] Failed initializing ${name}:`, err);
        failed.push(name);
      }
    }

    return { initialized, failed };
  }

  public async getAggregatedHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: number;
    services: Record<string, ServiceHealth>;
  }> {
    const services: Record<string, ServiceHealth> = {};
    let overallHealthy = true;

    for (const [name, svc] of this.services.entries()) {
      try {
        const health = await svc.getHealth();
        services[name] = health;
        if (health.status === "unhealthy" || health.status === "degraded") {
          overallHealthy = false;
        }
      } catch (err: any) {
        services[name] = {
          serviceName: name,
          status: "unhealthy",
          uptimeSeconds: 0,
          lastHeartbeat: Date.now(),
          version: svc.version,
          errors: [err.message || "Health check failed"]
        };
        overallHealthy = false;
      }
    }

    return {
      status: overallHealthy ? "healthy" : "degraded",
      timestamp: Date.now(),
      services
    };
  }

  public async shutdownAll(): Promise<void> {
    for (const [name, svc] of this.services.entries()) {
      try {
        await svc.shutdown();
      } catch (err) {
        console.error(`[MicroserviceRegistry] Error shutting down ${name}:`, err);
      }
    }
  }

  // Event Pub/Sub
  public subscribe(event: string, listener: (payload: any) => void): () => void {
    const list = this.eventListeners.get(event) || [];
    list.push(listener);
    this.eventListeners.set(event, list);
    return () => {
      const current = this.eventListeners.get(event) || [];
      this.eventListeners.set(event, current.filter((l) => l !== listener));
    };
  }

  public emit(event: string, payload: any): void {
    const list = this.eventListeners.get(event) || [];
    list.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[MicroserviceRegistry] Event listener error for ${event}:`, err);
      }
    });
  }
}
