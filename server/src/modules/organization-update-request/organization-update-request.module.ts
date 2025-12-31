import { Module, forwardRef } from '@nestjs/common';
import { OrganizationUpdateRequestService } from './organization-update-request.service';
import { OrganizationUpdateRequestController } from './organization-update-request.controller';
import { OrganizationUpdateRequestRepository } from './organization-update-request.repository';
import { OrganizationModule } from '../organization/organization.module';

@Module({
    imports: [forwardRef(() => OrganizationModule)],
    controllers: [OrganizationUpdateRequestController],
    providers: [OrganizationUpdateRequestService, OrganizationUpdateRequestRepository],
    exports: [OrganizationUpdateRequestService],
})
export class OrganizationUpdateRequestModule { }
