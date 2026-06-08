import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface LegalDocAnalysisResult {
  is_valid_document: boolean;
  document_type_detected: string;
  issuer: string | null;
  license_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  is_expired: boolean;
  confidence: number;
  issues: string[];
  summary: string;
}

const DEFAULT_RESULT: LegalDocAnalysisResult = {
  is_valid_document: false,
  document_type_detected: 'unknown',
  issuer: null,
  license_number: null,
  issue_date: null,
  expiry_date: null,
  is_expired: false,
  confidence: 0,
  issues: ['Không thể phân tích tài liệu'],
  summary: 'Không thể phân tích tài liệu này.',
};

@Injectable()
export class LocalLegalDocService {
  private readonly logger = new Logger(LocalLegalDocService.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.baseUrl =
      process.env.LOCAL_LEGAL_DOC_AI_URL ?? 'http://localhost:8004';
    this.enabled =
      (process.env.USE_LOCAL_LEGAL_DOC_AI ?? 'false').toLowerCase() === 'true';

    if (this.enabled) {
      this.logger.log(`Local Legal Doc AI enabled at ${this.baseUrl}`);
    } else {
      this.logger.log('Local Legal Doc AI disabled — using Gemini fallback');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async analyzeDocument(
    base64Data: string,
    mimeType: string,
    docType: string,
  ): Promise<LegalDocAnalysisResult | null> {
    if (!this.enabled) return null;

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      // 30s timeout — OCR on large PDFs can be slow
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const res = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64_data: base64Data,
          mime_type: mimeType,
          doc_type: docType,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from Legal Doc AI server`);
      }

      const data = (await res.json()) as LegalDocAnalysisResult & {
        model_used?: string;
        duration_ms?: number;
      };

      const result: LegalDocAnalysisResult = {
        is_valid_document: Boolean(data.is_valid_document),
        document_type_detected:
          typeof data.document_type_detected === 'string'
            ? data.document_type_detected
            : 'unknown',
        issuer: typeof data.issuer === 'string' ? data.issuer : null,
        license_number:
          typeof data.license_number === 'string' ? data.license_number : null,
        issue_date:
          typeof data.issue_date === 'string' ? data.issue_date : null,
        expiry_date:
          typeof data.expiry_date === 'string' ? data.expiry_date : null,
        is_expired: Boolean(data.is_expired),
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        issues: Array.isArray(data.issues)
          ? (data.issues as string[]).slice(0, 5)
          : [],
        summary:
          typeof data.summary === 'string' ? data.summary : 'Đã phân tích.',
      };

      const durationMs = Date.now() - startTime;

      setImmediate(() => {
        this.prisma.aILog
          .create({
            data: {
              model: data.model_used ?? 'local-legal-doc-ai',
              purpose: 'legal_document_analysis',
              input_text: `docType:${docType} mime:${mimeType}`,
              output_text: JSON.stringify(result).substring(0, 500),
              duration_ms: durationMs,
              is_success: true,
              metadata: {
                confidence: result.confidence,
                is_valid: result.is_valid_document,
                issues_count: result.issues.length,
                local_duration_ms: data.duration_ms ?? null,
              },
            },
          })
          .catch(() => {});
      });

      return result;
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.warn(`LocalLegalDocService error: ${msg} — falling back to Gemini`);

      setImmediate(() => {
        this.prisma.aILog
          .create({
            data: {
              model: 'local-legal-doc-ai',
              purpose: 'legal_document_analysis',
              input_text: `docType:${docType}`,
              is_success: false,
              error_message: msg.substring(0, 500),
            },
          })
          .catch(() => {});
      });

      return null;
    }
  }
}
