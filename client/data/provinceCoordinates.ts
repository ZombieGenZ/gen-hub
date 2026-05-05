export const PROVINCE_COORDS: Record<string, { lat: number; lng: number; zoom: number }> = {
    'Hồ Chí Minh': { lat: 10.7769, lng: 106.7009, zoom: 11 },
    'Thành phố Hồ Chí Minh': { lat: 10.7769, lng: 106.7009, zoom: 11 },
    'Hà Nội': { lat: 21.0285, lng: 105.8542, zoom: 11 },
    'Thành phố Hà Nội': { lat: 21.0285, lng: 105.8542, zoom: 11 },
    'Đà Nẵng': { lat: 16.0544, lng: 108.2022, zoom: 12 },
    'Thành phố Đà Nẵng': { lat: 16.0544, lng: 108.2022, zoom: 12 },
    'Bình Dương': { lat: 11.1667, lng: 106.6667, zoom: 11 },
    'Đồng Nai': { lat: 10.9333, lng: 107.0000, zoom: 11 },
    'Long An': { lat: 10.5333, lng: 106.4000, zoom: 11 },
    'Hải Phòng': { lat: 20.8449, lng: 106.6881, zoom: 11 },
    'Thành phố Hải Phòng': { lat: 20.8449, lng: 106.6881, zoom: 11 },
    'Bắc Ninh': { lat: 21.1861, lng: 106.0763, zoom: 12 },
    'Hưng Yên': { lat: 20.8500, lng: 106.0500, zoom: 12 },
    'Hải Dương': { lat: 20.9400, lng: 106.3197, zoom: 11 },
    'Thái Nguyên': { lat: 21.5942, lng: 105.8442, zoom: 11 },
    'Vĩnh Phúc': { lat: 21.3094, lng: 105.6022, zoom: 11 },
    'Cần Thơ': { lat: 10.0452, lng: 105.7469, zoom: 11 },
    'Thành phố Cần Thơ': { lat: 10.0452, lng: 105.7469, zoom: 11 },
    'Bà Rịa - Vũng Tàu': { lat: 10.5500, lng: 107.2333, zoom: 11 },
    'Tây Ninh': { lat: 11.3667, lng: 106.1000, zoom: 11 },
    'Bình Phước': { lat: 11.7500, lng: 106.9000, zoom: 10 },
    'Quảng Ninh': { lat: 21.0000, lng: 107.3333, zoom: 10 },
    'Hà Nam': { lat: 20.5333, lng: 105.9500, zoom: 12 },
    'Nam Định': { lat: 20.4333, lng: 106.1667, zoom: 11 },
    'Bắc Giang': { lat: 21.2731, lng: 106.1946, zoom: 11 },
};

export function getProvinceCoords(provinceName: string | null) {
    if (!provinceName) return null;
    
    // Normalize string: remove accents, lowercase, remove dashes and spaces
    const normalize = (str: string) => 
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
           .replace(/đ/g, 'd').replace(/Đ/g, 'D')
           .toLowerCase().replace(/[\s-]/g, '');

    const normalizedTarget = normalize(provinceName);

    const key = Object.keys(PROVINCE_COORDS).find(
        (k) => {
            const normK = normalize(k);
            return normalizedTarget.includes(normK) || normK.includes(normalizedTarget);
        }
    );
    return key ? PROVINCE_COORDS[key] : null;
}
