#!/usr/bin/env python3
"""
Data fetching layer — all API calls with local JSON/CSV caching.

Usage:
    python fetch_data.py          # fetch everything and cache
    from fetch_data import *      # import individual fetch functions
"""

import json
import os
import gzip
import io
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path

import requests
import pandas as pd
import numpy as np

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# ─── Station configuration ───────────────────────────────────────────────────

USGS_STATION = "01578310"  # Susquehanna River at Conowingo, MD

NOAA_CURRENT_STATIONS = [
    {"id": "ACT4976", "name": "Tolly Point, 1.6 mi. east of",         "lat": 38.9345, "lon": -76.4170, "waypoint": "Start",         "type": "subordinate"},
    {"id": "ACT4916", "name": "Sharp Island Lt., 3.4 mi. west of",    "lat": 38.6438, "lon": -76.4480, "waypoint": "Black Walnut",   "type": "subordinate"},
    {"id": "ACT4901", "name": "Plum Point, 1.4 mi. ESE of",           "lat": 38.6125, "lon": -76.4775, "waypoint": "Gooses Reef",    "type": "subordinate"},
    {"id": "ACT4891", "name": "James Island, 3.4 mi. west of",        "lat": 38.5250, "lon": -76.4200, "waypoint": "James Island N", "type": "subordinate"},
    {"id": "CHB0304", "name": "James Island, 1.6 n.mi. SW of",        "lat": 38.4857, "lon": -76.3646, "waypoint": "James Island S", "type": "subordinate"},
    {"id": "ACT4866", "name": "Cove Point, 2.7 n.mi. east of",        "lat": 38.3800, "lon": -76.3253, "waypoint": "Cove Point",    "type": "subordinate"},
    {"id": "ACT4826", "name": "Point No Point, 2.8 n.mi. east of",    "lat": 38.1397, "lon": -76.2612, "waypoint": "Point No Point","type": "subordinate"},
    {"id": "ACT4806", "name": "Point Lookout approach",               "lat": 38.1100, "lon": -76.2183, "waypoint": "Point Lookout", "type": "subordinate"},
]

PORTS_STATIONS = [
    {"id": "cb1102", "name": "Chesapeake Bay Bridge (0.5nm S)", "lat": 38.9900, "lon": -76.4000, "waypoint": "Start proxy"},
    {"id": "cb1001", "name": "Cove Point LNG Pier (1.0nm N)",   "lat": 38.4050, "lon": -76.3810, "waypoint": "Cove Point proxy"},
]

NDBC_STATION = "44063"  # Annapolis, MD buoy

CBIBS_KEY = "f159959c117f473477edbdf3245cc2a4831ac61f"
CBIBS_BASE = "https://mw.buoybay.noaa.gov/api/v1"

CBIBS_STATIONS = [
    {"id": "AN", "name": "Annapolis",    "lat": 38.9634, "lon": -76.4467, "note": "Bay Bridge / Start proxy"},
    {"id": "GR", "name": "Gooses Reef",  "lat": 38.5550, "lon": -76.4100, "note": "Mid-course waypoint"},
    {"id": "PL", "name": "Potomac",      "lat": 38.0300, "lon": -76.3330, "note": "Lower Bay / Finish approach"},
    {"id": "SR", "name": "Stingray Point","lat": 37.5667, "lon": -76.1500, "note": "South Bay reference"},
]

# ─── Helpers ─────────────────────────────────────────────────────────────────

def cache_path(key: str, ext: str = "json") -> Path:
    return CACHE_DIR / f"{key}.{ext}"


def load_cache(key: str, ext: str = "json"):
    p = cache_path(key, ext)
    if not p.exists():
        return None
    if ext == "json":
        return json.loads(p.read_text())
    elif ext == "csv":
        return pd.read_csv(p, parse_dates=["time"])
    return None


def save_cache(key: str, data, ext: str = "json"):
    p = cache_path(key, ext)
    if ext == "json":
        p.write_text(json.dumps(data, default=str))
    elif ext == "csv":
        data.to_csv(p, index=False)


def get_json(url: str, params: dict = None, cache_key: str = None, force_refresh: bool = False) -> dict:
    if cache_key and not force_refresh:
        cached = load_cache(cache_key)
        if cached is not None:
            print(f"  [cache] {cache_key}")
            return cached

    print(f"  [fetch] {url}")
    if params:
        print(f"         params={params}")

    r = requests.get(url, params=params, timeout=60)
    r.raise_for_status()
    data = r.json()

    if cache_key:
        save_cache(cache_key, data)

    return data


