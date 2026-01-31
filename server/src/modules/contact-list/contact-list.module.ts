import { Module } from '@nestjs/common';
import { ContactListController } from './contact-list.controller';
import { ContactListService } from './contact-list.service';
import { ContactListRepository } from './contact-list.repository';
import { ContactListCacheKeysHelper } from './helpers/contact-list-cache-keys.helper';

@Module({
    controllers: [ContactListController],
    providers: [ContactListService, ContactListRepository, ContactListCacheKeysHelper],
    exports: [ContactListService, ContactListRepository, ContactListCacheKeysHelper],
})
export class ContactListModule { }

