import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PersistenceMicroservice } from "./PersistenceMicroservice";
import { CrossDeviceAuthMicroservice } from "./CrossDeviceAuthMicroservice";
import { ArxivPipelineMicroservice } from "./ArxivPipelineMicroservice";
import { DispatchMicroservice } from "./DispatchMicroservice";
import { BinanceTreasuryMicroservice } from "./BinanceTreasuryMicroservice";
import { MicroserviceRegistry } from "./MicroserviceRegistry";
import { BlogPost, PipelineExecutionRecord } from "../types";

// Setup dedicated test directory
const TEST_DIR = path.join(process.cwd(), "data", "test_microservices");
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

const sampleBlogs: BlogPost[] = [
  {
    id: "blog-test-1",
    title: "Non-Hermitian Quantum Mechanics & Exceptional Points",
    slug: "non-hermitian-quantum-mechanics",
    excerpt: "Comprehensive study of PT-symmetric open quantum systems.",
    content: "## Hamiltonian Dynamics\n\n$$\\hat{H} = \\begin{pmatrix} r e^{i\\theta} & J \\\\ J & r e^{-i\\theta} \\end{pmatrix}$$",
    author: "Lucas Kempe",
    date: "2026-08-30",
    readingTime: "9 min read",
    arxivLink: "https://arxiv.org/abs/2608.12345",
    bannerSvg: "<svg><text>Quantum</text></svg>",
    tags: ["Quantum Mechanics", "Spectral Theory"],
    views: 399,
    timestamp: 1725000000000,
    createdAt: 1725000000000
  },
  {
    id: "blog-test-2",
    title: "Symplectic Manifolds in Neural Optimal Control",
    slug: "symplectic-manifolds-neural-control",
    excerpt: "Geometric deep learning on symplectic differential equations.",
    content: "## Symplectic 2-Form\n\n$$\\omega = \\sum_{i=1}^n dq_i \\wedge dp_i$$",
    author: "Lucas Kempe",
    date: "2026-08-31",
    readingTime: "8 min read",
    arxivLink: "https://arxiv.org/abs/2608.67890",
    bannerSvg: "<svg><text>Geometry</text></svg>",
    tags: ["Differential Geometry", "Control Theory"],
    views: 420,
    timestamp: 1725100000000,
    createdAt: 1725100000000
  }
];

// ------------------------------------------------------------------------------------------------
// PERSISTENCE MICROSERVICE TESTS
// ------------------------------------------------------------------------------------------------

test("PersistenceMicroservice: Initializes and creates directory structures", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });
  const initOk = await persistence.initialize();
  assert.strictEqual(initOk, true);

  const health = await persistence.getHealth();
  assert.ok(["healthy", "degraded"].includes(health.status));
  assert.strictEqual(health.serviceName, "PersistenceMicroservice");
});

test("PersistenceMicroservice: Persists across multiple storage tiers and creates snapshot", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });
  const res = await persistence.persistMultiTier(sampleBlogs, "unit-test-sync");

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status.customBlogsJson, true);
  assert.strictEqual(res.status.dataTs, true);
  assert.strictEqual(res.status.snapshot, true);
  assert.strictEqual(res.status.sitemap, true);
  assert.ok(res.status.activeTierCount >= 4);

  const loaded = persistence.readBlogs();
  assert.ok(loaded.length >= 2);
  const found = loaded.find((b) => b.id === "blog-test-1");
  assert.ok(found);
  assert.strictEqual(found?.title, "Non-Hermitian Quantum Mechanics & Exceptional Points");
});

test("PersistenceMicroservice: Handles cross-device and cross-IP synchronization with conflict resolution", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });

  // Device A (e.g. iPad on Cellular IP) sends updated blog with increased views
  const clientPayload = {
    deviceId: "device_ipad_pro_01",
    deviceName: "Lucas's iPad Pro",
    ipAddress: "166.199.12.84",
    fingerprintHash: "fp_ipad_safari",
    clientTimestamp: 1725200000000,
    blogs: [
      {
        ...sampleBlogs[0],
        views: 450, // Higher views
        tags: ["Quantum Mechanics", "Spectral Theory", "Optics"], // Extra tag
        timestamp: 1725200000000
      },
      {
        id: "blog-device-new",
        title: "Topological Insulators and Chern Numbers",
        slug: "topological-insulators-chern",
        excerpt: "Calculation of Berry curvature and topological Chern invariant.",
        content: "$$\\mathcal{C} = \\frac{1}{2\\pi} \\int_{\\text{BZ}} \\mathcal{F} \\, d^2k$$",
        author: "Lucas Kempe",
        date: "2026-09-01",
        readingTime: "6 min read",
        arxivLink: "https://arxiv.org/abs/2609.99999",
        bannerSvg: "<svg></svg>",
        tags: ["Topology"],
        views: 480,
        timestamp: 1725200000000,
        createdAt: 1725200000000
      }
    ]
  };

  const syncResult = await persistence.syncCrossDevice(clientPayload);
  assert.strictEqual(syncResult.success, true);
  assert.ok(syncResult.mergedBlogs.length >= 3);

  // Check that device was registered in persistence registry
  const registeredDevices = persistence.getRegisteredDevices();
  const devA = registeredDevices.find((d) => d.deviceId === "device_ipad_pro_01");
  assert.ok(devA, "Device should be registered");
  assert.strictEqual(devA?.deviceName, "Lucas's iPad Pro");
  assert.strictEqual(devA?.ipAddress, "166.199.12.84");

  // Check that view count preserved maximum and tags were merged
  const merged1 = syncResult.mergedBlogs.find((b) => b.id === "blog-test-1");
  assert.strictEqual(merged1?.views, 450);
  assert.ok(merged1?.tags.includes("Optics"));
});