# ─── 1. USGS discharge ───────────────────────────────────────────────────────

def fetch_usgs_discharge(start_dt: str, end_dt: str, force_refresh: bool = False) -> pd.DataFrame:
    """
    Pull 15-minute discharge (parameterCd=00060) from USGS IV service.
    Validates that the returned data is actually for station 01578310.
    Returns DataFrame with columns: time, discharge_cfs, gage_height_ft
    """
    cache_key = f"usgs_{USGS_STATION}_{start_dt}_{end_dt}"
    cached_df = load_cache(cache_key, "csv")
    if cached_df is not None and not force_refresh:
        print(f"  [cache] USGS discharge {start_dt}–{end_dt} ({len(cached_df)} rows)")
        return cached_df

    url = "https://waterservices.usgs.gov/nwis/iv/"
    params = {
        "sites": USGS_STATION,
        "parameterCd": "00060,00065",
        "startDT": start_dt,
        "endDT": end_dt,
        "format": "json",
    }
    print(f"\nFetching USGS discharge for station {USGS_STATION}: {start_dt} → {end_dt}")
    raw = get_json(url, params=params, cache_key=cache_key + "_raw")

    # Validate we got the right station
    ts_list = raw.get("value", {}).get("timeSeries", [])
    if not ts_list:
        print(f"  ERROR: No timeSeries in USGS response. Raw response keys: {list(raw.keys())}")
        print(f"  Raw (first 500 chars): {json.dumps(raw)[:500]}")
        return pd.DataFrame()

    # Check site ID in metadata
    for ts in ts_list:
        site_code = ts.get("sourceInfo", {}).get("siteCode", [{}])
        if isinstance(site_code, list):
            site_code = site_code[0].get("value", "UNKNOWN")
        site_name = ts.get("sourceInfo", {}).get("siteName", "UNKNOWN")
        param = ts.get("variable", {}).get("variableCode", [{}])
        if isinstance(param, list):
            param = param[0].get("value", "UNKNOWN")
        print(f"  Station returned: siteCode={site_code}, siteName={site_name}, param={param}")
        if site_code != USGS_STATION:
            print(f"  WARNING: Expected {USGS_STATION}, got {site_code} — data mismatch, skipping this series")
            continue

    # Parse into DataFrame
    records = {}
    for ts in ts_list:
        site_code = ts.get("sourceInfo", {}).get("siteCode", [{}])
        if isinstance(site_code, list):
            site_code = site_code[0].get("value", "")
        if site_code != USGS_STATION:
            continue

        param_codes = ts.get("variable", {}).get("variableCode", [{}])
        if isinstance(param_codes, list):
            param_code = param_codes[0].get("value", "")
        else:
            param_code = param_codes

        values = ts.get("values", [{}])[0].get("value", [])
        for v in values:
            t = v["dateTime"]
            val = v["value"]
            if val == "-999999" or val is None:
                continue
            try:
                val = float(val)
            except (ValueError, TypeError):
                continue
            if t not in records:
                records[t] = {"time": t}
            if param_code == "00060":
                records[t]["discharge_cfs"] = val
            elif param_code == "00065":
                records[t]["gage_height_ft"] = val

    if not records:
        print("  ERROR: No valid records parsed from USGS response")
        return pd.DataFrame()

    df = pd.DataFrame(list(records.values()))
    df["time"] = pd.to_datetime(df["time"], utc=True).dt.tz_convert("US/Eastern")
    df = df.sort_values("time").reset_index(drop=True)

    print(f"  Parsed {len(df)} rows; discharge range: {df.get('discharge_cfs', pd.Series()).min():.0f}–{df.get('discharge_cfs', pd.Series()).max():.0f} cfs")

    save_cache(cache_key, df, "csv")
    return df


# ─── 2. NOAA current predictions ─────────────────────────────────────────────

