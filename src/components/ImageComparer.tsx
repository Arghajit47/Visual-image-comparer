
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

// Define the structure of the data object from Resemble.js
interface ResembleAnalysisData {
  misMatchPercentage: string;
  isSameDimensions: boolean;
  dimensionDifference: { width: number; height: number };
  getImageDataUrl?: () => string; // Optional because it might not exist if images are identical or error
  analysisTime: number;
  error?: any;
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
    setDisplayBaseUrl(baseImageUrl);
    setDisplayActualUrl(actualImageUrl);

    if (!baseImageUrl || !actualImageUrl) {
      setError("Please provide both base and actual image URLs.");
      setIsLoading(false);
      return;
    }

    try {
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
        largeImageThreshold: 0,
        useCrossOrigin: true,
      });

      resemble(baseImageUrl)
        .compareTo(actualImageUrl)
        .onComplete((data: ResembleAnalysisData) => {
          if (data.error) {
            console.error("Resemble.js error:", data.error);
            setError(`Error analyzing images: ${String(data.error)}. This could be due to CORS issues or invalid image URLs.`);
            setIsLoading(false);
            return;
          }

          const mismatch = parseFloat(data.misMatchPercentage);
          setDifferencePercentage(mismatch);

          if (mismatch > 0 && data.getImageDataUrl) {
            setDiffImageUrl(data.getImageDataUrl());
          } else {
            setDiffImageUrl(null);
          }
          setIsLoading(false);
        });
    } catch (e) {
      console.error("Error during comparison setup:", e);
      let errorMessage = "Failed to compare images.";
      if (e instanceof Error) {
        errorMessage += ` ${e.message}`;
      }
      if (String(e).toLowerCase().includes("cors") || (e instanceof Error && e.message.toLowerCase().includes("cors"))) {
        errorMessage = "CORS error: Cannot load images from the provided URLs. Ensure the remote servers allow cross-origin requests (CORS headers). You might need to use a CORS proxy if you don't control the image servers.";
      } else if (e instanceof TypeError && e.message.includes("fetch")) {
         errorMessage = "Network error or invalid image URL. Please check the URLs and your internet connection.";
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const baseChanged = displayBaseUrl !== null && baseImageUrl !== displayBaseUrl;
    const actualChanged = displayActualUrl !== null && actualImageUrl !== displayActualUrl;
    const urlsHaveChanged = baseChanged || actualChanged;

    if (urlsHaveChanged) {
        setDiffImageUrl(null);
        setDifferencePercentage(null);
    }
  }, [baseImageUrl, actualImageUrl, displayBaseUrl, displayActualUrl]);

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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(displayBaseUrl || displayActualUrl || diffImageUrl || differencePercentage !== null) && !isLoading && !error && (
        <div className="mb-8 text-center transition-opacity duration-300 ease-in-out">
            {differencePercentage !== null && (
                <p className="text-2xl font-semibold mb-1">
                Difference: <span className="text-accent">{differencePercentage.toFixed(2)}%</span>
                </p>
                 {differencePercentage === 0 && <p className="text-lg text-muted-foreground">Images are identical.</p>}
            )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle>Base Image</CardTitle>
          </CardHeader>
          <CardContent className="aspect-[4/3] relative bg-muted rounded-b-lg overflow-hidden">
            {displayBaseUrl ? (
              <Image src={displayBaseUrl} alt="Base" fill style={{ objectFit: 'contain' }} className="rounded-b-lg" data-ai-hint="abstract photo" onError={() => { setError(`Failed to load base image from ${displayBaseUrl}. Check URL and CORS policy.`); setDisplayBaseUrl(null);}}/>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="w-16 h-16 opacity-50" />
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
              <Image src={displayActualUrl} alt="Actual" fill style={{ objectFit: 'contain' }} className="rounded-b-lg" data-ai-hint="abstract pattern" onError={() => { setError(`Failed to load actual image from ${displayActualUrl}. Check URL and CORS policy.`); setDisplayActualUrl(null);}}/>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="w-16 h-16 opacity-50" />
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
              <Image src={diffImageUrl} alt="Difference" fill style={{ objectFit: 'contain' }} className="rounded-b-lg" data-ai-hint="colorful difference"/>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                 {isLoading && !error && (displayBaseUrl && displayActualUrl) ? <p className="text-sm">Generating diff...</p> : <ImageIcon className="w-16 h-16 opacity-50" />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
