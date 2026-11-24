import { useMemo } from "react";
import { Clock } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DAYS, type Day } from "@/lib/transit/data";
import { cityStats, formatClock, speedBand } from "@/lib/transit/model";
import { cn } from "@/lib/utils";

const BAND_BG = {
  fast: "bg-traffic-fast",
  moderate: "bg-traffic-moderate",
  heavy: "bg-traffic-heavy",
  severe: "bg-traffic-severe",
} as const;

const QUICK = [
  { label: "8 AM", m: 8 * 60 },
  { label: "1 PM", m: 13 * 60 },
  { label: "6 PM", m: 18 * 60 },
  { label: "11 PM", m: 23 * 60 },
];

interface Props {
  day: Day;
  minutes: number;
  onDay: (d: Day) => void;
  onMinutes: (m: number) => void;
}

export function TimeControls({ day, minutes, onDay, onMinutes }: Props) {
  // City-wide average speed for each hour → traffic "skyline" above the slider.
  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => {
        const s = cityStats(day, h * 60 + 30);
        return { h, speed: s.avgSpeed, band: speedBand(s.avgSpeed) };
      }),
    [day],
  );
  const maxSpeed = Math.max(...hours.map((x) => x.speed));
  const currentHour = Math.floor(minutes / 60);

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={day}
        onValueChange={(v) => v && onDay(v as Day)}
        className="grid w-full grid-cols-7 gap-1"
        aria-label="Day of week"
      >
        {DAYS.map((d) => (
          <ToggleGroupItem
            key={d}
            value={d}
            className="h-8 rounded-md border border-input text-xs font-medium data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
          >
            {d}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5" /> Depart at
          </span>
          <span className="tabular text-lg font-semibold">{formatClock(minutes)}</span>
        </div>

        <div className="flex h-12 items-end gap-[2px]" aria-hidden>
          {hours.map((x) => (
            <button
              key={x.h}
              type="button"
              tabIndex={-1}
              onClick={() => onMinutes(x.h * 60)}
              title={`${formatClock(x.h * 60)} · ${Math.round(x.speed)} km/h avg`}
              className={cn(
                "flex-1 rounded-t-sm transition-all duration-500",
                BAND_BG[x.band],
                x.h === currentHour ? "opacity-100" : "opacity-35 hover:opacity-70",
              )}
              style={{ height: `${Math.round(Math.max(14, (1 - x.speed / maxSpeed) * 100 + 14))}%` }}
            />
          ))}
        </div>
        <Slider
          className="mt-2"
          min={0}
          max={1435}
          step={5}
          value={[minutes]}
          onValueChange={(v) => onMinutes(v[0] ?? minutes)}
          aria-label="Departure time"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground tabular">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => onMinutes(q.m)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                minutes === q.m ? "border-foreground bg-foreground text-background" : "border-input hover:border-foreground/40",
              )}
            >
              {q.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const idx = (now.getDay() + 6) % 7;
              onDay(DAYS[idx]!);
              onMinutes(Math.round((now.getHours() * 60 + now.getMinutes()) / 5) * 5);
            }}
            className="rounded-full border border-input px-2.5 py-0.5 text-xs transition-colors hover:border-foreground/40"
          >
            Now
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Bar height = how congested the city is each hour. Tap a bar to jump.</p>
      </div>
    </div>
  );
}
