"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fromYMD, toYMD } from "@/lib/dates";

export function DatePicker({ value, onChange, placeholder = "Pick a date", maxDate, minDate }) {
  const [open, setOpen] = useState(false);
  const date = fromYMD(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start rounded-xl border-gray-200 bg-white px-3.5 font-normal text-gray-900 shadow-none hover:bg-gray-50 hover:text-gray-900"
        >
          <CalendarIcon size={16} className="mr-2 shrink-0 text-gray-400" />
          {date ? (
            <span>{format(date, "MMM d, yyyy")}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          {date && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  onChange("");
                }
              }}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={14} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) => {
            if (selected) {
              onChange(toYMD(selected));
              setOpen(false);
            }
          }}
          disabled={(day) =>
            (maxDate ? day > maxDate : false) || (minDate ? day < minDate : false)
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
