import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as comparePost,
  OPTIONS as compareOptions,
} from "../compare-images/route";
import { GET as healthGet, OPTIONS as healthOptions } from "../health/route";

const createMockRequest = (body: any) => {
  return {
    json: async () => body,
  } as NextRequest;
};

const createRedImage = async () => {
  const response = await fetch('https://i.sstatic.net/lWUlB.jpg');
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
};

const createBlueImage = async () => {
  const response = await fetch('https://i.sstatic.net/gz9Kf.jpg');
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
};

describe("API Integration Tests", () => {
  describe("Health Endpoint", () => {
    it("should return 200 status", async () => {
      const response = await healthGet();
      expect(response.status).toBe(200);
    });

    it("should handle OPTIONS preflight", async () => {
      const response = await healthOptions();
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(response.headers.get("access-control-allow-methods")).toContain(
        "GET"
      );
    });

    it("should return valid health data structure", async () => {
      const response = await healthGet();
      const data = await response.json();

      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("imageProcessing");
      expect(data.imageProcessing.library).toBe("sharp");
    });

    it("should list supported formats", async () => {
      const response = await healthGet();
      const data = await response.json();

      expect(data.imageProcessing.supportedFormats).toContain("PNG");
      expect(data.imageProcessing.supportedFormats).toContain("JPEG");
      expect(data.imageProcessing.supportedFormats).toContain("WebP");
      expect(data.imageProcessing.supportedFormats).toContain("SVG");
    });
  });

  describe("Validation Tests", () => {
    it("should reject missing baseImageSource", async () => {
      const request = createMockRequest({
        actualImageSource: await createRedImage(),
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should reject missing actualImageSource", async () => {
      const request = createMockRequest({
        baseImageSource: await createRedImage(),
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should reject invalid threshold > 100", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        threshold: 150,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("threshold");
    });

    it("should reject invalid threshold < 0", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        threshold: -5,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("threshold");
    });

    it("should reject file paths", async () => {
      const request = createMockRequest({
        baseImageSource: "/path/to/file.png",
        actualImageSource: await createRedImage(),
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to parse URL");
    });
  });

  describe("Identical Images Tests", () => {
    it("should return 0% for identical images", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        threshold: 0,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.differencePercentage).toBe(0);
      expect(data.status).toBe("Passed");
      expect(data.diffImageUrl).toBeNull();
    });

    it("should pass with high threshold", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        threshold: 50,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(data.status).toBe("Passed");
    });
  });

  describe("Different Images Tests", () => {
    it("should detect differences", async () => {
      const request = createMockRequest({
        baseImageSource: await createRedImage(),
        actualImageSource: await createBlueImage(),
        threshold: 0,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.differencePercentage).toBeGreaterThan(0);
      expect(data.status).toBe("Failed");
      expect(data.diffImageUrl).toBeTruthy();
      expect(data.diffImageUrl).toMatch(/^data:image\/(png|jpeg|webp);base64,/);
    });

    it("should fail when exceeding threshold", async () => {
      const request = createMockRequest({
        baseImageSource: await createRedImage(),
        actualImageSource: await createBlueImage(),
        threshold: 1,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(data.status).toBe("Failed");
      expect(data.differencePercentage).toBeGreaterThan(1);
    });

    it("should pass within threshold", async () => {
      const request = createMockRequest({
        baseImageSource: await createRedImage(),
        actualImageSource: await createBlueImage(),
        threshold: 100,
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(data.status).toBe("Passed");
    });
  });

  describe("Options Tests", () => {
    it("should accept all configuration options combined", async () => {
      const request = createMockRequest({
        baseImageSource: await createRedImage(),
        actualImageSource: await createBlueImage(),
        threshold: 10,
        options: {
          pixelmatch: {
            threshold: 0.05,
            includeAA: true,
            alpha: 0.2,
            aaColor: [255, 255, 0],
            diffColor: [255, 0, 255],
            diffColorAlt: [0, 255, 255],
            diffMask: false,
          },
          resize: {
            enabled: true,
            strategy: 'fit',
            maintainAspectRatio: true,
          },
          quality: {
            jpeg: 85,
            png: 7,
            webp: 90,
          },
          colorSpace: {
            normalize: true,
            grayscale: false,
          },
          output: {
            format: 'png',
            includeOriginals: true,
            includeDiffBounds: true,
            includeMetadata: true,
          },
        },
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('differencePercentage');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('baseImage');
      expect(data.metadata).toHaveProperty('actualImage');
      expect(data.metadata).toHaveProperty('comparison');
      expect(data.metadata.comparison).toHaveProperty('totalPixels');
      expect(data.metadata.comparison).toHaveProperty('diffPixels');
      expect(data.metadata.comparison).toHaveProperty('processingTime');
      expect(data.metadata.comparison).toHaveProperty('algorithm');
      
      if (data.differencePercentage > 0) {
        expect(data.diffImageUrl).toBeTruthy();
        expect(data.diffBounds).toBeDefined();
        expect(data.diffBounds).toHaveProperty('left');
        expect(data.diffBounds).toHaveProperty('top');
        expect(data.diffBounds).toHaveProperty('width');
        expect(data.diffBounds).toHaveProperty('height');
      }
    });

    it("should accept custom pixelmatch threshold", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        options: {
          pixelmatch: {
            threshold: 0.05,
          },
        },
      });

      const response = await comparePost(request);
      expect(response.status).toBe(200);
    });

    it("should accept custom diff color", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        options: {
          pixelmatch: {
            diffColor: [255, 0, 0],
          },
        },
      });

      const response = await comparePost(request);
      expect(response.status).toBe(200);
    });

    it("should return metadata when requested", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
        options: {
          output: {
            includeMetadata: true,
          },
        },
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.baseImage).toHaveProperty("width");
      expect(data.metadata.baseImage).toHaveProperty("height");
      expect(data.metadata.comparison).toHaveProperty("totalPixels");
      expect(data.metadata.comparison).toHaveProperty("processingTime");
    });

    it("should return diff bounds when requested", async () => {
      const request = createMockRequest({
        baseImageSource: await createRedImage(),
        actualImageSource: await createBlueImage(),
        options: {
          output: {
            includeDiffBounds: true,
          },
        },
      });

      const response = await comparePost(request);
      const data = await response.json();

      if (data.differencePercentage > 0) {
        expect(data.diffBounds).toBeDefined();
        expect(data.diffBounds).toHaveProperty("left");
        expect(data.diffBounds).toHaveProperty("top");
        expect(data.diffBounds).toHaveProperty("width");
        expect(data.diffBounds).toHaveProperty("height");
      }
    });
  });

  describe("CORS Tests", () => {
    it("should handle OPTIONS preflight", async () => {
      const response = await compareOptions();

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(response.headers.get("access-control-allow-methods")).toContain(
        "POST"
      );
    });

    it("should include CORS headers in POST", async () => {
      const imageData = await createRedImage();
      const request = createMockRequest({
        baseImageSource: imageData,
        actualImageSource: imageData,
      });

      const response = await comparePost(request);
      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    });
  });

  describe("Error Handling Tests", () => {
    it("should handle corrupted base64", async () => {
      const request = createMockRequest({
        baseImageSource: "data:image/png;base64,invalid!!!",
        actualImageSource: await createRedImage(),
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
    });

    it("should provide helpful error messages", async () => {
      const request = createMockRequest({
        baseImageSource: "data:image/png;base64,",
        actualImageSource: await createRedImage(),
      });

      const response = await comparePost(request);
      const data = await response.json();

      expect(data.error).toBeTypeOf("string");
      expect(data.error.length).toBeGreaterThan(0);
    });
  });
});