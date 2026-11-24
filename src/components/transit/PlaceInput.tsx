import { useState } from "react";
import { Crosshair, MapPin, Navigation, Star } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { STOPS } from "@/lib/transit/data";
import { placeFromStop, type Place } from "@/lib/transit/model";
import { cn } from "@/lib/utils";

const COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

interface Props {
  label: string;
  marker: "A" | "B";
  value: Place | null;
  onChange: (p: Place) => void;
  onPickOnMap: () => void;
  picking: boolean;
}

export function PlaceInput({ label, marker, value, onChange, onPickOnMap, picking }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const coord = query.match(COORD_RE);
  const popular = STOPS.filter((s) => s.popular);

  const choose = (p: Place) => {
    onChange(p);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg border border-input bg-card px-3 py-2.5 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            picking && "border-accent ring-2 ring-accent/50",
          )}
        >
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full font-display text-xs font-bold",
              marker === "A" ? "bg-foreground text-background" : "bg-accent text-accent-foreground",
            )}
          >
            {marker}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className={cn("block truncate text-sm font-medium", !value && "text-muted-foreground")}>
              {picking ? "Click a point on the map…" : (value?.label ?? "Choose a stop or landmark")}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search stops, or type 28.61, 77.21" value={query} onValueChange={setQuery} />
          <CommandList className="scrollbar-thin max-h-72">
            <CommandEmpty>No stop found. Try coordinates like 28.61, 77.21.</CommandEmpty>
            {coord && (
              <CommandGroup heading="Custom location">
                <CommandItem
                  value={`coords ${query}`}
                  onSelect={() => {
                    const lat = Number(coord[1]);
                    const lng = Number(coord[2]);
                    choose({ lat, lng, label: `Pinned ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
                  }}
                >
                  <Navigation /> Use {Number(coord[1]).toFixed(4)}, {Number(coord[2]).toFixed(4)}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              <CommandItem
                value="pick on map choose point"
                onSelect={() => {
                  setOpen(false);
                  onPickOnMap();
                }}
              >
                <Crosshair /> Pick a point on the map
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Popular">
              {popular.map((s) => (
                <CommandItem key={`p-${s.id}`} value={`popular ${s.name} ${s.area}`} onSelect={() => choose(placeFromStop(s.id))}>
                  <Star className="text-accent" />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.area}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="All stops">
              {STOPS.filter((s) => !s.popular).map((s) => (
                <CommandItem key={s.id} value={`${s.name} ${s.area}`} onSelect={() => choose(placeFromStop(s.id))}>
                  <MapPin />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.area}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
