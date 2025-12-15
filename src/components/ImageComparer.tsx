
"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import resemble from "resemblejs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ImageIcon, FileImage, Link as LinkIcon, Filter, Download, Settings2, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define the structure of the data object from Resemble.js at the module level
interface ResembleAnalysisData {
  misMatchPercentage: number;
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

  const baseFileInputRef = useRef<HTMLInputElement>(null);
  const actualFileInputRef = useRef<HTMLInputElement>(null);

  const [displayBaseUrl, setDisplayBaseUrl] = useState<string | null>(null);
  const [displayActualUrl, setDisplayActualUrl] = useState<string | null>(null);
  const [diffImageUrl, setDiffImageUrl] = useState<string | null>(null);
  const [differencePercentage, setDifferencePercentage] = useState<
    number | null
  >(null);
  const [threshold, setThreshold] = useState<number>(0);

  const [errorColorRed, setErrorColorRed] = useState<number>(255);
  const [errorColorGreen, setErrorColorGreen] = useState<number>(0);
  const [errorColorBlue, setErrorColorBlue] = useState<number>(255);
  const [errorType, setErrorType] = useState<string>("flat");
  const [transparency, setTransparency] = useState<number>(0.3);
  const [largeImageThreshold, setLargeImageThreshold] = useState<number>(1200);
  const [useCrossOrigin, setUseCrossOrigin] = useState<boolean>(true);

