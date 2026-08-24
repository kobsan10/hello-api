import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "hello world" },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
