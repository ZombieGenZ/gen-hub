
import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
    amenity: {
        ttl: parseInt(process.env.REDIS_AMENITY_CACHE_TTL ?? '300', 10),
        listTtl: parseInt(process.env.REDIS_AMENITY_LIST_CACHE_TTL ?? '60', 10),
        keyPrefix: process.env.REDIS_AMENITY_KEY_PREFIX || 'amenity',
        listKeyPrefix: process.env.REDIS_AMENITY_LIST_KEY_PREFIX || 'amenity:list',
        detailKeyPrefix: process.env.REDIS_AMENITY_DETAIL_KEY_PREFIX || 'amenity:detail',
    },
    addonType: {
        ttl: parseInt(process.env.REDIS_ADDON_TYPE_CACHE_TTL ?? '300', 10),
        listTtl: parseInt(process.env.REDIS_ADDON_TYPE_LIST_CACHE_TTL ?? '60', 10),
        keyPrefix: process.env.REDIS_ADDON_TYPE_KEY_PREFIX || 'addon-type',
        listKeyPrefix: process.env.REDIS_ADDON_TYPE_LIST_KEY_PREFIX || 'addon-type:list',
        detailKeyPrefix: process.env.REDIS_ADDON_TYPE_DETAIL_KEY_PREFIX || 'addon-type:detail',
        activeKeyPrefix: process.env.REDIS_ADDON_TYPE_ACTIVE_KEY_PREFIX || 'addon-type:active',
    },
    coupon: {
        ttl: {
            item: parseInt(process.env.REDIS_COUPON_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_COUPON_LIST_CACHE_TTL ?? '60', 10),
            page: parseInt(process.env.REDIS_COUPON_PAGE_CACHE_TTL ?? '600', 10),
        },
        keys: {
            item: process.env.REDIS_COUPON_KEY_PREFIX || 'coupon',
            list: process.env.REDIS_COUPON_LIST_KEY_PREFIX || 'coupon:list',
            page: process.env.REDIS_COUPON_PAGE_KEY_PREFIX || 'coupon:page',
        },
    },
    publicCoupon: {
        ttl: {
            item: parseInt(process.env.REDIS_PUBLIC_COUPON_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_PUBLIC_COUPON_LIST_CACHE_TTL ?? '60', 10),
            saved: parseInt(process.env.REDIS_PUBLIC_COUPON_SAVED_CACHE_TTL ?? '300', 10),
        },
        keys: {
            item: process.env.REDIS_PUBLIC_COUPON_KEY_PREFIX || 'coupon:public',
            list: process.env.REDIS_PUBLIC_COUPON_LIST_KEY_PREFIX || 'coupon:public:list',
            saved: process.env.REDIS_PUBLIC_COUPON_SAVED_KEY_PREFIX || 'coupon:public:saved',
        },
    },
    couponSchedule: {
        ttl: {
            item: parseInt(process.env.REDIS_COUPON_SCHEDULE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_COUPON_SCHEDULE_LIST_CACHE_TTL ?? '60', 10),
            page: parseInt(process.env.REDIS_COUPON_SCHEDULE_PAGE_CACHE_TTL ?? '600', 10),
        },
        keys: {
            item: process.env.REDIS_COUPON_SCHEDULE_KEY_PREFIX || 'coupon-schedule',
            list: process.env.REDIS_COUPON_SCHEDULE_LIST_KEY_PREFIX || 'coupon-schedule:list',
            page: process.env.REDIS_COUPON_SCHEDULE_PAGE_KEY_PREFIX || 'coupon-schedule:page',
        },
    },
    warehouseTemplate: {
        ttl: {
            item: parseInt(process.env.REDIS_WAREHOUSE_TEMPLATE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_WAREHOUSE_TEMPLATE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_WAREHOUSE_TEMPLATE_KEY_PREFIX || 'warehouse-template',
            list: process.env.REDIS_WAREHOUSE_TEMPLATE_LIST_KEY_PREFIX || 'warehouse-template:list',
        },
    },
    warehouseManager: {
        ttl: {
            item: parseInt(process.env.REDIS_WAREHOUSE_MANAGER_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_WAREHOUSE_MANAGER_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_WAREHOUSE_MANAGER_KEY_PREFIX || 'warehouse-manager',
            list: process.env.REDIS_WAREHOUSE_MANAGER_LIST_KEY_PREFIX || 'warehouse-manager:list',
        },
    },
    warehouseManagerRole: {
        ttl: {
            item: parseInt(process.env.REDIS_WAREHOUSE_MANAGER_ROLE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_WAREHOUSE_MANAGER_ROLE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_WAREHOUSE_MANAGER_ROLE_KEY_PREFIX || 'warehouse-manager-role',
            list: process.env.REDIS_WAREHOUSE_MANAGER_ROLE_LIST_KEY_PREFIX || 'warehouse-manager-role:list',
        },
    },
    warehouseVisit: {
        ttl: {
            item: parseInt(process.env.REDIS_WAREHOUSE_VISIT_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_WAREHOUSE_VISIT_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_WAREHOUSE_VISIT_KEY_PREFIX || 'warehouse-visit',
            list: process.env.REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX || 'warehouse-visit:list',
        },
    },
    rentalDurationTier: {
        ttl: {
            item: parseInt(process.env.REDIS_RENTAL_DURATION_TIER_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_RENTAL_DURATION_TIER_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_RENTAL_DURATION_TIER_KEY_PREFIX || 'rental-duration-tier',
            list: process.env.REDIS_RENTAL_DURATION_TIER_LIST_KEY_PREFIX || 'rental-duration-tier:list',
        },
    },
    rowTemplate: {
        ttl: {
            item: parseInt(process.env.REDIS_ROW_TEMPLATE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ROW_TEMPLATE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_ROW_TEMPLATE_KEY_PREFIX || 'row-template',
            list: process.env.REDIS_ROW_TEMPLATE_LIST_KEY_PREFIX || 'row-template:list',
        },
    },
    rackTemplate: {
        ttl: {
            item: parseInt(process.env.REDIS_RACK_TEMPLATE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_RACK_TEMPLATE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_RACK_TEMPLATE_KEY_PREFIX || 'rack-template',
            list: process.env.REDIS_RACK_TEMPLATE_LIST_KEY_PREFIX || 'rack-template:list',
        },
    },
    shelfTemplate: {
        ttl: {
            item: parseInt(process.env.REDIS_SHELF_TEMPLATE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_SHELF_TEMPLATE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_SHELF_TEMPLATE_KEY_PREFIX || 'shelf-template',
            list: process.env.REDIS_SHELF_TEMPLATE_LIST_KEY_PREFIX || 'shelf-template:list',
        },
    },
    blockTemplate: {
        ttl: {
            item: parseInt(process.env.REDIS_BLOCK_TEMPLATE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_BLOCK_TEMPLATE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_BLOCK_TEMPLATE_KEY_PREFIX || 'block-template',
            list: process.env.REDIS_BLOCK_TEMPLATE_LIST_KEY_PREFIX || 'block-template:list',
        },
    },
}));
