import Elysia, { t } from "elysia";
import axios from "axios";
import { fetchWithCache } from "../../lib/fetchWithCache";
import { deleteFromRedis } from "../../lib/redis";
import { publishToKafka } from "../../lib/kafka";
import { makeCacheKey, OPENWEATHER_PRECISION } from "../../utils/geo";
import { config } from "../../config";
import { requestLoggerPlugin } from "../../plugins/requestLogger";
import { MissingConfigError } from "../../lib/errors";
import type { OpenWeather } from "./types";

const TTL_SECONDS = 600; // 10 minutes

async function fetchOpenWeather(lat: number, lon: number): Promise<OpenWeather> {
  if (!config.openWeather.apiEndpoint || !config.openWeather.apiKey) {
    throw new MissingConfigError("OpenWeather API (OPENWEATHER_API_ENDPOINT / OPENWEATHER_API_KEY)");
  }
  const { data } = await axios.get<OpenWeather>(
    `https://${config.openWeather.apiEndpoint}/data/2.5/weather`,
    { params: { lat, lon, appid: config.openWeather.apiKey, units: "metric" }, timeout: 5000 }
  );
  return data;
}

export const openWeatherPlugin = new Elysia({ name: "openweather", prefix: "/openweather" })
  .use(requestLoggerPlugin)
  .delete(
    "/cache",
    async ({ query, logger }) => {
      const lat = parseFloat(query.lat);
      const lon = parseFloat(query.lon);
      const cacheKey = makeCacheKey("openweather", lat, lon, OPENWEATHER_PRECISION);
      logger.info("clearing OpenWeather cache", { cacheKey });
      await deleteFromRedis(cacheKey);
      return { cleared: true };
    },
    { query: t.Object({ lat: t.String(), lon: t.String() }) }
  )
  .get(
    "/data",
    async ({ query, logger }) => {
      const lat = parseFloat(query.lat);
      const lon = parseFloat(query.lon);
      const cacheKey = makeCacheKey("openweather", lat, lon, OPENWEATHER_PRECISION);
      logger.info("fetching OpenWeather data", { lat, lon, cacheKey });
      return fetchWithCache<OpenWeather>(cacheKey, TTL_SECONDS, () => fetchOpenWeather(lat, lon), logger);
    },
    { query: t.Object({ lat: t.String(), lon: t.String() }) }
  )
  .post(
    "/publish",
    async ({ query, logger }) => {
      const lat = parseFloat(query.lat);
      const lon = parseFloat(query.lon);
      const cacheKey = makeCacheKey("openweather", lat, lon, OPENWEATHER_PRECISION);
      logger.info("publishing OpenWeather data to Kafka", { lat, lon, cacheKey });

      const data = await fetchWithCache<OpenWeather>(
        cacheKey,
        TTL_SECONDS,
        () => fetchOpenWeather(lat, lon),
        logger
      );

      const sent = await publishToKafka("hubble-openweather", data);
      return { data, kafka: sent ? "published" : "skipped" };
    },
    { query: t.Object({ lat: t.String(), lon: t.String() }) }
  );
