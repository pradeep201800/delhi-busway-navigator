// Frontend traffic model + journey planner. Pure functions, no I/O, safe for SSR.
import {
  ROUTE_BY_ID,
  ROUTES,
  STOPS,
  STOP_BY_ID,
  type BusRoute,
  type CorridorType,
  type Day,
  type Stop,
  type StopId,
} from "./data";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const WALK_KMH = 4.6;
/** Straight-line → street distance factor for walking and road segments. */
export const DETOUR = 1.25;
export const MAX_WALK_KM = 2.2;
export const TRANSFER_BUFFER_MIN = 2;
export const TRANSFER_WALK_KM = 0.6;

/** Free-flow bus speed (km/h) per corridor type. */
export const FREEFLOW_KMH: Record<CorridorType, number> = {
  ring: 42,
  arterial: 38,
  outer: 44,
  central: 33,
};

/** Hourly speed multipliers (1 = free flow). Index = hour of day. */
export const SPEED_PROFILE: Record<"weekday" | "saturday" | "sunday", number[]> = {
  weekday: [1, 1, 1, 1, 0.97, 0.92, 0.82, 0.66, 0.5, 0.47, 0.58, 0.7, 0.72, 0.7, 0.72, 0.66, 0.58, 0.49, 0.44, 0.48, 0.6, 0.75, 0.86, 0.94],
  saturday: [1, 1, 1, 1, 0.98, 0.96, 0.92, 0.84, 0.76, 0.7, 0.68, 0.68, 0.66, 0.68, 0.7, 0.68, 0.64, 0.6, 0.58, 0.6, 0.66, 0.76, 0.86, 0.94],
  sunday: [1, 1, 1, 1, 1, 0.98, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.74, 0.74, 0.76, 0.76, 0.74, 0.7, 0.68, 0.7, 0.76, 0.84, 0.92, 0.97],
};

export type SpeedBand = "fast" | "moderate" | "heavy" | "severe";

export const SPEED_BANDS: { band: SpeedBand; label: string; min: number }[] = [
  { band: "fast", label: "Free-flowing", min: 26 },
  { band: "moderate", label: "Moderate", min: 18 },
  { band: "heavy", label: "Heavy", min: 11 },
  { band: "severe", label: "Gridlock", min: 0 },
];

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ------------------------------------------------------------------ */
/* Road segments                                                       */
/* ------------------------------------------------------------------ */

export interface Segment {
  id: string;
  a: StopId;
  b: StopId;
  lengthKm: number;
  freeflow: number;
  hotspot: number;
  routes: string[];
}

export const segmentKey = (a: StopId, b: StopId) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function buildSegments(): Segment[] {
  const map = new Map<string, Segment>();
  for (const route of ROUTES) {
    for (let i = 0; i < route.stops.length - 1; i++) {
      const a = route.stops[i]!;
      const b = route.stops[i + 1]!;
      const key = segmentKey(a, b);
      const existing = map.get(key);
      if (existing) {
        existing.routes.push(route.id);
        continue;
      }
      const sa = STOP_BY_ID[a]!;
      const sb = STOP_BY_ID[b]!;
      map.set(key, {
        id: key,
        a,
        b,
        lengthKm: haversineKm(sa, sb) * DETOUR,
        freeflow: FREEFLOW_KMH[route.corridor],
        hotspot: (sa.hotspot + sb.hotspot) / 2,
        routes: [route.id],
      });
    }
  }
  return [...map.values()];
}

export const SEGMENTS: Segment[] = buildSegments();
export const SEGMENT_BY_KEY: Record<string, Segment> = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));

/* ------------------------------------------------------------------ */
/* Speed model                                                         */
/* ------------------------------------------------------------------ */

export function profileFor(day: Day) {
  if (day === "Sat") return SPEED_PROFILE.saturday;
  if (day === "Sun") return SPEED_PROFILE.sunday;
  return SPEED_PROFILE.weekday;
}

/** Interpolated time-of-day multiplier. `minutes` may exceed 1440 (wraps). */
export function timeMultiplier(day: Day, minutes: number): number {
  const profile = profileFor(day);
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const frac = (m % 60) / 60;
  const a = profile[h]!;
  const b = profile[(h + 1) % 24]!;
  return a + (b - a) * frac;
}

/** Modeled bus speed on a segment, km/h. */
export function segmentSpeed(seg: Segment, day: Day, minutes: number): number {
  const mult = timeMultiplier(day, minutes);
  return Math.max(6, seg.freeflow * Math.pow(mult, seg.hotspot));
}

export function speedBand(kmh: number): SpeedBand {
  for (const b of SPEED_BANDS) if (kmh >= b.min) return b.band;
  return "severe";
}

/** Dwell time (min) per segment: main stop + implied minor stops, longer when crowded. */
export function dwellMinutes(seg: Segment, mult: number): number {
  const crowd = 1 + (1 - mult) * 0.8;
  return (0.35 + seg.lengthKm * 0.12) * crowd;
}

