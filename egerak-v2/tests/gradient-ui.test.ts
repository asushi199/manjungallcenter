import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navbarSource = readFileSync("components/Navbar.tsx", "utf8");
const dashboardPageSource = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
const todayStatsSource = readFileSync("app/(app)/dashboard/DashboardTodayStats.tsx", "utf8");

test("header keeps official blue and shows the SentRa logo on a clean tile", () => {
  assert.match(navbarSource, /<header className="bg-brand-700 text-white shadow sticky top-0 z-40">/);
  assert.match(navbarSource, /SentraLogo/);
});

test("dashboard primary action uses an icon-led gradient button", () => {
  assert.match(dashboardPageSource, /bg-gradient-to-r from-brand-700 via-brand-600 to-cyan-600/);
  assert.match(dashboardPageSource, /aria-hidden="true"\s*>\s*\+/s);
});

test("today stats card has a compact gradient icon accent", () => {
  assert.match(todayStatsSource, /function TodayStatsIcon/);
  assert.match(todayStatsSource, /bg-gradient-to-br from-brand-600 to-cyan-500/);
});
