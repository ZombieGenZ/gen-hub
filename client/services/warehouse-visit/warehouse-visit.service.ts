const API = process.env.NEXT_PUBLIC_API_URL;

export type VisitPurpose = 'RENTAL_INQUIRY' | 'INSPECTION';
export type VisitStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface CreateVisitBookingRequest {
    warehouse_template_id: string;
    visitor_name: string;
    visitor_email: string;
    visitor_phone: string;
    visit_date: string; // YYYY-MM-DD
    visit_time_start: string; // HH:mm
    visit_time_end: string; // HH:mm
    purpose?: VisitPurpose;
    number_of_visitors?: number;
}

export interface WarehouseVisitBooking {
    id: string;
    warehouse_template_id: string;
    visitor_name: string;
    visitor_email: string;
    visitor_phone: string;
    visit_date: string;
    visit_time_start: string;
    visit_time_end: string;
    purpose?: VisitPurpose;
    number_of_visitors?: number;
    status: VisitStatus;
    confirmation_notes?: string;
    cancel_reason?: string;
    visitor_feedback?: string;
    created_at: string;
    updated_at: string;
}

export interface UpdateVisitStatusRequest {
    status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    confirmation_notes?: string;
    cancel_reason?: string;
    visitor_feedback?: string;
}

export interface RescheduleVisitRequest {
    visit_date: string;
    visit_time_start: string;
    visit_time_end: string;
    reason?: string;
}

export class WarehouseVisitService {
    /**
     * Create a new warehouse visit booking
     * @param token Access token
     * @param request Visit booking data
     * @returns Created booking
     */
    async createBooking(token: string, request: CreateVisitBookingRequest): Promise<WarehouseVisitBooking> {
        const response = await fetch(`${API}/warehouse-visit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create visit booking');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Get list of visit bookings
     * @param token Access token
     * @param params Filter parameters
     * @returns List of bookings
     */
    async getBookings(token: string, params: {
        page?: number;
        limit?: number;
        status?: VisitStatus;
        date?: string;
    } = {}): Promise<{ data: WarehouseVisitBooking[]; total: number }> {
        const query = new URLSearchParams();

        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.status) query.append('status', params.status);
        if (params.date) query.append('date', params.date);

        const response = await fetch(`${API}/warehouse-visit?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch visit bookings');
        }

        const result = await response.json();
        return result;
    }

    /**
     * Get visit booking details
     * @param token Access token
     * @param id Booking ID
     * @returns Booking details
     */
    async getBookingById(token: string, id: string): Promise<WarehouseVisitBooking> {
        const response = await fetch(`${API}/warehouse-visit/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch visit booking details');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Update visit booking status
     * @param token Access token
     * @param id Booking ID
     * @param request Status update data
     * @returns Updated booking
     */
    async updateStatus(token: string, id: string, request: UpdateVisitStatusRequest): Promise<WarehouseVisitBooking> {
        const response = await fetch(`${API}/warehouse-visit/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update visit status');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Reschedule a visit booking
     * @param token Access token
     * @param id Booking ID
     * @param request Reschedule data
     * @returns Updated booking
     */
    async reschedule(token: string, id: string, request: RescheduleVisitRequest): Promise<WarehouseVisitBooking> {
        const response = await fetch(`${API}/warehouse-visit/${id}/reschedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to reschedule visit');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Delete/cancel a visit booking
     * @param token Access token
     * @param id Booking ID
     */
    async deleteBooking(token: string, id: string): Promise<void> {
        const response = await fetch(`${API}/warehouse-visit/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete visit booking');
        }
    }
}

export const warehouseVisitService = new WarehouseVisitService();
