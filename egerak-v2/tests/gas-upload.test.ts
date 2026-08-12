import assert from "node:assert/strict";
import test from "node:test";
import { uploadOprPhotoViaGas } from "../lib/gas-upload";

test("GAS upload supplies an abort signal and reports a readable timeout", async () => {
  const previousUrl = process.env.GAS_WEB_APP_URL;
  const previousSecret = process.env.GAS_UPLOAD_SECRET;
  const originalFetch = globalThis.fetch;
  let receivedSignal: AbortSignal | undefined;

  process.env.GAS_WEB_APP_URL = "https://example.test/upload";
  process.env.GAS_UPLOAD_SECRET = "test-secret";
  globalThis.fetch = (async (_input, init) => {
    receivedSignal = init?.signal ?? undefined;
    throw new DOMException("The operation was aborted.", "AbortError");
  }) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        uploadOprPhotoViaGas(1, {
          name: "gambar.jpg",
          type: "image/jpeg",
          buffer: Buffer.from("test"),
        }),
      /Muat naik gambar mengambil terlalu lama/,
    );
    assert.ok(receivedSignal instanceof AbortSignal);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.GAS_WEB_APP_URL;
    else process.env.GAS_WEB_APP_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.GAS_UPLOAD_SECRET;
    else process.env.GAS_UPLOAD_SECRET = previousSecret;
  }
});
