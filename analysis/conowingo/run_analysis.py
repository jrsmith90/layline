#!/usr/bin/env python3
"""
Main entry point.
Usage:
    python run_analysis.py           # fetch (cached) + analyze + chart
    python run_analysis.py --refresh # force-refresh all API data
    python run_analysis.py --skip-charts
"""

import sys
import json
from pathlib import Path

import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from fetch_data import fetch_all, NOAA_CURRENT_STATIONS, PORTS_STATIONS
from analysis import run_analysis, build_results_table

FORCE_REFRESH = "--refresh" in sys.argv
SKIP_CHARTS = "--skip-charts" in sys.argv
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def print_plain_summary(results: dict, table: pd.DataFrame, data: dict):
    usgs = data["usgs"]
    discharge_h = results.get("discharge_h", pd.DataFrame())
    events = results.get("events", pd.DataFrame())

    print("\n" + "="*70)
    print("PLAIN-LANGUAGE SUMMARY")
    print("="*70)

    if not discharge_h.empty and "discharge_cfs" in discharge_h.columns:
        median_q = discharge_h["discharge_cfs"].median()
        p90_q = discharge_h["discharge_cfs"].quantile(0.90)
        max_q = discharge_h["discharge_cfs"].max()
        max_t = discharge_h.loc[discharge_h["discharge_cfs"].idxmax(), "time"]
        print(f"\nConowingo discharge character ({discharge_h['time'].min().year}–{discharge_h['time'].max().year}):")
        print(f"  Median flow:     {median_q:>10,.0f} cfs")
        print(f"  90th percentile: {p90_q:>10,.0f} cfs")
        print(f"  Maximum recorded:{max_q:>10,.0f} cfs (on {max_t.strftime('%Y-%m-%d')})")
        if not events.empty:
            print(f"\nIdentified {len(events)} high-flow release events over the analysis period.")
            print("Top 5 by peak discharge:")
            for _, ev in events.head(5).iterrows():
                print(f"  {ev['start'].strftime('%Y-%m-%d')} — peak {ev['peak_discharge_cfs']/1000:.0f}k cfs, {ev['duration_hours']:.0f}h above threshold")

    print("\nData availability:")
    for st in PORTS_STATIONS:
        obs = data["observed"].get(st["id"], pd.DataFrame())
        if not obs.empty:
            span = f"{obs['time'].min().strftime('%Y-%m-%d')} → {obs['time'].max().strftime('%Y-%m-%d')}"
            print(f"  PORTS observed {st['id']} ({st['name']}): {len(obs)} rows, {span}")
        else:
            print(f"  PORTS observed {st['id']}: NO DATA — residual analysis not possible for this station")

    for st in NOAA_CURRENT_STATIONS:
        pred = data["predictions"].get(st["id"], pd.DataFrame())
        if not pred.empty:
            print(f"  Predictions {st['id']}: {len(pred)} rows")
        else:
            print(f"  Predictions {st['id']}: NO DATA")

    wind = data.get("wind", pd.DataFrame())
    if not wind.empty:
        print(f"  NDBC wind 44063: {len(wind)} hourly obs, {wind['time'].min().year}–{wind['time'].max().year}")
    else:
        print("  NDBC wind 44063: NO DATA — wind-control analysis skipped")

    print("\n" + "-"*70)
    print("RESULTS TABLE")
    print("-"*70)
    if not table.empty:
        pd.set_option("display.max_columns", None)
        pd.set_option("display.width", 120)
        pd.set_option("display.float_format", lambda x: f"{x:.3f}" if pd.notnull(x) else "n/a")
        print(table.to_string(index=False))

    print("\n" + "-"*70)
    print("INTERPRETATION")
    print("-"*70)

    valid = table.dropna(subset=["Max |r|"])
    if valid.empty:
        print("Insufficient data for empirical interpretation.")
        print("See LIMITATIONS section below.")
    else:
        has_effect = valid[valid["Max |r|"].abs() > 0.1]
        if not has_effect.empty:
            print("\nStations with detectable discharge signal (|r| > 0.10):")
            for _, row in has_effect.iterrows():
                lag = row["Lag at Max (hr)"]
                r = row["Max |r|"]
                dkt = row["Δ kt per 50k cfs"]
                rp = row["r_partial (wind ctrl)"]
                direction = "ebb-ward" if isinstance(r, float) and r > 0 else "flood-ward"
                lag_str = f"{lag:.0f}h" if pd.notnull(lag) else "n/a"
                dkt_str = f"{dkt:+.3f} kt" if pd.notnull(dkt) else "n/a"
                rp_str = f"{rp:.3f}" if pd.notnull(rp) else "n/a"
                print(f"\n  {row['Station ID']} ({row['Waypoint']}):")
                print(f"    Peak |r|={r:.3f} at lag={lag_str}; r_partial={rp_str} after wind control")
                print(f"    Δ current ≈ {dkt_str} per 50,000 cfs of excess discharge (direction: {direction})")
        else:
            print("No stations showed a correlation > 0.10 between discharge anomaly")
            print("and tidal current predictions. This is most likely because predicted")
            print("(harmonic) currents don't contain any river signal by definition.")
            print("See LIMITATIONS below.")

    print("\n" + "-"*70)
    print("LIMITATIONS & DATA GAPS")
    print("-"*70)
    print("""
1. CORE LIMITATION — Predicted vs. Observed Currents:
   The harmonic (predicted) tidal currents used for most stations contain NO
   river-flow signal — they are purely astronomical. Cross-correlating discharge
   against predicted currents therefore measures whether large discharge events
   happen to coincide with tidal phase, not whether discharge *changes* the
   current. A meaningful analysis requires observed current minus predicted
   (the "residual"). Observed data (PORTS) is only available for the recent
   retention window (~30-90 days), severely limiting historical analysis.

2. PORTS Station Availability:
   cb1102 (Bay Bridge) and cb1001 (Cove Point) are the only PORTS current
   stations on this course with real-time observations. Even if PORTS data
   is available, 90 days may contain only 1-2 high-flow events, making
   correlation coefficients unreliable.

3. Transit Time Physical Expectation:
   Based on Chesapeake Bay estuarine flushing studies (e.g., Boicourt 1973,
   Pritchard 1952), freshwater from Conowingo reaches the mid-Bay in roughly
   2-8 weeks during low-flow and 3-7 days during major flood events — meaning
   lags at Point No Point could be 100-200 hours even for major releases.
   Our 240h (10-day) cross-correlation window captures only the fast end of
   this range.

4. CBIBS Salinity:
   The CBIBS API (buoybay.noaa.gov) requires a free API key for data access.
   Salinity was not fetched. A freshwater pulse from Conowingo is directly
   detectable as a salinity drop 2-5 days ahead of any current anomaly —
   this would be the most robust physical confirmation.

5. Wind Confounding:
   Major discharge events are storm-driven; the same weather that causes
   dam releases also causes strong winds. Partial correlation controlling
   for NDBC 44063 wind speed reduces but does not eliminate this confound.
   A proper analysis would use multiple wind stations and a spatial wind model.

6. One-Dimensional Analysis:
   Tidal current stations measure along-channel velocity only. River discharge
   creates a 3D stratified response; the surface ebb anomaly and sub-surface
   response differ. A full picture requires ADCP profiles, not just surface
   observations.
""")


