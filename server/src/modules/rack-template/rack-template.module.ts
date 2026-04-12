import { Module } from '@nestjs/common';
import { RackTemplateController } from './rack-template.controller';
import { RackTemplateService } from './rack-template.service';
import { RackTemplateRepository } from './rack-template.repository';

@Module({
  controllers: [RackTemplateController],
  providers: [RackTemplateService, RackTemplateRepository],
  exports: [RackTemplateService, RackTemplateRepository],
})
export class RackTemplateModule {}
