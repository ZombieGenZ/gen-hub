import { NextRequest, NextResponse } from "next/server";

function isValidSwaggerUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const swaggerUrl = request.nextUrl.searchParams.get("url");

  if (!isValidSwaggerUrl(swaggerUrl)) {
    return NextResponse.json(
      {
        message: "URL api docs json không hợp lệ.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(swaggerUrl!, {
      cache: "no-store",
      headers: {
        Accept: "application/json, application/vnd.oai.openapi+json, */*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          message: `Không thể tải Swagger JSON. HTTP ${response.status}.`,
        },
        { status: response.status },
      );
    }

    const json = await response.json();
    return NextResponse.json(json, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối tới URL api docs json đã nhập.",
      },
      { status: 502 },
    );
  }
}
