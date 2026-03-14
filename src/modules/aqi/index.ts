import Elysia, { t } from "elysia";
import axios from "axios";
import { fetchWithCache } from "../../lib/fetchWithCache";
import { deleteFromRedis } from "../../lib/redis";
import { publishToKafka } from "../../lib/kafka";
import { makeCacheKey, AQI_PRECISION } from "../../utils/geo";
import { config } from "../../config";
import { requestLoggerPlugin } from "../../plugins/requestLogger";
import { MissingConfigError } from "../../lib/errors";
import type { AirQualityResponse } from "./types";

const TTL_SECONDS = 600; // 10 minutes

async function fetchAqi(lat: number, lon: number): Promise<AirQualityResponse> {
  if (!config.aqi.apiEndpoint || !config.aqi.apiKey) {
    throw new MissingConfigError("AQI API (AQAIR_API_ENDPOINT / AQAIR_API_KEY)");
  }
  const { data } = await axios.get<AirQualityResponse>(
    `https://${config.aqi.apiEndpoint}/v2/nearest_city`,
    { params: { lat, lon, key: config.aqi.apiKey }, timeout: 5000 }
  );
  return data;
}

export const aqiPlugin = new Elysia({ name: "aqi", prefix: "/aqi" })
  .use(requestLoggerPlugin)
  .delete(
    "/cache",
    async ({ query, logger }) => {
      const lat = parseFloat(query.lat);
      const lon = parseFloat(query.lon);
      const cacheKey = makeCacheKey("aqi", lat, lon, AQI_PRECISION);
      logger.info("clearing AQI cache", { cacheKey });
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
      const cacheKey = makeCacheKey("aqi", lat, lon, AQI_PRECISION);
      logger.info("fetching AQI data", { lat, lon, cacheKey });
      return fetchWithCache<AirQualityResponse>(cacheKey, TTL_SECONDS, () => fetchAqi(lat, lon), logger);
    },
    { query: t.Object({ lat: t.String(), lon: t.String() }) }
  )
  .post(
    "/publish",
    async ({ query, logger }) => {
      const lat = parseFloat(query.lat);
      const lon = parseFloat(query.lon);
      const cacheKey = makeCacheKey("aqi", lat, lon, AQI_PRECISION);
      logger.info("publishing AQI data to Kafka", { lat, lon, cacheKey });

      const data = await fetchWithCache<AirQualityResponse>(
        cacheKey,
        TTL_SECONDS,
        () => fetchAqi(lat, lon),
        logger
      );

      const sent = await publishToKafka("hubble-aqi", data);
      return { data, kafka: sent ? "published" : "skipped" };
    },
    { query: t.Object({ lat: t.String(), lon: t.String() }) }
  );
