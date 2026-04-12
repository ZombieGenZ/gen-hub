import { Module } from '@nestjs/common';
import { ShelfTemplateController } from './shelf-template.controller';
import { ShelfTemplateService } from './shelf-template.service';
import { ShelfTemplateRepository } from './shelf-template.repository';

@Module({
  controllers: [ShelfTemplateController],
  providers: [ShelfTemplateService, ShelfTemplateRepository],
  exports: [ShelfTemplateService, ShelfTemplateRepository],
})
export class ShelfTemplateModule {}
