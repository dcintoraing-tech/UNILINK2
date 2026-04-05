
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "./scroll-area"

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    name?: string;
    defaultValue?: string;
    placeholder?: string;
    emptyMessage?: string;
    searchPlaceholder?: string;
    onValueChange?: (value: string) => void;
    value?: string;
}

export function Combobox({ 
    options, 
    name, 
    defaultValue,
    placeholder = "Select an option",
    emptyMessage = "No option found.",
    searchPlaceholder = "Search...",
    value: controlledValue,
    onValueChange: setControlledValue
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")

  const isControlled = controlledValue !== undefined && setControlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const setValue = isControlled ? setControlledValue : setInternalValue;

  React.useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue || "");
    }
  }, [defaultValue, isControlled]);

  const selectedLabel = React.useMemo(() => {
    return options.find((option) => option.value === value)?.label
  }, [options, value]);

  const hiddenInput = name ? <input type="hidden" name={name} value={value} /> : null;

  return (
    <>
      {hiddenInput}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {value && selectedLabel ? selectedLabel : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <ScrollArea className="max-h-72">
                    <CommandGroup>
                        {options.map((option) => (
                        <CommandItem
                            key={option.value}
                            value={option.label}
                            onSelect={(currentLabel) => {
                                const selectedOption = options.find(o => o.label === currentLabel);
                                setValue(selectedOption ? selectedOption.value : "")
                                setOpen(false)
                            }}
                        >
                            <Check
                            className={cn(
                                "mr-2 h-4 w-4",
                                value === option.value ? "opacity-100" : "opacity-0"
                            )}
                            />
                            {option.label}
                        </CommandItem>
                        ))}
                    </CommandGroup>
                </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}

    