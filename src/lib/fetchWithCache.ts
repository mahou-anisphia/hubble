import { getFromRedis, setInRedis } from "./redis";
import type { Logger } from "../logger";

export async function fetchWithCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  logger?: Pick<Logger, "info">
): Promise<T> {
  const cached = await getFromRedis<T>(key);
  if (cached !== null) {
    logger?.info("cache hit", { key });
    return cached;
  }

  logger?.info("cache miss — calling external API", { key });
  const data = await fetcher();

  await setInRedis(key, data as object, ttl);
  return data;
}
