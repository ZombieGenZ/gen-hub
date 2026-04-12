import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsUUID,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DurationUnit } from '@prisma/client';

export class RowAddonGiftDto {
  @ApiPropertyOptional({ description: 'ID của config (nếu update)' })
  @IsOptional()
  @IsUUID('4', { message: i18nValidationMessage('validation.isUUID') })
  id?: string;

  @ApiPropertyOptional({ description: 'ID của addon được tặng' })
  @IsUUID('4', { message: i18nValidationMessage('validation.isUUID') })
  addon_id: string;

  // Removed min order amount condition

  // Row-specific conditions if any (usually just order amount, or duration?)
  // Replicating WarehouseAddonGiftDto structure mostly, but adapted context if needed.
  // WarehouseTemplate had min_warehouses, min_rows.
  // RowTemplate context: maybe min_racks?
  // Let's stick to simple conditions for now or copy generic structure.
  // Actually, RowAddonGift might depend on renting multiple rows?
  // Or just min_order_amount implementation.
  // Checking schema.prisma for RowAddonGift fields.
  /*
  model RowAddonGift {
    id                       String          @id @default(uuid())
    row_template_id          String
    addon_id                 String
    require_min_order_amount Boolean         @default(false)
    min_order_amount         Decimal?        @db.Decimal(19, 4)
    is_until_service_end     Boolean         @default(true)
    gift_duration_value      Int?
    gift_duration_unit       DurationUnit?
    is_active                Boolean         @default(true)
    ...
  }
  */
  // So it only has min_order_amount.

  @ApiPropertyOptional({ description: 'Tặng đến khi kết thúc dịch vụ chính' })
  @IsOptional()
  @IsBoolean()
  is_until_service_end?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị thời gian tặng (nếu không phải until service end)',
  })
  @ValidateIf((o) => o.is_until_service_end === false)
  @IsNumber()
  @Min(1)
  gift_duration_value?: number;

  @ApiPropertyOptional({
    description: 'Đơn vị thời gian tặng',
    enum: DurationUnit,
  })
  @ValidateIf((o) => o.is_until_service_end === false)
  @IsEnum(DurationUnit)
  gift_duration_unit?: DurationUnit;

  @ApiPropertyOptional({ description: 'Trạng thái active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
