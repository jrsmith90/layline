#!/usr/bin/env python3
"""
Conowingo discharge vs. Bay current analysis:
1. Identify release events (discharge anomalies)
2. Compute tidal residuals where observed data exists
3. Cross-correlate discharge vs current at lags 0-240h
4. Partial correlation controlling for wind
5. Summarize results per station
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import signal, stats

# ─── Event detection ─────────────────────────────────────────────────────────

def compute_discharge_anomaly(usgs_df: pd.DataFrame, window_days: int = 30) -> pd.DataFrame:
    """
    Resample USGS 15-min data to hourly.
    Compute rolling 30-day median baseline.
    Anomaly = discharge - baseline.
    Flag events where discharge > 2x rolling median AND > 50,000 cfs.
    """
    if usgs_df.empty:
        return pd.DataFrame()

    df = usgs_df.copy()
    # Normalize timestamps: parse and strip timezone for consistent resampling
    t = pd.to_datetime(df["time"], utc=True, errors="coerce")
    df["time"] = t.dt.tz_convert("US/Eastern").dt.tz_localize(None)
    df = df.set_index("time").sort_index()

    if "discharge_cfs" not in df.columns:
        print("  ERROR: No discharge_cfs column in USGS data")
        return pd.DataFrame()

    # Hourly mean
    df_h = df["discharge_cfs"].resample("1h").mean().to_frame("discharge_cfs")
    df_h = df_h.dropna()

    # 30-day rolling median (720 hours)
    df_h["baseline_cfs"] = df_h["discharge_cfs"].rolling(window=720, min_periods=48, center=False).median()
    df_h["anomaly_cfs"] = df_h["discharge_cfs"] - df_h["baseline_cfs"]

    # Relative ratio
    df_h["ratio"] = df_h["discharge_cfs"] / df_h["baseline_cfs"].clip(lower=1)

    # Event flag: 2x baseline OR > 50k cfs and meaningfully above baseline
    p90 = df_h["discharge_cfs"].quantile(0.90)
    high_threshold = max(50_000, p90)
    df_h["is_high_flow"] = (df_h["discharge_cfs"] > high_threshold) | (df_h["ratio"] > 2.0)

    print(f"  Discharge stats:")
    print(f"    Overall median:  {df_h['discharge_cfs'].median():>10,.0f} cfs")
    print(f"    Overall mean:    {df_h['discharge_cfs'].mean():>10,.0f} cfs")
    print(f"    90th percentile: {p90:>10,.0f} cfs")
    print(f"    Max:             {df_h['discharge_cfs'].max():>10,.0f} cfs")
    print(f"    High-flow hours: {df_h['is_high_flow'].sum():>10,} ({df_h['is_high_flow'].mean()*100:.1f}% of time)")
    print(f"    Event threshold: >{high_threshold:,.0f} cfs or >2x rolling median")

    return df_h.reset_index()


def identify_release_events(df_h: pd.DataFrame, min_duration_hours: int = 12) -> pd.DataFrame:
    """
    Group contiguous high-flow hours into discrete events.
    Returns one row per event with start, end, peak, duration, total volume.
    """
    if df_h.empty:
        return pd.DataFrame()

    df_h = df_h.set_index("time").sort_index()
    high = df_h["is_high_flow"].astype(int)

    # Label contiguous groups
    group = (high.diff() != 0).cumsum()
    events = []
    for g_id, grp in df_h.groupby(group):
        if not grp["is_high_flow"].any():
            continue
        duration = len(grp)
        if duration < min_duration_hours:
            continue
        events.append({
            "start": grp.index[0],
            "end": grp.index[-1],
            "duration_hours": duration,
            "peak_discharge_cfs": grp["discharge_cfs"].max(),
            "mean_discharge_cfs": grp["discharge_cfs"].mean(),
            "peak_anomaly_cfs": grp["anomaly_cfs"].max() if "anomaly_cfs" in grp.columns else np.nan,
            "baseline_cfs": grp["baseline_cfs"].mean() if "baseline_cfs" in grp.columns else np.nan,
        })

    events_df = pd.DataFrame(events)
    if not events_df.empty:
        events_df = events_df.sort_values("peak_discharge_cfs", ascending=False)
    print(f"  Identified {len(events_df)} release events (≥{min_duration_hours}h duration)")
    if not events_df.empty:
        print(f"  Top 5 events by peak discharge:")
        for _, ev in events_df.head(5).iterrows():
            print(f"    {ev['start'].strftime('%Y-%m-%d')} | peak={ev['peak_discharge_cfs']:>9,.0f} cfs | {ev['duration_hours']:>4}h")
    return events_df


# ─── Tidal residual computation ───────────────────────────────────────────────

def compute_residual(
    observed_df: pd.DataFrame,
    predicted_df: pd.DataFrame,
    station_id: str,
) -> pd.DataFrame:
    """
    Merge observed and predicted on hourly timestamps; compute residual.
    observed_df must have columns: time, speed_kts (from PORTS)
    predicted_df must have columns: time, velocity_kts or speed_kts
    Returns DataFrame: time, observed_kts, predicted_kts, residual_kts
    """
    if observed_df.empty:
        return pd.DataFrame()

    obs = observed_df.copy()
    pred = predicted_df.copy()

    # Normalize column names
    if "speed_kts" in obs.columns and "velocity_kts" not in obs.columns:
        obs["velocity_kts"] = obs["speed_kts"]
    if "speed_kts" in pred.columns and "velocity_kts" not in pred.columns:
        pred["velocity_kts"] = pred["speed_kts"]

    # Round to nearest hour for merge
    obs["time_h"] = pd.to_datetime(obs["time"]).dt.round("1h")
    pred["time_h"] = pd.to_datetime(pred["time"]).dt.round("1h")

    obs_h = obs.groupby("time_h")["velocity_kts"].mean().reset_index(name="observed_kts")
    pred_h = pred.groupby("time_h")["velocity_kts"].mean().reset_index(name="predicted_kts")

    merged = obs_h.merge(pred_h, on="time_h", how="inner")
    merged = merged.rename(columns={"time_h": "time"})
    merged["residual_kts"] = merged["observed_kts"] - merged["predicted_kts"]

    print(f"  {station_id}: {len(merged)} residual hours, mean residual={merged['residual_kts'].mean():.3f} kt, std={merged['residual_kts'].std():.3f} kt")
    return merged


# ─── Cross-correlation ────────────────────────────────────────────────────────

def cross_correlate_discharge_current(
    discharge_df: pd.DataFrame,
    current_df: pd.DataFrame,
    current_col: str,
    max_lag_hours: int = 240,
    station_id: str = "",
) -> pd.DataFrame:
    """
    Cross-correlate discharge anomaly vs current signal at lags 0..max_lag_hours.
    Positive lag means discharge leads current (i.e., discharge change happens N hours
    before the current change — which is the physically meaningful direction).

    discharge_df: hourly, columns [time, anomaly_cfs] (or discharge_cfs)
    current_df:   hourly (or finer), columns [time, <current_col>]

    Returns DataFrame: lag_hours, correlation, n_samples
    """
    # Merge on hourly timestamps
    d = discharge_df.copy()
    c = current_df.copy()

    d["time_h"] = pd.to_datetime(d["time"]).dt.floor("1h")
    c["time_h"] = pd.to_datetime(c["time"]).dt.floor("1h")

    # Use anomaly if available, else raw discharge
    discharge_signal_col = "anomaly_cfs" if "anomaly_cfs" in d.columns else "discharge_cfs"
    d_h = d.groupby("time_h")[discharge_signal_col].mean().reset_index()
    c_h = c.groupby("time_h")[current_col].mean().reset_index()

    merged = d_h.merge(c_h, on="time_h", how="inner").dropna()

    if len(merged) < 100:
        print(f"  {station_id}: Too few overlapping hours ({len(merged)}) for cross-correlation")
        return pd.DataFrame()

    x = merged[discharge_signal_col].values
    y = merged[current_col].values

    # Detrend and normalize
    x = signal.detrend(x)
    y = signal.detrend(y)
    x = (x - x.mean()) / (x.std() + 1e-9)
    y = (y - y.mean()) / (y.std() + 1e-9)

    lags = range(0, max_lag_hours + 1)
    results = []
    for lag in lags:
        if lag >= len(x):
            break
        # Discharge leads current by `lag` hours: x[:-lag] vs y[lag:]
        if lag == 0:
            xi, yi = x, y
        else:
            xi, yi = x[:-lag], y[lag:]

        if len(xi) < 50:
            break

        r, p = stats.pearsonr(xi, yi)
        results.append({"lag_hours": lag, "correlation": r, "p_value": p, "n_samples": len(xi)})

    result_df = pd.DataFrame(results)
    if not result_df.empty:
        best = result_df.loc[result_df["correlation"].abs().idxmax()]
        print(f"  {station_id}: best correlation={best['correlation']:.3f} at lag={best['lag_hours']:.0f}h (p={best['p_value']:.3e}, n={best['n_samples']:.0f})")
    return result_df


# ─── Partial correlation (wind control) ──────────────────────────────────────

def partial_correlation_with_wind(
    discharge_df: pd.DataFrame,
    current_df: pd.DataFrame,
    wind_df: pd.DataFrame,
    current_col: str,
    best_lag_hours: int,
    station_id: str = "",
) -> dict:
    """
    Compute partial correlation of discharge → current, controlling for wind speed.
    Uses simple linear regression: residualize both discharge and current on wind,
    then correlate the residuals.

    Returns dict with keys: r_full, r_partial, r_wind_only, coeff_kts_per_50kcfs
    """
    d = discharge_df.copy()
    c = current_df.copy()
    w = wind_df.copy()

    d["time_h"] = pd.to_datetime(d["time"]).dt.floor("1h")
    c["time_h"] = pd.to_datetime(c["time"]).dt.floor("1h")
    w["time_h"] = pd.to_datetime(w["time"]).dt.floor("1h")

    discharge_col = "anomaly_cfs" if "anomaly_cfs" in d.columns else "discharge_cfs"
    d_h = d.groupby("time_h")[discharge_col].mean().reset_index()
    c_h = c.groupby("time_h")[current_col].mean().reset_index()

    wind_cols = [col for col in ["wind_spd_mps", "gust_mps"] if col in w.columns]
    if not wind_cols:
        print(f"  {station_id}: No wind columns available for partial correlation")
        return {}
    w_h = w.groupby("time_h")[wind_cols].mean().reset_index()

    # Apply lag to discharge (lag it forward relative to current)
    d_h = d_h.copy()
    if best_lag_hours > 0:
        d_h["time_h"] = d_h["time_h"] + pd.Timedelta(hours=best_lag_hours)

    merged = d_h.merge(c_h, on="time_h").merge(w_h, on="time_h").dropna()

    if len(merged) < 50:
        print(f"  {station_id}: Too few rows for partial correlation ({len(merged)})")
        return {}

    X_d = merged[discharge_col].values
    X_w = merged[wind_cols[0]].values
    Y = merged[current_col].values

    # Full correlation (discharge vs current)
    r_full, _ = stats.pearsonr(X_d, Y)

    # Residualize discharge on wind
    slope_dw, intercept_dw, *_ = stats.linregress(X_w, X_d)
    resid_d = X_d - (slope_dw * X_w + intercept_dw)

    # Residualize current on wind
    slope_yw, intercept_yw, *_ = stats.linregress(X_w, Y)
    resid_y = Y - (slope_yw * X_w + intercept_yw)

    # Partial correlation
    r_partial, p_partial = stats.pearsonr(resid_d, resid_y)

    # Wind-only correlation
    r_wind, _ = stats.pearsonr(X_w, Y)

    # Coefficient: how many kts per 50k cfs excess discharge?
    # Simple OLS on lag-shifted discharge and current
    slope, intercept, r_ols, p_ols, se = stats.linregress(X_d, Y)
    coeff_kts_per_50kcfs = slope * 50_000

    print(f"  {station_id} (lag={best_lag_hours}h): r_full={r_full:.3f}, r_partial={r_partial:.3f}, r_wind={r_wind:.3f}")
    print(f"    OLS coeff: {coeff_kts_per_50kcfs:+.3f} kt per 50k cfs excess discharge")

    return {
        "r_full": r_full,
        "r_partial": r_partial,
        "r_wind_only": r_wind,
        "p_partial": p_partial,
        "coeff_kts_per_50kcfs": coeff_kts_per_50kcfs,
        "n_samples": len(merged),
    }


# ─── Main analysis orchestrator ───────────────────────────────────────────────

def run_analysis(data: dict) -> dict:
    """
    Given the output of fetch_all(), run the full analysis pipeline.
    Returns a results dict summarizing per-station findings.
    """
    from fetch_data import NOAA_CURRENT_STATIONS, PORTS_STATIONS

    print("\n" + "="*60)
    print("ANALYSIS: Discharge characterization")
    print("="*60)

    usgs_df = data["usgs"]
    if usgs_df.empty:
        print("ERROR: No USGS data available. Cannot proceed.")
        return {}

    discharge_h = compute_discharge_anomaly(usgs_df)
    if discharge_h.empty:
        return {}
    events = identify_release_events(discharge_h)

    print("\n" + "="*60)
    print("ANALYSIS: Tidal residuals (PORTS observed stations)")
    print("="*60)

    residuals = {}
    for st in PORTS_STATIONS:
        obs_df = data["observed"].get(st["id"], pd.DataFrame())
        # For PORTS stations, match to nearest prediction station
        # cb1102 ~ ACT4976 (Tolly Point / Start)
        # cb1001 ~ ACT4866 (Cove Point)
        pred_map = {"cb1102": "ACT4976", "cb1001": "ACT4866"}
        pred_station = pred_map.get(st["id"])
        pred_df = data["predictions"].get(pred_station, pd.DataFrame()) if pred_station else pd.DataFrame()

        if not obs_df.empty and not pred_df.empty:
            resid = compute_residual(obs_df, pred_df, st["id"])
            if not resid.empty:
                residuals[st["id"]] = resid

    print("\n" + "="*60)
    print("ANALYSIS: Cross-correlation (discharge vs predictions)")
    print("="*60)

    xcorr_results = {}

    # For all 8 course stations, cross-correlate discharge vs predicted current
    for st in NOAA_CURRENT_STATIONS:
        pred_df = data["predictions"].get(st["id"], pd.DataFrame())
        if pred_df.empty:
            continue

        current_col = "velocity_kts" if "velocity_kts" in pred_df.columns else "speed_kts"
        if current_col not in pred_df.columns:
            continue

        xcorr = cross_correlate_discharge_current(
            discharge_h, pred_df, current_col,
            max_lag_hours=240, station_id=st["id"]
        )
        if not xcorr.empty:
            xcorr_results[st["id"]] = xcorr

    # For PORTS residuals (where available), cross-correlate vs residual
    print("\n  -- PORTS residual cross-correlations --")
    for st_id, resid_df in residuals.items():
        if "residual_kts" not in resid_df.columns:
            continue
        xcorr = cross_correlate_discharge_current(
            discharge_h, resid_df, "residual_kts",
            max_lag_hours=240, station_id=f"{st_id}_residual"
        )
        if not xcorr.empty:
            xcorr_results[f"{st_id}_residual"] = xcorr

    print("\n" + "="*60)
    print("ANALYSIS: Partial correlation controlling for wind")
    print("="*60)

    partial_results = {}
    wind_df = data["wind"]

    for st in NOAA_CURRENT_STATIONS:
        pred_df = data["predictions"].get(st["id"], pd.DataFrame())
        if pred_df.empty or wind_df.empty:
            continue
        xcorr = xcorr_results.get(st["id"])
        if xcorr is None or xcorr.empty:
            continue

        current_col = "velocity_kts" if "velocity_kts" in pred_df.columns else "speed_kts"
        best_lag = int(xcorr.loc[xcorr["correlation"].abs().idxmax(), "lag_hours"])

        pr = partial_correlation_with_wind(
            discharge_h, pred_df, wind_df,
            current_col=current_col,
            best_lag_hours=best_lag,
            station_id=st["id"],
        )
        if pr:
            partial_results[st["id"]] = pr

    print("\n" + "="*60)
    print("ANALYSIS: Salinity anomaly & cross-correlation (CBIBS)")
    print("="*60)

    sal_anomalies = {}
    sal_xcorr = {}
    for st_id, sal_df in data.get("salinity", {}).items():
        if sal_df.empty:
            continue
        anom = compute_salinity_anomaly(sal_df, st_id)
        if not anom.empty:
            sal_anomalies[st_id] = anom
            xcorr_sal = cross_correlate_discharge_salinity(discharge_h, anom, st_id)
            if not xcorr_sal.empty:
                sal_xcorr[st_id] = xcorr_sal

    return {
        "discharge_h": discharge_h,
        "events": events,
        "residuals": residuals,
        "xcorr": xcorr_results,
        "partial": partial_results,
        "sal_anomalies": sal_anomalies,
        "sal_xcorr": sal_xcorr,
    }


def compute_salinity_anomaly(sal_df: pd.DataFrame, station_id: str, window_days: int = 30) -> pd.DataFrame:
    """
    Compute daily-mean salinity and rolling anomaly (observed - rolling median).
    A negative anomaly = freshwater pulse.
    """
    if sal_df.empty:
        return pd.DataFrame()

    df = sal_df.copy()
    df["time"] = pd.to_datetime(df["time"]).dt.tz_localize(None)
    df = df.set_index("time").sort_index()

    # Hourly mean, then daily mean for cleaner signal
    daily = df["salinity_psu"].resample("1h").mean().resample("1D").mean().to_frame("salinity_psu")
    daily = daily.dropna()
    daily["baseline_psu"] = daily["salinity_psu"].rolling(window=window_days, min_periods=7, center=False).median()
    daily["anomaly_psu"] = daily["salinity_psu"] - daily["baseline_psu"]
    print(f"  {station_id} salinity anomaly: mean={daily['anomaly_psu'].mean():.2f}, "
          f"min={daily['anomaly_psu'].min():.2f} PSU")
    return daily.reset_index()


def cross_correlate_discharge_salinity(
    discharge_df: pd.DataFrame,
    salinity_df: pd.DataFrame,
    station_id: str,
    max_lag_days: int = 30,
) -> pd.DataFrame:
    """
    Cross-correlate discharge anomaly (hourly) against salinity anomaly (daily).
    Lags are in days (0–max_lag_days).
    Positive lag = discharge leads salinity drop.
    """
    d = discharge_df.copy()
    s = salinity_df.copy()

    d["time_d"] = pd.to_datetime(d["time"]).dt.tz_localize(None).dt.floor("1D")
    s["time_d"] = pd.to_datetime(s["time"]).dt.floor("1D")

    discharge_col = "anomaly_cfs" if "anomaly_cfs" in d.columns else "discharge_cfs"
    d_d = d.groupby("time_d")[discharge_col].mean().reset_index()
    s_d = s[["time_d", "anomaly_psu"]].dropna()

    merged = d_d.merge(s_d, on="time_d", how="inner").dropna()
    if len(merged) < 30:
        print(f"  {station_id}: Too few days ({len(merged)}) for salinity xcorr")
        return pd.DataFrame()

    from scipy import signal as scsignal, stats
    x = scsignal.detrend(merged[discharge_col].values)
    y = scsignal.detrend(merged["anomaly_psu"].values)
    x = (x - x.mean()) / (x.std() + 1e-9)
    y = (y - y.mean()) / (y.std() + 1e-9)

    results = []
    for lag in range(0, max_lag_days + 1):
        if lag >= len(x):
            break
        xi = x[:-lag] if lag > 0 else x
        yi = y[lag:] if lag > 0 else y
        if len(xi) < 20:
            break
        r, p = stats.pearsonr(xi, yi)
        results.append({"lag_days": lag, "correlation": r, "p_value": p, "n": len(xi)})

    result_df = pd.DataFrame(results)
    if not result_df.empty:
        best = result_df.loc[result_df["correlation"].abs().idxmax()]
        print(f"  {station_id} salinity xcorr: best r={best['correlation']:.3f} "
              f"at lag={best['lag_days']:.0f} days (p={best['p_value']:.3e})")
    return result_df


def build_results_table(analysis: dict, station_list: list) -> pd.DataFrame:
    """
    Build the final summary table: station | max corr | lag | current effect per 50k cfs
    """
    rows = []
    for st in station_list:
        st_id = st["id"]
        xcorr = analysis["xcorr"].get(st_id)
        partial = analysis["partial"].get(st_id, {})

        if xcorr is None or xcorr.empty:
            rows.append({
                "Station ID": st_id,
                "Name": st["name"],
                "Waypoint": st["waypoint"],
                "Max |r|": None,
                "Lag at Max (hr)": None,
                "r_partial (wind ctrl)": None,
                "Δ kt per 50k cfs": None,
                "Note": "No data",
            })
            continue

        best_idx = xcorr["correlation"].abs().idxmax()
        best = xcorr.iloc[best_idx]
        rows.append({
            "Station ID": st_id,
            "Name": st["name"],
            "Waypoint": st["waypoint"],
            "Max |r|": round(best["correlation"], 3),
            "Lag at Max (hr)": int(best["lag_hours"]),
            "r_partial (wind ctrl)": round(partial.get("r_partial", np.nan), 3),
            "Δ kt per 50k cfs": round(partial.get("coeff_kts_per_50kcfs", np.nan), 3),
            "Note": "",
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    from fetch_data import fetch_all, NOAA_CURRENT_STATIONS

    print("Fetching data...")
    data = fetch_all(start_year=2022)

    print("\nRunning analysis...")
    results = run_analysis(data)

    if results:
        table = build_results_table(results, NOAA_CURRENT_STATIONS)
        print("\n" + "="*60)
        print("RESULTS TABLE")
        print("="*60)
        pd.set_option("display.max_columns", None)
        pd.set_option("display.width", 120)
        print(table.to_string(index=False))
