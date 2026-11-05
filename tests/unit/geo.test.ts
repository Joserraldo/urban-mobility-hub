import { describe, expect, it } from "vitest";

import {
  batteryLevel,
  CITY_CENTER,
  distanceM,
  formatDistance,
  nearest,
  walkMinutes,
} from "../../src/lib/geo";

describe("geo: distancias del mapa", () => {
  it("la distancia de un punto a sí mismo es 0", () => {
    expect(distanceM(CITY_CENTER, CITY_CENTER)).toBe(0);
  });

  it("0,01° de latitud son ~1,1 km", () => {
    const d = distanceM(CITY_CENTER, { lat: CITY_CENTER.lat + 0.01, lng: CITY_CENTER.lng });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1125);
  });

  it("formatea metros y kilómetros", () => {
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(1234)).toBe("1,2 km");
  });

  it("estima minutos caminando con mínimo 1", () => {
    expect(walkMinutes(10)).toBe(1);
    expect(walkMinutes(400)).toBe(5);
  });

  it("elige el elemento más cercano", () => {
    const items = [
      { id: "lejos", lat: 7.13, lng: -73.11 },
      { id: "cerca", lat: 7.114, lng: -73.11 },
    ];
    expect(nearest(CITY_CENTER, items)?.item.id).toBe("cerca");
    expect(nearest(CITY_CENTER, [])).toBeNull();
  });

  it("clasifica la batería en alta, media y baja", () => {
    expect(batteryLevel(80)).toBe("high");
    expect(batteryLevel(35)).toBe("mid");
    expect(batteryLevel(10)).toBe("low");
  });
});
