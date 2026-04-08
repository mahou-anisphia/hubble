import { systemLogger } from "./logger";

export const config = {
  redis: {
    endpoint: process.env.REDIS_ENDPOINT,
    port: process.env.REDIS_PORT,
  },
  kafka: {
    endpoint: process.env.KAFKA_ENDPOINT,
    port: process.env.KAFKA_PORT,
  },
  aqi: {
    apiKey: process.env.AQAIR_API_KEY,
    apiEndpoint: process.env.AQAIR_API_ENDPOINT,
  },
  openWeather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
    apiEndpoint: process.env.OPENWEATHER_API_ENDPOINT,
  },
} as const;

export function checkConfig() {
  const checks = {
    aqi: [config.aqi.apiKey, config.aqi.apiEndpoint],
    openweather: [config.openWeather.apiKey, config.openWeather.apiEndpoint],
    redis: [config.redis.endpoint, config.redis.port],
    kafka: [config.kafka.endpoint, config.kafka.port],
  };
  for (const [module, values] of Object.entries(checks)) {
    if (values.some((v) => !v)) {
      systemLogger.warn(
        { module, status: "degraded" },
        `missing config for module: ${module}`
      );
    }
  }
}
