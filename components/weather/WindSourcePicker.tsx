"use client"

import { ChangeEvent } from "react"
import {
  CURRENT_REFERENCE_OPTIONS,
  DEFAULT_WIND_REFERENCE_ID,
} from "@/lib/weather/config/currentLocations"
import type { CurrentReferenceOption } from "@/types/current"

type WindSourcePickerProps = {
  value?: string
  onChange?: (value: string, option?: CurrentReferenceOption) => void
  label?: string
  helperText?: string
  className?: string
}

export default function WindSourcePicker({
  value = DEFAULT_WIND_REFERENCE_ID,
  onChange,
  label = "Wind source",
  helperText = "Pick the wind reference that best matches the part of the course you care about.",
  className,
}: WindSourcePickerProps) {
  const windOptions = CURRENT_REFERENCE_OPTIONS.filter(
    (option) => option.type === "wind",
  )

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.target.value
    const selectedOption = windOptions.find((option) => option.id === nextValue)
    onChange?.(nextValue, selectedOption)
  }

  return (
    <div className={className}>
      <label
        htmlFor="wind-source-picker"
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <select
        id="wind-source-picker"
        value={value}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
      >
        {windOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-slate-400">{helperText}</p>
    </div>
  )
}
