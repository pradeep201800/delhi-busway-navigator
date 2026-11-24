import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useMemo, useState } from "react";
import { ArrowUpDown, BusFront, Crosshair, Route as RouteIcon, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PlaceInput } from "@/components/transit/PlaceInput";
import { TimeControls } from "@/components/transit/TimeControls";
import { JourneyCard } from "@/components/transit/JourneyCard";
import { ModelDrawer } from "@/components/transit/ModelDrawer";
import { Legend, NetworkStatus } from "@/components/transit/MapOverlay";
import type { PickTarget } from "@/components/transit/map-types";
import { PRESETS, STOP_BY_ID, type Day, type StopId } from "@/lib/transit/data";
import { placeFromStop, planJourneys, type LatLng, type Place } from "@/lib/transit/model";

const TransitMap = lazy(() => import("@/components/transit/TransitMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delhi Bus Traffic Model & Journey Planner" },
      {
        name: "description",
        content: "Plan Delhi bus trips and see how modeled live traffic speeds change travel time versus the timetable.",
      },
      { property: "og:title", content: "Delhi Bus Traffic Model & Journey Planner" },
      {
        property: "og:description",
        content: "Compare live-traffic bus journey times across Delhi with quieter hours and static timetables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT = PRESETS[0]!;

function MapFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <BusFront className="size-4 animate-pulse" /> Loading Delhi map…
      </span>
    </div>
  );
}

