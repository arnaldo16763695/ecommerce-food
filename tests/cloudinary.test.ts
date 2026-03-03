import { afterEach, describe, expect, it } from "vitest";

import { getCloudinaryConfig, signCloudinaryParams } from "../lib/cloudinary";

const ORIGINAL_ENV = process.env;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("cloudinary utils", () => {
  it("returns config using required env vars", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    process.env.CLOUDINARY_UPLOAD_FOLDER = "my-folder";

    expect(getCloudinaryConfig()).toEqual({
      cloudName: "demo-cloud",
      apiKey: "api-key",
      apiSecret: "secret",
      uploadFolder: "my-folder",
    });
  });

  it("uses default folder when CLOUDINARY_UPLOAD_FOLDER is missing", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "api-key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    delete process.env.CLOUDINARY_UPLOAD_FOLDER;

    expect(getCloudinaryConfig().uploadFolder).toBe("e-commerce-food");
  });

  it("throws when required env vars are missing", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    expect(() => getCloudinaryConfig()).toThrow(
      "Missing required environment variable: CLOUDINARY_CLOUD_NAME",
    );
  });

  it("signs params with stable sorting and ignores empty values", () => {
    const sigA = signCloudinaryParams(
      {
        timestamp: "123",
        folder: "abc",
        empty: "",
      },
      "secret",
    );
    const sigB = signCloudinaryParams(
      {
        folder: "abc",
        timestamp: "123",
      },
      "secret",
    );

    expect(sigA).toBe(sigB);
    expect(sigA).toMatch(/^[a-f0-9]{40}$/);
  });
});
