import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, countryByCode } from "@/lib/countries";
import { cn } from "@/lib/utils";

export default function CountrySelector({ value, onChange, disabled = false }: { value: string; onChange: (code: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = countryByCode(value || "");
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between font-normal">
        {selected ? `${selected.name} (${selected.code})` : "Search for a country"}
        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
      <Command>
        <CommandInput placeholder="Search country, code, or dial code…" />
        <CommandList>
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup>
            {COUNTRIES.map(country => <CommandItem key={country.code} value={`${country.name} ${country.code} ${country.dial}`} onSelect={() => { onChange(country.code); setOpen(false); }}>
              <Check className={cn("mr-2 h-4 w-4", value === country.code ? "opacity-100" : "opacity-0")} />
              <span>{country.name}</span><span className="ml-auto text-xs text-muted-foreground">{country.dial}</span>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
