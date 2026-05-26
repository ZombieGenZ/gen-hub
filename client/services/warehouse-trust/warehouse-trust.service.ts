import { authStorage } from '../auth/auth-storage.service';
import type { LegalDocument, TrustProfile } from './warehouse-trust.types';

const API = process.env.NEXT_PUBLIC_API_URL;

class WarehouseTrustService {
  private headers(): HeadersInit {
    const token = authStorage.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  async listPendingDocuments(reviewStatus?: string): Promise<LegalDocument[]> {
    const params = reviewStatus ? `?review_status=${reviewStatus}` : '';
    const res = await fetch(
      `${API}/admin/warehouse-trust/pending-documents${params}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error('Failed to fetch pending documents');
    return res.json();
  }

  async getTrustProfile(warehouseTemplateId: string): Promise<TrustProfile | null> {
    const res = await fetch(
      `${API}/admin/warehouse-trust/profile/${warehouseTemplateId}`,
      { headers: this.headers() },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch trust profile');
    return res.json();
  }

  async reviewDocument(
    documentId: string,
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_RESUBMIT',
    reviewNote?: string,
  ): Promise<LegalDocument> {
    const res = await fetch(
      `${API}/admin/warehouse-trust/documents/${documentId}/review`,
      {
        method: 'PATCH',
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_note: reviewNote }),
      },
    );
    if (!res.ok) throw new Error('Failed to review document');
    return res.json();
  }

  async recompute(warehouseTemplateId: string): Promise<void> {
    await fetch(
      `${API}/admin/warehouse-trust/recompute/${warehouseTemplateId}`,
      { method: 'PATCH', headers: this.headers() },
    );
  }

  async getDocuments(warehouseTemplateId: string): Promise<LegalDocument[]> {
    const res = await fetch(
      `${API}/warehouse-legal-docs/${warehouseTemplateId}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  }

  async getSignedUrl(documentId: string): Promise<string> {
    const res = await fetch(
      `${API}/warehouse-legal-docs/download/${documentId}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error('Failed to get download URL');
    const data = (await res.json()) as { url: string };
    return data.url;
  }

  async uploadDocument(
    warehouseTemplateId: string,
    documentType: string,
    file: File,
  ): Promise<LegalDocument> {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);

    const res = await fetch(
      `${API}/warehouse-legal-docs/${warehouseTemplateId}`,
      {
        method: 'POST',
        headers: this.headers(),
        body: formData,
      },
    );
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  }

  async deleteDocument(documentId: string): Promise<void> {
    await fetch(`${API}/warehouse-legal-docs/${documentId}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }
}

export const warehouseTrustService = new WarehouseTrustService();
