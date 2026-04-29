import { Module } from '@nestjs/common';
import { StockTakeController } from './stock-take.controller';
import { StockTakeService } from './stock-take.service';
import { SharedModule } from '../../common/shared.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
  imports: [SharedModule, OrganizationModule, ApiKeyVerificationModule],
  controllers: [StockTakeController],
  providers: [StockTakeService],
  exports: [StockTakeService],
})
export class StockTakeModule {}
