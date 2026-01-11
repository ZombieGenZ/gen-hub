import { Module } from '@nestjs/common';
import { ContactListController } from './contact-list.controller';
import { ContactListService } from './contact-list.service';
import { ContactListRepository } from './contact-list.repository';

@Module({
    controllers: [ContactListController],
    providers: [ContactListService, ContactListRepository],
    exports: [ContactListService, ContactListRepository],
})
export class ContactListModule { }
