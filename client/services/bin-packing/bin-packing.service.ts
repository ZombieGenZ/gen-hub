import type { BinPackingResult, ComputePackingPayload } from './bin-packing.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class BinPackingService {
    async compute(token: string, payload: ComputePackingPayload): Promise<BinPackingResult> {
        const res = await fetch(`${API}/warehouse-manager/bin-packing/compute`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<BinPackingResult>;
    }

    async getByExportId(token: string, exportId: string): Promise<BinPackingResult> {
        const res = await fetch(`${API}/warehouse-manager/bin-packing/${exportId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<BinPackingResult>;
    }

    async apply(token: string, exportId: string): Promise<BinPackingResult> {
        const res = await fetch(`${API}/warehouse-manager/bin-packing/${exportId}/apply`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<BinPackingResult>;
    }
}
