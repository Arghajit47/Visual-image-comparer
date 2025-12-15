
import { type NextRequest, NextResponse } from 'next/server';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

interface CompareImagesRequestBody {
  baseImageSource?: string;
  actualImageSource?: string;
  threshold?: number;
  options?: {
    // Pixelmatch comparison options
    pixelmatch?: {
      threshold?: number;        // Color difference threshold (0-1), default: 0.1
      includeAA?: boolean;       // Include anti-aliasing, default: false
      alpha?: number;            // Blending factor of unchanged pixels (0-1), default: 0.1
      aaColor?: [number, number, number]; // Anti-aliasing color RGB, default: [255, 255, 0]
      diffColor?: [number, number, number]; // Diff color RGB, default: [255, 0, 0]
      diffColorAlt?: [number, number, number]; // Alternative diff color, default: null
      diffMask?: boolean;        // Draw only diff, not entire image, default: false
    };
    
    // Image preprocessing options
    resize?: {
      enabled?: boolean;         // Auto-resize to match dimensions, default: true
      strategy?: 'fit' | 'fill' | 'cover' | 'contain' | 'inside' | 'outside'; // Resize strategy, default: 'fill'
      width?: number;            // Force specific width
      height?: number;           // Force specific height
      maintainAspectRatio?: boolean; // Keep aspect ratio, default: true
    };
    
    // Image quality options
    quality?: {
      jpeg?: number;             // JPEG quality 1-100, default: 90
      png?: number;              // PNG compression 0-9, default: 6
      webp?: number;             // WebP quality 1-100, default: 80
    };
    
    // Color space options
    colorSpace?: {
      convert?: 'srgb' | 'rgb16' | 'cmyk' | 'lab' | 'b-w'; // Color space conversion
      grayscale?: boolean;       // Convert to grayscale before comparison
      normalize?: boolean;       // Normalize colors, default: false
    };
    
    // Output options
    output?: {
      format?: 'png' | 'jpeg' | 'webp'; // Diff image format, default: 'png'
      includeOriginals?: boolean; // Include original images in response, default: false
      includeDiffBounds?: boolean; // Include bounding box of differences, default: false
      includeMetadata?: boolean;  // Include image metadata, default: false
    };
    
    // Performance options
    performance?: {
      maxDimension?: number;     // Max width/height (resize if larger), default: 4096
      timeout?: number;          // Processing timeout in ms, default: 30000
      earlyExit?: boolean;       // Stop at first diff if threshold exceeded, default: false
    };
    
    // Ignore options
    ignore?: {
      antialiasing?: boolean;    // Ignore anti-aliased pixels, default: false
      regions?: Array<{          // Ignore specific regions
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      colors?: Array<string>;    // Ignore specific colors (hex), default: []
    };
  };
}

interface CompareImagesResponseBody {
  differencePercentage: number | null;
  status: 'Passed' | 'Failed' | null;
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

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function base64ToBuffer(dataUri: string): Promise<Buffer> {
  if (dataUri.startsWith('data:')) {
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid data URI format: missing base64 data');
    }
    const cleanBase64 = base64Data.trim().replace(/\s/g, '');
    return Buffer.from(cleanBase64, 'base64');
  }
  const response = await fetch(dataUri);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
    throw new Error(`Failed to decode image: ${error.message}. Supported formats: PNG, JPEG, WebP, GIF, AVIF, TIFF, SVG.`);
  }
}

async function resizeToMatch(buffer: Buffer, targetWidth: number, targetHeight: number): Promise<ImageData> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(targetWidth, targetHeight, { fit: 'fill' })
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
  try {

    const body = (await request.json()) as CompareImagesRequestBody;
    const { baseImageSource, actualImageSource, threshold = 0, options } = body;

    if (!baseImageSource || !actualImageSource) {
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: 'Both baseImageSource and actualImageSource are required.',
        } as CompareImagesResponseBody,
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
        return NextResponse.json(
          {
            differencePercentage: null,
            status: null,
            diffImageUrl: null,
            error: 'Invalid threshold value. Must be a number between 0 and 100.',
          } as CompareImagesResponseBody,
          { status: 400, headers: corsHeaders }
        );
    }

    const baseBuffer = await base64ToBuffer(baseImageSource);
    const actualBuffer = await base64ToBuffer(actualImageSource);

    const startTime = Date.now();
    
    let img1 = await decodeImage(baseBuffer);
    let img2 = await decodeImage(actualBuffer);

    const originalDimensions = {
      base: { width: img1.width, height: img1.height },
      actual: { width: img2.width, height: img2.height },
    };

    const resizeEnabled = options?.resize?.enabled ?? true;
    if (resizeEnabled && (img1.width !== img2.width || img1.height !== img2.height)) {
      console.log(`Dimension mismatch: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}. Auto-resizing...`);
      
      const targetWidth = options?.resize?.width || Math.max(img1.width, img2.width);
      const targetHeight = options?.resize?.height || Math.max(img1.height, img2.height);
      
      if (img1.width !== targetWidth || img1.height !== targetHeight) {
        img1 = await resizeToMatch(baseBuffer, targetWidth, targetHeight);
      }
      if (img2.width !== targetWidth || img2.height !== targetHeight) {
        img2 = await resizeToMatch(actualBuffer, targetWidth, targetHeight);
      }
    } else if (!resizeEnabled && (img1.width !== img2.width || img1.height !== img2.height)) {
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
      const outputFormat = options?.output?.format || 'png';
      const quality = options?.quality?.[outputFormat as keyof typeof options.quality] || (outputFormat === 'png' ? 6 : 90);
      
      let diffSharp = sharp(diffData, {
        raw: { width, height, channels: 4 },
      });
      
      if (outputFormat === 'jpeg') {
        diffSharp = diffSharp.jpeg({ quality: quality as number });
      } else if (outputFormat === 'webp') {
        diffSharp = diffSharp.webp({ quality: quality as number });
      } else {
        diffSharp = diffSharp.png({ compressionLevel: quality as number });
      }
      
      const diffBuffer = await diffSharp.toBuffer();
      const base64Diff = diffBuffer.toString('base64');
      diffImageUrl = `data:image/${outputFormat};base64,${base64Diff}`;
      
      if (options?.output?.includeDiffBounds) {
        diffBounds = calculateDiffBounds(diffData, width, height);
      }
    }
    
    const processingTime = Date.now() - startTime;

    const status = differencePercentage > threshold ? 'Failed' : 'Passed';

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
          algorithm: 'pixelmatch',
        },
      };
    }
    
    if (diffBounds) {
      response.diffBounds = diffBounds;
    }
    
    if (options?.output?.includeOriginals) {
      const origFormat = options?.output?.format || 'png';
      response.processedImages = {
        baseImageUrl: `data:image/${origFormat};base64,${baseBuffer.toString('base64')}`,
        actualImageUrl: `data:image/${origFormat};base64,${actualBuffer.toString('base64')}`,
      };
    }

    return NextResponse.json(response, { status: 200, headers: corsHeaders });

  } catch (e: unknown) {
    console.error('API error in /api/compare-images:', e);
    let errorMessage = 'An unexpected error occurred during image comparison.';
    
    if (e instanceof SyntaxError) {
        errorMessage = 'Invalid JSON payload provided.';
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    
    return NextResponse.json(
      {
        differencePercentage: null,
        status: null,
        diffImageUrl: null,
        error: errorMessage,
      } as CompareImagesResponseBody,
      { status: 500, headers: corsHeaders }
    );
  }
}
