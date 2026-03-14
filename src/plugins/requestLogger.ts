import Elysia from "elysia";
import { createLogger } from "../logger";

export const requestLoggerPlugin = new Elysia({ name: "request-logger" })
  .derive({ as: "global" }, () => {
    const requestId = crypto.randomUUID();
    return {
      logger: createLogger({ requestId }),
      requestId,
    };
  })
  .onBeforeHandle({ as: "global" }, ({ logger, request }) => {
    const url = new URL(request.url);
    logger.info("incoming request", {
      method: request.method,
      path: url.pathname,
    });
  })
  .onAfterHandle({ as: "global" }, ({ logger, request, response }) => {
    const url = new URL(request.url);
    logger.info("request completed", {
      method: request.method,
      path: url.pathname,
      status: response instanceof Response ? response.status : 200,
    });
  })
;
