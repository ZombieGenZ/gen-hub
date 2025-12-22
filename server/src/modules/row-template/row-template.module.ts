import { Module } from '@nestjs/common';
import { RowTemplateController } from './row-template.controller';
import { RowTemplateService } from './row-template.service';
import { RowTemplateRepository } from './row-template.repository';

@Module({
    controllers: [RowTemplateController],
    providers: [RowTemplateService, RowTemplateRepository],
    exports: [RowTemplateService, RowTemplateRepository],
})
export class RowTemplateModule { }
