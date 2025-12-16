import { describe, it, expect, vi } from "vitest";
import { GET } from "../route";

vi.mock("sharp", () => ({
  default: { versions: { sharp: "0.33.5" } },
}));

describe("GET /api/health", () => {
  it("should return health check data", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("environment");
    expect(data).toHaveProperty("imageProcessing");
    expect(data.imageProcessing).toHaveProperty("library", "sharp");
    expect(data.imageProcessing).toHaveProperty("available", true);
  });

  it("should include supported formats", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.imageProcessing.supportedFormats).toEqual([
      "PNG",
      "JPEG",
      "WebP",
      "GIF",
      "AVIF",
      "TIFF",
      "SVG",
    ]);
  });

  it("should include comparison info", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.comparison).toEqual({
      library: "pixelmatch",
      algorithm: "pixel-by-pixel",
    });
  });
});
