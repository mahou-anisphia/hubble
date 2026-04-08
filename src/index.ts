import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { requestLoggerPlugin } from "./plugins/requestLogger";
import { errorHandlerPlugin } from "./plugins/errorHandler";
import { aqiPlugin } from "./modules/aqi/index";
import { openWeatherPlugin } from "./modules/openweather/index";
import { checkConfig, config } from "./config";
import { pingRedis } from "./lib/redis";
import { pingKafka } from "./lib/kafka";

checkConfig();

const app = new Elysia()
  .use(cors())
  .use(requestLoggerPlugin)
  .use(errorHandlerPlugin)
  .use(
    swagger({
      documentation: {
        info: {
          title: "Hubble API",
          version: "1.0.0",
          description: "Hubble service API",
        },
      },
    })
  )
  .group("/api/v1", (app) => app.use(aqiPlugin).use(openWeatherPlugin))
  .get("/", async ({ logger }) => {
    logger.info("handling health check");
    const modules: Record<string, "online" | "down"> = {};

    // Config-gated checks
    modules.aqi =
      config.aqi.apiKey && config.aqi.apiEndpoint ? "online" : "down";
    modules.openweather =
      config.openWeather.apiKey && config.openWeather.apiEndpoint
        ? "online"
        : "down";

    // Service ping checks
    if (!config.redis.endpoint || !config.redis.port) {
      modules.redis = "down";
    } else {
      modules.redis = (await pingRedis()) ? "online" : "down";
    }

    if (!config.kafka.endpoint || !config.kafka.port) {
      modules.kafka = "down";
    } else {
      modules.kafka = (await pingKafka()) ? "online" : "down";
    }

    const allOnline = Object.values(modules).every((s) => s === "online");
    return { status: allOnline ? "ok" : "degraded", modules };
  })
  .listen(Number(process.env.PORT) || 3000);

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
