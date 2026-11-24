import { describe, expect, it } from "vitest";
import { placeFromStop, planJourneys, segmentSpeed, SEGMENT_BY_KEY, segmentKey } from "./model";

const tue830 = 8 * 60 + 30;

describe("journey planner", () => {
  it("default preset Kashmere Gate → Nehru Place on Tue 8:30 AM returns 2–3 options incl. a direct bus", () => {
    const js = planJourneys(placeFromStop("kashmere"), placeFromStop("nehru"), "Tue", tue830);
    expect(js.length).toBeGreaterThanOrEqual(2);
    expect(js.length).toBeLessThanOrEqual(3);
    expect(js.some((j) => j.type === "direct")).toBe(true);
  });

  it("the same trip is slower at 8:30 AM weekday than at 11 PM", () => {
    const peak = planJourneys(placeFromStop("kashmere"), placeFromStop("nehru"), "Tue", tue830)[0]!;
    const night = planJourneys(placeFromStop("kashmere"), placeFromStop("nehru"), "Tue", 23 * 60)[0]!;
    expect(peak.totalMin).toBeGreaterThan(night.totalMin);
  });

  it("traffic delay equals now minus the quieter-hour baseline and is positive at peak", () => {
    const j = planJourneys(placeFromStop("kashmere"), placeFromStop("nehru"), "Tue", tue830)[0]!;
    expect(j.trafficDelayMin).toBeCloseTo(j.totalMin - j.quietMin, 5);
    expect(j.trafficDelayMin).toBeGreaterThan(5);
  });

  it("ITO corridor runs slower at 9 AM weekday than 9 AM Sunday", () => {
    const seg = SEGMENT_BY_KEY[segmentKey("redfort", "ito")]!;
    expect(segmentSpeed(seg, "Tue", 9 * 60)).toBeLessThan(segmentSpeed(seg, "Sun", 9 * 60));
  });

  it("all demo presets find at least one journey", () => {
    const presets: [string, string, "Thu" | "Fri" | "Sun", number][] = [
      ["cp", "aiims", "Thu", 18 * 60 + 15],
      ["dwarka21", "rajivchowk", "Fri", 23 * 60],
      ["anandvihar", "hauzkhas", "Sun", 13 * 60],
    ];
    for (const [o, d, day, m] of presets) {
      expect(planJourneys(placeFromStop(o), placeFromStop(d), day, m).length).toBeGreaterThan(0);
    }
  });
});