export function headwayAt(route: BusRoute, day: Day, minutes: number): number {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hour = m / 60;
  if (hour < 6 || hour >= 22) return route.headway.night;
  return timeMultiplier(day, minutes) < 0.65 ? route.headway.peak : route.headway.offpeak;
}

export function cityStats(day: Day, minutes: number) {
  let totalKm = 0;
  let weighted = 0;
  const counts: Record<SpeedBand, number> = { fast: 0, moderate: 0, heavy: 0, severe: 0 };
  for (const s of SEGMENTS) {
    const v = segmentSpeed(s, day, minutes);
    totalKm += s.lengthKm;
    weighted += v * s.lengthKm;
    counts[speedBand(v)] += s.lengthKm;
  }
  const avg = weighted / totalKm;
  const congestedShare = (counts.heavy + counts.severe) / totalKm;
  return { avgSpeed: avg, band: speedBand(avg), congestedShare, multiplier: timeMultiplier(day, minutes) };
}

/* ------------------------------------------------------------------ */
/* Route helpers                                                       */
/* ------------------------------------------------------------------ */

/** Ordered stop ids riding `route` from `from` to `to` (either direction), or null. */
export function rideStops(route: BusRoute, from: StopId, to: StopId): StopId[] | null {
  const i = route.stops.indexOf(from);
  const j = route.stops.indexOf(to);
  if (i < 0 || j < 0 || i === j) return null;
  return i < j ? route.stops.slice(i, j + 1) : route.stops.slice(j, i + 1).reverse();
}

/* ------------------------------------------------------------------ */
/* Journey planning                                                    */
/* ------------------------------------------------------------------ */

export interface Place extends LatLng {
  label: string;
  stopId?: StopId;
}

export function placeFromStop(id: StopId): Place {
  const s = STOP_BY_ID[id]!;
  return { lat: s.lat, lng: s.lng, label: s.name, stopId: s.id };
}

interface Ride {
  routeId: string;
  from: StopId;
  to: StopId;
}

interface Itinerary {
  origin: Place;
  destination: Place;
  rides: Ride[];
}

export type Leg =
  | { kind: "walk"; from: Place; to: Place; distanceKm: number; minutes: number; startMin: number; purpose: "access" | "transfer" | "egress" | "direct" }
  | {
      kind: "bus";
      route: BusRoute;
      from: Stop;
      to: Stop;
      stops: StopId[];
      waitMin: number;
      headway: number;
      rideMin: number;
      distanceKm: number;
      avgSpeed: number;
      boardMin: number;
      alightMin: number;
    };

export interface Journey {
  id: string;
  type: "direct" | "transfer" | "walk";
  legs: Leg[];
  departMin: number;
  arriveMin: number;
  totalMin: number;
  quietMin: number;
  quietAtMin: number;
  timetableMin: number;
  trafficDelayMin: number;
  walkKm: number;
  busKm: number;
  transfers: number;
}

const placeOfStop = (id: StopId): Place => placeFromStop(id);

function walkMinutes(a: LatLng, b: LatLng) {
  const km = haversineKm(a, b) * DETOUR;
  return { km, min: (km / WALK_KMH) * 60 };
}

/** Evaluate an itinerary at a given departure. `timetable` uses static scheduled speeds. */
function evaluate(it: Itinerary, day: Day, departMin: number, timetable = false): { legs: Leg[]; total: number } {
  const legs: Leg[] = [];
  let clock = departMin;

  if (it.rides.length === 0) {
    const w = walkMinutes(it.origin, it.destination);
    legs.push({ kind: "walk", from: it.origin, to: it.destination, distanceKm: w.km, minutes: w.min, startMin: clock, purpose: "direct" });
    return { legs, total: w.min };
  }

  let here: Place = it.origin;
  it.rides.forEach((ride, idx) => {
    const boardPlace = placeOfStop(ride.from);
    const w = walkMinutes(here, boardPlace);
    if (w.km > 0.02) {
      legs.push({ kind: "walk", from: here, to: boardPlace, distanceKm: w.km, minutes: w.min, startMin: clock, purpose: idx === 0 ? "access" : "transfer" });
      clock += w.min;
    }
    if (idx > 0) clock += TRANSFER_BUFFER_MIN;

    const route = ROUTE_BY_ID[ride.routeId]!;
    const headway = headwayAt(route, day, clock);
    // Timetable assumes you arrive just in time; the live model expects half a headway.
    const waitMin = timetable ? 0 : headway / 2;
    clock += waitMin;
    const boardMin = clock;

    const stops = rideStops(route, ride.from, ride.to)!;
    let distanceKm = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const seg = SEGMENT_BY_KEY[segmentKey(stops[i]!, stops[i + 1]!)]!;
      const speed = timetable ? seg.freeflow * 0.78 : segmentSpeed(seg, day, clock);
      const mult = timetable ? 0.9 : timeMultiplier(day, clock);
      clock += (seg.lengthKm / speed) * 60 + dwellMinutes(seg, mult);
      distanceKm += seg.lengthKm;
    }
    const rideMin = clock - boardMin;
    legs.push({
      kind: "bus",
      route,
      from: STOP_BY_ID[ride.from]!,
      to: STOP_BY_ID[ride.to]!,
      stops,
      waitMin,
      headway,
      rideMin,
      distanceKm,
      avgSpeed: distanceKm / (rideMin / 60),
      boardMin,
      alightMin: clock,
    });
    here = placeOfStop(ride.to);
  });

  const w = walkMinutes(here, it.destination);
  if (w.km > 0.02) {
    legs.push({ kind: "walk", from: here, to: it.destination, distanceKm: w.km, minutes: w.min, startMin: clock, purpose: "egress" });
    clock += w.min;
  }
  return { legs, total: clock - departMin };
}

