
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
    organization: {
        ttl: {
            item: parseInt(process.env.REDIS_ORGANIZATION_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ORGANIZATION_LIST_CACHE_TTL ?? '60', 10),
            member: parseInt(process.env.REDIS_ORGANIZATION_MEMBER_CACHE_TTL ?? '300', 10),
        },
        keys: {
            item: process.env.REDIS_ORGANIZATION_KEY_PREFIX || 'organization',
            list: process.env.REDIS_ORGANIZATION_LIST_KEY_PREFIX || 'organization:list',
            member: process.env.REDIS_ORGANIZATION_MEMBER_KEY_PREFIX || 'organization:member',
        },
    },
    organizationRole: {
        ttl: {
            item: parseInt(process.env.REDIS_ORG_ROLE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ORG_ROLE_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_ORG_ROLE_KEY_PREFIX || 'org:role',
            list: process.env.REDIS_ORG_ROLE_LIST_KEY_PREFIX || 'org:role:list',
            permissions: process.env.REDIS_ORG_ROLE_PERMISSIONS_KEY_PREFIX || 'org:role:perms',
        },
    },
    organizationApiKey: {
        ttl: {
            item: parseInt(process.env.REDIS_ORG_API_KEY_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ORG_API_KEY_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_ORG_API_KEY_KEY_PREFIX || 'org:apikey',
            list: process.env.REDIS_ORG_API_KEY_LIST_KEY_PREFIX || 'org:apikey:list',
        },
    },
    organizationUpdateRequest: {
        ttl: {
            item: parseInt(process.env.REDIS_ORG_UPDATE_REQUEST_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ORG_UPDATE_REQUEST_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_ORG_UPDATE_REQUEST_KEY_PREFIX || 'org:update-request',
            list: process.env.REDIS_ORG_UPDATE_REQUEST_LIST_KEY_PREFIX || 'org:update-request:list',
        },
    },
    adminApiKey: {
        ttl: {
            item: parseInt(process.env.REDIS_ADMIN_API_KEY_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ADMIN_API_KEY_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_ADMIN_API_KEY_KEY_PREFIX || 'admin:apikey',
            list: process.env.REDIS_ADMIN_API_KEY_LIST_KEY_PREFIX || 'admin:apikey:list',
        },
    },
    orgChat: {
        ttl: {
            item: parseInt(process.env.REDIS_ORG_CHAT_CACHE_TTL ?? '300', 10),
            message: parseInt(process.env.REDIS_ORG_CHAT_MESSAGE_CACHE_TTL ?? '60', 10),
            call: parseInt(process.env.REDIS_ORG_CHAT_CALL_CACHE_TTL ?? '300', 10),
        },
        keys: {
            item: process.env.REDIS_ORG_CHAT_KEY_PREFIX || 'org:chat',
            message: process.env.REDIS_ORG_CHAT_MESSAGE_KEY_PREFIX || 'org:chat:msg',
            call: process.env.REDIS_ORG_CHAT_CALL_KEY_PREFIX || 'org:chat:call',
        },
    },
    // Article Module
    article: {
        ttl: {
            item: parseInt(process.env.REDIS_ARTICLE_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_ARTICLE_LIST_CACHE_TTL ?? '60', 10),
            emoji: parseInt(process.env.REDIS_ARTICLE_EMOJI_CACHE_TTL ?? '3600', 10),
            comment: parseInt(process.env.REDIS_ARTICLE_COMMENT_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_ARTICLE_KEY_PREFIX || 'article',
            list: process.env.REDIS_ARTICLE_LIST_KEY_PREFIX || 'article:list',
            public: process.env.REDIS_ARTICLE_PUBLIC_KEY_PREFIX || 'article:public',
            emoji: process.env.REDIS_ARTICLE_EMOJI_KEY_PREFIX || 'article:emoji',
            comment: process.env.REDIS_ARTICLE_COMMENT_KEY_PREFIX || 'article:comment',
        },
    },
    // Category Module
    category: {
        ttl: {
            item: parseInt(process.env.REDIS_CATEGORY_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_CATEGORY_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_CATEGORY_KEY_PREFIX || 'category',
            list: process.env.REDIS_CATEGORY_LIST_KEY_PREFIX || 'category:list',
            active: process.env.REDIS_CATEGORY_ACTIVE_KEY_PREFIX || 'category:active',
        },
    },
    // Contact Module
    contact: {
        ttl: {
            item: parseInt(process.env.REDIS_CONTACT_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_CONTACT_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_CONTACT_KEY_PREFIX || 'contact',
            detail: process.env.REDIS_CONTACT_DETAIL_KEY_PREFIX || 'contact:detail',
            staff: process.env.REDIS_CONTACT_STAFF_KEY_PREFIX || 'contact:staff',
            priority: process.env.REDIS_CONTACT_PRIORITY_KEY_PREFIX || 'contact:priority',
            normal: process.env.REDIS_CONTACT_NORMAL_KEY_PREFIX || 'contact:normal',
            skipped: process.env.REDIS_CONTACT_SKIPPED_KEY_PREFIX || 'contact:skipped',
        },
    },
    // Contact List Module (Blacklist/Whitelist)
    contactList: {
        ttl: {
            item: parseInt(process.env.REDIS_CONTACT_LIST_CACHE_TTL ?? '3600', 10),
            list: parseInt(process.env.REDIS_CONTACT_LIST_LIST_CACHE_TTL ?? '300', 10),
        },
        keys: {
            item: process.env.REDIS_CONTACT_LIST_ENTRY_KEY_PREFIX || 'contact-list',
            list: process.env.REDIS_CONTACT_LIST_ENTRY_LIST_KEY_PREFIX || 'contact-list:list',
            email: process.env.REDIS_CONTACT_LIST_ENTRY_EMAIL_KEY_PREFIX || 'contact-list:email',
            ip: process.env.REDIS_CONTACT_LIST_ENTRY_IP_KEY_PREFIX || 'contact-list:ip',
        },
    },
    // Contact Tag Module
    contactTag: {
        ttl: {
            item: parseInt(process.env.REDIS_CONTACT_TAG_CACHE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_CONTACT_TAG_LIST_CACHE_TTL ?? '60', 10),
        },
        keys: {
            item: process.env.REDIS_CONTACT_TAG_KEY_PREFIX || 'contact-tag',
            list: process.env.REDIS_CONTACT_TAG_LIST_KEY_PREFIX || 'contact-tag:list',
            active: process.env.REDIS_CONTACT_TAG_ACTIVE_KEY_PREFIX || 'contact-tag:active',
        },
    },
    // App Download Module
    appDownload: {
        ttl: {
            share: parseInt(process.env.REDIS_APP_DOWNLOAD_SHARE_TTL ?? '300', 10),
            list: parseInt(process.env.REDIS_APP_DOWNLOAD_LIST_TTL ?? '60', 10),
        },
        keys: {
            share: process.env.REDIS_APP_DOWNLOAD_SHARE_KEY_PREFIX || 'app-download:share',
            list: process.env.REDIS_APP_DOWNLOAD_LIST_KEY_PREFIX || 'app-download:list',
        },
    },
    // Inventory Request Module
    inventoryRequest: {
        ttl: {
            inboundList: parseInt(process.env.REDIS_INBOUND_LIST_TTL ?? '60', 10),
            outboundList: parseInt(process.env.REDIS_OUTBOUND_LIST_TTL ?? '60', 10),
            inboundDetail: parseInt(process.env.REDIS_INBOUND_DETAIL_TTL ?? '120', 10),
            outboundDetail: parseInt(process.env.REDIS_OUTBOUND_DETAIL_TTL ?? '120', 10),
        },
        keys: {
            inbound: process.env.REDIS_INBOUND_KEY_PREFIX || 'inventory:inbound',
            outbound: process.env.REDIS_OUTBOUND_KEY_PREFIX || 'inventory:outbound',
        },
    },
}));
