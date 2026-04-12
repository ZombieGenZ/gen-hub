export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface UIDComponents {
  warehouse: number;
  zone: number;
  row: number;
  shelf: number;
  bin: number;
}

export const Warehouse3DConfig = {
  zoneSpacingX: 20.0,
  binSpacingX: 1.2,
  shelfHeightY: 1.5,
  rowSpacingZ: 4.0,
};

/**
 * Parses a warehouse bin UID and extracts its components.
 * Format: WH{ID}-Z{Zone}-R{Row}-S{Shelf}-B{Bin}
 * Example: WH01-Z02-R05-S01-B03
 *
 * @param uid The unique identifier (e.g. "WH01-Z02-R05-S01-B03")
 * @returns UIDComponents object containing the numeric identifiers
 */
export function parseUID(uid: string): UIDComponents {
  const regex = /^WH(\d+)-Z(\d+)-R(\d+)-S(\d+)-B(\d+)$/;
  const match = uid.match(regex);

  if (!match) {
    throw new Error(`Invalid warehouse bin UID format: ${uid}`);
  }

  const [_, strWh, strZone, strRow, strShelf, strBin] = match;

  return {
    warehouse: parseInt(strWh, 10),
    zone: parseInt(strZone, 10),
    row: parseInt(strRow, 10),
    shelf: parseInt(strShelf, 10),
    bin: parseInt(strBin, 10),
  };
}

/**
 * Converts a parsed UID into 3D Coordinates (X, Y, Z) based on the warehouse layout configuration.
 *
 * @param uid The unique identifier (e.g. "WH01-Z02-R05-S01-B03")
 * @returns Point3D coordinates { x, y, z }
 */
export function parseUIDToCoordinates(uid: string): Point3D {
  const components = parseUID(uid);

  // X axis depends on Zone and Bin position within the shelf
  const x =
    (components.zone - 1) * Warehouse3DConfig.zoneSpacingX +
    (components.bin - 1) * Warehouse3DConfig.binSpacingX;

  // Y axis depends on the Shelf level
  const y = (components.shelf - 1) * Warehouse3DConfig.shelfHeightY;

  // Z axis depends on the Row position
  const z = (components.row - 1) * Warehouse3DConfig.rowSpacingZ;

  return { x, y, z };
}