def main():
    print(f"{'='*70}")
    print("Conowingo Dam Discharge vs. Chesapeake Bay Current Analysis")
    print(f"{'='*70}")

    data = fetch_all(start_year=2022, force_refresh=FORCE_REFRESH)

    print("\nRunning analysis pipeline...")
    results = run_analysis(data)

    if not results:
        print("Analysis failed — check data fetch errors above.")
        return

    table = build_results_table(results, NOAA_CURRENT_STATIONS)

    # Save results
    results_path = OUTPUT_DIR / "results_table.csv"
    table.to_csv(results_path, index=False)
    print(f"\nResults table saved: {results_path}")

    if not SKIP_CHARTS:
        from charts import (
            chart_discharge_history,
            chart_xcorr_by_station,
            chart_event_case_study,
            chart_lag_vs_distance,
        )
        print("\nGenerating charts...")
        chart_discharge_history(results["discharge_h"], results["events"])
        chart_xcorr_by_station(results["xcorr"], NOAA_CURRENT_STATIONS)
        chart_event_case_study(results["discharge_h"], data["predictions"], results["events"])
        chart_lag_vs_distance(results["xcorr"], NOAA_CURRENT_STATIONS)
        from charts import chart_salinity_vs_discharge
        chart_salinity_vs_discharge(
            results["discharge_h"], results.get("sal_anomalies", {}),
            results["events"], results.get("sal_xcorr", {})
        )

    print_plain_summary(results, table, data)
    print(f"\nAll outputs in: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
