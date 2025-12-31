import { PartialType } from '@nestjs/swagger';
import { CreateInsuranceDto } from './create-insurance.dto';

/**
 * DTO cập nhật Insurance - Bảo hiểm
 */
export class UpdateInsuranceDto extends PartialType(CreateInsuranceDto) { }
