// Browser-only: imports Leaflet at module scope. Load with React.lazy behind <ClientOnly>.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapPinOff } from "lucide-react";

import { DELHI_CENTER, ROUTES, STOPS, STOP_BY_ID, type BusRoute } from "@/lib/transit/data";
import {
  SEGMENTS,
  SEGMENT_BY_KEY,
  SPEED_BANDS,
  segmentKey,
  segmentSpeed,
  speedBand,
  type SpeedBand,
} from "@/lib/transit/model";
import type { TransitMapProps } from "./map-types";

/** Simulated seconds per real second for the moving fleet. */
const SIM_FACTOR = 30;
const BUSES_PER_DIRECTION = 2;

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const bandColor = (b: SpeedBand) => cssVar(`--traffic-${b}`);
const bandLabel = (b: SpeedBand) => SPEED_BANDS.find((x) => x.band === b)?.label ?? b;

interface SimBus {
  route: BusRoute;
  forward: boolean;
  progressKm: number;
  cum: number[];
  marker: L.Marker;
  pingAt: number;
  pingEvery: number;
  speed: number;
}

function routeCum(route: BusRoute): number[] {
  const cum = [0];
  for (let i = 0; i < route.stops.length - 1; i++) {
    const seg = SEGMENT_BY_KEY[segmentKey(route.stops[i]!, route.stops[i + 1]!)]!;
    cum.push(cum[i]! + seg.lengthKm);
  }
  return cum;
}

/** Position and segment index of a bus along its route. */
function locate(bus: SimBus): { latlng: L.LatLngExpression; segIdx: number } {
  const stops = bus.route.stops;
  const total = bus.cum[bus.cum.length - 1]!;
  const d = bus.forward ? bus.progressKm : total - bus.progressKm;
  let i = 0;
  while (i < bus.cum.length - 2 && bus.cum[i + 1]! < d) i++;
  const a = STOP_BY_ID[stops[i]!]!;
  const b = STOP_BY_ID[stops[i + 1]!]!;
  const span = bus.cum[i + 1]! - bus.cum[i]!;
  const t = span > 0 ? Math.min(1, Math.max(0, (d - bus.cum[i]!) / span)) : 0;
  return { latlng: [a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t], segIdx: i };
}

