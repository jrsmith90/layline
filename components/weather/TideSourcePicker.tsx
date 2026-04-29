

"use client"

import { ChangeEvent } from "react"
import {
  CURRENT_REFERENCE_OPTIONS,
  DEFAULT_TIDE_REFERENCE_ID,
} from "@/lib/weather/config/currentLocations"
import type { CurrentReferenceOption } from "@/types/current"

type TideSourcePickerProps = {
  value?: string
  onChange?: (value: string, option?: CurrentReferenceOption) => void
  label?: string
  helperText?: string
  className?: string
}

export default function TideSourcePicker({
  value = DEFAULT_TIDE_REFERENCE_ID,
  onChange,
  label = "Tide source",
  helperText = "Pick the tide reference you want to use for local tide stage and timing.",
  className,
}: TideSourcePickerProps) {
  const tideOptions = CURRENT_REFERENCE_OPTIONS.filter(
    (option) => option.type === "tide",
  )

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.target.value
    const selectedOption = tideOptions.find((option) => option.id === nextValue)
    onChange?.(nextValue, selectedOption)
  }

  return (
    <div className={className}>
      <label
        htmlFor="tide-source-picker"
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <select
        id="tide-source-picker"
        value={value}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
      >
        {tideOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-slate-400">{helperText}</p>
    </div>
  )
}
