import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: Barcode Lookup via Open Food Facts
 * Proxy endpoint to avoid CORS issues when calling external barcode APIs.
 *
 * GET /api/barcode-lookup?code=8934563012345
 *
 * Returns product info from global barcode database (Open Food Facts).
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json(
            { success: false, message: "Mã vạch không được để trống" },
            { status: 400 }
        );
    }

    // Validate barcode format (numeric, 8-14 digits for EAN/UPC)
    if (!/^\d{8,14}$/.test(code)) {
        return NextResponse.json(
            { success: false, message: "Mã vạch không hợp lệ (yêu cầu 8-14 chữ số)" },
            { status: 400 }
        );
    }

    try {
        // Open Food Facts API — free, no API key required
        const res = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,image_url,brands,categories,quantity`,
            {
                headers: { "User-Agent": "GenHub/1.0" },
                signal: AbortSignal.timeout(8000),
            }
        );

        if (res.status === 404) {
            return NextResponse.json({
                success: true,
                found: false,
                data: null,
                message: "Không tìm thấy sản phẩm trong cơ sở dữ liệu toàn cầu",
            });
        }

        if (!res.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Lỗi từ cơ sở dữ liệu mã vạch (HTTP ${res.status})`,
                },
                { status: 502 }
            );
        }

        const data = await res.json();

        if (data.status === 0 || !data.product) {
            return NextResponse.json({
                success: true,
                found: false,
                data: null,
                message: "Không tìm thấy sản phẩm trong cơ sở dữ liệu toàn cầu",
            });
        }

        const product = data.product;

        return NextResponse.json({
            success: true,
            found: true,
            data: {
                name: product.product_name || null,
                image_url: product.image_url || null,
                brand: product.brands || null,
                category: product.categories || null,
                quantity: product.quantity || null,
            },
        });
    } catch (error) {
        console.error("Barcode lookup error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Lỗi khi tra cứu mã vạch. Vui lòng thử lại.",
            },
            { status: 500 }
        );
    }
}
