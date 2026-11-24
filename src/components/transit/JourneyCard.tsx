import { ArrowRight, Bus, ChevronDown, Footprints, Repeat, Timer, TrendingUp } from "lucide-react";

import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { useTween } from "@/hooks/use-tween";
import { STOP_BY_ID } from "@/lib/transit/data";
import { formatClock, formatDuration, type Journey, type Leg } from "@/lib/transit/model";
import { cn } from "@/lib/utils";

const FLEET_BG = { ac: "bg-fleet-ac", cng: "bg-fleet-cng", electric: "bg-fleet-electric" } as const;
const FLEET_LABEL = { ac: "AC", cng: "CNG", electric: "e-Bus" } as const;

function RouteChip({ number, fleet }: { number: string; fleet: keyof typeof FLEET_BG }) {
  return (
    <span className={cn("tabular inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-primary-foreground", FLEET_BG[fleet])}>
      <Bus className="size-3" />
      {number}
    </span>
  );
}

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

function typeBadge(j: Journey) {
  if (j.type === "direct") return <Badge variant="direct">Direct</Badge>;
  if (j.type === "walk") return <Badge variant="walk">Walk only</Badge>;
  return <Badge variant="transfer">{j.transfers} transfer</Badge>;
}

interface Props {
  journey: Journey;
  index: number;
  selected: boolean;
  fastest: boolean;
  onSelect: () => void;
}

