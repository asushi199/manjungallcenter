import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedCronRequest, isCronSecretConfigured } from "../lib/cron-auth";

test("isAuthorizedCronRequest accepts bearer, header, and query secret", () => {
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret-value";
  try {
    assert.equal(isCronSecretConfigured(), true);
    const url = "https://example.test/api/cron/backup";
    assert.equal(isAuthorizedCronRequest(new Request(url)), false);
    assert.equal(
      isAuthorizedCronRequest(
        new Request(url, { headers: { authorization: "Bearer test-secret-value" } }),
      ),
      true,
    );
    assert.equal(
      isAuthorizedCronRequest(new Request(url, { headers: { "x-cron-secret": "test-secret-value" } })),
      true,
    );
    assert.equal(
      isAuthorizedCronRequest(new Request(`${url}?secret=test-secret-value`)),
      true,
    );
    assert.equal(
      isAuthorizedCronRequest(new Request(`${url}?secret=wrong`)),
      false,
    );
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
});

test("isAuthorizedCronRequest rejects when secret is missing", () => {
  const prev = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    assert.equal(isCronSecretConfigured(), false);
    assert.equal(
      isAuthorizedCronRequest(
        new Request("https://example.test/api/cron/backup", {
          headers: { authorization: "Bearer test-secret-value" },
        }),
      ),
      false,
    );
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
});
