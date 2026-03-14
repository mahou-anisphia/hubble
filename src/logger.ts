export interface LogContext {
  requestId: string;
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(ctx: LogContext): Logger {
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    const entry = {
      level,
      requestId: ctx.requestId,
      timestamp: new Date().toUTCString(),
      message,
      ...data,
    };
    console.log(JSON.stringify(entry));
  };

  return {
    info:  (message, data) => log("info",  message, data),
    warn:  (message, data) => log("warn",  message, data),
    error: (message, data) => log("error", message, data),
    debug: (message, data) => log("debug", message, data),
  };
}
