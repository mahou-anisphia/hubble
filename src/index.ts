import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { requestLoggerPlugin } from "./plugins/requestLogger";
import { errorHandlerPlugin } from "./plugins/errorHandler";
import { aqiPlugin } from "./modules/aqi/index";
import { openWeatherPlugin } from "./modules/openweather/index";

const app = new Elysia()
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
  .get("/", ({ logger }) => {
    logger.info("handling health check");
    return { status: "ok" };
  })
  .listen(3000);

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
