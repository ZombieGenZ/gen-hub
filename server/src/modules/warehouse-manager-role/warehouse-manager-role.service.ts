import { Injectable, NotFoundException } from '@nestjs/common';
import { WarehouseManagerRoleRepository } from './warehouse-manager-role.repository';
import { CreateWarehouseManagerRoleDto, UpdateWarehouseManagerRoleDto } from './dto';
import { WarehouseManagerRole, WarehouseManagerPermission } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class WarehouseManagerRoleService {
    constructor(
        private readonly warehouseManagerRoleRepository: WarehouseManagerRoleRepository,
        private readonly i18n: I18nService,
    ) { }

    async createRole(dto: CreateWarehouseManagerRoleDto): Promise<WarehouseManagerRole> {
        const { permission_ids, ...roleData } = dto;
        const role = await this.warehouseManagerRoleRepository.createRole(roleData);

        if (permission_ids && permission_ids.length > 0) {
            await this.warehouseManagerRoleRepository.assignPermissionsToRole(role.id, permission_ids);
        }

        const newRole = await this.warehouseManagerRoleRepository.findRoleById(role.id);
        if (!newRole) {
            throw new Error('Failed to retrieve created role');
        }
        return newRole;
    }

    async findAllRoles(query: any): Promise<IPaginatedResponse<WarehouseManagerRole>> {
        return this.warehouseManagerRoleRepository.findAllRoles(query);
    }

    async findRoleById(id: string, lang: string): Promise<WarehouseManagerRole> {
        const role = await this.warehouseManagerRoleRepository.findRoleById(id);
        if (!role) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.role_not_found', { lang }));
        }
        return role;
    }

    async updateRole(id: string, dto: UpdateWarehouseManagerRoleDto, lang: string): Promise<WarehouseManagerRole> {
        const role = await this.warehouseManagerRoleRepository.findRoleById(id);
        if (!role) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.role_not_found', { lang }));
        }

        const { permission_ids, ...roleData } = dto;
        await this.warehouseManagerRoleRepository.updateRole(id, roleData);

        if (permission_ids) {
            await this.warehouseManagerRoleRepository.assignPermissionsToRole(id, permission_ids);
        }

        const updatedRole = await this.warehouseManagerRoleRepository.findRoleById(id);
        if (!updatedRole) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.role_not_found', { lang }));
        }
        return updatedRole;
    }

    async deleteRole(id: string, userId: string, lang: string): Promise<void> {
        const role = await this.warehouseManagerRoleRepository.findRoleById(id);
        if (!role) {
            throw new NotFoundException(await this.i18n.translate('warehouse_manager.errors.role_not_found', { lang }));
        }

        await this.warehouseManagerRoleRepository.softDeleteRole(id, userId);
    }

    async findAllPermissions(): Promise<WarehouseManagerPermission[]> {
        return this.warehouseManagerRoleRepository.findAllPermissions();
    }
}
