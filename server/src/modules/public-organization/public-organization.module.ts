import { Module } from '@nestjs/common';
import { PublicOrganizationController } from './public-organization.controller';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [PublicOrganizationController],
})
export class PublicOrganizationModule {}
