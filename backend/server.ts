import express, { type Express, type Request, type Response, type NextFunction } from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import dotenv from "dotenv";
import { pinoHttp } from "pino-http";
import apiRoutes from "./src/api/index.js";
import { initializeSocket } from "./libs/socket.manager.js";
import { logger } from "./libs/logger.js";
import { checkReadiness } from "./libs/health.js";
import { apiRateLimit } from "./src/middleware/apiRateLimit.middleware.js";
import http from "http";
import config from "./config/config.js";

dotenv.config();

const app: Express = express();

// Trust the configured number of proxy hops so `req.ip` (and downstream rate
// limiters) derive the client IP from X-Forwarded-For only as far as our own
// proxy chain — beyond that the header is attacker-controlled and spoofable.
// Defaults to `false` (trust nothing) when TRUST_PROXY is unset.
app.set('trust proxy', config.trustProxy);

const allowedOrigins = config.allowedOrigins;
app.use(cors({
  origin: allowedOrigins.includes('*')
    ? '*'
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(pinoHttp({
  logger,
  customLogLevel: (_req, res, err: Error | undefined) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
}));

// Liveness: is the process up? Cheap, no dependency checks. Used by the Docker
// HEALTHCHECK and process supervisors — a dependency blip must not kill the pod.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Readiness: can the process actually serve traffic? Probes MySQL, Redis, and
// S3. Returns 503 (with a per-dependency breakdown) if any check fails — wire
// load balancers / orchestrators to this endpoint.
app.get("/ready", async (_req: Request, res: Response) => {
  const report = await checkReadiness();
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});

// iOS Universal Links — Apple fetches this to verify the app association
app.get("/.well-known/apple-app-site-association", (_req: Request, res: Response) => {
  const { iosTeamId, iosBundleId } = config.deepLink;
  res.setHeader("Content-Type", "application/json");
  res.json({
    applinks: {
      details: [
        {
          appIDs: [`${iosTeamId}.${iosBundleId}`],
          components: [
            { "/": "/gallery/join/*" },
            { "/": "/group/join/*" },
          ],
        },
      ],
    },
  });
});

// Android App Links — Google fetches this to verify the app association
app.get("/.well-known/assetlinks.json", (_req: Request, res: Response) => {
  const { androidPackage, androidSha256Cert } = config.deepLink;
  res.setHeader("Content-Type", "application/json");
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: androidPackage,
        sha256_cert_fingerprints: androidSha256Cert ? [androidSha256Cert] : [],
      },
    },
  ]);
});

// Baseline per-IP/per-user rate limit on all API routes (coarse safety net;
// stricter limiters still apply on auth and upload-confirm routes).
app.use('/api/v1', apiRateLimit, apiRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found' });
});

// Sentry error capture. Sits before the app's own handler: it reports errors
// (default: HTTP status >= 500) to Sentry, then passes them through to the
// handler below, which still owns the response. No-op when Sentry is disabled.
Sentry.setupExpressErrorHandler(app);

// Global error handler — must have 4 params so Express recognises it as error middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status: number = typeof err.statusCode === 'number' ? err.statusCode
    : typeof err.status === 'number' ? err.status
    : 500;
  const message: string = status < 500 ? err.message : 'Internal server error';
  if (status >= 500) {
    (req as any).log.error({ err }, 'Unhandled error');
  }
  res.status(status).json({ message });
});

const httpServer = http.createServer(app);
initializeSocket(httpServer);

export default httpServer;
