import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the root capstone/.env before Prisma is initialized
dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});
export function isValidPostgresUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.replace(/^["']|["']$/g, "").trim();
  return clean.startsWith("postgresql://") || clean.startsWith("postgres://");
}
function createSafePrismaProxy() {
  const handler = {
    get(target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve();
      }
      if (prop === '$queryRaw' || prop === '$executeRaw') {
        return () => Promise.reject(new Error("PostgreSQL not connected (no valid postgresql:// connection URL)"));
      }
      return new Proxy({}, {
        get(mTarget, mProp) {
          if (mProp === 'findMany') return () => Promise.resolve([]);
          if (mProp === 'findFirst' || mProp === 'findUnique') return () => Promise.resolve(null);
          if (mProp === 'create') return (args) => Promise.resolve(args?.data || {});
          if (mProp === 'update' || mProp === 'updateMany') return (args) => Promise.resolve(args?.data || null);
          if (mProp === 'delete' || mProp === 'deleteMany') return () => Promise.resolve(null);
          if (mProp === 'count') return () => Promise.resolve(0);
          return () => Promise.resolve(null);
        }
      });
    }
  };
  return new Proxy({}, handler);
}

function getPrismaClient() {
  const rawUrl = process.env.DATABASE_URL;
  const isPostgres = isValidPostgresUrl(rawUrl);

  if (!isPostgres) {
    if (!global.__prismaSafeProxy) {
      global.__prismaSafeProxy = createSafePrismaProxy();
    }
    return global.__prismaSafeProxy;
  }

  if (!global.__prismaClient) {
    const cleanUrl = rawUrl.replace(/^["']|["']$/g, "").trim();
    global.__prismaClient = new PrismaClient({
      datasources: { db: { url: cleanUrl } },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
    });
  }
  return global.__prismaClient;
}

const prisma = new Proxy({}, {
  get(target, prop) {
    const client = getPrismaClient();
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

async function checkDatabaseConnection() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === "") {
    return {
      connected: false,
      message: "DATABASE_URL environment variable is not configured. Running in memory mode."
    };
  }

  if (!isValidPostgresUrl(rawUrl)) {
    return {
      connected: false,
      message: "DATABASE_URL does not start with postgresql:// or postgres://. Running in memory mode."
    };
  }

  const start = performance.now();
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1 as ping`;
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: true,
      message: "Successfully connected to PostgreSQL via Prisma ORM.",
      latencyMs
    };
  } catch (error) {
    return {
      connected: false,
      message: `Database connection failed: ${error?.message || String(error)}`
    };
  }
}

export {
  checkDatabaseConnection,
  getPrismaClient,
  prisma
};

