import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { requestLoggerPlugin } from "./plugins/requestLogger";
import { aqiPlugin } from "./modules/aqi/index";
import { openWeatherPlugin } from "./modules/openweather/index";

const app = new Elysia()
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
  .use(requestLoggerPlugin)
  .group("/api/v1", (app) => app.use(aqiPlugin).use(openWeatherPlugin))
  .get("/", ({ logger }) => {
    logger.info("handling health check");
    return { status: "ok" };
  })
  .listen(3000);

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
