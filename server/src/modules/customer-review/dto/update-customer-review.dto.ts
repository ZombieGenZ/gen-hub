import { PartialType } from '@nestjs/swagger';
import { CreateCustomerReviewDto } from './create-customer-review.dto';

export class UpdateCustomerReviewDto extends PartialType(CreateCustomerReviewDto) { }
