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
  packaging_method: string;
  stackable: boolean;
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

const ORIENTATIONS: Array<
  (l: number, w: number, h: number) => [number, number, number]
> = [
  (l, w, h) => [l, w, h], // normal
  (l, w, h) => [w, l, h], // rotated 90 around Z
  (l, w, h) => [l, h, w], // rotated 90 around X (flat)
];

function overlaps(
  a: PlacedItem,
  bx: number,
  by: number,
  bz: number,
  bl: number,
  bw: number,
  bh: number,
): boolean {
  return (
    bx < a.x + a.placed_length &&
    bx + bl > a.x &&
    by < a.y + a.placed_width &&
    by + bw > a.y &&
    bz < a.z + a.placed_height &&
    bz + bh > a.z
  );
}

function fitsInContainer(
  c: Container,
  x: number,
  y: number,
  z: number,
  l: number,
  w: number,
  h: number,
): boolean {
  return x + l <= c.length && y + w <= c.width && z + h <= c.height;
}

function isSupported(
  placed: PlacedItem[],
  x: number,
  y: number,
  z: number,
  l: number,
  w: number,
): boolean {
  // Ground level is always supported
  if (z === 0) return true;
  // Check that there is a placed item directly below (z-touching)
  for (const p of placed) {
    if (p.z + p.placed_height === z) {
      const overlapX =
        Math.min(x + l, p.x + p.placed_length) - Math.max(x, p.x);
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
    if (
      pt.x > container.length ||
      pt.y > container.width ||
      pt.z > container.height
    )
      continue;

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
      // Skip points that have been enclosed by a previously placed item
      let blocked = false;
      for (const p of placed) {
        if (
          p.x <= ep.x &&
          ep.x < p.x + p.placed_length &&
          p.y <= ep.y &&
          ep.y < p.y + p.placed_width &&
          p.z <= ep.z &&
          ep.z < p.z + p.placed_height
        ) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (let oriIdx = 0; oriIdx < ORIENTATIONS.length; oriIdx++) {
        // LIQUID must stay upright — forbid rotation 2 (L×H×W = laid flat)
        if (item.packaging_method === 'LIQUID' && oriIdx === 2) continue;

        const [pl, pw, ph] = ORIENTATIONS[oriIdx](
          item.length,
          item.width,
          item.height,
        );

        // Don't place anything on top of a non-stackable placed item
        if (ep.z > 0) {
          const blockedByNonStackable = placed.some((p) => {
            if (p.z + p.placed_height !== ep.z) return false;
            const ox =
              Math.min(ep.x + pl, p.x + p.placed_length) - Math.max(ep.x, p.x);
            const oy =
              Math.min(ep.y + pw, p.y + p.placed_width) - Math.max(ep.y, p.y);
            return ox > 0 && oy > 0 && !p.stackable;
          });
          if (blockedByNonStackable) continue;
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

        // OVERSIZED items strongly prefer floor placement
        const zPenalty = item.packaging_method === 'OVERSIZED' ? 5000 : 1000;
        const score = ep.z * zPenalty + ep.x + ep.y;
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
        rotation: ORIENTATIONS.findIndex((fn) => {
          const r = fn(item.length, item.width, item.height);
          return (
            r[0] === bestOri[0] && r[1] === bestOri[1] && r[2] === bestOri[2]
          );
        }),
        packaging_method: item.packaging_method,
        stackable: item.stackable,
      };

      placed.push(pi);
      totalWeight += item.weight;

      // Remove used extreme point FIRST so it doesn't falsely dominate the
      // new candidates generated by addExtremePoints below.
      extremePoints = extremePoints.filter((ep) => ep !== bestPoint);
      addExtremePoints(extremePoints, pi, placed, container);
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
