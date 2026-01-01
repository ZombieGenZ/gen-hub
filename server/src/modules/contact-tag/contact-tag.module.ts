import { Module } from '@nestjs/common';
import { ContactTagController } from './contact-tag.controller';
import { ContactTagService } from './contact-tag.service';
import { ContactTagRepository } from './contact-tag.repository';

@Module({
    controllers: [ContactTagController],
    providers: [ContactTagService, ContactTagRepository],
    exports: [ContactTagService, ContactTagRepository],
})
export class ContactTagModule { }
