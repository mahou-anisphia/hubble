import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { requestLoggerPlugin } from "./plugins/requestLogger";

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
  .get("/", ({ logger }) => {
    logger.info("handling health check");
    return { status: "ok" };
  })
  .listen(3000);

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
