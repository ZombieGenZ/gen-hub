import { Module } from '@nestjs/common';
import { BlockTemplateController } from './block-template.controller';
import { BlockTemplateService } from './block-template.service';
import { BlockTemplateRepository } from './block-template.repository';

@Module({
  controllers: [BlockTemplateController],
  providers: [BlockTemplateService, BlockTemplateRepository],
  exports: [BlockTemplateService, BlockTemplateRepository],
})
export class BlockTemplateModule {}
