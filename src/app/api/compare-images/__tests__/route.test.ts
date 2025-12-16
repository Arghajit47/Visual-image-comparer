import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    metadata: vi
      .fn()
      .mockResolvedValue({ width: 100, height: 100, format: "png" }),
    raw: vi.fn().mockReturnThis(),
    ensureAlpha: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      resolveWithObject: true,
      then: (cb: any) =>
        cb({
          data: Buffer.alloc(40000),
          info: { width: 100, height: 100 },
        }),
    }),
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("pixelmatch", () => ({
  default: vi.fn(() => 100),
}));

describe("POST /api/compare-images", () => {
  const createMockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if baseImageSource is missing", async () => {
    const request = createMockRequest({
      actualImageSource: "data:image/png;base64,test",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("should return 400 if actualImageSource is missing", async () => {
    const request = createMockRequest({
      baseImageSource: "data:image/png;base64,test",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("should return 400 for invalid threshold", async () => {
    const request = createMockRequest({
      baseImageSource: "data:image/png;base64,test",
      actualImageSource: "data:image/png;base64,test",
      threshold: 150,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("threshold");
  });

  it("should validate image source format", async () => {
    const request = createMockRequest({
      baseImageSource: "invalid-source",
      actualImageSource: "data:image/png;base64,test",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeTruthy();
  });

  it("should handle successful comparison", async () => {
    const validBase64 = Buffer.from("test").toString("base64");
    const request = createMockRequest({
      baseImageSource: `data:image/png;base64,${validBase64}`,
      actualImageSource: `data:image/png;base64,${validBase64}`,
      threshold: 5,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
