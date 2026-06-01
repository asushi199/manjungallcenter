import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSektorsForLaporanScope,
  intersectSektorIds,
  normalizeLaporanSektorIds,
} from "../lib/laporan-sektor-scope";
import { applySektorScopeToFilter, isSektorIdInScope } from "../lib/sektor-admin-scope";

test("normalizeLaporanSektorIds deduplicates positive numeric ids", () => {
  assert.deepEqual(normalizeLaporanSektorIds([1, "2", 2, 0, -1, "abc", 3]), [1, 2, 3]);
  assert.deepEqual(normalizeLaporanSektorIds("1,2"), []);
});

test("filterSektorsForLaporanScope removes penyelia-only sectors", () => {
  const sektors = [
    { id: 1, code: "USTP" },
    { id: 2, code: "PPD_PENTADBIRAN" },
  ];

  assert.deepEqual(filterSektorsForLaporanScope(sektors), [{ id: 1, code: "USTP" }]);
});

test("intersectSektorIds defaults to allowed ids when no request is provided", () => {
  assert.deepEqual(intersectSektorIds(undefined, [1, 2]), [1, 2]);
  assert.deepEqual(intersectSektorIds([2, 3], [1, 2]), [2]);
  assert.deepEqual(intersectSektorIds([2, 3], []), []);
});

test("applySektorScopeToFilter handles all-sector and no-access scopes", () => {
  assert.equal(
    applySektorScopeToFilter(undefined, { allSectors: true, allowedIds: [], noAccess: false }),
    undefined,
  );
  assert.deepEqual(
    applySektorScopeToFilter([1], { allSectors: true, allowedIds: [], noAccess: false }),
    [1],
  );
  assert.deepEqual(
    applySektorScopeToFilter([1], { allSectors: false, allowedIds: [], noAccess: true }),
    [],
  );
});

test("isSektorIdInScope rejects null ids and no-access scopes", () => {
  assert.equal(
    isSektorIdInScope(2, { allSectors: false, allowedIds: [1, 2], noAccess: false }),
    true,
  );
  assert.equal(
    isSektorIdInScope(null, { allSectors: false, allowedIds: [1, 2], noAccess: false }),
    false,
  );
  assert.equal(
    isSektorIdInScope(1, { allSectors: false, allowedIds: [1], noAccess: true }),
    false,
  );
});