test("PersistenceMicroservice: Snapshot rollback and recovery", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });
  const snapshots = persistence.listSnapshots();
  assert.ok(snapshots.length > 0, "At least one snapshot should exist");

  const latestSnapshot = snapshots[0];
  const rollbackRes = await persistence.rollbackToSnapshot(latestSnapshot.filename);
  assert.strictEqual(rollbackRes.success, true);
  assert.ok(rollbackRes.blogCount > 0);
});

// ------------------------------------------------------------------------------------------------
// CROSS-DEVICE AUTH MICROSERVICE TESTS
// ------------------------------------------------------------------------------------------------

test("CrossDeviceAuthMicroservice: Register passkey and authenticate with biometric awareness", async () => {
  const auth = new CrossDeviceAuthMicroservice({ baseDir: TEST_DIR });
  await auth.initialize();

  const regRes = auth.registerPasskey(
    {
      id: "passkey_macbook_m3_secure",
      deviceName: "Lucas's MacBook Pro M3",
      publicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...",
      biometricVerified: true
    },
    "192.168.1.100"
  );

  assert.strictEqual(regRes.success, true);
  assert.strictEqual(regRes.record.id, "passkey_macbook_m3_secure");
  assert.strictEqual(regRes.record.deviceName, "Lucas's MacBook Pro M3");

  // Authenticate
  const authRes = auth.authenticate("passkey_macbook_m3_secure", "192.168.1.100");
  assert.strictEqual(authRes.authorized, true);
  assert.ok(authRes.session);
  assert.strictEqual(authRes.session?.credentialId, "passkey_macbook_m3_secure");
});

test("CrossDeviceAuthMicroservice: Cross-IP roaming preserves active session seamlessly", async () => {
  const auth = new CrossDeviceAuthMicroservice({ baseDir: TEST_DIR });
  await auth.initialize();

  // Initial auth on Home Wi-Fi (IP A)
  const authRes = auth.authenticate("passkey_macbook_m3_secure", "24.120.55.10");
  assert.strictEqual(authRes.authorized, true);
  const sessionId = authRes.session!.sessionId;

  // Device roams to Cellular 5G (IP B)
  const roamRes = auth.validateSessionWithRoam(sessionId, "172.56.21.99", "fp_macbook_m3");
  assert.strictEqual(roamRes.valid, true);
  assert.ok(roamRes.roamContext);
  assert.strictEqual(roamRes.roamContext?.ipRoamDetected, true);
  assert.strictEqual(roamRes.roamContext?.originalIp, "24.120.55.10");
  assert.strictEqual(roamRes.roamContext?.currentIp, "172.56.21.99");
});

test("CrossDeviceAuthMicroservice: Portal tokens pair devices and browsers across networks", async () => {
  const auth = new CrossDeviceAuthMicroservice({ baseDir: TEST_DIR });
  await auth.initialize();

  // Browser on new device generates portal pairing token
  const portal = auth.createPortalToken("auth");
  assert.ok(portal.token);
  assert.ok(portal.challenge);

  // Authenticated device approves portal token
  const verifyRes = auth.verifyPortalToken(portal.token, true, {
    deviceName: "Lucas's iPhone 16 Pro"
  });
  assert.strictEqual(verifyRes.success, true);

  // Browser polls token and gains access
  const pollRes = auth.pollPortalToken(portal.token);
  assert.strictEqual(pollRes.authorized, true);
  assert.strictEqual(pollRes.deviceName, "Lucas's iPhone 16 Pro");
  assert.ok(pollRes.password);
});

// ------------------------------------------------------------------------------------------------
// ARXIV PIPELINE MICROSERVICE TESTS
// ------------------------------------------------------------------------------------------------

