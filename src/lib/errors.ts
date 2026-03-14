export class MissingConfigError extends Error {
  constructor(module: string) {
    super(`${module} is not configured — check environment variables`);
    this.name = "MissingConfigError";
  }
}
