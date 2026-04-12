import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { CategoryCacheKeysHelper } from './helpers/category-cache-keys.helper';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository, CategoryCacheKeysHelper],
  exports: [CategoryService, CategoryRepository, CategoryCacheKeysHelper],
})
export class CategoryModule {}
