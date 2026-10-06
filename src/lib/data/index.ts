import type { DataSource } from "./datasource";
import { createMockDataSource } from "./mock";

export type { DataSource } from "./datasource";
export * from "./types";

let instance: DataSource | undefined;

/** Selección de adaptador por entorno: VITE_DATA_SOURCE=mock | api (por defecto, api cuando exista backend). */
export function getDataSource(): DataSource {
  if (!instance) {
    const kind = import.meta.env.VITE_DATA_SOURCE ?? "mock";
    // Cuando backend publique el contrato, aquí se enchufa createApiDataSource() (api.ts).
    instance = kind === "mock" ? createMockDataSource() : createMockDataSource();
  }
  return instance;
}
