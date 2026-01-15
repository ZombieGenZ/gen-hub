import { Module } from '@nestjs/common';
import { CozeService } from './coze.service';
import { CozeRepository } from './coze.repository';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Module tích hợp Coze AI
 * Cung cấp CozeService cho các module khác sử dụng
 */
@Module({
    imports: [PrismaModule],
    providers: [CozeService, CozeRepository],
    exports: [CozeService],
})
export class CozeModule { }
