import { NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const AI_PLUGIN_API_KEY = process.env.AI_PLUGIN_API_KEY || process.env.COZE_PLUGIN_API_KEY || '';

export async function POST(request: Request) {
    if (!API) {
        return NextResponse.json(
            { message: 'API URL chưa được cấu hình.' },
            { status: 500 }
        );
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json(
            { message: 'Payload không hợp lệ.' },
            { status: 400 }
        );
    }

    const body = payload as Record<string, unknown>;

    if (!body.warehouse_id || !body.visitor_name || !body.visit_date || !body.visit_time_start) {
        return NextResponse.json(
            { message: 'Thiếu thông tin bắt buộc để đặt lịch.' },
            { status: 400 }
        );
    }

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (AI_PLUGIN_API_KEY) {
            headers['X-API-Key'] = AI_PLUGIN_API_KEY;
        }

        const response = await fetch(`${API}/ai-plugin/visit-booking`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { message: data?.message || 'Không thể tạo lịch hẹn.' },
                { status: response.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json(
            { message: 'Lỗi kết nối máy chủ. Vui lòng thử lại.' },
            { status: 502 }
        );
    }
}
