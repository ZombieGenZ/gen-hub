import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseManagerRoleDto } from './create-warehouse-manager-role.dto';

export class UpdateWarehouseManagerRoleDto extends PartialType(CreateWarehouseManagerRoleDto) { }
