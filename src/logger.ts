import pino from "pino";

export interface LogContext {
  requestId: string;
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

const base = pino({
  timestamp: pino.stdTimeFunctions.isoTime,
  base: null,
});

export const systemLogger = base.child({ system: "hubble" });

export function createLogger(ctx: LogContext): Logger {
  const child = base.child({ requestId: ctx.requestId });
  return {
    info: (message, data) =>
      data ? child.info(data, message) : child.info(message),
    warn: (message, data) =>
      data ? child.warn(data, message) : child.warn(message),
    error: (message, data) =>
      data ? child.error(data, message) : child.error(message),
    debug: (message, data) =>
      data ? child.debug(data, message) : child.debug(message),
  };
}
