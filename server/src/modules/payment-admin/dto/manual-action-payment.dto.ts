import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho manual accept payment
 */
export class ManualAcceptPaymentDto {
  @ApiProperty({
    description: 'ID của payment cần accept',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  paymentId: string;
}

/**
 * DTO cho manual reject payment
 */
export class ManualRejectPaymentDto {
  @ApiProperty({
    description: 'ID của payment cần reject',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  paymentId: string;
}
