import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleEmojiController, ArticleReactionAdminController } from './article-emoji.controller';
import { ArticleCommentController, ArticleCommentAdminController } from './article-comment.controller';
import { ArticleService } from './article.service';
import { ArticleRepository } from './article.repository';
import { ArticleEmojiService } from './article-emoji.service';
import { ArticleCommentService } from './article-comment.service';

@Module({
    controllers: [
        ArticleController,
        ArticleEmojiController,
        ArticleCommentController,
        ArticleReactionAdminController,
        ArticleCommentAdminController,
    ],
    providers: [
        ArticleService,
        ArticleRepository,
        ArticleEmojiService,
        ArticleCommentService,
    ],
    exports: [
        ArticleService,
        ArticleRepository,
        ArticleEmojiService,
        ArticleCommentService,
    ],
})
export class ArticleModule { }
