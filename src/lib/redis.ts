import Redis from "ioredis";
import { config } from "../config";

let redisClient: Redis | null = null;
let connecting = false;

async function getRedisClient(): Promise<Redis | null> {
  if (redisClient?.status === "ready") return redisClient;
  if (connecting) return null;

  const { endpoint: host, port } = config.redis;

  if (!host || !port) {
    console.warn("[redis] REDIS_ENDPOINT or REDIS_PORT not set — running cache-free");
    return null;
  }

  connecting = true;
  try {
    const client = new Redis({
      host,
      port: parseInt(port, 10),
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    client.on("error", (err: Error) => {
      console.error("[redis] connection error:", err.message);
      redisClient = null;
    });

    await client.connect();
    redisClient = client;
    return redisClient;
  } catch (err) {
    console.error("[redis] failed to connect:", (err as Error).message);
    redisClient = null;
    return null;
  } finally {
    connecting = false;
  }
}

export async function getFromRedis<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error("[redis] getFromRedis error:", (err as Error).message);
    return null;
  }
}

export async function setInRedis(
  key: string,
  value: object,
  ttl: number
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    console.error("[redis] setInRedis error:", (err as Error).message);
  }
}

export async function deleteFromRedis(key: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error("[redis] deleteFromRedis error:", (err as Error).message);
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    const reply = await client.ping();
    return reply === "PONG";
  } catch {
    return false;
  }
}
