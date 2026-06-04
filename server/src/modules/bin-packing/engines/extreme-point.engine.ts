/**
 * 3D Bin Packing — Extreme Point Algorithm
 * Packs items into a single container (truck cargo space).
 */

export interface Container {
  length: number;
  width: number;
  height: number;
  max_weight: number;
}

export interface PackItem {
  id: string;
  product_id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  stackable: boolean;
  stack_limit?: number;
  packaging_method: string;
}

export interface PlacedItem {
  item_id: string;
  product_id: string;
  x: number;
  y: number;
  z: number;
  placed_length: number;
  placed_width: number;
  placed_height: number;
  rotation: number; // 0=LWH, 1=WLH, 2=LHW
}

export interface PackResult {
  packed: PlacedItem[];
  unpacked: string[]; // item ids
  space_utilization: number; // 0-100
  total_weight: number;
  packed_count: number;
  unpacked_count: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

const ORIENTATIONS: Array<(l: number, w: number, h: number) => [number, number, number]> = [
  (l, w, h) => [l, w, h],   // normal
  (l, w, h) => [w, l, h],   // rotated 90 around Z
  (l, w, h) => [l, h, w],   // rotated 90 around X (flat)
];

function overlaps(
  a: PlacedItem,
  bx: number, by: number, bz: number,
  bl: number, bw: number, bh: number,
): boolean {
  return (
    bx < a.x + a.placed_length && bx + bl > a.x &&
    by < a.y + a.placed_width  && by + bw > a.y &&
    bz < a.z + a.placed_height && bz + bh > a.z
  );
}

function fitsInContainer(
  c: Container,
  x: number, y: number, z: number,
  l: number, w: number, h: number,
): boolean {
  return x + l <= c.length && y + w <= c.width && z + h <= c.height;
}

function isSupported(
  placed: PlacedItem[],
  x: number, y: number, z: number,
  l: number, w: number,
): boolean {
  // Ground level is always supported
  if (z === 0) return true;
  // Check that there is a placed item directly below (z-touching)
  for (const p of placed) {
    if (p.z + p.placed_height === z) {
      const overlapX = Math.min(x + l, p.x + p.placed_length) - Math.max(x, p.x);
      const overlapY = Math.min(y + w, p.y + p.placed_width) - Math.max(y, p.y);
      if (overlapX > 0 && overlapY > 0) return true;
    }
  }
  return false;
}

function addExtremePoints(
  points: Point3D[],
  placed: PlacedItem,
  existing: PlacedItem[],
  container: Container,
): void {
  // After placing an item, add 3 new extreme points at its corners
  const candidates: Point3D[] = [
    { x: placed.x + placed.placed_length, y: placed.y, z: placed.z },
    { x: placed.x, y: placed.y + placed.placed_width, z: placed.z },
    { x: placed.x, y: placed.y, z: placed.z + placed.placed_height },
  ];

  for (const pt of candidates) {
    if (pt.x > container.length || pt.y > container.width || pt.z > container.height) continue;

    const dominated = points.some(
      (ep) => ep.x <= pt.x && ep.y <= pt.y && ep.z <= pt.z,
    );
    if (!dominated) {
      points.push(pt);
    }
  }
}

export function runExtremePointPacking(
  container: Container,
  items: PackItem[],
): PackResult {
  const placed: PlacedItem[] = [];
  const unpacked: string[] = [];
  let totalWeight = 0;

  // Expand items by quantity & sort by volume descending
  const expanded: (PackItem & { _idx: number })[] = [];
  items.forEach((item) => {
    for (let q = 0; q < item.quantity; q++) {
      expanded.push({ ...item, _idx: expanded.length });
    }
  });

  expanded.sort((a, b) => {
    const volA = a.length * a.width * a.height;
    const volB = b.length * b.width * b.height;
    return volB - volA; // largest first
  });

  // Extreme points — start with origin
  let extremePoints: Point3D[] = [{ x: 0, y: 0, z: 0 }];

  for (const item of expanded) {
    if (totalWeight + item.weight > container.max_weight) {
      unpacked.push(item.id);
      continue;
    }

    let bestPoint: Point3D | null = null;
    let bestOri: [number, number, number] | null = null;
    let bestScore = Infinity;

    for (const ep of extremePoints) {
      for (let oriIdx = 0; oriIdx < ORIENTATIONS.length; oriIdx++) {
        const [pl, pw, ph] = ORIENTATIONS[oriIdx](item.length, item.width, item.height);

        // Non-stackable items must sit on floor or on non-stackable top
        if (!item.stackable && ep.z !== 0) {
          // Check if all items below are stackable (allow non-stackable on top if stacking ok below)
          const hasNonStackableBelow = placed.some(
            (p) =>
              p.z + p.placed_height === ep.z &&
              !items.find((i) => i.id === p.item_id)?.stackable,
          );
          if (hasNonStackableBelow) continue;
        }

        if (!fitsInContainer(container, ep.x, ep.y, ep.z, pl, pw, ph)) continue;
        if (!isSupported(placed, ep.x, ep.y, ep.z, pl, pw)) continue;

        // Check overlaps
        let hasOverlap = false;
        for (const p of placed) {
          if (overlaps(p, ep.x, ep.y, ep.z, pl, pw, ph)) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) continue;

        // Heuristic: minimize wasted corner space (prefer lower z, then smaller x+y)
        const score = ep.z * 1000 + ep.x + ep.y;
        if (score < bestScore) {
          bestScore = score;
          bestPoint = ep;
          bestOri = [pl, pw, ph];
        }
      }
    }

    if (bestPoint && bestOri) {
      const pi: PlacedItem = {
        item_id: item.id,
        product_id: item.product_id,
        x: bestPoint.x,
        y: bestPoint.y,
        z: bestPoint.z,
        placed_length: bestOri[0],
        placed_width: bestOri[1],
        placed_height: bestOri[2],
        rotation: ORIENTATIONS.findIndex(
          (fn) => {
            const r = fn(item.length, item.width, item.height);
            return r[0] === bestOri![0] && r[1] === bestOri![1] && r[2] === bestOri![2];
          },
        ),
      };

      placed.push(pi);
      totalWeight += item.weight;
      addExtremePoints(extremePoints, pi, placed, container);

      // Remove used extreme point
      extremePoints = extremePoints.filter(
        (ep) => ep !== bestPoint,
      );
    } else {
      unpacked.push(item.id);
    }
  }

  const containerVol = container.length * container.width * container.height;
  const usedVol = placed.reduce(
    (sum, p) => sum + p.placed_length * p.placed_width * p.placed_height,
    0,
  );
  const utilization = containerVol > 0 ? (usedVol / containerVol) * 100 : 0;

  return {
    packed: placed,
    unpacked,
    space_utilization: Math.min(100, Math.round(utilization * 100) / 100),
    total_weight: totalWeight,
    packed_count: placed.length,
    unpacked_count: unpacked.length,
  };
}
