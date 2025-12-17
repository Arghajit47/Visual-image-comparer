import { type NextRequest, NextResponse } from "next/server";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

interface CompareImagesRequestBody {
  baseImageSource?: string;
  actualImageSource?: string;
  threshold?: number;
  options?: {
    // Pixelmatch comparison options
    pixelmatch?: {
      threshold?: number; // Color difference threshold (0-1), default: 0.1
      includeAA?: boolean; // Include anti-aliasing, default: false
      alpha?: number; // Blending factor of unchanged pixels (0-1), default: 0.1
      aaColor?: [number, number, number]; // Anti-aliasing color RGB, default: [255, 255, 0]
      diffColor?: [number, number, number]; // Diff color RGB, default: [255, 0, 0]
      diffColorAlt?: [number, number, number]; // Alternative diff color, default: null
      diffMask?: boolean; // Draw only diff, not entire image, default: false
    };

    // Image preprocessing options
    resize?: {
      enabled?: boolean; // Auto-resize to match dimensions, default: true
      strategy?: "fit" | "fill" | "cover" | "contain" | "inside" | "outside"; // Resize strategy, default: 'fill'
      width?: number; // Force specific width
      height?: number; // Force specific height
      maintainAspectRatio?: boolean; // Keep aspect ratio, default: true
    };

    // Image quality options
    quality?: {
      jpeg?: number; // JPEG quality 1-100, default: 90
      png?: number; // PNG compression 0-9, default: 6
      webp?: number; // WebP quality 1-100, default: 80
    };

    // Color space options
    colorSpace?: {
      convert?: "srgb" | "rgb16" | "cmyk" | "lab" | "b-w"; // Color space conversion
      grayscale?: boolean; // Convert to grayscale before comparison
      normalize?: boolean; // Normalize colors, default: false
    };

    // Output options
    output?: {
      format?: "png" | "jpeg" | "webp"; // Diff image format, default: 'png'
      includeOriginals?: boolean; // Include original images in response, default: false
      includeDiffBounds?: boolean; // Include bounding box of differences, default: false
      includeMetadata?: boolean; // Include image metadata, default: false
    };

    // Performance options
    performance?: {
      maxDimension?: number; // Max width/height (resize if larger), default: 4096
      timeout?: number; // Processing timeout in ms, default: 30000
      earlyExit?: boolean; // Stop at first diff if threshold exceeded, default: false
    };

    // Ignore options
    ignore?: {
      antialiasing?: boolean; // Ignore anti-aliased pixels, default: false
      regions?: Array<{
        // Ignore specific regions
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      colors?: Array<string>; // Ignore specific colors (hex), default: []
    };
  };
}

interface CompareImagesResponseBody {
  differencePercentage: number | null;
  status: "Passed" | "Failed" | null;
  diffImageUrl: string | null;
  error: string | null;

  // Optional extended data
  metadata?: {
    baseImage?: {
      width: number;
      height: number;
      format?: string;
      size?: number;
    };
    actualImage?: {
      width: number;
      height: number;
      format?: string;
      size?: number;
    };
    comparison?: {
      totalPixels: number;
      diffPixels: number;
      processingTime: number;
      algorithm: string;
    };
  };

  diffBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };

  processedImages?: {
    baseImageUrl?: string;
    actualImageUrl?: string;
  };
}

