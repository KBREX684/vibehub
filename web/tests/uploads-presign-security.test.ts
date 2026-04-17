import { describe, expect, it } from "vitest";
import { MAX_IMAGE_UPLOAD_BYTES, createPresignedPutUrl } from "../src/lib/uploads-presign";

describe("uploads presign security", () => {
  it("rejects oversized uploads before presigning", async () => {
    await expect(
      createPresignedPutUrl({
        userId: "u1",
        filename: "avatar.png",
        contentType: "image/png",
        sizeBytes: MAX_IMAGE_UPLOAD_BYTES + 1,
      })
    ).rejects.toThrow("UPLOAD_TOO_LARGE");
  });
});
