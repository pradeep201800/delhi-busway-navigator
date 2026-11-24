import { useState } from "react";
import { ChevronUp, FlaskConical } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Day } from "@/lib/transit/data";
import { FREEFLOW_KMH, TRANSFER_BUFFER_MIN, WALK_KMH, formatClock, timeMultiplier } from "@/lib/transit/model";
import { cn } from "@/lib/utils";

export function ModelDrawer({ day, minutes }: { day: Day; minutes: number }) {
  const [open, setOpen] = useState(false);
  const mult = timeMultiplier(day, minutes);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-float sm:w-[340px]">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-secondary/60">
        <FlaskConical className="size-4 text-primary" />
        <span className="flex-1">How the model works</span>
        <span className="tabular rounded bg-secondary px-1.5 py-0.5 text-[11px]">×{mult.toFixed(2)}</span>
        <ChevronUp className={cn("size-4 transition-transform", !open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="scrollbar-thin max-h-[50vh] overflow-y-auto border-t border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          Everything runs in your browser on simulated data. Each road segment between two stops gets a modeled bus speed for{" "}
          <strong className="text-foreground">{day} {formatClock(minutes)}</strong>:
        </p>
        <div className="tabular my-2 rounded-md bg-secondary px-2.5 py-2 text-[11px] text-foreground">
          speed = free-flow × (time factor)<sup>hotspot</sup>
        </div>
        <ul className="space-y-1.5">
          <li>
            <strong className="text-foreground">Free-flow speeds:</strong> ring road {FREEFLOW_KMH.ring}, outer {FREEFLOW_KMH.outer}, arterial{" "}
            {FREEFLOW_KMH.arterial}, central {FREEFLOW_KMH.central} km/h.
          </li>
          <li>
            <strong className="text-foreground">Time factor</strong> comes from an hourly speed profile (weekday, Saturday, Sunday). Right now it is{" "}
            <span className="tabular text-foreground">{mult.toFixed(2)}</span> (1.00 = empty roads).
          </li>
          <li>
            <strong className="text-foreground">Hotspots</strong> like ITO, Ashram and AIIMS have a higher exponent, so they slow down more at peak.
          </li>
          <li>
            <strong className="text-foreground">Dwell time</strong> per stop grows with crowding; you also wait half the route's headway on average.
          </li>
          <li>
            <strong className="text-foreground">Transfers</strong> add a {TRANSFER_BUFFER_MIN} min buffer; walking is {WALK_KMH} km/h with a 1.25× street detour.
          </li>
          <li>
            <strong className="text-foreground">Quieter hour</strong> = the fastest departure for the same trip between 5 AM and 11 PM that day.
          </li>
          <li>
            <strong className="text-foreground">Timetable</strong> assumes fixed scheduled speeds and no waiting, like a printed schedule.
          </li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