test("ArxivPipelineMicroservice: Ingests arXiv identifiers and generates scholarly article", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });
  await persistence.initialize();
  const arxiv = new ArxivPipelineMicroservice(persistence);
  await arxiv.initialize();

  // Ingest arXiv paper
  const ingested = await arxiv.ingestArxiv("2608.12345");
  assert.ok(ingested.arxivId);
  assert.ok(ingested.title);
  assert.ok(ingested.summary);

  // Synthesize article via pipeline
  const result = await arxiv.generateArticle({
    arxivInput: "2608.12345",
    forceModel: "procedural"
  });

  assert.ok(result.blog);
  assert.ok(result.blog.id);
  assert.ok(result.blog.content.includes("$$"));
  assert.ok(result.blog.bannerSvg.includes("<svg"));
  assert.strictEqual(result.executionRecord.status, "completed");
  assert.strictEqual(result.executionRecord.steps.length, 4);
});

test("ArxivPipelineMicroservice: Tracks generation jobs lifecycle and metrics", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });
  const arxiv = new ArxivPipelineMicroservice(persistence);

  const job = arxiv.createJob("2608.55555");
  assert.ok(job.id);
  assert.strictEqual(job.status, "queued");

  arxiv.updateJob(job.id, {
    status: "generating",
    progressPercent: 50,
    currentStepMessage: "Evaluating KaTeX formulas"
  });

  const updated = arxiv.getJob(job.id);
  assert.strictEqual(updated?.status, "generating");
  assert.strictEqual(updated?.progressPercent, 50);
});

// ------------------------------------------------------------------------------------------------
// DISPATCH & BINANCE TREASURY MICROSERVICES TESTS
// ------------------------------------------------------------------------------------------------

test("DispatchMicroservice: Generates dual morning research proposals with RAG alignment", async () => {
  const persistence = new PersistenceMicroservice({ baseDir: TEST_DIR });
  const dispatch = new DispatchMicroservice(persistence);
  await dispatch.initialize();

  const options = dispatch.generateDailyOptions();
  assert.ok(options.optionA);
  assert.ok(options.optionB);
  assert.strictEqual(options.optionA.optionType, "option_a");
  assert.strictEqual(options.optionB.optionType, "option_b");
  assert.ok(options.optionA.ragAlignmentScore > 0.7);
  assert.ok(options.optionB.ragAlignmentScore > 0.7);

  const dispatchRes = await dispatch.dispatchNotification(sampleBlogs[0]);
  assert.strictEqual(dispatchRes.success, true);
  assert.ok(["email", "simulated"].includes(dispatchRes.channel));
});

test("BinanceTreasuryMicroservice: Headless market data, order preview calculation, and donations", async () => {
  const treasury = new BinanceTreasuryMicroservice();
  await treasury.initialize();

  const tickers = await treasury.getMarketTickers(["BTCUSDT", "ETHUSDT"]);
  assert.ok(Array.isArray(tickers));
  assert.ok(tickers.length >= 1);

  const preview = await treasury.previewTradeOrder("BTCUSDT", "BUY", "LIMIT", 0.05, 90000);
  assert.strictEqual(preview.symbol, "BTCUSDT");
  assert.strictEqual(preview.side, "BUY");
  assert.strictEqual(preview.totalNotionalUsd, 4500);
  assert.ok(preview.estimatedFeeUsd > 0);

  const donations = treasury.getDonations();
  assert.ok(donations.length >= 3);
  const btcDonation = donations.find((d) => d.symbol === "BTC");
  assert.ok(btcDonation);
  assert.ok(btcDonation?.address.startsWith("bc1q") || btcDonation?.address.length > 10);
});

// ------------------------------------------------------------------------------------------------
// MICROSERVICE REGISTRY CONTAINER & LIFECYCLE TESTS
// ------------------------------------------------------------------------------------------------

test("MicroserviceRegistry: Coordinates all microservices and provides aggregated health status", async () => {
  const registry = MicroserviceRegistry.getInstance();
  const initResult = await registry.initializeAll();

  assert.ok(initResult.initialized.length >= 5);
  assert.strictEqual(initResult.failed.length, 0);

  const aggregatedHealth = await registry.getAggregatedHealth();
  assert.ok(["healthy", "degraded"].includes(aggregatedHealth.status));
  assert.ok(aggregatedHealth.services["PersistenceMicroservice"]);
  assert.ok(aggregatedHealth.services["CrossDeviceAuthMicroservice"]);
  assert.ok(aggregatedHealth.services["ArxivPipelineMicroservice"]);
  assert.ok(aggregatedHealth.services["DispatchMicroservice"]);
  assert.ok(aggregatedHealth.services["BinanceTreasuryMicroservice"]);

  // Event bus test
  let eventReceived = false;
  const unsubscribe = registry.subscribe("blog:created", (payload) => {
    if (payload.id === "test-evt") eventReceived = true;
  });

  registry.emit("blog:created", { id: "test-evt" });
  assert.strictEqual(eventReceived, true);
  unsubscribe();
});