export default function TransitMap(props: TransitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trafficRef = useRef<L.LayerGroup | null>(null);
  const segLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const journeyRef = useRef<L.LayerGroup | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);
  const fleetRef = useRef<L.LayerGroup | null>(null);
  const busesRef = useRef<SimBus[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [tilesFailed, setTilesFailed] = useState(false);

  /* ---------- create map once ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: DELHI_CENTER,
      zoom: 12,
      minZoom: 10,
      maxZoom: 17,
      zoomControl: false,
      preferCanvas: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    let loaded = 0;
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
      className: "map-tiles",
    });
    tiles.on("tileload", () => {
      loaded++;
      setTilesFailed(false);
    });
    tiles.addTo(map);
    const fallbackTimer = window.setTimeout(() => {
      if (loaded === 0) setTilesFailed(true);
    }, 6000);

    map.createPane("journey").style.zIndex = "450";
    map.createPane("stops").style.zIndex = "460";
    map.createPane("fleet").style.zIndex = "620";
    map.createPane("pins").style.zIndex = "640";

    // Traffic segments
    const traffic = L.layerGroup();
    for (const seg of SEGMENTS) {
      const a = STOP_BY_ID[seg.a]!;
      const b = STOP_BY_ID[seg.b]!;
      const line = L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        { weight: 6, opacity: 0.9, lineCap: "round" },
      );
      line.bindTooltip("", { sticky: true });
      segLinesRef.current.set(seg.id, line);
      line.addTo(traffic);
    }
    trafficRef.current = traffic;

    // Stops
    const stopsLayer = L.layerGroup().addTo(map);
    for (const s of STOPS) {
      const m = L.circleMarker([s.lat, s.lng], {
        pane: "stops",
        radius: s.popular ? 5 : 4,
        color: cssVar("--foreground"),
        weight: 2,
        fillColor: cssVar("--card"),
        fillOpacity: 1,
      });
      m.bindTooltip(`<strong>${s.name}</strong><br/><span style="opacity:.7">${s.area}</span>`, { direction: "top", offset: [0, -6] });
      m.on("click", (e) => {
        if (propsRef.current.pickMode) {
          L.DomEvent.stop(e);
          propsRef.current.onPickStop(s.id);
        }
      });
      m.addTo(stopsLayer);
    }

    journeyRef.current = L.layerGroup().addTo(map);
    pinsRef.current = L.layerGroup().addTo(map);
    fleetRef.current = L.layerGroup();

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (propsRef.current.pickMode) propsRef.current.onPickPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      window.clearTimeout(fallbackTimer);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      segLinesRef.current.clear();
      busesRef.current = [];
    };
  }, []);

  /* ---------- traffic colors ---------- */
  useEffect(() => {
    const map = mapRef.current;
    const traffic = trafficRef.current;
    if (!map || !traffic) return;
    for (const seg of SEGMENTS) {
      const line = segLinesRef.current.get(seg.id);
      if (!line) continue;
      const v = segmentSpeed(seg, props.day, props.minutes);
      const band = speedBand(v);
      line.setStyle({ color: bandColor(band) });
      const a = STOP_BY_ID[seg.a]!.name;
      const b = STOP_BY_ID[seg.b]!.name;
      line.setTooltipContent(
        `<strong>${a} ↔ ${b}</strong><br/>${Math.round(v)} km/h · ${bandLabel(band)}<br/><span style="opacity:.7">Free-flow ${seg.freeflow} km/h · ${seg.lengthKm.toFixed(1)} km</span>`,
      );
    }
    if (props.showTraffic && !map.hasLayer(traffic)) traffic.addTo(map);
    if (!props.showTraffic && map.hasLayer(traffic)) traffic.remove();
  }, [props.day, props.minutes, props.showTraffic]);

  /* ---------- picking cursor ---------- */
  useEffect(() => {
    containerRef.current?.classList.toggle("picking", !!props.pickMode);
  }, [props.pickMode]);

  /* ---------- origin / destination pins ---------- */
  useEffect(() => {
    const pins = pinsRef.current;
    const map = mapRef.current;
    if (!pins || !map) return;
    pins.clearLayers();
    const add = (p: { lat: number; lng: number; label: string }, cls: "origin" | "destination") => {
      L.marker([p.lat, p.lng], {
        pane: "pins",
        icon: L.divIcon({ className: "", html: `<div class="pin-marker ${cls}"><span>${cls === "origin" ? "A" : "B"}</span></div>`, iconSize: [0, 0] }),
        keyboard: false,
      })
        .bindTooltip(p.label, { direction: "top", offset: [0, -30] })
        .addTo(pins);
    };
    if (props.origin) add(props.origin, "origin");
    if (props.destination) add(props.destination, "destination");
  }, [props.origin, props.destination]);

  /* ---------- journey highlight ---------- */
  const selected = props.journeys.find((j) => j.id === props.selectedId) ?? props.journeys[0] ?? null;
  const journeySig = props.journeys.map((j) => j.id).join(",");
  useEffect(() => {
    const layer = journeyRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const routeColor = cssVar("--route");
    const casing = cssVar("--card");
    const ink = cssVar("--foreground");
    const bounds = L.latLngBounds([]);

    // Faint alternatives
    for (const j of props.journeys) {
      if (selected && j.id === selected.id) continue;
      for (const leg of j.legs) {
        if (leg.kind !== "bus") continue;
        const pts = leg.stops.map((id) => [STOP_BY_ID[id]!.lat, STOP_BY_ID[id]!.lng] as L.LatLngTuple);
        L.polyline(pts, { pane: "journey", color: routeColor, weight: 4, opacity: 0.28, dashArray: "2 8", lineCap: "round" })
          .on("click", (e) => {
            if (propsRef.current.pickMode) return;
            L.DomEvent.stop(e);
            propsRef.current.onSelectJourney(j.id);
          })
          .addTo(layer);
      }
    }

    if (selected) {
      let transferNo = 0;
      selected.legs.forEach((leg, idx) => {
        if (leg.kind === "walk") {
          const pts: L.LatLngTuple[] = [
            [leg.from.lat, leg.from.lng],
            [leg.to.lat, leg.to.lng],
          ];
          L.polyline(pts, { pane: "journey", color: ink, weight: 3, opacity: 0.75, dashArray: "1 7", lineCap: "round" }).addTo(layer);
          pts.forEach((p) => bounds.extend(p));
          return;
        }
        const pts = leg.stops.map((id) => [STOP_BY_ID[id]!.lat, STOP_BY_ID[id]!.lng] as L.LatLngTuple);
        L.polyline(pts, { pane: "journey", color: casing, weight: 11, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(layer);
        L.polyline(pts, { pane: "journey", color: routeColor, weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" })
          .bindTooltip(`Route <strong>${leg.route.number}</strong> · ${leg.from.name} → ${leg.to.name}`, { sticky: true })
          .addTo(layer);
        pts.forEach((p) => bounds.extend(p));
        // Transfer marker at the boarding stop of every bus leg after the first
        const prevBus = selected.legs.slice(0, idx).some((l) => l.kind === "bus");
        if (prevBus) {
          transferNo++;
          L.marker([leg.from.lat, leg.from.lng], {
            pane: "pins",
            icon: L.divIcon({ className: "", html: `<div class="transfer-marker">T${transferNo}</div>`, iconSize: [0, 0] }),
          })
            .bindTooltip(`<strong>Change here</strong><br/>${leg.from.name} → board ${leg.route.number}`, { direction: "top", offset: [0, -12] })
            .addTo(layer);
        }
      });
    }
    if (props.origin) bounds.extend([props.origin.lat, props.origin.lng]);
    if (props.destination) bounds.extend([props.destination.lat, props.destination.lng]);
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [70, 70], maxZoom: 14, duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeySig, selected?.id]);

  /* ---------- simulated fleet ---------- */
  useEffect(() => {
    const map = mapRef.current;
    const fleet = fleetRef.current;
    if (!map || !fleet) return;
    if (!props.showFleet) {
      fleet.remove();
      return;
    }
    fleet.addTo(map);
    if (busesRef.current.length === 0) {
      const now = Date.now();
      for (const route of ROUTES) {
        const cum = routeCum(route);
        const total = cum[cum.length - 1]!;
        for (const forward of [true, false]) {
          for (let k = 0; k < BUSES_PER_DIRECTION; k++) {
            const marker = L.marker([0, 0], {
              pane: "fleet",
              icon: L.divIcon({ className: "", html: `<div class="bus-marker fleet-${route.fleet}">${route.number}</div>`, iconSize: [0, 0] }),
              keyboard: false,
            });
            marker.bindTooltip("", { direction: "top", offset: [0, -10] });
            const bus: SimBus = {
              route,
              forward,
              progressKm: total * ((k + (forward ? 0.15 : 0.6) + Math.random() * 0.3) / BUSES_PER_DIRECTION) % total,
              cum,
              marker,
              pingAt: now - Math.random() * 8000,
              pingEvery: 3000 + Math.random() * 9000,
              speed: 0,
            };
            marker.setLatLng(locate(bus).latlng);
            marker.addTo(fleet);
            busesRef.current.push(bus);
          }
        }
      }
    }

    const tick = () => {
      const { day, minutes, journeys, selectedId } = propsRef.current;
      const sel = journeys.find((j) => j.id === selectedId) ?? journeys[0];
      const activeRoutes = new Set(sel ? sel.legs.flatMap((l) => (l.kind === "bus" ? [l.route.id] : [])) : []);
      const now = Date.now();
      for (const bus of busesRef.current) {
        const total = bus.cum[bus.cum.length - 1]!;
        const { segIdx } = locate(bus);
        const seg = SEGMENT_BY_KEY[segmentKey(bus.route.stops[segIdx]!, bus.route.stops[segIdx + 1]!)]!;
        // Small jitter so buses on the same road don't move in lockstep
        bus.speed = segmentSpeed(seg, day, minutes) * (0.9 + Math.random() * 0.2);
        bus.progressKm += (bus.speed * SIM_FACTOR) / 3600;
        if (bus.progressKm >= total) {
          bus.progressKm = 0;
          bus.forward = !bus.forward;
        }
        if (now - bus.pingAt > bus.pingEvery) {
          bus.pingAt = now;
          bus.pingEvery = 3000 + Math.random() * 9000;
        }
        bus.marker.setLatLng(locate(bus).latlng);
        const ago = Math.max(0, Math.round((now - bus.pingAt) / 1000));
        const towards = STOP_BY_ID[bus.forward ? bus.route.stops[bus.route.stops.length - 1]! : bus.route.stops[0]!]!.name;
        bus.marker.setTooltipContent(
          `<strong>Route ${bus.route.number}</strong> · to ${towards}<br/>${Math.round(bus.speed)} km/h · ${bandLabel(speedBand(bus.speed))}<br/><span style="opacity:.7">updated ${ago}s ago</span>`,
        );
        const el = bus.marker.getElement()?.firstElementChild;
        el?.classList.toggle("dim", activeRoutes.size > 0 && !activeRoutes.has(bus.route.id));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [props.showFleet]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="transit-map h-full w-full" aria-label="Map of Delhi bus network" />
      {tilesFailed && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[700] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-float">
          <MapPinOff className="size-3.5" /> Street tiles unavailable · showing schematic network
        </div>
      )}
    </div>
  );
}
