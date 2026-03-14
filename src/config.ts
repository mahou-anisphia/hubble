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
