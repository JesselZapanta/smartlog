"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
Popover,
PopoverContent,
PopoverTrigger,
} from "@/components/ui/popover";
import { fromYMD, toYMD } from "@/lib/dates";

export function DatePicker({ value, onChange, placeholder = "Pick a date", maxDate, minDate, startYear = 1940, endYear }) {
const [open, setOpen] = useState(false);
const date = fromYMD(value);

const resolvedEndYear = endYear ?? new Date().getFullYear() + 6;

const startMonth = useMemo(() => {
const fallback = new Date(startYear, 0, 1);
if (minDate && minDate > fallback) {
return new Date(minDate.getFullYear(), minDate.getMonth(), 1);
}
return fallback;
}, [startYear, minDate]);

const endMonth = useMemo(() => {
const fallback = new Date(resolvedEndYear, 11, 1);
if (maxDate && maxDate < fallback) {
return new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
}
return fallback;
}, [resolvedEndYear, maxDate]);

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const todayDisabled =
(maxDate ? today > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : false) ||
(minDate ? today < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : false);

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
</Button>
</PopoverTrigger>
<PopoverContent className="w-auto p-0" align="start">
<Calendar
mode="single"
selected={date}
captionLayout="dropdown"
startMonth={startMonth}
endMonth={endMonth}
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
<div className="flex items-center justify-between border-t border-gray-100 py-2 pl-2 pr-2">
{value ? (
<button
type="button"
onClick={() => onChange("")}
className="rounded-lg px-3 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
>
Clear
</button>
) : (
<span />
)}
<button
type="button"
disabled={todayDisabled}
onClick={() => {
onChange(toYMD(today));
setOpen(false);
}}
className="rounded-lg px-3 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
>
Today
</button>
</div>
</PopoverContent>
</Popover>
);
}
