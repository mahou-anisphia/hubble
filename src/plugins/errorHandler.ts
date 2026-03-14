import Elysia from "elysia";
import axios from "axios";
import { MissingConfigError } from "../lib/errors";

export const errorHandlerPlugin = new Elysia({ name: "error-handler" })
  .onError({ as: "global" }, (ctx) => {
    const { code, error, set, request } = ctx;
    const logger = (ctx as any).logger as { error: (msg: string, meta?: object) => void } | undefined;

    const log = (msg: string, status: number) => {
      const url = new URL(request.url);
      logger?.error(msg, {
        method: request.method,
        path: url.pathname,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
    };

    // Missing env / config — module not available
    if (error instanceof MissingConfigError) {
      set.status = 503;
      log("request error", 503);
      return { error: error.message };
    }

    // Upstream API failures
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED") {
        set.status = 504;
        log("request error", 504);
        return { error: "Upstream API timed out" };
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        set.status = 502;
        log("request error", 502);
        return { error: "Upstream API authentication failed — check API key config" };
      }
      if (error.response) {
        set.status = 502;
        log("request error", 502);
        return { error: `Upstream API returned ${error.response.status}` };
      }
      set.status = 502;
      log("request error", 502);
      return { error: "Could not reach upstream API" };
    }

    // Elysia request validation — parse the JSON message into something readable
    if (code === "VALIDATION") {
      try {
        const parsed = JSON.parse(error.message);
        const on = parsed.on ?? "request";
        const field = (parsed.property as string)?.replace(/^\//, "") || "unknown";
        const msg = parsed.message ?? "invalid value";
        log("request error", 422);
        return { error: `Invalid ${on} parameter '${field}': ${msg}` };
      } catch {
        log("request error", 422);
        return { error: "Invalid request parameters" };
      }
    }

    if (code === "NOT_FOUND") {
      log("request error", 404);
      return { error: "Not found" };
    }

    // Everything else: don't leak internals
    set.status = 500;
    log("request error", 500);
    return { error: "Internal server error" };
  });
