const API = process.env.NEXT_PUBLIC_API_URL

export class LocationService {
    async getProvinces() {
        const response = await fetch(`${API}/api/v1/locations/provinces`)
        return response.json()
    }

    async getWards(province_id: string) {
        const response = await fetch(`${API}/api/v1/locations/wards?province_id=${province_id}`)
        return response.json()
    }
}