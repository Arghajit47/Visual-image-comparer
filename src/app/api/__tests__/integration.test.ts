import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

let server: any;
let baseURL: string;

beforeAll(async () => {
  await app.prepare();

  server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      baseURL = `http://localhost:${address.port}`;
      resolve();
    });
  });
}, 30000);

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe("API Integration Tests", () => {
  describe("Health Endpoint", () => {
    it("should return 200 status", async () => {
      const response = await fetch(`${baseURL}/api/health`);
      expect(response.status).toBe(200);
    });

    it("should return valid health data structure", async () => {
      const response = await fetch(`${baseURL}/api/health`);
      const data = await response.json();

      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("environment");
      expect(data).toHaveProperty("imageProcessing");
      expect(data).toHaveProperty("comparison");
      expect(data).toHaveProperty("nodeVersion");
      expect(data).toHaveProperty("platform");
      expect(data).toHaveProperty("arch");
    });

    it("should return sharp availability", async () => {
      const response = await fetch(`${baseURL}/api/health`);
      const data = await response.json();

      expect(data.imageProcessing).toHaveProperty("library", "sharp");
      expect(data.imageProcessing).toHaveProperty("available");
      expect(data.imageProcessing).toHaveProperty("version");
      expect(data.imageProcessing.supportedFormats).toBeInstanceOf(Array);
      expect(data.imageProcessing.supportedFormats).toContain("PNG");
      expect(data.imageProcessing.supportedFormats).toContain("JPEG");
    });

    it("should have correct CORS headers", async () => {
      const response = await fetch(`${baseURL}/api/health`);

      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(response.headers.get("access-control-allow-methods")).toContain(
        "GET"
      );
    });
  });

  describe("Compare Images Endpoint - Validation", () => {
    it("should reject request without baseImageSource", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualImageSource: "data:image/png;base64,test",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("required");
    });

    it("should reject request without actualImageSource", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "data:image/png;base64,test",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("required");
    });

    it("should reject invalid threshold (> 100)", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "data:image/png;base64,test",
          actualImageSource: "data:image/png;base64,test",
          threshold: 150,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("threshold");
    });

    it("should reject invalid threshold (< 0)", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "data:image/png;base64,test",
          actualImageSource: "data:image/png;base64,test",
          threshold: -5,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("threshold");
    });

    it("should reject invalid image source format", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "invalid-source",
          actualImageSource: "data:image/png;base64,test",
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it("should reject file paths", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "/path/to/file.png",
          actualImageSource: "data:image/png;base64,test",
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Invalid image source");
    });
  });

  describe("Compare Images Endpoint - Identical Images", () => {
    const createRedImage = () => {
      const canvas = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cf400000030101003f6c23cb00000000049454e44ae426082",
        "hex"
      ).toString("base64");
      return `data:image/png;base64,${canvas}`;
    };

    it("should return 0% difference for identical images", async () => {
      const imageData = createRedImage();

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: imageData,
          actualImageSource: imageData,
          threshold: 0,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.differencePercentage).toBe(0);
      expect(data.status).toBe("Passed");
      expect(data.diffImageUrl).toBeNull();
      expect(data.error).toBeNull();
    });

    it("should pass when identical images with high threshold", async () => {
      const imageData = createRedImage();

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: imageData,
          actualImageSource: imageData,
          threshold: 50,
        }),
      });

      const data = await response.json();
      expect(data.status).toBe("Passed");
    });
  });

  describe("Compare Images Endpoint - Different Images", () => {
    const createRedImage = () => {
      const canvas = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cf400000030101003f6c23cb00000000049454e44ae426082",
        "hex"
      ).toString("base64");
      return `data:image/png;base64,${canvas}`;
    };

    const createBlueImage = () => {
      const canvas = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cfc00000030101005e6c23d700000000049454e44ae426082",
        "hex"
      ).toString("base64");
      return `data:image/png;base64,${canvas}`;
    };

    it("should detect differences between different colored images", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: createRedImage(),
          actualImageSource: createBlueImage(),
          threshold: 0,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.differencePercentage).toBeGreaterThan(0);
      expect(data.status).toBe("Failed");
      expect(data.diffImageUrl).toBeTruthy();
      expect(data.diffImageUrl).toMatch(/^data:image\/(png|jpeg|webp);base64,/);
      expect(data.error).toBeNull();
    });

    it("should fail when difference exceeds threshold", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: createRedImage(),
          actualImageSource: createBlueImage(),
          threshold: 1,
        }),
      });

      const data = await response.json();
      expect(data.status).toBe("Failed");
      expect(data.differencePercentage).toBeGreaterThan(1);
    });

    it("should pass when difference is within threshold", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: createRedImage(),
          actualImageSource: createBlueImage(),
          threshold: 100,
        }),
      });

      const data = await response.json();
      expect(data.status).toBe("Passed");
    });
  });

  describe("Compare Images Endpoint - Options", () => {
    const createTestImage = () => {
      const canvas = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cf400000030101003f6c23cb00000000049454e44ae426082",
        "hex"
      ).toString("base64");
      return `data:image/png;base64,${canvas}`;
    };

    it("should accept custom pixelmatch threshold", async () => {
      const imageData = createTestImage();

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: imageData,
          actualImageSource: imageData,
          options: {
            pixelmatch: {
              threshold: 0.05,
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.error).toBeNull();
    });

    it("should accept custom diff color", async () => {
      const imageData = createTestImage();

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: imageData,
          actualImageSource: imageData,
          options: {
            pixelmatch: {
              diffColor: [255, 0, 0],
            },
          },
        }),
      });

      expect(response.status).toBe(200);
    });

    it("should return metadata when requested", async () => {
      const imageData = createTestImage();

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: imageData,
          actualImageSource: imageData,
          options: {
            output: {
              includeMetadata: true,
            },
          },
        }),
      });

      const data = await response.json();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.baseImage).toHaveProperty("width");
      expect(data.metadata.baseImage).toHaveProperty("height");
      expect(data.metadata.comparison).toHaveProperty("totalPixels");
      expect(data.metadata.comparison).toHaveProperty("diffPixels");
      expect(data.metadata.comparison).toHaveProperty("processingTime");
    });

    it("should return diff bounds when requested", async () => {
      const createRedImage = () => {
        const canvas = Buffer.from(
          "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cf400000030101003f6c23cb00000000049454e44ae426082",
          "hex"
        ).toString("base64");
        return `data:image/png;base64,${canvas}`;
      };

      const createBlueImage = () => {
        const canvas = Buffer.from(
          "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cfc00000030101005e6c23d700000000049454e44ae426082",
          "hex"
        ).toString("base64");
        return `data:image/png;base64,${canvas}`;
      };

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: createRedImage(),
          actualImageSource: createBlueImage(),
          options: {
            output: {
              includeDiffBounds: true,
            },
          },
        }),
      });

      const data = await response.json();
      if (data.differencePercentage > 0) {
        expect(data.diffBounds).toBeDefined();
        expect(data.diffBounds).toHaveProperty("left");
        expect(data.diffBounds).toHaveProperty("top");
        expect(data.diffBounds).toHaveProperty("right");
        expect(data.diffBounds).toHaveProperty("bottom");
        expect(data.diffBounds).toHaveProperty("width");
        expect(data.diffBounds).toHaveProperty("height");
      }
    });

    it("should support different output formats", async () => {
      const imageData = createTestImage();

      const formats = ["png", "jpeg", "webp"];

      for (const format of formats) {
        const response = await fetch(`${baseURL}/api/compare-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseImageSource: imageData,
            actualImageSource: imageData,
            options: {
              output: {
                format,
              },
            },
          }),
        });

        expect(response.status).toBe(200);
      }
    });
  });

  describe("Compare Images Endpoint - CORS", () => {
    it("should handle OPTIONS preflight request", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(response.headers.get("access-control-allow-methods")).toContain(
        "POST"
      );
      expect(response.headers.get("access-control-allow-headers")).toContain(
        "Content-Type"
      );
    });

    it("should include CORS headers in POST response", async () => {
      const imageData = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cf400000030101003f6c23cb00000000049454e44ae426082",
        "hex"
      ).toString("base64");

      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: `data:image/png;base64,${imageData}`,
          actualImageSource: `data:image/png;base64,${imageData}`,
        }),
      });

      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    });
  });

  describe("Compare Images Endpoint - Error Handling", () => {
    it("should handle malformed JSON gracefully", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it("should handle corrupted base64 data", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "data:image/png;base64,invalid!!!base64",
          actualImageSource: "data:image/png;base64,test",
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it("should provide helpful error messages", async () => {
      const response = await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: "data:image/png;base64,",
          actualImageSource: "data:image/png;base64,test",
        }),
      });

      const data = await response.json();
      expect(data.error).toBeTypeOf("string");
      expect(data.error.length).toBeGreaterThan(0);
    });
  });

  describe("Compare Images Endpoint - Performance", () => {
    it("should complete comparison within reasonable time", async () => {
      const imageData = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6364f8cf400000030101003f6c23cb00000000049454e44ae426082",
        "hex"
      ).toString("base64");

      const startTime = Date.now();

      await fetch(`${baseURL}/api/compare-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageSource: `data:image/png;base64,${imageData}`,
          actualImageSource: `data:image/png;base64,${imageData}`,
        }),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
