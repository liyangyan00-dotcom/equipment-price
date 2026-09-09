import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      service: "wpi-supplier-quote-portal",
      public: true,
      version: 1,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
