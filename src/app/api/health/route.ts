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
  let sharpAvailable = false;
  let sharpError = null;
  let sharpVersion = null;

  try {
    const sharp = require("sharp");
    sharpAvailable = true;
    sharpVersion = sharp.versions?.sharp || 'unknown';
  } catch (error: any) {
    sharpError = error.message;
  }

  return NextResponse.json({
    status: "ok",
    message: "Image comparison API health check",
    timestamp: new Date().toISOString(),
    environment: "Netlify Serverless Function",
    imageProcessing: {
      library: "sharp",
      available: sharpAvailable,
      version: sharpVersion,
      error: sharpError,
      supportedFormats: ["PNG", "JPEG", "WebP", "GIF", "AVIF", "TIFF", "SVG"],
    },
    comparison: {
      library: "pixelmatch",
      algorithm: "pixel-by-pixel",
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }, {
    headers: corsHeaders,
  });
}
