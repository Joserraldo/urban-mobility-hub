import type { DataSource } from "./datasource";
import { createApiDataSource } from "./api";
import { createMockDataSource } from "./mock";

export type { DataSource } from "./datasource";
export * from "./types";

let instance: DataSource | undefined;

/** Selección de adaptador por entorno: VITE_DATA_SOURCE=mock | api (`bun run dev:api` sube el backend SQLite). */
export function getDataSource(): DataSource {
  if (!instance) {
    const kind = (import.meta.env["VITE_DATA_SOURCE"] as string | undefined) ?? "mock";
    instance = kind === "api" ? createApiDataSource() : createMockDataSource();
  }
  return instance;
}
