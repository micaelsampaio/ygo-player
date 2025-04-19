import debug from "debug";
import * as path from "path-browserify";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  enabled: boolean;
  component: string;
  level: LogLevel;
}

interface LoggerOptions {
  timestamp?: boolean;
  prefix?: string;
  sourceMap?: boolean;
}

export class Logger {
  private enabled: boolean;
  private component: string;
  private level: LogLevel;
  private options: LoggerOptions;
  private debugInstance: debug.Debugger;

  private static levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: LoggerConfig, options: LoggerOptions = {}) {
    this.enabled = config.enabled;
    this.component = `ygo:${config.component}`;
    this.level = config.level;
    this.options = {
      timestamp: true,
      prefix: "→",
      sourceMap: true,
      ...options,
    };
    this.debugInstance = debug(this.component);
  }

  private getCallerInfo(): string {
    try {
      const error = new Error();
      const stack = error.stack?.split("\n")[3];
      if (!stack) return "";

      // Match both webpack-style and regular paths
      const matches = stack.match(
        /(?:webpack-internal:\/\/\/|file:\/\/)?(.+?):(\d+):(\d+)/
      );
      if (!matches) return "";

      const [, filePath, line] = matches;
      const fileName = path.basename(filePath);
      return `${fileName}:${line}`;
    } catch {
      return "";
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts = [];

    if (this.options.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.options.sourceMap) {
      const callerInfo = this.getCallerInfo();
      if (callerInfo) {
        parts.push(`(${callerInfo})`);
      }
    }

    if (this.options.prefix) {
      parts.push(this.options.prefix);
    }

    parts.push(message);

    return parts.join(" ");
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      this.debugInstance(this.formatMessage("debug", message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog("info")) {
      this.debugInstance(this.formatMessage("info", message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog("warn")) {
      this.debugInstance(this.formatMessage("warn", message), ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog("error")) {
      this.debugInstance(this.formatMessage("error", message), ...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levels[level] >= Logger.levels[this.level];
  }

  static createLogger(component: string): Logger {
    return new Logger(
      {
        enabled: import.meta.env.VITE_DEBUG_ENABLED === "true",
        component,
        level: "debug",
      },
      {
        timestamp: true,
        prefix: "→",
        sourceMap: true,
      }
    );
  }
}