export function JourneyCard({ journey: j, index, selected, fastest, onSelect }: Props) {
  const total = useTween(j.totalMin);
  const quiet = Math.round(j.quietMin);
  const delay = Math.round(j.trafficDelayMin);
  const buses = j.legs.filter((l): l is Extract<Leg, { kind: "bus" }> => l.kind === "bus");

  // Proportions for the time bar
  const walk = j.legs.reduce((s, l) => s + (l.kind === "walk" ? l.minutes : 0), 0);
  const wait = buses.reduce((s, l) => s + l.waitMin, 0) + j.transfers * 2;
  const ride = buses.reduce((s, l) => s + l.rideMin, 0);
  const sum = walk + wait + ride || 1;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-all duration-300",
        selected ? "border-route shadow-float ring-1 ring-route" : "border-border shadow-card hover:border-foreground/25",
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full p-4 text-left focus-visible:outline-none" aria-expanded={selected}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tabular text-[11px] text-muted-foreground">Option {index + 1}</span>
              {typeBadge(j)}
              {fastest && <Badge variant="clear">Fastest</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {j.legs.map((l, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
                  {l.kind === "walk" ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Footprints className="size-3.5" />
                      {Math.round(l.minutes)}
                    </span>
                  ) : (
                    <RouteChip number={l.route.number} fleet={l.route.fleet} />
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="tabular text-2xl font-semibold leading-none">{Math.round(total)}<span className="ml-0.5 text-sm font-normal text-muted-foreground">min</span></div>
            <div className="tabular mt-1 text-xs text-muted-foreground">Arrive {formatClock(j.arriveMin)}</div>
          </div>
        </div>

        {/* time composition bar */}
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-foreground/35 transition-all duration-500" style={{ width: `${(walk / sum) * 100}%` }} />
          <div className="bg-accent transition-all duration-500" style={{ width: `${(wait / sum) * 100}%` }} />
          <div className="bg-route transition-all duration-500" style={{ width: `${(ride / sum) * 100}%` }} />
        </div>

        <div className="mt-3 space-y-1.5 text-xs">
          <p className="flex items-start gap-1.5">
            <TrendingUp className={cn("mt-px size-3.5 shrink-0", delay > 2 ? "text-traffic-severe" : "text-success")} />
            <span>
              <strong className="font-semibold">{Math.round(j.totalMin)} min now</strong> vs. ~{quiet} min at a quieter hour{" "}
              {delay > 2 ? (
                <Badge variant="delay" className="ml-0.5 px-1.5 py-0">+{delay} min traffic delay</Badge>
              ) : (
                <Badge variant="clear" className="ml-0.5 px-1.5 py-0">roads are clear</Badge>
              )}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="size-3.5 shrink-0" />
            Timetable says {formatDuration(j.timetableMin)}
            <span className="text-muted-foreground/70">· quietest around {formatClock(j.quietAtMin)}</span>
          </p>
        </div>
        <div className="mt-2 flex items-center justify-end text-[11px] font-medium text-route">
          {selected ? "Showing on map" : "Show on map"}
          <ChevronDown className={cn("ml-0.5 size-3.5 transition-transform", selected && "rotate-180")} />
        </div>
      </button>

      {selected && <LegTimeline journey={j} />}
    </article>
  );
}

function LegTimeline({ journey: j }: { journey: Journey }) {
  let busCount = 0;
  return (
    <ol className="fade-swap border-t border-border bg-secondary/40 px-4 py-3 text-sm">
      <TimelineRow dot="origin" time={formatClock(j.departMin)} title={j.legs[0]?.kind === "walk" ? j.legs[0].from.label : (j.legs[0] as Extract<Leg, { kind: "bus" }>).from.name} sub="Start" />
      {j.legs.map((leg, i) => {
        if (leg.kind === "walk") {
          const verb = leg.purpose === "transfer" ? "Walk to change stop" : leg.purpose === "egress" ? "Walk to destination" : leg.purpose === "direct" ? "Walk all the way" : "Walk to first stop";
          return (
            <TimelineRow key={i} dot="walk" icon={<Footprints className="size-3.5" />} title={verb} sub={`${fmtKm(leg.distanceKm)} · ${Math.round(leg.minutes)} min`} />
          );
        }
        busCount++;
        const isTransfer = busCount > 1;
        return (
          <Fragment key={i}>
            {isTransfer && (
              <TimelineRow dot="transfer" icon={<Repeat className="size-3.5" />} title={`Change at ${leg.from.name}`} sub="2 min transfer buffer" />
            )}
            <TimelineRow
              dot="bus"
              time={formatClock(leg.boardMin)}
              title={
                <span className="flex flex-wrap items-center gap-1.5">
                  Board <RouteChip number={leg.route.number} fleet={leg.route.fleet} /> at {leg.from.name}
                </span>
              }
              sub={`${FLEET_LABEL[leg.route.fleet]} · every ${leg.headway} min · expected wait ${Math.round(leg.waitMin)} min`}
            />
            <TimelineRow
              dot="ride"
              title={`Ride ${leg.stops.length - 1} major stops · ${fmtKm(leg.distanceKm)}`}
              sub={`${Math.round(leg.rideMin)} min at ~${Math.round(leg.avgSpeed)} km/h modeled${leg.stops.length > 2 ? ` · via ${leg.stops.slice(1, -1).map((id) => STOP_BY_ID[id]!.name).join(", ")}` : ""}`}
            />
            <TimelineRow dot="alight" time={formatClock(leg.alightMin)} title={`Get off at ${leg.to.name}`} />
          </Fragment>
        );
      })}
      <TimelineRow dot="destination" time={formatClock(j.arriveMin)} title={lastLabel(j)} sub="Arrive" last />
    </ol>
  );
}

function lastLabel(j: Journey) {
  const last = j.legs[j.legs.length - 1];
  if (!last) return "";
  return last.kind === "walk" ? last.to.label : last.to.name;
}

const DOT: Record<string, string> = {
  origin: "size-3 bg-foreground",
  destination: "size-3 bg-accent ring-2 ring-foreground",
  walk: "size-2 bg-muted-foreground",
  bus: "size-3 bg-route",
  ride: "size-0",
  alight: "size-3 bg-card ring-2 ring-route",
  transfer: "size-3 bg-card ring-2 ring-accent",
};

function TimelineRow({
  dot,
  time,
  title,
  sub,
  icon,
  last,
}: {
  dot: keyof typeof DOT | string;
  time?: string;
  title: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  last?: boolean;
}) {
  const line = dot === "ride" ? "bg-route w-1" : dot === "walk" ? "border-l-2 border-dotted border-muted-foreground/60 w-0" : "bg-border w-px";
  return (
    <li className="grid grid-cols-[3.75rem_1rem_1fr] gap-x-2">
      <span className="tabular pt-0.5 text-right text-[11px] text-muted-foreground">{time}</span>
      <span className="relative flex justify-center">
        {!last && <span className={cn("absolute top-0 bottom-0", line)} />}
        <span className={cn("relative z-10 mt-1 rounded-full", DOT[dot])} />
      </span>
      <div className={cn("min-w-0", last ? "pb-0" : "pb-3")}>
        <div className="flex items-center gap-1.5 font-medium leading-snug">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
        </div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </li>
  );
}
