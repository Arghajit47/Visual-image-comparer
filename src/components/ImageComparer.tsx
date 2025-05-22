
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import resemble from "resemblejs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ImageIcon } from "lucide-react";

// Define the structure of the data object from Resemble.js at the module level
interface ResembleAnalysisData {
  misMatchPercentage: string;
  isSameDimensions: boolean;
  dimensionDifference: { width: number; height: number };
  getImageDataUrl?: () => string;
  analysisTime: number;
  error?: any; // Can be string or Error object or other types
}

export default function ImageComparer() {
  const [baseImageUrl, setBaseImageUrl] = useState<string>("");
  const [actualImageUrl, setActualImageUrl] = useState<string>("");

  const [displayBaseUrl, setDisplayBaseUrl] = useState<string | null>(null);
  const [displayActualUrl, setDisplayActualUrl] = useState<string | null>(null);
  const [diffImageUrl, setDiffImageUrl] = useState<string | null>(null);
  const [differencePercentage, setDifferencePercentage] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    setDiffImageUrl(null);
    setDifferencePercentage(null);
    setDisplayBaseUrl(baseImageUrl); // Display immediately
    setDisplayActualUrl(actualImageUrl); // Display immediately

    if (!baseImageUrl || !actualImageUrl) {
      setError("Please provide both base and actual image URLs.");
      setIsLoading(false);
      return;
    }

    try {
      // Validate URLs before attempting to use them
      new URL(baseImageUrl);
      new URL(actualImageUrl);
    } catch (_) {
      setError("Invalid URL format. Please enter valid URLs.");
      setIsLoading(false);
      return;
    }

    try {
      resemble.outputSettings({
        errorColor: { red: 255, green: 0, blue: 255 }, // Magenta for differences
        errorType: "flatMap",
        transparency: 0.3,
        largeImageThreshold: 0, // Process large images fully
        useCrossOrigin: true, // Important for loading external images
      });

      resemble(baseImageUrl)
        .compareTo(actualImageUrl)
        .onComplete(function(data: ResembleAnalysisData) {
          if (data.error) {
            console.warn("Resemble.js analysis error object (raw):", data.error); // Log the raw error

            let errorDetailString = String(data.error);
            // Clean up common noise like "[object Event]" or "[object ProgressEvent]" from the error string
            errorDetailString = errorDetailString.replace(/\.?\s*\[object Event\]$/i, '').trim();
            errorDetailString = errorDetailString.replace(/\.?\s*\[object ProgressEvent\]$/i, '').trim();

            let userFriendlyMessage = `Image comparison failed. Resemble.js reported: "${errorDetailString}".`;
            const lowerErrorDetail = errorDetailString.toLowerCase();

            if (lowerErrorDetail.includes("failed to load") ||
                lowerErrorDetail.includes("networkerror") ||
                lowerErrorDetail.includes("cors") ||
                lowerErrorDetail.includes("img not loaded")) {
              userFriendlyMessage = `Failed to load one of the images for comparison. This can happen if:
1. The URL is not a direct link to an image file (e.g., it's a webpage displaying the image).
2. The image server has CORS restrictions preventing access from other websites.
3. There's a network issue, or the URL is invalid or inaccessible.
Please verify the URLs and ensure they point directly to image files. (Details: ${errorDetailString})`;
            }
            
            setError(userFriendlyMessage);
            setIsLoading(false);
            return;
          }

          const mismatch = parseFloat(data.misMatchPercentage);
          setDifferencePercentage(mismatch);

          if (mismatch > 0 && data.getImageDataUrl) {
            setDiffImageUrl(data.getImageDataUrl());
          } else {
            setDiffImageUrl(null); // No diff image if no mismatch or error
          }
          setIsLoading(false);
        });
    } catch (e: unknown) {
      console.error("Error during comparison setup or execution:", e);
      let specificErrorMessage: string | null = null;

      if (e instanceof Error) {
        const lowerCaseMessage = e.message.toLowerCase();
        if (lowerCaseMessage.includes("cors")) {
          specificErrorMessage = "CORS error: Cannot load images. Ensure the remote servers allow cross-origin requests (CORS headers). You might need to use a CORS proxy.";
        } else if (lowerCaseMessage.includes("failed to fetch") || (e instanceof TypeError && lowerCaseMessage.includes("networkerror"))) {
          specificErrorMessage = "Network error or invalid image URL. Please check the URLs and your internet connection.";
        } else {
          specificErrorMessage = `Comparison error: ${e.message}`;
        }
      } else {
        const errorString = String(e).toLowerCase();
        if (errorString.includes("cors")) {
          specificErrorMessage = "CORS error: Cannot load images. Check server CORS policy.";
        }
      }
      
      setError(specificErrorMessage || "Failed to compare images. An unknown error occurred.");
      setIsLoading(false);
    }
  }; // Explicit semicolon for function expression assignment

  useEffect(() => {
    const baseChanged = displayBaseUrl !== null && baseImageUrl !== displayBaseUrl;
    const actualChanged = displayActualUrl !== null && actualImageUrl !== displayActualUrl;
    const urlsHaveChanged = baseChanged || actualChanged;

    if (urlsHaveChanged) {
        setDiffImageUrl(null);
        setDifferencePercentage(null);
    }
  }, [baseImageUrl, actualImageUrl, displayBaseUrl, displayActualUrl]); // Explicit semicolon for function expression assignment

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label htmlFor="baseImageUrl" className="text-sm font-medium">Base Image URL</Label>
            <Input
              id="baseImageUrl"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={baseImageUrl}
              onChange={(e) => setBaseImageUrl(e.target.value)}
              className="mt-1"
              aria-label="Base Image URL"
            />
          </div>
          <div>
            <Label htmlFor="actualImageUrl" className="text-sm font-medium">Actual Image URL</Label>
            <Input
              id="actualImageUrl"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={actualImageUrl}
              onChange={(e) => setActualImageUrl(e.target.value)}
              className="mt-1"
              aria-label="Actual Image URL"
            />
          </div>
        </div>
        <Button onClick={handleCompare} disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Comparing...
            </>
          ) : "Compare Images"}
        </Button>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-8 transition-opacity duration-300 ease-in-out">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription><pre className="whitespace-pre-wrap">{error}</pre></AlertDescription>
        </Alert>
      )}

      {(displayBaseUrl || displayActualUrl || diffImageUrl || differencePercentage !== null) && !isLoading && !error && (
        <div className="mb-8 text-center transition-opacity duration-300 ease-in-out">
            {differencePercentage !== null && (
                <p className="text-2xl font-semibold mb-1">
                Difference: <span className="text-accent">{differencePercentage.toFixed(2)}%</span>
                </p>
            )}
            {differencePercentage === 0 && <p className="text-lg text-muted-foreground">Images are identical.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle>Base Image</CardTitle>
          </CardHeader>
          <CardContent className="aspect-[4/3] relative bg-muted rounded-b-lg overflow-hidden">
            {displayBaseUrl ? (
              <Image 
                src={displayBaseUrl} 
                alt="Base" 
                fill 
                style={{ objectFit: 'contain' }} 
                className="rounded-b-lg" 
                data-ai-hint="abstract photo" 
                onError={() => { setError(`Failed to load base image from ${displayBaseUrl}. Check URL and CORS policy.`); setDisplayBaseUrl(null);}}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="w-16 h-16 opacity-50" aria-hidden="true" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle>Actual Image</CardTitle>
          </CardHeader>
          <CardContent className="aspect-[4/3] relative bg-muted rounded-b-lg overflow-hidden">
            {displayActualUrl ? (
              <Image 
                src={displayActualUrl} 
                alt="Actual" 
                fill 
                style={{ objectFit: 'contain' }} 
                className="rounded-b-lg" 
                data-ai-hint="abstract pattern" 
                onError={() => { setError(`Failed to load actual image from ${displayActualUrl}. Check URL and CORS policy.`); setDisplayActualUrl(null);}}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="w-16 h-16 opacity-50" aria-hidden="true" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`shadow-md transition-all duration-500 ease-in-out ${diffImageUrl || (isLoading && !error && (displayBaseUrl && displayActualUrl)) ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <CardHeader>
            <CardTitle>Difference</CardTitle>
          </CardHeader>
          <CardContent className="aspect-[4/3] relative bg-muted rounded-b-lg overflow-hidden">
            {diffImageUrl ? (
              <Image 
                src={diffImageUrl} 
                alt="Difference" 
                fill 
                style={{ objectFit: 'contain' }} 
                className="rounded-b-lg"
                data-ai-hint="colorful difference"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                 {isLoading && !error && (displayBaseUrl && displayActualUrl) ? <p className="text-sm">Generating diff...</p> : <ImageIcon className="w-16 h-16 opacity-50" aria-hidden="true" />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