const MAX_IMAGE_DATA_LENGTH = 6 * 1024 * 1024;
const MAX_REQUEST_SIZE = 6 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function base64ToBuffer(dataUri: string): Promise<Buffer> {
  if (dataUri.startsWith("data:")) {
    const base64Data = dataUri.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid data URI format: missing base64 data");
    }
    const cleanBase64 = base64Data.trim().replace(/\s/g, "");
    return Buffer.from(cleanBase64, "base64");
  }
  const response = await fetch(dataUri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function compressImageIfNeeded(dataUri: string): Promise<string> {
  const threshold = 3 * 1024 * 1024;
  
  if (dataUri.length <= threshold) {
    return dataUri;
  }
  
  console.log(`[API] Image size ${(dataUri.length / 1024 / 1024).toFixed(2)}MB > 3MB, compressing...`);
  
  const buffer = await base64ToBuffer(dataUri);
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  let compressed = image;
  let format = metadata.format || 'jpeg';
  
  if (format === 'jpeg' || format === 'jpg') {
    compressed = compressed.jpeg({ quality: 75, progressive: true });
  } else if (format === 'png') {
    compressed = compressed.png({ compressionLevel: 9, adaptiveFiltering: true });
  } else if (format === 'webp') {
    compressed = compressed.webp({ quality: 70 });
  } else {
    compressed = compressed.jpeg({ quality: 75 });
    format = 'jpeg';
  }
  
  let compressedBuffer = await compressed.toBuffer();
  let compressedSize = compressedBuffer.length;
  
  if (compressedSize > threshold) {
    console.log(`[API] Still ${(compressedSize / 1024 / 1024).toFixed(2)}MB after compression, resizing to 2048px...`);
    compressed = sharp(buffer).resize(2048, 2048, { fit: 'inside', withoutEnlargement: true });
    
    if (format === 'jpeg' || format === 'jpg') {
      compressed = compressed.jpeg({ quality: 75 });
    } else if (format === 'png') {
      compressed = compressed.png({ compressionLevel: 9 });
    } else if (format === 'webp') {
      compressed = compressed.webp({ quality: 70 });
    } else {
      compressed = compressed.jpeg({ quality: 75 });
    }
    
    compressedBuffer = await compressed.toBuffer();
    compressedSize = compressedBuffer.length;
  }
  
  if (compressedSize > threshold) {
    console.log(`[API] Still ${(compressedSize / 1024 / 1024).toFixed(2)}MB, resizing to 1024px...`);
    compressed = sharp(buffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
    
    if (format === 'jpeg' || format === 'jpg') {
      compressed = compressed.jpeg({ quality: 70 });
    } else if (format === 'png') {
      compressed = compressed.png({ compressionLevel: 9 });
    } else if (format === 'webp') {
      compressed = compressed.webp({ quality: 65 });
    } else {
      compressed = compressed.jpeg({ quality: 70 });
    }
    
    compressedBuffer = await compressed.toBuffer();
    compressedSize = compressedBuffer.length;
  }
  
  const base64Compressed = compressedBuffer.toString('base64');
  const newDataUri = `data:image/${format};base64,${base64Compressed}`;
  
  console.log(`[API] Compression complete: ${(dataUri.length / 1024 / 1024).toFixed(2)}MB → ${(newDataUri.length / 1024 / 1024).toFixed(2)}MB`);
  
  return newDataUri;
}

interface ImageData {
  data: Buffer;
  width: number;
  height: number;
}

async function decodeImage(buffer: Buffer): Promise<ImageData> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const { data, info } = await image
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      width: info.width,
      height: info.height,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to decode image: ${error.message}. Supported formats: PNG, JPEG, WebP, GIF, AVIF, TIFF, SVG.`
    );
  }
}

async function resizeToMatch(
  buffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<ImageData> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(targetWidth, targetHeight, { fit: "fill" })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      width: info.width,
      height: info.height,
    };
  } catch (error: any) {
    throw new Error(`Failed to resize image: ${error.message}`);
  }
}

function calculateDiffBounds(diffData: Buffer, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = diffData[idx];
      const g = diffData[idx + 1];
      const b = diffData[idx + 2];

      if (r > 0 || g > 0 || b > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export async function POST(request: NextRequest) {
  console.log('[API] Image comparison request received');
  
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      console.log('[API] Request too large:', contentLength, 'bytes (Netlify limit: 6MB)');
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: `Request size (${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB) exceeds Netlify's 6MB limit. Please use smaller images.`,
        } as CompareImagesResponseBody,
        { status: 413, headers: corsHeaders }
      );
    }
    
    const body = (await request.json()) as CompareImagesRequestBody;
    const { baseImageSource, actualImageSource, threshold = 0, options } = body;
    
    console.log('[API] Request parsed. Base image length:', baseImageSource?.length || 0, 'Actual image length:', actualImageSource?.length || 0);

    if (!baseImageSource || !actualImageSource) {
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: "Both baseImageSource and actualImageSource are required.",
        } as CompareImagesResponseBody,
        { status: 400, headers: corsHeaders }
      );
    }

    let processedBaseImage = baseImageSource;
    let processedActualImage = actualImageSource;
    
    if (baseImageSource.length > 3 * 1024 * 1024) {
      processedBaseImage = await compressImageIfNeeded(baseImageSource);
    }
    
    if (actualImageSource.length > 3 * 1024 * 1024) {
      processedActualImage = await compressImageIfNeeded(actualImageSource);
    }
    
    if (processedBaseImage.length > MAX_IMAGE_DATA_LENGTH || processedActualImage.length > MAX_IMAGE_DATA_LENGTH) {
      const largerSize = Math.max(processedBaseImage.length, processedActualImage.length);
      console.log('[API] Image data still too large after compression:', (largerSize / 1024 / 1024).toFixed(2), 'MB');
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: `Images are too large (${(largerSize / 1024 / 1024).toFixed(2)}MB) even after automatic compression. Netlify has a 6MB limit. Please use smaller images.`,
        } as CompareImagesResponseBody,
        { status: 413, headers: corsHeaders }
      );
    }

    if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: "Invalid threshold value. Must be a number between 0 and 100.",
        } as CompareImagesResponseBody,
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('[API] Starting pixelmatch comparison...');

    const baseBuffer = await base64ToBuffer(processedBaseImage);
    const actualBuffer = await base64ToBuffer(processedActualImage);

    const startTime = Date.now();

    let img1 = await decodeImage(baseBuffer);
    let img2 = await decodeImage(actualBuffer);

    const originalDimensions = {
      base: { width: img1.width, height: img1.height },
      actual: { width: img2.width, height: img2.height },
    };

    const resizeEnabled = options?.resize?.enabled ?? true;
    if (
      resizeEnabled &&
      (img1.width !== img2.width || img1.height !== img2.height)
    ) {
      console.log(
        `Dimension mismatch: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}. Auto-resizing...`
      );

      const targetWidth =
        options?.resize?.width || Math.max(img1.width, img2.width);
      const targetHeight =
        options?.resize?.height || Math.max(img1.height, img2.height);

      if (img1.width !== targetWidth || img1.height !== targetHeight) {
        img1 = await resizeToMatch(baseBuffer, targetWidth, targetHeight);
      }
      if (img2.width !== targetWidth || img2.height !== targetHeight) {
        img2 = await resizeToMatch(actualBuffer, targetWidth, targetHeight);
      }
    } else if (
      !resizeEnabled &&
      (img1.width !== img2.width || img1.height !== img2.height)
    ) {
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: `Image dimensions don't match: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}. Enable resize option to auto-resize.`,
        } as CompareImagesResponseBody,
        { status: 400, headers: corsHeaders }
      );
    }

    const { width, height } = img1;
    const diffData = Buffer.alloc(width * height * 4);

    const pixelmatchOptions: any = {
      threshold: options?.pixelmatch?.threshold ?? 0.1,
      includeAA: options?.pixelmatch?.includeAA ?? false,
    };

    if (options?.pixelmatch?.alpha !== undefined) {
      pixelmatchOptions.alpha = options.pixelmatch.alpha;
    }
    if (options?.pixelmatch?.aaColor) {
      pixelmatchOptions.aaColor = options.pixelmatch.aaColor;
    }
    if (options?.pixelmatch?.diffColor) {
      pixelmatchOptions.diffColor = options.pixelmatch.diffColor;
    }
    if (options?.pixelmatch?.diffColorAlt) {
      pixelmatchOptions.diffColorAlt = options.pixelmatch.diffColorAlt;
    }
    if (options?.pixelmatch?.diffMask !== undefined) {
      pixelmatchOptions.diffMask = options.pixelmatch.diffMask;
    }

    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diffData,
      width,
      height,
      pixelmatchOptions
    );

    const totalPixels = width * height;
    const differencePercentage = (numDiffPixels / totalPixels) * 100;

    let diffImageUrl: string | null = null;
    let diffBounds: any = null;

    if (numDiffPixels > 0) {
      const outputFormat = options?.output?.format || "png";
      const quality =
        options?.quality?.[outputFormat as keyof typeof options.quality] ||
        (outputFormat === "png" ? 6 : 90);

      let diffSharp = sharp(diffData, {
        raw: { width, height, channels: 4 },
      });

      if (outputFormat === "jpeg") {
        diffSharp = diffSharp.jpeg({ quality: quality as number });
      } else if (outputFormat === "webp") {
        diffSharp = diffSharp.webp({ quality: quality as number });
      } else {
        diffSharp = diffSharp.png({ compressionLevel: quality as number });
      }

      const diffBuffer = await diffSharp.toBuffer();
      const base64Diff = diffBuffer.toString("base64");
      diffImageUrl = `data:image/${outputFormat};base64,${base64Diff}`;

      if (options?.output?.includeDiffBounds) {
        diffBounds = calculateDiffBounds(diffData, width, height);
      }
    }

    const processingTime = Date.now() - startTime;

    const status = differencePercentage > threshold ? "Failed" : "Passed";

    const response: CompareImagesResponseBody = {
      differencePercentage,
      status,
      diffImageUrl,
      error: null,
    };

    if (options?.output?.includeMetadata) {
      response.metadata = {
        baseImage: {
          width: originalDimensions.base.width,
          height: originalDimensions.base.height,
          size: baseBuffer.length,
        },
        actualImage: {
          width: originalDimensions.actual.width,
          height: originalDimensions.actual.height,
          size: actualBuffer.length,
        },
        comparison: {
          totalPixels,
          diffPixels: numDiffPixels,
          processingTime,
          algorithm: "pixelmatch",
        },
      };
    }

    if (diffBounds) {
      response.diffBounds = diffBounds;
    }

    if (options?.output?.includeOriginals) {
      const origFormat = options?.output?.format || "png";
      response.processedImages = {
        baseImageUrl: `data:image/${origFormat};base64,${baseBuffer.toString(
          "base64"
        )}`,
        actualImageUrl: `data:image/${origFormat};base64,${actualBuffer.toString(
          "base64"
        )}`,
      };
    }

    console.log('[API] Comparison successful. Difference:', response.differencePercentage, '%');
    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    console.error('[API] Error in /api/compare-images:', e);
    let errorMessage = "An unexpected error occurred during image comparison.";
    let statusCode = 500;

    if (e instanceof SyntaxError) {
      errorMessage = "Invalid JSON payload provided.";
      statusCode = 400;
    } else if (e instanceof Error) {
      const errorMsgLower = e.message.toLowerCase();
      
      if (errorMsgLower.includes('body') || errorMsgLower.includes('payload') || 
          errorMsgLower.includes('size') || errorMsgLower.includes('too large') ||
          errorMsgLower.includes('entity too large')) {
        errorMessage = 'Request payload too large. Image data exceeds 6MB Netlify limit. Please use smaller images.';
        statusCode = 413;
      } else if (errorMsgLower.includes('timeout') || errorMsgLower.includes('timed out')) {
        errorMessage = 'Request timed out. Images might be too large to process. Please try smaller images.';
        statusCode = 504;
      } else if (errorMsgLower.includes('memory') || errorMsgLower.includes('heap')) {
        errorMessage = 'Server ran out of memory processing images. Please use smaller images.';
        statusCode = 500;
      } else if (errorMsgLower.includes('decode') || errorMsgLower.includes('invalid image')) {
        errorMessage = `Invalid image format: ${e.message}`;
        statusCode = 400;
      } else {
        errorMessage = e.message;
      }
    }

    return NextResponse.json(
      {
        differencePercentage: null,
        status: null,
        diffImageUrl: null,
        error: errorMessage,
      } as CompareImagesResponseBody,
      { status: statusCode, headers: corsHeaders }
    );
  }
}