function nearbyStops(p: Place, maxKm = MAX_WALK_KM, limit = 4): Stop[] {
  if (p.stopId) return [STOP_BY_ID[p.stopId]!];
  return STOPS.map((s) => ({ s, d: haversineKm(p, s) }))
    .filter((x) => x.d <= maxKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.s);
}

function candidateItineraries(origin: Place, destination: Place): Itinerary[] {
  const out: Itinerary[] = [];
  let boards = nearbyStops(origin);
  let alights = nearbyStops(destination);
  // Far from any stop: fall back to the single nearest stop.
  if (boards.length === 0) boards = nearbyStops({ lat: origin.lat, lng: origin.lng, label: origin.label }, 50, 1);
  if (alights.length === 0) alights = nearbyStops({ lat: destination.lat, lng: destination.lng, label: destination.label }, 50, 1);

  const direct = haversineKm(origin, destination) * DETOUR;
  if (direct <= 1.6) out.push({ origin, destination, rides: [] });

  for (const b of boards) {
    for (const a of alights) {
      if (a.id === b.id) continue;
      for (const r1 of ROUTES) {
        if (!r1.stops.includes(b.id)) continue;
        if (r1.stops.includes(a.id)) out.push({ origin, destination, rides: [{ routeId: r1.id, from: b.id, to: a.id }] });
        for (const r2 of ROUTES) {
          // Skip transfers that are dominated by riding one of the two routes end to end.
          if (r2.id === r1.id || !r2.stops.includes(a.id) || r1.stops.includes(a.id) || r2.stops.includes(b.id)) continue;
          for (const t1 of r1.stops) {
            if (t1 === b.id) continue;
            for (const t2 of r2.stops) {
              if (t2 === a.id) continue;
              if (t1 !== t2 && haversineKm(STOP_BY_ID[t1]!, STOP_BY_ID[t2]!) > TRANSFER_WALK_KM) continue;
              out.push({
                origin,
                destination,
                rides: [
                  { routeId: r1.id, from: b.id, to: t1 },
                  { routeId: r2.id, from: t2, to: a.id },
                ],
              });
            }
          }
        }
      }
    }
  }
  return out;
}

/** Plan up to `max` journey options for the given departure. */
export function planJourneys(origin: Place, destination: Place, day: Day, departMin: number, max = 3): Journey[] {
  const its = candidateItineraries(origin, destination);
  const scored = its.map((it) => ({ it, total: evaluate(it, day, departMin).total }));
  scored.sort((x, y) => x.total - y.total);

  // Keep the best itinerary per route combination for variety.
  const seen = new Set<string>();
  const picked: Itinerary[] = [];
  for (const { it } of scored) {
    const sig = it.rides.map((r) => r.routeId).join(">") || "walk";
    if (seen.has(sig)) continue;
    seen.add(sig);
    picked.push(it);
    if (picked.length >= max) break;
  }

  return picked.map((it) => {
    const now = evaluate(it, day, departMin);
    // Quieter-hour baseline: fastest departure of the same day between 05:00 and 23:00.
    let quietMin = Infinity;
    let quietAtMin = departMin;
    for (let m = 5 * 60; m <= 23 * 60; m += 30) {
      const t = evaluate(it, day, m).total;
      if (t < quietMin) {
        quietMin = t;
        quietAtMin = m;
      }
    }
    quietMin = Math.min(quietMin, now.total);
    const timetableMin = evaluate(it, day, departMin, true).total;
    const walkKm = now.legs.reduce((s, l) => s + (l.kind === "walk" ? l.distanceKm : 0), 0);
    const busKm = now.legs.reduce((s, l) => s + (l.kind === "bus" ? l.distanceKm : 0), 0);
    return {
      id: `${it.rides.map((r) => `${r.routeId}:${r.from}-${r.to}`).join("_") || "walk"}`,
      type: it.rides.length === 0 ? "walk" : it.rides.length === 1 ? "direct" : "transfer",
      legs: now.legs,
      departMin,
      arriveMin: departMin + now.total,
      totalMin: now.total,
      quietMin,
      quietAtMin,
      timetableMin,
      trafficDelayMin: Math.max(0, now.total - quietMin),
      walkKm,
      busKm,
      transfers: Math.max(0, it.rides.length - 1),
    } satisfies Journey;
  });
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}
