import { Module } from '@nestjs/common';
import { PublicQuotationController } from './public-quotation.controller';
import { PublicQuotationService } from './public-quotation.service';
import { PublicQuotationRepository } from './public-quotation.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PublicQuotationController],
    providers: [PublicQuotationService, PublicQuotationRepository],
    exports: [PublicQuotationService],
})
export class PublicQuotationModule {}
