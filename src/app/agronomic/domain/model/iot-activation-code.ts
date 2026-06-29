/**
 * @file iot-activation-code.ts
 * @description Helpers for the IoT device activation (claim) code. The code a
 * producer enters to claim a physical sensor encodes the sensor kind in its
 * prefix: `VIORA-<TT><NN>-<XXXX>` where TT is SP (soil probe), LW (leaf wetness)
 * or WS (weather station). The backend validates the code against its registry;
 * the frontend only parses the prefix to preview the detected sensor type.
 */
import { IotDeviceType } from './iot-device.entity';

/** Validates the activation-code shape, e.g. `VIORA-SP01-7K3M`. */
export const ACTIVATION_CODE_PATTERN = /^VIORA-(SP|LW|WS)\d{2}-[A-Z0-9]{4}$/;

/**
 * Derives the sensor kind from an activation code prefix. Returns `unknown` when
 * the code is incomplete or unrecognized (e.g. while the user is still typing).
 */
export function deviceTypeFromActivationCode(code: string | null | undefined): IotDeviceType {
  const prefix = (code ?? '').trim().toUpperCase().match(/^VIORA-(SP|LW|WS)/)?.[1];

  switch (prefix) {
    case 'SP':
      return 'soil-probe';
    case 'LW':
      return 'leaf-wetness';
    case 'WS':
      return 'weather-station';
    default:
      return 'unknown';
  }
}