function Index() {
  const [origin, setOrigin] = useState<Place | null>(() => placeFromStop(DEFAULT.origin));
  const [destination, setDestination] = useState<Place | null>(() => placeFromStop(DEFAULT.destination));
  const [day, setDay] = useState<Day>(DEFAULT.day);
  const [minutes, setMinutes] = useState(DEFAULT.minutes);
  const [activePreset, setActivePreset] = useState<string | null>(DEFAULT.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showFleet, setShowFleet] = useState(true);
  const [pickMode, setPickMode] = useState<PickTarget | null>(null);

  const journeys = useMemo(
    () => (origin && destination ? planJourneys(origin, destination, day, minutes) : []),
    [origin, destination, day, minutes],
  );
  const selected = journeys.find((j) => j.id === selectedId) ?? journeys[0] ?? null;
  const fastestId = journeys.reduce<string | null>(
    (best, j) => (best === null || j.totalMin < journeys.find((x) => x.id === best)!.totalMin ? j.id : best),
    null,
  );

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setOrigin(placeFromStop(p.origin));
    setDestination(placeFromStop(p.destination));
    setDay(p.day);
    setMinutes(p.minutes);
    setActivePreset(p.id);
    setSelectedId(null);
    setPickMode(null);
  };

  const clearPreset = () => setActivePreset(null);

  const setPlace = (target: PickTarget, p: Place) => {
    if (target === "origin") setOrigin(p);
    else setDestination(p);
    setSelectedId(null);
    clearPreset();
  };

  const onPickPoint = (ll: LatLng) => {
    if (!pickMode) return;
    setPlace(pickMode, { ...ll, label: `Pinned ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}` });
    toast.success(`${pickMode === "origin" ? "Start" : "Destination"} pinned on the map`);
    setPickMode(null);
  };
  const onPickStop = (id: StopId) => {
    if (!pickMode) return;
    setPlace(pickMode, placeFromStop(id));
    toast.success(`${pickMode === "origin" ? "Start" : "Destination"} set to ${STOP_BY_ID[id]!.name}`);
    setPickMode(null);
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
    setSelectedId(null);
    clearPreset();
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      {/* Top bar */}
      <header className="bg-header text-header-foreground">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <BusFront className="size-5" />
            </span>
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold sm:text-xl">Delhi Bus Fleet Traffic Model</h1>
              <p className="text-xs text-header-muted">& Journey Planner · live speeds vs. static timetables</p>
            </div>
          </div>
          <nav aria-label="Demo scenarios" className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:ml-auto lg:px-0 lg:pb-0">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={activePreset === p.id ? "chipActive" : "chip"}
                onClick={() => applyPreset(p.id)}
                className="h-auto shrink-0 flex-col items-start gap-0 px-3 py-1.5 text-left"
              >
                <span className="text-xs font-semibold">{p.label}</span>
                <span className="tabular text-[10px] opacity-75">{p.tag}</span>
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Planner panel */}
        <aside className="scrollbar-thin w-full border-border lg:w-[440px] lg:shrink-0 lg:overflow-y-auto lg:border-r">
          <section className="space-y-3 p-4">
            <div className="relative space-y-2">
              <PlaceInput
                label="From"
                marker="A"
                value={origin}
                onChange={(p) => setPlace("origin", p)}
                onPickOnMap={() => setPickMode("origin")}
                picking={pickMode === "origin"}
              />
              <PlaceInput
                label="To"
                marker="B"
                value={destination}
                onChange={(p) => setPlace("destination", p)}
                onPickOnMap={() => setPickMode("destination")}
                picking={pickMode === "destination"}
              />
              <Button
                variant="mapControl"
                size="icon"
                onClick={swap}
                aria-label="Swap start and destination"
                className="absolute top-1/2 right-3 size-8 -translate-y-1/2 rounded-full"
              >
                <ArrowUpDown />
              </Button>
            </div>

            <TimeControls
              day={day}
              minutes={minutes}
              onDay={(d) => {
                setDay(d);
                clearPreset();
              }}
              onMinutes={(m) => {
                setMinutes(m);
                clearPreset();
              }}
            />
          </section>

          <section className="space-y-3 px-4 pb-6" aria-live="polite">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-bold">
                <RouteIcon className="size-4 text-primary" /> Journey options
              </h2>
              <span className="text-xs text-muted-foreground">{journeys.length} found</span>
            </div>
            {journeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {origin && destination
                  ? "No bus connection found nearby. Try a stop closer to a main road."
                  : "Choose a start and destination to see options."}
              </div>
            ) : (
              journeys.map((j, i) => (
                <JourneyCard
                  key={j.id}
                  journey={j}
                  index={i}
                  selected={selected?.id === j.id}
                  fastest={j.id === fastestId && journeys.length > 1}
                  onSelect={() => setSelectedId(j.id)}
                />
              ))
            )}
          </section>
        </aside>

        {/* Map */}
        <section className="relative h-[75vh] min-h-[480px] flex-1 lg:h-auto" aria-label="Delhi traffic map">
          <ClientOnly fallback={<MapFallback />}>
            <Suspense fallback={<MapFallback />}>
              <TransitMap
                day={day}
                minutes={minutes}
                origin={origin}
                destination={destination}
                journeys={journeys}
                selectedId={selected?.id ?? null}
                showTraffic={showTraffic}
                showFleet={showFleet}
                pickMode={pickMode}
                onPickPoint={onPickPoint}
                onPickStop={onPickStop}
                onSelectJourney={setSelectedId}
              />
            </Suspense>
          </ClientOnly>

          <div className="pointer-events-none absolute inset-0 z-[500] p-3">
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="pointer-events-auto">
                  <NetworkStatus
                    day={day}
                    minutes={minutes}
                    showTraffic={showTraffic}
                    showFleet={showFleet}
                    onTraffic={setShowTraffic}
                    onFleet={setShowFleet}
                  />
                </div>
                {pickMode && (
                  <div className="pointer-events-auto fade-swap flex items-center gap-2 rounded-full bg-header px-3 py-2 text-xs text-header-foreground shadow-float">
                    <Crosshair className="size-4 text-accent" />
                    Click the map or a stop to set your {pickMode === "origin" ? "start" : "destination"}
                    <button type="button" onClick={() => setPickMode(null)} aria-label="Cancel picking" className="rounded-full p-0.5 hover:bg-header-chip">
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start gap-2 pr-12 sm:flex-row sm:items-end sm:justify-between">
                <div className="pointer-events-auto hidden sm:block">
                  <Legend showFleet={showFleet} />
                </div>
                <div className="pointer-events-auto w-full sm:w-auto">
                  <ModelDrawer day={day} minutes={minutes} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
