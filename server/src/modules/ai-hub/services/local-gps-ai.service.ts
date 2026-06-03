import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface GpsTrackInput {
  lat: number;
  lng: number;
  speed: number | null;
  recorded_at: string;
}

export interface GpsAnalysisResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  warnings: string[];
  eta_note: string;
}

const VALID_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH']);
const DEFAULT_RESULT: GpsAnalysisResult = {
  risk_level: 'LOW',
  summary: 'Hành trình bình thường.',
  warnings: [],
  eta_note: '',
};

@Injectable()
export class LocalGpsAiService {
  private readonly logger = new Logger(LocalGpsAiService.name);
  private readonly baseUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.baseUrl = process.env.LOCAL_GPS_AI_URL ?? 'http://localhost:8001';
  }

  async analyzeGpsRoute(input: {
    tracks: GpsTrackInput[];
    warehouseName: string;
    licensePlate: string;
    currentDistanceM: number;
  }): Promise<GpsAnalysisResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);

      const res = await fetch(`${this.baseUrl}/analyze-gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: input.tracks,
          warehouseName: input.warehouseName,
          licensePlate: input.licensePlate,
          currentDistanceM: input.currentDistanceM,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from GPS AI server`);
      }

      const data = (await res.json()) as {
        risk_level?: string;
        summary?: string;
        warnings?: unknown[];
        eta_note?: string;
        model_used?: string;
        confidence?: number;
      };

      const result: GpsAnalysisResult = {
        risk_level: VALID_RISK_LEVELS.has(data.risk_level ?? '')
          ? (data.risk_level as GpsAnalysisResult['risk_level'])
          : 'LOW',
        summary:
          typeof data.summary === 'string'
            ? data.summary
            : DEFAULT_RESULT.summary,
        warnings: Array.isArray(data.warnings)
          ? data.warnings.filter((w) => typeof w === 'string').slice(0, 4)
          : [],
        eta_note: typeof data.eta_note === 'string' ? data.eta_note : '',
      };

      const durationMs = Date.now() - startTime;

      setImmediate(() => {
        this.prisma.aILog
          .create({
            data: {
              model: data.model_used ?? 'local-gps-ai',
              purpose: 'gps_route_analysis',
              input_text: `tracks:${input.tracks.length} plate:${input.licensePlate}`,
              output_text: JSON.stringify(result).substring(0, 500),
              duration_ms: durationMs,
              is_success: true,
              metadata: {
                confidence: data.confidence ?? null,
                track_count: input.tracks.length,
                warehouse: input.warehouseName,
              },
            },
          })
          .catch(() => {});
      });

      return result;
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`LocalGpsAiService error: ${msg}`);

      setImmediate(() => {
        this.prisma.aILog
          .create({
            data: {
              model: 'local-gps-ai',
              purpose: 'gps_route_analysis',
              input_text: `tracks:${input.tracks.length} plate:${input.licensePlate}`,
              is_success: false,
              error_message: msg.substring(0, 500),
            },
          })
          .catch(() => {});
      });

      return DEFAULT_RESULT;
    }
  }
}
