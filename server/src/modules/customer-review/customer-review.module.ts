import { Module } from '@nestjs/common';
import { CustomerReviewController } from './customer-review.controller';
import { CustomerReviewService } from './customer-review.service';
import { CustomerReviewRepository } from './customer-review.repository';

@Module({
  controllers: [CustomerReviewController],
  providers: [CustomerReviewService, CustomerReviewRepository],
  exports: [CustomerReviewService, CustomerReviewRepository],
})
export class CustomerReviewModule {}
