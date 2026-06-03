import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiContextRepository } from './ai-context.repository';
import { AiHubService } from './ai-hub.service';
import { CozeService } from './services/coze.service';
import { DifyService } from './services/dify.service';
import { GeminiService } from './services/gemini.service';
import { LocalGpsAiService } from './services/local-gps-ai.service';

@Module({
  imports: [PrismaModule],
  providers: [
    AiContextRepository,
    AiHubService,
    GeminiService,
    CozeService,
    DifyService,
    LocalGpsAiService,
  ],
  exports: [AiHubService, GeminiService, LocalGpsAiService],
})
export class AiHubModule {}
