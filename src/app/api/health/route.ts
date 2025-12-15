import { NextResponse } from "next/server";

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  let canvasAvailable = false;
  let canvasError = null;

  try {
    require("resemblejs");
    canvasAvailable = true;
  } catch (error: any) {
    canvasError = error.message;
  }

  return NextResponse.json({
    status: "ok",
    message: "Image comparison API health check",
    timestamp: new Date().toISOString(),
    canvas: {
      available: canvasAvailable,
      error: canvasError,
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }, {
    headers: corsHeaders,
  });
}
