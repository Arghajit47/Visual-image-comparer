
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import Image from "next/image";
import resemble from "resemblejs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ImageIcon, FileImage, Link as LinkIcon, Filter, Download } from "lucide-react";

// Define the structure of the data object from Resemble.js at the module level
interface ResembleAnalysisData {
  misMatchPercentage: string;
  isSameDimensions: boolean;
  dimensionDifference: { width: number; height: number };
  getImageDataUrl?: () => string;
  analysisTime: number;
  error?: any;
}

export default function ImageComparer() {
  const [baseImageUrl, setBaseImageUrl] = useState<string>("");
  const [actualImageUrl, setActualImageUrl] = useState<string>("");
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [actualImageFile, setActualImageFile] = useState<File | null>(null);

  const [displayBaseUrl, setDisplayBaseUrl] = useState<string | null>(null);
  const [displayActualUrl, setDisplayActualUrl] = useState<string | null>(null);
  const [diffImageUrl, setDiffImageUrl] = useState<string | null>(null);
  const [differencePercentage, setDifferencePercentage] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleBaseFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBaseImageFile(file);
      setBaseImageUrl(""); // Clear URL if file is selected
    } else {
      setBaseImageFile(null);
    }
  };

  const handleActualFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setActualImageFile(file);
      setActualImageUrl(""); // Clear URL if file is selected
    } else {
      setActualImageFile(null);
    }
  };

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    setDiffImageUrl(null);
    setDifferencePercentage(null);

    let sourceBase: string | Buffer | null = null;
    let sourceActual: string | Buffer | null = null;

    try {
      if (baseImageFile) {
        sourceBase = await readFileAsDataURL(baseImageFile);
      } else if (baseImageUrl) {
        new URL(baseImageUrl); // Validate URL format
        sourceBase = baseImageUrl;
      }

      if (actualImageFile) {
        sourceActual = await readFileAsDataURL(actualImageFile);
      } else if (actualImageUrl) {
        new URL(actualImageUrl); // Validate URL format
        sourceActual = actualImageUrl;
      }

      if (!sourceBase || !sourceActual) {
        setError("Please provide sources for both base and actual images (URL or file).");
        setIsLoading(false);
        return;
      }

      setDisplayBaseUrl(sourceBase as string);
      setDisplayActualUrl(sourceActual as string);

      resemble.outputSettings({
        errorColor: { red: 255, green: 0, blue: 255 }, // Pink for differences
        errorType: "flatMap",
        transparency: 0.3,
        largeImageThreshold: 0, // Process large images without downscaling
        useCrossOrigin: true, // Important for URL-based images on client-side
      });

      resemble(sourceBase)
        .compareTo(sourceActual)
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
Please verify the URLs/files and ensure they point directly to image files. (Details: ${errorDetailString})`;
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
            setDiffImageUrl(null);
          }
          setIsLoading(false);
        });
    } catch (e: unknown) {
      console.error("Error during comparison setup or execution:", e);
      let specificErrorMessage: string | null = null;

      if (e instanceof Error) {
          if (e.message.toLowerCase().includes("invalid url")) {
              specificErrorMessage = "Invalid URL format. Please ensure URLs start with http:// or https://.";
          } else if (e.message.toLowerCase().includes("cors")) {
            specificErrorMessage = "CORS error: Cannot load images from the provided URLs. Ensure the remote servers allow cross-origin requests. You might need to use a CORS proxy or try uploading the files directly.";
          } else if (e.message.toLowerCase().includes("failed to fetch") || (e instanceof TypeError && e.message.toLowerCase().includes("networkerror"))) {
            specificErrorMessage = "Network error or invalid image URL. Please check the URLs and your internet connection.";
          } else {
            specificErrorMessage = `Comparison error: ${e.message}`;
          }
      } else {
        const errorString = String(e).toLowerCase();
        if (errorString.includes("cors")){ // Fallback for non-Error objects that might still indicate CORS
            specificErrorMessage = "CORS error: Cannot load images. Check server CORS policy.";
        }
      }
      
      setError(specificErrorMessage || "Failed to compare images. An unknown error occurred. Please check the console for more details.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const baseSourceIsFile = !!baseImageFile;
    const actualSourceIsFile = !!actualImageFile;

    // Condition to check if inputs have changed in a way that requires resetting diff results
    let resetNeeded = false;
    if (baseSourceIsFile) {
      // If base is now a file, but displayBaseUrl is still an old URL (not a data URI) or null
      if (displayBaseUrl && !displayBaseUrl.startsWith('data:')) resetNeeded = true;
    } else {
      // If base is now a URL, and it's different from what's displayed (and display isn't a data URI)
      if (displayBaseUrl && displayBaseUrl !== baseImageUrl && !displayBaseUrl.startsWith('data:')) resetNeeded = true;
    }

    if (actualSourceIsFile) {
       // If actual is now a file, but displayActualUrl is still an old URL (not a data URI) or null
      if (displayActualUrl && !displayActualUrl.startsWith('data:')) resetNeeded = true;
    } else {
      // If actual is now a URL, and it's different from what's displayed (and display isn't a data URI)
      if (displayActualUrl && displayActualUrl !== actualImageUrl && !displayActualUrl.startsWith('data:')) resetNeeded = true;
    }
    
    // More direct check: if the source URL/file changes, reset
    if (baseImageUrl !== (displayBaseUrl && !displayBaseUrl.startsWith('data:') ? displayBaseUrl : '') && !baseImageFile) resetNeeded = true;
    if (actualImageUrl !== (displayActualUrl && !displayActualUrl.startsWith('data:') ? displayActualUrl : '') && !actualImageFile) resetNeeded = true;
    if (baseImageFile && (!displayBaseUrl || !displayBaseUrl.startsWith('data:'))) resetNeeded = true;
    if (actualImageFile && (!displayActualUrl || !displayActualUrl.startsWith('data:'))) resetNeeded = true;


    if (resetNeeded) {
        setDiffImageUrl(null);
        setDifferencePercentage(null);
        // Optionally reset display URLs if they are not from current valid sources
        // This part is tricky, as we want to keep displaying uploaded files until new ones are chosen
    }
  }, [baseImageUrl, actualImageUrl, baseImageFile, actualImageFile]);


  const handleDownloadDiffImage = () => {
    if (diffImageUrl) {
      const link = document.createElement('a');
      link.href = diffImageUrl;
      link.download = 'diff-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 mb-6">
          
          <div className="space-y-4">
            <Label htmlFor="baseImageUrl" className="text-sm font-medium flex items-center"><LinkIcon className="mr-2 h-4 w-4" />Base Image URL</Label>
            <Input
              id="baseImageUrl"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={baseImageUrl}
              onChange={(e) => { setBaseImageUrl(e.target.value); if(e.target.value) setBaseImageFile(null);}}
              className="mt-1"
              aria-label="Base Image URL"
              disabled={!!baseImageFile}
            />
            <div className="text-center my-2 text-sm text-muted-foreground">OR</div>
            <Label htmlFor="baseImageFile" className="text-sm font-medium flex items-center"><FileImage className="mr-2 h-4 w-4" />Upload Base Image</Label>
            <Input
              id="baseImageFile"
              type="file"
              accept="image/*"
              onChange={handleBaseFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-label="Upload Base Image"
            />
            {baseImageFile && <p className="text-xs text-muted-foreground mt-1">Selected: {baseImageFile.name}</p>}
          </div>

          
          <div className="space-y-4">
            <Label htmlFor="actualImageUrl" className="text-sm font-medium flex items-center"><LinkIcon className="mr-2 h-4 w-4" />Actual Image URL</Label>
            <Input
              id="actualImageUrl"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={actualImageUrl}
              onChange={(e) => {setActualImageUrl(e.target.value); if(e.target.value) setActualImageFile(null);}}
              className="mt-1"
              aria-label="Actual Image URL"
              disabled={!!actualImageFile}
            />
             <div className="text-center my-2 text-sm text-muted-foreground">OR</div>
            <Label htmlFor="actualImageFile" className="text-sm font-medium flex items-center"><FileImage className="mr-2 h-4 w-4" />Upload Actual Image</Label>
            <Input
              id="actualImageFile"
              type="file"
              accept="image/*"
              onChange={handleActualFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-label="Upload Actual Image"
            />
            {actualImageFile && <p className="text-xs text-muted-foreground mt-1">Selected: {actualImageFile.name}</p>}
          </div>
        </div>

        <div className="space-y-4 my-6">
            <Label htmlFor="differenceThreshold" className="text-sm font-medium flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Difference Threshold (%) (Optional)
            </Label>
            <Input
            id="differenceThreshold"
            type="number"
            placeholder="0.00 (default)"
            step="0.01"
            min="0"
            max="100"
            value={threshold.toString()} // Keep as string for controlled input, parse on use or change
            onChange={(e) => {
                const val = e.target.value;
                // Allow empty input for temporary state, default to 0 if blurred empty
                // Or parse directly:
                let numVal = parseFloat(val);
                if (isNaN(numVal) || numVal < 0) numVal = 0;
                if (numVal > 100) numVal = 100;
                setThreshold(numVal);
            }}
            className="mt-1"
            aria-label="Difference Threshold Percentage"
            />
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

      {(differencePercentage !== null) && !isLoading && !error && (
        <div className="mb-8 text-center transition-opacity duration-300 ease-in-out">
            <p className="text-2xl font-semibold mb-1">
            Difference: <span className="text-accent">{differencePercentage.toFixed(2)}%</span>
            </p>
            <p className="text-sm text-muted-foreground mb-2">
                (Current Threshold: {threshold.toFixed(2)}%)
            </p>
            {differencePercentage > threshold ? (
              <p className="text-lg text-destructive font-semibold mt-1">
                Status: Failed
              </p>
            ) : (
              <p className="text-lg text-success font-semibold mt-1">
                Status: Passed
              </p>
            )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle>Base Image</CardTitle>
          </CardHeader>
          <CardContent className="min-h-60 relative bg-muted rounded-b-lg overflow-hidden p-0">
            {displayBaseUrl ? (
              <Image 
                src={displayBaseUrl} 
                alt="Base" 
                width={0}
                height={0}
                sizes="(max-width: 767px) 100vw, 33vw"
                style={{ width: '100%', height: 'auto', objectFit: 'contain', color: 'transparent' }} 
                className="rounded-b-lg" 
                data-ai-hint="abstract photo" 
                onError={() => { setError(`Failed to load base image. If using a URL, check URL and CORS policy. If uploaded, the file might be corrupted.`); setDisplayBaseUrl(null);}}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground" aria-hidden="true">
                <ImageIcon className="w-16 h-16 opacity-50" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle>Actual Image</CardTitle>
          </CardHeader>
          <CardContent className="min-h-60 relative bg-muted rounded-b-lg overflow-hidden p-0">
            {displayActualUrl ? (
              <Image 
                src={displayActualUrl} 
                alt="Actual" 
                width={0}
                height={0}
                sizes="(max-width: 767px) 100vw, 33vw"
                style={{ width: '100%', height: 'auto', objectFit: 'contain', color: 'transparent' }} 
                className="rounded-b-lg" 
                data-ai-hint="abstract pattern" 
                onError={() => { setError(`Failed to load actual image. If using a URL, check URL and CORS policy. If uploaded, the file might be corrupted.`); setDisplayActualUrl(null);}}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground" aria-hidden="true">
                <ImageIcon className="w-16 h-16 opacity-50" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`shadow-md transition-all duration-500 ease-in-out ${diffImageUrl || (isLoading && !error && (displayBaseUrl && displayActualUrl)) ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <CardHeader>
            <CardTitle>Difference</CardTitle>
          </CardHeader>
          <CardContent className="min-h-60 relative bg-muted rounded-b-lg overflow-hidden p-0">
            {diffImageUrl ? (
              <Image 
                src={diffImageUrl} 
                alt="Difference" 
                width={0}
                height={0}
                sizes="(max-width: 767px) 100vw, 33vw"
                style={{ width: '100%', height: 'auto', objectFit: 'contain', color: 'transparent' }} 
                className="rounded-b-lg"
                data-ai-hint="colorful difference"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground" aria-hidden="true">
                 {isLoading && !error && (displayBaseUrl && displayActualUrl) ? <p className="text-sm">Generating diff...</p> : <ImageIcon className="w-16 h-16 opacity-50" />}
              </div>
            )}
          </CardContent>
          {diffImageUrl && (
            <CardFooter className="pt-4 justify-center">
              <Button onClick={handleDownloadDiffImage} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Diff
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