  const [scaleToSameSize, setScaleToSameSize] = useState<boolean>(false);
  const [ignoreAntialiasing, setIgnoreAntialiasing] = useState<boolean>(false);
  const [ignoreColors, setIgnoreColors] = useState<boolean>(false);
  const [ignoreAlpha, setIgnoreAlpha] = useState<boolean>(false);
  const [returnEarlyThreshold, setReturnEarlyThreshold] = useState<number>(0);

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
        setError(
          "Please provide sources for both base and actual images (URL or file)."
        );
        setIsLoading(false);
        return;
      }

      setDisplayBaseUrl(sourceBase as string);
      setDisplayActualUrl(sourceActual as string);

      resemble.outputSettings({
        errorColor: {
          red: errorColorRed,
          green: errorColorGreen,
          blue: errorColorBlue,
        },
        errorType: errorType as any,
        transparency: transparency,
        largeImageThreshold: largeImageThreshold,
        useCrossOrigin: useCrossOrigin,
      });

      let comparison = resemble(sourceBase).compareTo(sourceActual);

      if (scaleToSameSize) {
        comparison = comparison.scaleToSameSize();
      }

      if (ignoreAntialiasing) {
        comparison = comparison.ignoreAntialiasing();
      }

      if (ignoreColors) {
        comparison = comparison.ignoreColors();
      }

      if (ignoreAlpha) {
        comparison = comparison.ignoreAlpha();
      }

      if (returnEarlyThreshold > 0) {
        comparison = comparison.setReturnEarlyThreshold(returnEarlyThreshold);
      }

      comparison.onComplete(function (data: ResembleAnalysisData) {
        if (data.error) {
          console.warn("Resemble.js analysis error object (raw):", data.error); // Log the raw error

          let errorDetailString = String(data.error);
          // Clean up common noise like "[object Event]" or "[object ProgressEvent]" from the error string
          errorDetailString = errorDetailString
            .replace(/\.?\s*\[object Event\]$/i, "")
            .trim();
          errorDetailString = errorDetailString
            .replace(/\.?\s*\[object ProgressEvent\]$/i, "")
            .trim();

          let userFriendlyMessage = `Image comparison failed. Resemble.js reported: "${errorDetailString}".`;
          const lowerErrorDetail = errorDetailString.toLowerCase();

          if (
            lowerErrorDetail.includes("failed to load") ||
            lowerErrorDetail.includes("networkerror") ||
            lowerErrorDetail.includes("cors") ||
            lowerErrorDetail.includes("img not loaded")
          ) {
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

        const mismatch =
          typeof data.misMatchPercentage === "string"
            ? parseFloat(data.misMatchPercentage)
            : data.misMatchPercentage;
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
          specificErrorMessage =
            "Invalid URL format. Please ensure URLs start with http:// or https://.";
        } else if (e.message.toLowerCase().includes("cors")) {
          specificErrorMessage =
            "CORS error: Cannot load images from the provided URLs. Ensure the remote servers allow cross-origin requests. You might need to use a CORS proxy or try uploading the files directly.";
        } else if (
          e.message.toLowerCase().includes("failed to fetch") ||
          (e instanceof TypeError &&
            e.message.toLowerCase().includes("networkerror"))
        ) {
          specificErrorMessage =
            "Network error or invalid image URL. Please check the URLs and your internet connection.";
        } else {
          specificErrorMessage = `Comparison error: ${e.message}`;
        }
      } else {
        const errorString = String(e).toLowerCase();
        if (errorString.includes("cors")) {
          // Fallback for non-Error objects that might still indicate CORS
          specificErrorMessage =
            "CORS error: Cannot load images. Check server CORS policy.";
        }
      }

      setError(
        specificErrorMessage ||
          "Failed to compare images. An unknown error occurred. Please check the console for more details."
      );
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
      if (displayBaseUrl && !displayBaseUrl.startsWith("data:"))
        resetNeeded = true;
    } else {
      // If base is now a URL, and it's different from what's displayed (and display isn't a data URI)
      if (
        displayBaseUrl &&
        displayBaseUrl !== baseImageUrl &&
        !displayBaseUrl.startsWith("data:")
      )
        resetNeeded = true;
    }

    if (actualSourceIsFile) {
      // If actual is now a file, but displayActualUrl is still an old URL (not a data URI) or null
      if (displayActualUrl && !displayActualUrl.startsWith("data:"))
        resetNeeded = true;
    } else {
      // If actual is now a URL, and it's different from what's displayed (and display isn't a data URI)
      if (
        displayActualUrl &&
        displayActualUrl !== actualImageUrl &&
        !displayActualUrl.startsWith("data:")
      )
        resetNeeded = true;
    }

    // More direct check: if the source URL/file changes, reset
    if (
      baseImageUrl !==
        (displayBaseUrl && !displayBaseUrl.startsWith("data:")
          ? displayBaseUrl
          : "") &&
      !baseImageFile
    )
      resetNeeded = true;
    if (
      actualImageUrl !==
        (displayActualUrl && !displayActualUrl.startsWith("data:")
          ? displayActualUrl
          : "") &&
      !actualImageFile
    )
      resetNeeded = true;
    if (
      baseImageFile &&
      (!displayBaseUrl || !displayBaseUrl.startsWith("data:"))
    )
      resetNeeded = true;
    if (
      actualImageFile &&
      (!displayActualUrl || !displayActualUrl.startsWith("data:"))
    )
      resetNeeded = true;

    if (resetNeeded) {
      setDiffImageUrl(null);
      setDifferencePercentage(null);
      // Optionally reset display URLs if they are not from current valid sources
      // This part is tricky, as we want to keep displaying uploaded files until new ones are chosen
    }
  }, [baseImageUrl, actualImageUrl, baseImageFile, actualImageFile]);

  const handleDownloadDiffImage = () => {
    if (diffImageUrl) {
      const date = Date.now();
      const link = document.createElement("a");
      link.href = diffImageUrl;
      link.download = `diff-image-${date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setBaseImageUrl("");
    setActualImageUrl("");
    setBaseImageFile(null);
    setActualImageFile(null);
    setDisplayBaseUrl(null);
    setDisplayActualUrl(null);
    setDiffImageUrl(null);
    setDifferencePercentage(null);
    setThreshold(0);

    setErrorColorRed(255);
    setErrorColorGreen(0);
    setErrorColorBlue(255);
    setErrorType("flat");
    setTransparency(0.3);
    setLargeImageThreshold(1200);
    setUseCrossOrigin(true);
    setScaleToSameSize(false);
    setIgnoreAntialiasing(false);
    setIgnoreColors(false);
    setIgnoreAlpha(false);
    setReturnEarlyThreshold(0);

    setIsLoading(false);
    setError(null);

    if (baseFileInputRef.current) {
      baseFileInputRef.current.value = "";
    }
    if (actualFileInputRef.current) {
      actualFileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 p-6 shadow-lg">
        <div className="grid grid-cols-1 grid-cols-3 md:grid-cols-2 gap-x-6 gap-y-8 mb-6">
          <div className="space-y-4">
            <Label
              htmlFor="baseImageUrl"
              className="text-sm font-medium flex items-center"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Base Image URL
            </Label>
            <Input
              id="baseImageUrl"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={baseImageUrl}
              onChange={(e) => {
                setBaseImageUrl(e.target.value);
                if (e.target.value) setBaseImageFile(null);
              }}
              className="mt-1"
              aria-label="Base Image URL"
              disabled={!!baseImageFile}
            />
            <div className="text-center my-2 text-sm text-muted-foreground">
              OR
            </div>
            <Label
              htmlFor="baseImageFile"
              className="text-sm font-medium flex items-center"
            >
              <FileImage className="mr-2 h-4 w-4" />
              Upload Base Image
            </Label>
            <Input
              id="baseImageFile"
              type="file"
              accept="image/*"
              onChange={handleBaseFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-label="Upload Base Image"
              ref={baseFileInputRef}
            />
            {baseImageFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {baseImageFile.name}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Label
              htmlFor="actualImageUrl"
              className="text-sm font-medium flex items-center"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Actual Image URL
            </Label>
            <Input
              id="actualImageUrl"
              type="url"
              placeholder="https://placehold.co/600x400.png"
              value={actualImageUrl}
              onChange={(e) => {
                setActualImageUrl(e.target.value);
                if (e.target.value) setActualImageFile(null);
              }}
              className="mt-1"
              aria-label="Actual Image URL"
              disabled={!!actualImageFile}
            />
            <div className="text-center my-2 text-sm text-muted-foreground">
              OR
            </div>
            <Label
              htmlFor="actualImageFile"
              className="text-sm font-medium flex items-center"
            >
              <FileImage className="mr-2 h-4 w-4" />
              Upload Actual Image
            </Label>
            <Input
              id="actualImageFile"
              type="file"
              accept="image/*"
              onChange={handleActualFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-label="Upload Actual Image"
              ref={actualFileInputRef}
            />
            {actualImageFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {actualImageFile.name}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4 my-6">
          <Label
            htmlFor="differenceThreshold"
            className="text-sm font-medium flex items-center"
          >
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

        <Accordion type="single" collapsible className="mb-6">
          <AccordionItem value="advanced">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center">
                <Settings2 className="mr-2 h-4 w-4" />
                Advanced Options
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
              <TooltipProvider>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Output Settings
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="errorColorRed" className="text-xs">
                        Error Color Red
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Red component (0-255) of the color used to highlight differences in the comparison image.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="errorColorRed"
                      type="number"
                      min="0"
                      max="255"
                      value={errorColorRed}
                      onChange={(e) =>
                        setErrorColorRed(
                          Math.min(
                            255,
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="errorColorGreen" className="text-xs">
                        Error Color Green
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Green component (0-255) of the color used to highlight differences in the comparison image.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="errorColorGreen"
                      type="number"
                      min="0"
                      max="255"
                      value={errorColorGreen}
                      onChange={(e) =>
                        setErrorColorGreen(
                          Math.min(
                            255,
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="errorColorBlue" className="text-xs">
                        Error Color Blue
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Blue component (0-255) of the color used to highlight differences in the comparison image.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="errorColorBlue"
                      type="number"
                      min="0"
                      max="255"
                      value={errorColorBlue}
                      onChange={(e) =>
                        setErrorColorBlue(
                          Math.min(
                            255,
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label htmlFor="errorType" className="text-xs">
                      Error Type
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Visual style for showing differences: Flat (solid color), Movement (shows pixel shifts), Intensity variations, or Diff Only (shows just the differences).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={errorType} onValueChange={setErrorType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="movement">Movement</SelectItem>
                      <SelectItem value="flatDifferenceIntensity">
                        Flat Difference Intensity
                      </SelectItem>
                      <SelectItem value="movementDifferenceIntensity">
                        Movement Difference Intensity
                      </SelectItem>
                      <SelectItem value="diffOnly">Diff Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label htmlFor="transparency" className="text-xs">
                      Transparency (0-1)
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>How see-through the difference highlights are. 0 = fully opaque, 1 = fully transparent.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="transparency"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={transparency}
                    onChange={(e) =>
                      setTransparency(
                        Math.min(
                          1,
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      )
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label htmlFor="largeImageThreshold" className="text-xs">
                      Large Image Threshold (px)
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Images larger than this size (in pixels) will skip some pixels for faster processing. Set to 0 to analyze all pixels (slower but more accurate).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="largeImageThreshold"
                    type="number"
                    min="0"
                    value={largeImageThreshold}
                    onChange={(e) =>
                      setLargeImageThreshold(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="mt-1"
                    placeholder="1200 (default), 0 to disable"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useCrossOrigin"
                    checked={useCrossOrigin}
                    onCheckedChange={(checked) =>
                      setUseCrossOrigin(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="useCrossOrigin"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Use Cross-Origin (Required for URL images)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Enable this when comparing images from URLs. Required for loading images from different websites. Disable only if using local data URIs.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Comparison Options
                </h4>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="scaleToSameSize"
                    checked={scaleToSameSize}
                    onCheckedChange={(checked) =>
                      setScaleToSameSize(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="scaleToSameSize"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Scale to Same Size
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Automatically resize the second image to match the dimensions of the first image before comparing. Useful when images are different sizes.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignoreAntialiasing"
                    checked={ignoreAntialiasing}
                    onCheckedChange={(checked) =>
                      setIgnoreAntialiasing(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="ignoreAntialiasing"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Ignore Antialiasing
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Ignore small smoothing differences around edges. Useful when comparing images with slightly different rendering quality or compression.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignoreColors"
                    checked={ignoreColors}
                    onCheckedChange={(checked) =>
                      setIgnoreColors(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="ignoreColors"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Ignore Colors
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Compare only the structure/shape, not colors. Useful when you only care about layout differences, not color changes.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignoreAlpha"
                    checked={ignoreAlpha}
                    onCheckedChange={(checked) =>
                      setIgnoreAlpha(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="ignoreAlpha"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Ignore Alpha Channel
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Ignore transparency differences. Useful when comparing images with different transparency levels but similar content.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label htmlFor="returnEarlyThreshold" className="text-xs">
                      Return Early Threshold (%)
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Stop comparing once this percentage of differences is found. Speeds up comparison when you only need to know if images differ significantly. 0 = disabled (full comparison).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="returnEarlyThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={returnEarlyThreshold}
                    onChange={(e) =>
                      setReturnEarlyThreshold(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="mt-1"
                    placeholder="0 (disabled)"
                  />
                </div>
              </div>
              </TooltipProvider>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-col md:flex-row gap-3">
          <Button
            onClick={handleCompare}
            disabled={isLoading}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              "Compare Images"
            )}
          </Button>
          <Button
            onClick={handleReset}
            disabled={isLoading}
            variant="outline"
            className="w-full md:w-auto"
          >
            Reset
          </Button>
        </div>
      </Card>

      {error && (
        <Alert
          variant="destructive"
          className="mb-8 transition-opacity duration-300 ease-in-out"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </AlertDescription>
        </Alert>
      )}

      {differencePercentage !== null && !isLoading && !error && (
        <div className="mb-8 text-center transition-opacity duration-300 ease-in-out">
          <p className="text-2xl font-semibold mb-1">
            Difference:{" "}
            <span className="text-accent">
              {differencePercentage.toFixed(2)}%
            </span>
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

      <div className="grid grid-cols-1 grid-cols-3 md: gap-6">
        <Card className="shadow-md transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle>Base Image</CardTitle>
          </CardHeader>
          <CardContent className="min-h-60 relative bg-muted rounded-b-lg overflow-hidden p-0">
            {displayBaseUrl ? (
              <img
                src={displayBaseUrl}
                alt="Base Image"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  maxHeight: "600px",
                }}
                className="rounded-b-lg"
                onError={() => {
                  setError(
                    `Failed to load base image. If using a URL, check URL and CORS policy. If uploaded, the file might be corrupted.`
                  );
                  setDisplayBaseUrl(null);
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center h-full text-muted-foreground"
                aria-hidden="true"
              >
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
              <img
                src={displayActualUrl}
                alt="Actual Image"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  maxHeight: "600px",
                }}
                className="rounded-b-lg"
                onError={() => {
                  setError(
                    `Failed to load actual image. If using a URL, check URL and CORS policy. If uploaded, the file might be corrupted.`
                  );
                  setDisplayActualUrl(null);
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center h-full text-muted-foreground"
                aria-hidden="true"
              >
                <ImageIcon className="w-16 h-16 opacity-50" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`shadow-md transition-all duration-500 ease-in-out ${
            diffImageUrl ||
            (isLoading && !error && displayBaseUrl && displayActualUrl)
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <CardHeader>
            <CardTitle>Difference</CardTitle>
          </CardHeader>
          <CardContent className="min-h-60 relative bg-muted rounded-b-lg overflow-hidden p-0">
            {diffImageUrl ? (
              <img
                src={diffImageUrl}
                alt="Difference"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  maxHeight: "600px",
                }}
                className="rounded-b-lg"
              />
            ) : (
              <div
                className="flex items-center justify-center h-full text-muted-foreground"
                aria-hidden="true"
              >
                {isLoading && !error && displayBaseUrl && displayActualUrl ? (
                  <p className="text-sm">Generating diff...</p>
                ) : (
                  <ImageIcon className="w-16 h-16 opacity-50" />
                )}
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