def _noaa_fetch_one_year_raw(
    station_id: str, station_type: str,
    begin_date: str, end_date: str,
    cache_key: str, force_refresh: bool = False,
) -> dict:
    """Fetch one year (or less) of NOAA predictions. Returns raw JSON dict."""
    base_url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
    interval = "6" if station_type == "harmonic" else "MAX_SLACK"
    params = {
        "begin_date": begin_date,
        "end_date": end_date,
        "station": station_id,
        "product": "currents_predictions",
        "interval": interval,
        "time_zone": "lst_ldt",
        "units": "english",
        "format": "json",
    }
    try:
        raw = get_json(base_url, params=params, cache_key=cache_key, force_refresh=force_refresh)
        return raw
    except Exception as e:
        print(f"    HTTP error for {station_id} {begin_date}–{end_date}: {e}")
        return {}


def fetch_noaa_current_predictions(
    station_id: str, station_type: str,
    begin_date: str, end_date: str,
    force_refresh: bool = False,
) -> pd.DataFrame:
    """
    Pull current predictions from NOAA CO-OPS, chunked by year (API limit ~1yr).
    - Harmonic stations: continuous 6-min interval
    - Subordinate/ACT stations: MAX_SLACK discrete events, cosine-interpolated to 6-min
    Returns DataFrame with columns: time, velocity_kts (and speed_kts/dir_deg for harmonic)
    """
    cache_key = f"noaa_pred_{station_id}_{begin_date}_{end_date}"
    cached_df = load_cache(cache_key, "csv")
    if cached_df is not None and not force_refresh:
        print(f"  [cache] NOAA predictions {station_id} {begin_date}–{end_date} ({len(cached_df)} rows)")
        return cached_df

    # Build list of (start, end) pairs chunked by year
    # begin_date and end_date are YYYYMMDD strings
    start_dt = datetime.strptime(begin_date, "%Y%m%d")
    end_dt = datetime.strptime(end_date, "%Y%m%d")

    chunks = []
    cur = start_dt
    while cur <= end_dt:
        chunk_end = datetime(cur.year, 12, 31)
        if chunk_end > end_dt:
            chunk_end = end_dt
        chunks.append((cur.strftime("%Y%m%d"), chunk_end.strftime("%Y%m%d")))
        cur = datetime(cur.year + 1, 1, 1)

    all_predictions = []
    for (cs, ce) in chunks:
        chunk_key = f"noaa_pred_{station_id}_{cs}_{ce}_raw"
        raw_chunk = _noaa_fetch_one_year_raw(station_id, station_type, cs, ce, chunk_key, force_refresh)
        # Handle two possible response structures:
        # 1. {"predictions": [...]}  — harmonic 6-min
        # 2. {"current_predictions": {"cp": [...]}}  — MAX_SLACK subordinate
        preds = (
            raw_chunk.get("predictions")
            or raw_chunk.get("current_predictions", {}).get("cp")
            or []
        )
        all_predictions.extend(preds)
        if preds:
            print(f"    {station_id} {cs}–{ce}: {len(preds)} predictions")
        else:
            err = raw_chunk.get("error", {})
            if err:
                print(f"    {station_id} {cs}–{ce}: API error — {err}")
        time.sleep(0.2)  # gentle rate limiting

    if not all_predictions:
        print(f"  WARNING: No predictions at all for {station_id}")
        return pd.DataFrame()

    if station_type == "harmonic":
        df = pd.DataFrame(all_predictions)
        df = df.rename(columns={"t": "time", "s": "speed_kts", "d": "dir_deg", "b": "bin"})
        df["time"] = pd.to_datetime(df["time"])
        for col in ["speed_kts", "dir_deg"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        if "speed_kts" in df.columns:
            df["velocity_kts"] = df["speed_kts"]
        print(f"  {station_id} (harmonic): {len(df)} continuous rows")
    else:
        events = []
        for p in all_predictions:
            t = pd.to_datetime(p.get("t", p.get("Time", "")))
            typ = p.get("type", p.get("Type", ""))
            # Signed velocity: ebb is negative in our convention
            vel = p.get("Velocity_Major", p.get("s", p.get("v", 0)))
            try:
                vel = float(vel)
            except (ValueError, TypeError):
                vel = 0.0
            # Apply sign: ebb = negative, flood = positive, slack = 0
            if typ.lower() == "ebb" and vel > 0:
                vel = -vel
            events.append({"time": t, "velocity_kts": vel, "event_type": typ})

        events_df = pd.DataFrame(events).sort_values("time").reset_index(drop=True)
        print(f"  {station_id} (subordinate): {len(events_df)} MAX_SLACK events → cosine interpolating...")
        df = _cosine_interpolate(events_df, freq_minutes=6)

    df = df.sort_values("time").reset_index(drop=True)
    save_cache(cache_key, df, "csv")
    return df


def _cosine_interpolate(events_df: pd.DataFrame, freq_minutes: int = 6) -> pd.DataFrame:
    """
    Given a DataFrame with columns [time, velocity_kts, event_type],
    produce a continuous time series at `freq_minutes` resolution using
    cosine interpolation between consecutive event pairs.

    Formula: v = v0 + (v1 - v0) * (1 - cos(pi * frac)) / 2
    where frac = elapsed / total_duration between events.
    """
    if len(events_df) < 2:
        return events_df[["time", "velocity_kts"]].copy()

    times = []
    velocities = []
    event_flags = []

    for i in range(len(events_df) - 1):
        t0 = events_df.iloc[i]["time"]
        t1 = events_df.iloc[i + 1]["time"]
        v0 = events_df.iloc[i]["velocity_kts"]
        v1 = events_df.iloc[i + 1]["velocity_kts"]

        duration = (t1 - t0).total_seconds()
        if duration <= 0:
            continue

        # Generate timestamps at freq_minutes resolution
        n_steps = int(duration / (freq_minutes * 60))
        for j in range(n_steps):
            frac = j * freq_minutes * 60 / duration
            v_interp = v0 + (v1 - v0) * (1 - np.cos(np.pi * frac)) / 2
            times.append(t0 + timedelta(seconds=j * freq_minutes * 60))
            velocities.append(v_interp)
            event_flags.append(j == 0)

    # Append the last event point
    times.append(events_df.iloc[-1]["time"])
    velocities.append(events_df.iloc[-1]["velocity_kts"])
    event_flags.append(True)

    df = pd.DataFrame({"time": times, "velocity_kts": velocities, "is_event": event_flags})
    return df


# ─── 3. NOAA PORTS observed currents ─────────────────────────────────────────

def fetch_noaa_ports_observed(
    station_id: str, begin_date: str, end_date: str,
    force_refresh: bool = False,
) -> pd.DataFrame:
    """
    Pull real-time observed PORTS current data, chunked by 30-day windows.
    product=currents (not currents_predictions).
    Returns DataFrame with columns: time, speed_kts, dir_deg
    """
    cache_key = f"noaa_obs_{station_id}_{begin_date}_{end_date}"
    cached_df = load_cache(cache_key, "csv")
    if cached_df is not None and not force_refresh:
        print(f"  [cache] NOAA observed {station_id} {begin_date}–{end_date} ({len(cached_df)} rows)")
        return cached_df

    base_url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
    start_dt = datetime.strptime(begin_date, "%Y%m%d")
    end_dt = datetime.strptime(end_date, "%Y%m%d")

    # Chunk by 30 days
    chunks = []
    cur = start_dt
    while cur <= end_dt:
        chunk_end = min(cur + timedelta(days=29), end_dt)
        chunks.append((cur.strftime("%Y%m%d"), chunk_end.strftime("%Y%m%d")))
        cur = chunk_end + timedelta(days=1)

    print(f"\nFetching NOAA PORTS observed currents: {station_id} {begin_date}–{end_date} ({len(chunks)} chunks)")

    all_rows = []
    for (cs, ce) in chunks:
        params = {
            "begin_date": cs,
            "end_date": ce,
            "station": station_id,
            "product": "currents",
            "time_zone": "lst_ldt",
            "units": "english",
            "format": "json",
        }
        try:
            raw = get_json(base_url, params=params,
                           cache_key=f"noaa_obs_{station_id}_{cs}_{ce}_raw",
                           force_refresh=force_refresh)
        except Exception as e:
            print(f"    {station_id} {cs}–{ce}: HTTP error — {e}")
            continue

        rows = raw.get("data", [])
        if not rows:
            err = raw.get("error", {})
            if err:
                print(f"    {station_id} {cs}–{ce}: {err}")
        else:
            all_rows.extend(rows)
            print(f"    {station_id} {cs}–{ce}: {len(rows)} obs")
        time.sleep(0.2)

    if not all_rows:
        print(f"  WARNING: No observed data for {station_id}")
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    col_map = {"t": "time", "s": "speed_kts", "d": "dir_deg", "b": "bin", "f": "flags"}
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"])
    for col in ["speed_kts", "dir_deg"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.sort_values("time").drop_duplicates("time").reset_index(drop=True)
    print(f"  {station_id} observed: {len(df)} total rows, {df['time'].min()} → {df['time'].max()}")
    save_cache(cache_key, df, "csv")
    return df


# ─── 4. NDBC wind data ────────────────────────────────────────────────────────

def fetch_ndbc_wind(years: list, force_refresh: bool = False) -> pd.DataFrame:
    """
    Pull NDBC station 44063 wind data.
    Historical years: fetched from stdmet archive (gzipped).
    Most recent partial year: from realtime2 endpoint.
    Returns DataFrame with columns: time, wind_dir_deg, wind_spd_mps, gust_mps
    """
    cache_key = f"ndbc_{NDBC_STATION}_{'_'.join(str(y) for y in years)}"
    cached_df = load_cache(cache_key, "csv")
    if cached_df is not None and not force_refresh:
        print(f"  [cache] NDBC wind {years} ({len(cached_df)} rows)")
        return cached_df

    all_dfs = []
    current_year = datetime.now().year

    for year in years:
        if year < current_year:
            url = f"https://www.ndbc.noaa.gov/data/historical/stdmet/{NDBC_STATION}h{year}.txt.gz"
            print(f"  Fetching NDBC {year}: {url}")
            try:
                r = requests.get(url, timeout=60)
                r.raise_for_status()
                df_year = _parse_ndbc_stdmet(io.BytesIO(gzip.decompress(r.content)))
                if df_year is not None and not df_year.empty:
                    all_dfs.append(df_year)
                    print(f"    {year}: {len(df_year)} rows")
            except Exception as e:
                print(f"    {year}: FAILED — {e}")
        else:
            # Partial current year from realtime
            url = f"https://www.ndbc.noaa.gov/data/realtime2/{NDBC_STATION}.txt"
            print(f"  Fetching NDBC realtime: {url}")
            try:
                r = requests.get(url, timeout=60)
                r.raise_for_status()
                df_rt = _parse_ndbc_stdmet(io.StringIO(r.text))
                if df_rt is not None and not df_rt.empty:
                    all_dfs.append(df_rt)
                    print(f"    realtime: {len(df_rt)} rows")
            except Exception as e:
                print(f"    realtime: FAILED — {e}")

    if not all_dfs:
        print("  ERROR: No NDBC data fetched")
        return pd.DataFrame()

    df = pd.concat(all_dfs, ignore_index=True)
    df = df.sort_values("time").drop_duplicates("time").reset_index(drop=True)
    save_cache(cache_key, df, "csv")
    return df


def _parse_ndbc_stdmet(source) -> pd.DataFrame:
    """Parse NDBC standard meteorological fixed-width text."""
    try:
        # Read raw text
        if hasattr(source, "read"):
            raw = source.read()
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8", errors="replace")
        else:
            raw = source

        lines = raw.strip().split("\n")
        # First line is header, second line is units (starts with #), data follows
        header_line = lines[0].lstrip("#").split()
        # Skip units line if present
        data_start = 1
        if lines[1].startswith("#"):
            data_start = 2

        data_lines = [l for l in lines[data_start:] if l and not l.startswith("#")]

        rows = []
        for line in data_lines:
            parts = line.split()
            if len(parts) < len(header_line):
                continue
            row = dict(zip(header_line, parts))
            rows.append(row)

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows)

        # Build datetime: YYYY MM DD hh mm (or YY MM DD hh mm for older data)
        if "YY" in df.columns and "YYYY" not in df.columns:
            # Historical files use column name "YY" but store 4-digit years
            yr_sample = str(df["YY"].iloc[0])
            if len(yr_sample) == 2:
                df["YYYY"] = "20" + df["YY"]
            else:
                df["YYYY"] = df["YY"]
        time_cols = ["YYYY", "MM", "DD", "hh"]
        if "mm" in df.columns:
            time_cols.append("mm")
        try:
            df["time"] = pd.to_datetime(
                df[time_cols].astype(str).agg("-".join, axis=1),
                format="%Y-%m-%d-%H-%M" if "mm" in df.columns else "%Y-%m-%d-%H",
                errors="coerce",
            )
        except Exception:
            return pd.DataFrame()

        df = df.dropna(subset=["time"])

        rename = {"WDIR": "wind_dir_deg", "WSPD": "wind_spd_mps", "GST": "gust_mps"}
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        keep = ["time"] + [v for v in rename.values() if v in df.columns]
        df = df[keep].copy()

        for col in ["wind_dir_deg", "wind_spd_mps", "gust_mps"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
                df[col] = df[col].where(df[col] < 990, np.nan)  # NDBC uses 99/999 as missing

        return df

    except Exception as e:
        print(f"    NDBC parse error: {e}")
        return pd.DataFrame()


# ─── 5. CBIBS salinity ────────────────────────────────────────────────────────

def fetch_cbibs_salinity(
    station_id: str,
    start_year: int,
    end_year: int,
    force_refresh: bool = False,
) -> pd.DataFrame:
    """
    Pull sea_water_salinity from CBIBS, chunked by quarter (API handles ~3 months well).
    Returns DataFrame with columns: time, salinity_psu, qa
    """
    cache_key = f"cbibs_sal_{station_id}_{start_year}_{end_year}"
    cached_df = load_cache(cache_key, "csv")
    if cached_df is not None and not force_refresh:
        print(f"  [cache] CBIBS salinity {station_id} {start_year}–{end_year} ({len(cached_df)} rows)")
        return cached_df

    all_rows = []
    cur = datetime(start_year, 1, 1)
    end_dt = datetime(end_year, 12, 31, 23, 59)

    while cur <= end_dt:
        # Chunk by quarter
        q_end = datetime(cur.year, min(cur.month + 3, 12), 1) - timedelta(seconds=1)
        if q_end > end_dt:
            q_end = end_dt
        if cur.month + 3 > 12:
            q_end = datetime(cur.year + 1, 1, 1) - timedelta(seconds=1)

        sd = cur.strftime("%Y-%m-%dT%H:%M:%Sz")
        ed = q_end.strftime("%Y-%m-%dT%H:%M:%Sz")
        chunk_key = f"cbibs_sal_{station_id}_{cur.strftime('%Y%m')}_{q_end.strftime('%Y%m')}_raw"

        cached_raw = load_cache(chunk_key)
        if cached_raw is not None and not force_refresh:
            raw = cached_raw
        else:
            url = f"{CBIBS_BASE}/json/query/{station_id}"
            params = {"key": CBIBS_KEY, "sd": sd, "ed": ed, "var": "sea_water_salinity"}
            try:
                r = requests.get(url, params=params, timeout=60)
                r.raise_for_status()
                raw = r.json()
                save_cache(chunk_key, raw)
            except Exception as e:
                print(f"    CBIBS {station_id} {sd[:7]}: error — {e}")
                cur = q_end + timedelta(seconds=1)
                continue

        sts = raw.get("stations", [])
        if not sts or not sts[0].get("variable"):
            cur = q_end + timedelta(seconds=1)
            continue

        meas = sts[0]["variable"][0].get("measurements", [])
        for m in meas:
            try:
                val = float(m["value"])
            except (ValueError, TypeError):
                continue
            qa = m.get("QA", "")
            if "Bad" in qa or "MISSING" in qa:
                continue
            all_rows.append({"time": m["time"], "salinity_psu": val, "qa": qa})

        if meas:
            print(f"    CBIBS {station_id} {sd[:7]}: {len(meas)} measurements")

        cur = q_end + timedelta(seconds=1)
        time.sleep(0.2)

    if not all_rows:
        print(f"  WARNING: No CBIBS salinity data for {station_id}")
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    df["time"] = pd.to_datetime(df["time"], utc=True).dt.tz_localize(None)
    df["salinity_psu"] = pd.to_numeric(df["salinity_psu"], errors="coerce")
    df = df.sort_values("time").drop_duplicates("time").reset_index(drop=True)

    # Sanity check: salinity should be 0–36 PSU in Chesapeake Bay
    df = df[(df["salinity_psu"] >= 0) & (df["salinity_psu"] <= 36)]

    print(f"  CBIBS {station_id}: {len(df)} rows, {df['time'].min().date()} → {df['time'].max().date()}, "
          f"mean={df['salinity_psu'].mean():.1f} PSU")
    save_cache(cache_key, df, "csv")
    return df


# ─── Main fetch all ───────────────────────────────────────────────────────────

def fetch_all(
    start_year: int = 2022,
    end_year: int = 2026,
    force_refresh: bool = False,
):
    """Fetch and cache all datasets. Returns dict of DataFrames."""
    end_dt = datetime.now()
    start_dt = datetime(start_year, 1, 1)

    usgs_start = start_dt.strftime("%Y-%m-%d")
    usgs_end = end_dt.strftime("%Y-%m-%d")

    # NOAA API uses YYYYMMDD format
    noaa_start = start_dt.strftime("%Y%m%d")
    noaa_end = end_dt.strftime("%Y%m%d")

    print("\n" + "="*60)
    print("STEP 1: USGS Conowingo Discharge")
    print("="*60)
    usgs_df = fetch_usgs_discharge(usgs_start, usgs_end, force_refresh)

    print("\n" + "="*60)
    print("STEP 2: NOAA Current Predictions (8 stations)")
    print("="*60)
    predictions = {}
    for st in NOAA_CURRENT_STATIONS:
        print(f"\n  Station: {st['id']} — {st['name']}")
        df = fetch_noaa_current_predictions(
            st["id"], st["type"], noaa_start, noaa_end, force_refresh
        )
        predictions[st["id"]] = df

    print("\n" + "="*60)
    print("STEP 3: NOAA PORTS Observed Currents (recent window)")
    print("="*60)
    # PORTS data has limited retention; try last 90 days
    ports_start = (end_dt - timedelta(days=90)).strftime("%Y%m%d")
    ports_end = end_dt.strftime("%Y%m%d")
    observed = {}
    for st in PORTS_STATIONS:
        print(f"\n  Station: {st['id']} — {st['name']}")
        df = fetch_noaa_ports_observed(st["id"], ports_start, ports_end, force_refresh)
        observed[st["id"]] = df

    print("\n" + "="*60)
    print("STEP 4: NDBC Wind Data")
    print("="*60)
    years = list(range(start_year, end_year + 1))
    wind_df = fetch_ndbc_wind(years, force_refresh)

    print("\n" + "="*60)
    print("STEP 5: CBIBS Salinity (Annapolis, Gooses Reef, Potomac, Stingray Pt)")
    print("="*60)
    salinity = {}
    for st in CBIBS_STATIONS:
        print(f"\n  Station: {st['id']} — {st['name']} ({st['note']})")
        df = fetch_cbibs_salinity(st["id"], start_year, end_year, force_refresh)
        salinity[st["id"]] = df

    return {
        "usgs": usgs_df,
        "predictions": predictions,
        "observed": observed,
        "wind": wind_df,
        "salinity": salinity,
    }


if __name__ == "__main__":
    force = "--refresh" in sys.argv
    data = fetch_all(start_year=2022, force_refresh=force)

    print("\n" + "="*60)
    print("FETCH SUMMARY")
    print("="*60)
    usgs = data["usgs"]
    if not usgs.empty:
        print(f"USGS discharge: {len(usgs)} rows, {usgs['time'].min()} → {usgs['time'].max()}")
        if "discharge_cfs" in usgs.columns:
            print(f"  Discharge: min={usgs['discharge_cfs'].min():.0f}, max={usgs['discharge_cfs'].max():.0f}, median={usgs['discharge_cfs'].median():.0f} cfs")
    else:
        print("USGS: NO DATA")

    for st_id, df in data["predictions"].items():
        if not df.empty:
            print(f"Predictions {st_id}: {len(df)} rows")
        else:
            print(f"Predictions {st_id}: NO DATA")

    for st_id, df in data["observed"].items():
        if not df.empty:
            print(f"PORTS observed {st_id}: {len(df)} rows, {df['time'].min()} → {df['time'].max()}")
        else:
            print(f"PORTS observed {st_id}: NO DATA")

    wind = data["wind"]
    if not wind.empty:
        print(f"NDBC wind: {len(wind)} rows, {wind['time'].min()} → {wind['time'].max()}")
    else:
        print("NDBC wind: NO DATA")

    for st_id, df in data.get("salinity", {}).items():
        if not df.empty:
            print(f"CBIBS salinity {st_id}: {len(df)} rows, "
                  f"{df['time'].min().date()} to {df['time'].max().date()}, "
                  f"mean={df['salinity_psu'].mean():.1f} PSU")
        else:
            print(f"CBIBS salinity {st_id}: NO DATA")
