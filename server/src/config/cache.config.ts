
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
}));
