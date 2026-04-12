/**
 * Module Registry for API Key Swagger
 *
 * Đây là danh sách TẤT CẢ modules có khả năng hỗ trợ API Key.
 * Database (OrganizationPermission.allow_api_key) sẽ control ENABLE/DISABLE.
 *
 * Khi thêm module mới hỗ trợ API Key:
 * 1. Thêm vào registry này
 * 2. Seed permissions với allow_api_key = true
 * 3. Restart server
 */

import { WarehouseModule } from '../../modules/warehouse/warehouse.module';
import { ProductModule } from '../../modules/product/product.module';
import { BatchModule } from '../../modules/batch/batch.module';
import { PartnerModule } from '../../modules/partner/partner.module';
import { OrganizationModule } from '../../modules/organization/organization.module';
import { OrgNotificationModule } from '../../modules/org-notification/org-notification.module';
import { RentalContractModule } from '../../modules/rental-contract/rental-contract.module';

/**
 * Interface cho module registry entry
 */
export interface ApiKeyModuleEntry {
  /** Module class */

  module: any;
  /** Permission key prefixes that map to this module (e.g., ['product'] or ['organization.notification']) */
  permissionPrefixes: string[];
  /** Description for logging */
  description: string;
}

/**
 * Registry của tất cả modules hỗ trợ API key
 * Key: module name for logging
 * Value: module config
 */
export const API_KEY_MODULE_REGISTRY: Record<string, ApiKeyModuleEntry> = {
  warehouse: {
    module: WarehouseModule,
    permissionPrefixes: ['warehouse'],
    description: 'Warehouse management',
  },
  product: {
    module: ProductModule,
    permissionPrefixes: ['product'],
    description: 'Product management',
  },
  batch: {
    module: BatchModule,
    permissionPrefixes: ['batch'],
    description: 'Batch management',
  },
  partner: {
    module: PartnerModule,
    permissionPrefixes: ['partner'],
    description: 'Partner management',
  },
  organization: {
    module: OrganizationModule,
    permissionPrefixes: ['organization'],
    description: 'Organization management',
  },
  'org-notification': {
    module: OrgNotificationModule,
    permissionPrefixes: ['organization.notification'],
    description: 'Organization notifications',
  },
  'rental-contract': {
    module: RentalContractModule,
    permissionPrefixes: ['rental-contract'],
    description: 'Rental contract management',
  },
};

/**
 * Helper: Lấy modules cần include dựa trên permission keys từ database
 */
export function getApiKeyModules(permissionKeys: string[]): {
  modules: any[];
  enabledModuleNames: string[];
} {
  const modules: any[] = [];
  const enabledModuleNames: string[] = [];

  for (const [name, entry] of Object.entries(API_KEY_MODULE_REGISTRY)) {
    // Check if any permission matches this module's prefixes
    const hasMatchingPermission = permissionKeys.some((key) =>
      entry.permissionPrefixes.some((prefix) => key.startsWith(prefix)),
    );

    if (hasMatchingPermission) {
      modules.push(entry.module);
      enabledModuleNames.push(name);
    }
  }

  // Always include OrganizationModule for /organizations/permissions/api-key-enabled endpoint
  const orgModule = API_KEY_MODULE_REGISTRY.organization?.module;
  if (orgModule && !modules.includes(orgModule)) {
    modules.push(orgModule);
    enabledModuleNames.push('organization');
  }

  return { modules, enabledModuleNames };
}
