
import { type NextRequest, NextResponse } from 'next/server';
import resemble from 'resemblejs';

// Define the structure of the data object from Resemble.js
// Note: In Resemble.js, misMatchPercentage in the callback is typically a number.
interface ResembleAnalysisData {
  rawMisMatchPercentage?: number; // resemblejs often provides this as a number
  misMatchPercentage: number | string; // Accept string for wider compatibility, parse to number
  isSameDimensions: boolean;
  dimensionDifference: { width: number; height: number };
  getImageDataUrl?: () => string;
  analysisTime?: number;
  error?: any;
}

interface CompareImagesRequestBody {
  baseImageSource?: string;
  actualImageSource?: string;
  threshold?: number;
}

interface CompareImagesResponseBody {
  differencePercentage: number | null;
  status: 'Passed' | 'Failed' | null;
  diffImageUrl: string | null;
  error: string | null;
}

// Configure Resemble.js output settings globally for this API route
resemble.outputSettings({
  errorColor: { red: 255, green: 0, blue: 255 }, // Pink for differences
  errorType: 'flatMap', // Show differences as flat areas
  transparency: 0.3,
  largeImageThreshold: 0, // Process large images without downscaling
  // useCrossOrigin: true, // Not applicable for server-side URL fetching like this
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CompareImagesRequestBody;
    const { baseImageSource, actualImageSource, threshold = 0 } = body;

    if (!baseImageSource || !actualImageSource) {
      return NextResponse.json(
        {
          differencePercentage: null,
          status: null,
          diffImageUrl: null,
          error: 'Both baseImageSource and actualImageSource are required.',
        } as CompareImagesResponseBody,
        { status: 400 }
      );
    }

    // Validate threshold
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
        return NextResponse.json(
          {
            differencePercentage: null,
            status: null,
            diffImageUrl: null,
            error: 'Invalid threshold value. Must be a number between 0 and 100.',
          } as CompareImagesResponseBody,
          { status: 400 }
        );
    }

    const comparisonResult = await new Promise<CompareImagesResponseBody>((resolve) => {
      resemble(baseImageSource)
        .compareTo(actualImageSource)
        .onComplete(function (data: ResembleAnalysisData) {
          if (data.error) {
            console.error('Resemble.js analysis error (API):', data.error);
            let errorDetailString = String(data.error);
            errorDetailString = errorDetailString.replace(/\.?\s*\[object Event\]$/i, '').trim();
            errorDetailString = errorDetailString.replace(/\.?\s*\[object ProgressEvent\]$/i, '').trim();
            
            let userFriendlyMessage = `Image comparison failed. Resemble.js reported: "${errorDetailString}".`;
            const lowerErrorDetail = errorDetailString.toLowerCase();

            if (lowerErrorDetail.includes("failed to load") || 
                lowerErrorDetail.includes("networkerror") || 
                lowerErrorDetail.includes("cors") || 
                lowerErrorDetail.includes("img not loaded") ||
                lowerErrorDetail.includes("could not be found") || // For server-side file not found
                lowerErrorDetail.includes("enoent")) {
              userFriendlyMessage = `Failed to load one of the images for comparison. Ensure URLs are publicly accessible or data URIs are valid. (Details: ${errorDetailString})`;
            }

            resolve({
              differencePercentage: null,
              status: null,
              diffImageUrl: null,
              error: userFriendlyMessage,
            });
            return;
          }

          const mismatch = typeof data.misMatchPercentage === 'string' 
                            ? parseFloat(data.misMatchPercentage) 
                            : data.misMatchPercentage;
          
          const numericMismatch = Number(mismatch); // Ensure it's a number

          if (isNaN(numericMismatch)) {
            resolve({
              differencePercentage: null,
              status: null,
              diffImageUrl: null,
              error: 'Resemble.js returned a non-numeric mismatch percentage.',
            });
            return;
          }

          const status = numericMismatch > threshold ? 'Failed' : 'Passed';
          let diffImage: string | null = null;
          if (numericMismatch > 0 && data.getImageDataUrl) {
            diffImage = data.getImageDataUrl();
          }

          resolve({
            differencePercentage: numericMismatch,
            status,
            diffImageUrl: diffImage,
            error: null,
          });
        });
    });

    if (comparisonResult.error) {
        // If Resemble.js itself had an error (e.g. image load failure),
        // it might be a client error (bad URL) or server misconfiguration
        return NextResponse.json(comparisonResult, { status: comparisonResult.error.startsWith("Failed to load") ? 400 : 500 });
    }
    return NextResponse.json(comparisonResult, { status: 200 });

  } catch (e: unknown) {
    console.error('API error in /api/compare-images:', e);
    let errorMessage = 'An unexpected error occurred during image comparison.';
    if (e instanceof SyntaxError) {
        errorMessage = 'Invalid JSON payload provided.';
        return NextResponse.json({ error: errorMessage } as CompareImagesResponseBody, { status: 400 });
    } else if (e instanceof Error) {
        // Specific check for canvas/system library issues
        if (e.message.toLowerCase().includes('canvas') || e.message.toLowerCase().includes('.so')) {
            errorMessage = `Server-side image processing error: ${e.message}. This might be due to missing system dependencies for the 'canvas' library on the server.`;
            return NextResponse.json({ error: errorMessage } as CompareImagesResponseBody, { status: 500 });
        }
        errorMessage = e.message;
    }
    
    return NextResponse.json(
      {
        differencePercentage: null,
        status: null,
        diffImageUrl: null,
        error: errorMessage,
      } as CompareImagesResponseBody,
      { status: 500 }
    );
  }
}
