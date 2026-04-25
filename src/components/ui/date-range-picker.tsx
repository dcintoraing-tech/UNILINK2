"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange, SelectRangeEventHandler } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [lastClick, setLastClick] = React.useState<{ time: number; day: Date } | null>(null);
  const DOUBLE_CLICK_THRESHOLD_MS = 300;

  const handleSelect: SelectRangeEventHandler = (range, selectedDay, activeModifiers) => {
    if (activeModifiers.disabled) {
      return;
    }
    
    const now = Date.now();

    // Check for double click on the same day
    if (lastClick && lastClick.day.getTime() === selectedDay.getTime() && (now - lastClick.time < DOUBLE_CLICK_THRESHOLD_MS)) {
      onDateChange({ from: selectedDay, to: selectedDay });
      setLastClick(null); // Reset after double click
      return; 
    }

    // This is a single click, update last click info for the next potential double click
    setLastClick({ time: now, day: selectedDay });

    // For single clicks, we let react-day-picker's range logic handle it.
    onDateChange(range);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <div className="flex-1 min-w-0">
                <div className="truncate">
                {date?.from ? (
                    date.to ? (
                        date.from.getTime() === date.to.getTime() ? (
                            format(date.from, "PPP", { locale: es })
                        ) : (
                            <>
                                {format(date.from, "PPP", { locale: es })} -{" "}
                                {format(date.to, "PPP", { locale: es })}
                            </>
                        )
                    ) : (
                        format(date.from, "PPP", { locale: es })
                    )
                ) : (
                    <span>Selecciona un rango</span>
                )}
                </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
