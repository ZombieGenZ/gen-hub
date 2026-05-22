import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(data: {
    token: string;
    license_plate: string;
    warehouse_template_id: string;
    receipt_id?: string;
    export_id?: string;
    driver_phone?: string;
    expires_at: Date;
    created_by?: string;
  }) {
    return this.prisma.gpsSession.create({ data });
  }

  async findSessionByToken(token: string) {
    return this.prisma.gpsSession.findUnique({
      where: { token },
      include: {
        warehouse_template: {
          select: {
            id: true,
            name: true,
            address_detail: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
  }

  async addTrack(data: {
    session_id: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
  }) {
    return this.prisma.gpsTrack.create({ data });
  }

  async expireSession(id: string) {
    return this.prisma.gpsSession.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });
  }

  async completeSession(id: string) {
    return this.prisma.gpsSession.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async listSessionsByWarehouse(warehouseTemplateId: string) {
    return this.prisma.gpsSession.findMany({
      where: {
        warehouse_template_id: warehouseTemplateId,
        status: 'ACTIVE',
      },
      include: {
        tracks: {
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
