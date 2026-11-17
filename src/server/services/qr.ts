import QRCode from "qrcode";

/** Contenido del QR pegado al vehículo: es lo que el desbloqueo compara (UC08). */
export const vehicleQrPayload = (vehicleId: string) => `UMH:${vehicleId}`;

/** QR del vehículo como SVG (vectorial: se imprime nítido a cualquier tamaño). Corrección de errores alta (H). */
export function vehicleQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
    width: 512,
  });
}
