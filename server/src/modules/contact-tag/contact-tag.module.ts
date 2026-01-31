import { Module } from '@nestjs/common';
import { ContactTagController } from './contact-tag.controller';
import { ContactTagService } from './contact-tag.service';
import { ContactTagRepository } from './contact-tag.repository';
import { ContactTagCacheKeysHelper } from './helpers/contact-tag-cache-keys.helper';

@Module({
    controllers: [ContactTagController],
    providers: [ContactTagService, ContactTagRepository, ContactTagCacheKeysHelper],
    exports: [ContactTagService, ContactTagRepository, ContactTagCacheKeysHelper],
})
export class ContactTagModule { }

