import { Activity, Bus, Layers } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTween } from "@/hooks/use-tween";
import type { Day } from "@/lib/transit/data";
import { SPEED_BANDS, cityStats, formatClock } from "@/lib/transit/model";
import { cn } from "@/lib/utils";

const BAND_BG = {
  fast: "bg-traffic-fast",
  moderate: "bg-traffic-moderate",
  heavy: "bg-traffic-heavy",
  severe: "bg-traffic-severe",
} as const;

interface Props {
  day: Day;
  minutes: number;
  showTraffic: boolean;
  showFleet: boolean;
  onTraffic: (v: boolean) => void;
  onFleet: (v: boolean) => void;
}

export function NetworkStatus({ day, minutes, showTraffic, showFleet, onTraffic, onFleet }: Props) {
  const stats = cityStats(day, minutes);
  const avg = useTween(stats.avgSpeed);
  const label = SPEED_BANDS.find((b) => b.band === stats.band)?.label;

  return (
    <div className="w-[230px] rounded-xl border border-border bg-card p-3 shadow-float">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="live-dot" /> Modeled network
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="tabular text-2xl font-semibold">{Math.round(avg)}</span>
        <span className="text-xs text-muted-foreground">km/h avg</span>
        <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground", BAND_BG[stats.band])}>{label}</span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {day} {formatClock(minutes)} · {Math.round(stats.congestedShare * 100)}% of corridors congested
      </div>
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="traffic-toggle" className="flex items-center gap-1.5 text-xs font-medium">
            <Layers className="size-3.5" /> Traffic speeds
          </Label>
          <Switch id="traffic-toggle" checked={showTraffic} onCheckedChange={onTraffic} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="fleet-toggle" className="flex items-center gap-1.5 text-xs font-medium">
            <Bus className="size-3.5" /> Live bus fleet
          </Label>
          <Switch id="fleet-toggle" checked={showFleet} onCheckedChange={onFleet} />
        </div>
      </div>
    </div>
  );
}

export function Legend({ showFleet }: { showFleet: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-[11px] shadow-float">
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-muted-foreground">
        <Activity className="size-3.5" /> Bus speed
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {SPEED_BANDS.map((b) => (
          <span key={b.band} className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-4 rounded-full", BAND_BG[b.band])} />
            {b.label}
            <span className="tabular text-muted-foreground">{b.min > 0 ? `${b.min}+` : "<11"}</span>
          </span>
        ))}
      </div>
      {showFleet && (
        <div className="mt-2 flex gap-2 border-t border-border pt-2">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-fleet-ac" />AC</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-fleet-cng" />CNG</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-fleet-electric" />e-Bus</span>
        </div>
      )}
    </div>
  );
}
