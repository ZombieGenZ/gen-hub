import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Interface cho dữ liệu ping đơn lẻ
 */
export interface PingData {
  t: number; // timestamp
  p: number; // ping ms
  s: number; // status: 0=up, 1=down
}

@Schema({
  collection: 'service_status',
  timestamps: true,
})
export class ServiceStatus extends Document {
  /**
   * Format: ${type}_${day}_${hour}
   * Ví dụ: server_2024-05-20_14
   */
  @Prop({ required: true, unique: true, index: true })
  uid: string;

  /**
   * Loại service (ví dụ: server, database, api)
   */
  @Prop({ required: true, index: true })
  type: string;

  /**
   * Ngày theo định dạng YYYY-MM-DD
   */
  @Prop({ required: true })
  day: string;

  /**
   * Giờ (0-23)
   */
  @Prop({ required: true })
  hour: number;

  /**
   * Mảng dữ liệu ping trong giờ đó
   */
  @Prop({
    type: [
      {
        t: { type: Number, required: true },
        p: { type: Number, required: true },
        s: { type: Number, required: true },
      },
    ],
    default: [],
  })
  data: PingData[];
}

export const ServiceStatusSchema = SchemaFactory.createForClass(ServiceStatus);

// Thêm index cho truy vấn theo thời gian nhanh hơn
ServiceStatusSchema.index({ type: 1, day: 1 });
