#!/usr/bin/env python3
"""
Charts for the Conowingo discharge analysis.
Produces PNG files in ./output/.
"""

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.gridspec as gridspec
import numpy as np
import pandas as pd

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

DARK_BG = "#1a1a2e"
ACCENT_BLUE = "#4fc3f7"
ACCENT_ORANGE = "#ffb347"
ACCENT_RED = "#ef5350"
ACCENT_GREEN = "#66bb6a"
ACCENT_PURPLE = "#ab47bc"
GRAY = "#90a4ae"

plt.rcParams.update({
    "figure.facecolor": DARK_BG,
    "axes.facecolor": "#16213e",
    "axes.edgecolor": "#37474f",
    "axes.labelcolor": GRAY,
    "text.color": GRAY,
    "xtick.color": GRAY,
    "ytick.color": GRAY,
    "grid.color": "#263238",
    "grid.linewidth": 0.5,
    "lines.linewidth": 1.2,
    "font.family": "sans-serif",
    "font.size": 9,
})


# ─── Chart 1: Discharge history with event markers ────────────────────────────

def chart_discharge_history(discharge_h: pd.DataFrame, events: pd.DataFrame):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8), sharex=True)
    fig.suptitle("Conowingo Dam Discharge — USGS Station 01578310", color="white", fontsize=13, fontweight="bold")

    t = pd.to_datetime(discharge_h["time"])
    q = discharge_h["discharge_cfs"]

    # Discharge time series
    ax1.fill_between(t, q, alpha=0.3, color=ACCENT_BLUE)
    ax1.plot(t, q, color=ACCENT_BLUE, linewidth=0.6, alpha=0.8)
    if "baseline_cfs" in discharge_h.columns:
        ax1.plot(t, discharge_h["baseline_cfs"], color=ACCENT_ORANGE, linewidth=1.5, label="30-day rolling median", zorder=3)

    # Mark high-flow events
    if not events.empty:
        for _, ev in events.head(8).iterrows():
            ax1.axvspan(ev["start"], ev["end"], alpha=0.25, color=ACCENT_RED, zorder=2)
            ax1.annotate(
                f"{ev['peak_discharge_cfs']/1000:.0f}k",
                xy=(ev["start"] + (ev["end"] - ev["start"]) / 2, ev["peak_discharge_cfs"]),
                color=ACCENT_RED, fontsize=7, ha="center", va="bottom",
            )

    ax1.set_ylabel("Discharge (cfs)", color=GRAY)
    ax1.set_yscale("log")
    ax1.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
    ax1.legend(loc="upper right", framealpha=0.3)
    ax1.grid(True, which="both", alpha=0.4)
    ax1.set_title("Discharge (log scale) — red shading = high-flow events", color=GRAY, fontsize=9)

    # Anomaly
    if "anomaly_cfs" in discharge_h.columns:
        anom = discharge_h["anomaly_cfs"]
        ax2.fill_between(t, anom.clip(lower=0), alpha=0.5, color=ACCENT_RED, label="Excess above baseline")
        ax2.fill_between(t, anom.clip(upper=0), alpha=0.5, color=ACCENT_BLUE, label="Below baseline")
        ax2.axhline(0, color=GRAY, linewidth=0.8)
        ax2.set_ylabel("Discharge Anomaly (cfs)", color=GRAY)
        ax2.legend(loc="upper right", framealpha=0.3)
        ax2.grid(True, alpha=0.4)
        ax2.set_title("Discharge anomaly (observed − 30-day median)", color=GRAY, fontsize=9)

    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax2.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    plt.setp(ax2.xaxis.get_majorticklabels(), rotation=30, ha="right")

    plt.tight_layout()
    out = OUTPUT_DIR / "01_discharge_history.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {out}")


# ─── Chart 2: Cross-correlation lags per station ─────────────────────────────

def chart_xcorr_by_station(xcorr_dict: dict, station_list: list):
    n = len([s for s in station_list if s["id"] in xcorr_dict])
    if n == 0:
        print("  No xcorr data to chart")
        return

    fig, axes = plt.subplots(
        (n + 1) // 2, 2, figsize=(14, 3 * ((n + 1) // 2)),
        sharex=True
    )
    fig.suptitle("Cross-correlation: Conowingo Discharge Anomaly vs. Tidal Current Predictions\n(positive lag = discharge leads current)", color="white", fontsize=12, fontweight="bold")
    axes = np.array(axes).flatten()

    ax_idx = 0
    best_lags = {}

    for st in station_list:
        st_id = st["id"]
        xcorr = xcorr_dict.get(st_id)
        if xcorr is None or xcorr.empty:
            continue

        ax = axes[ax_idx]
        ax_idx += 1

        lags = xcorr["lag_hours"].values
        corr = xcorr["correlation"].values

        ax.axhline(0, color=GRAY, linewidth=0.8)
        ax.plot(lags, corr, color=ACCENT_BLUE, linewidth=1.2)
        ax.fill_between(lags, 0, corr, where=corr > 0, alpha=0.3, color=ACCENT_BLUE)
        ax.fill_between(lags, 0, corr, where=corr < 0, alpha=0.3, color=ACCENT_ORANGE)

        best_idx = np.argmax(np.abs(corr))
        best_lag = lags[best_idx]
        best_r = corr[best_idx]
        best_lags[st_id] = best_lag

        ax.axvline(best_lag, color=ACCENT_RED, linewidth=1.5, linestyle="--", alpha=0.8)
        ax.scatter([best_lag], [best_r], color=ACCENT_RED, zorder=5, s=40)
        ax.annotate(f"peak r={best_r:+.3f}\nat {best_lag}h lag",
                    xy=(best_lag, best_r), xytext=(best_lag + 8, best_r),
                    color=ACCENT_RED, fontsize=7.5,
                    arrowprops=dict(arrowstyle="->", color=ACCENT_RED, lw=0.8))

        ax.set_title(f"{st_id} — {st['waypoint']}", color=GRAY, fontsize=9)
        ax.set_ylabel("Pearson r", color=GRAY)
        ax.set_ylim(-0.35, 0.35)
        ax.grid(True, alpha=0.4)

    # Hide empty panels
    for i in range(ax_idx, len(axes)):
        axes[i].set_visible(False)

    axes[-2].set_xlabel("Lag (hours)", color=GRAY)
    axes[-1].set_xlabel("Lag (hours)", color=GRAY)

    plt.tight_layout()
    out = OUTPUT_DIR / "02_xcorr_by_station.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {out}")
    return best_lags


# ─── Chart 3: Event case study overlay ───────────────────────────────────────

def chart_event_case_study(
    discharge_h: pd.DataFrame,
    predictions_dict: dict,
    events: pd.DataFrame,
    station_ids: list = ("ACT4976", "ACT4866", "ACT4826"),
    n_events: int = 3,
):
    """
    For the N largest events, show a 2-week window: discharge above,
    current predictions at 3 stations below.
    """
    if events.empty or not predictions_dict:
        print("  No event case study data")
        return

    colors = [ACCENT_BLUE, ACCENT_GREEN, ACCENT_PURPLE]

    for i, (_, ev) in enumerate(events.head(n_events).iterrows()):
        win_start = ev["start"] - pd.Timedelta(days=2)
        win_end = ev["end"] + pd.Timedelta(days=7)

        fig = plt.figure(figsize=(14, 9))
        fig.suptitle(
            f"Event #{i+1}: Peak {ev['peak_discharge_cfs']/1000:.0f}k cfs on {ev['start'].strftime('%Y-%m-%d')}\n"
            f"({ev['duration_hours']:.0f}h above high-flow threshold)",
            color="white", fontsize=12, fontweight="bold"
        )
        gs = gridspec.GridSpec(4, 1, hspace=0.4)

        ax_q = fig.add_subplot(gs[0])
        mask_q = (discharge_h["time"] >= win_start) & (discharge_h["time"] <= win_end)
        dq = discharge_h[mask_q]
        ax_q.fill_between(dq["time"], dq["discharge_cfs"], alpha=0.4, color=ACCENT_RED)
        ax_q.plot(dq["time"], dq["discharge_cfs"], color=ACCENT_RED, linewidth=1.2)
        if "baseline_cfs" in dq.columns:
            ax_q.plot(dq["time"], dq["baseline_cfs"], color=ACCENT_ORANGE, linewidth=1.5, linestyle="--", label="baseline")
        ax_q.set_ylabel("Discharge (cfs)", color=GRAY)
        ax_q.set_yscale("log")
        ax_q.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, _: f"{x/1000:.0f}k"))
        ax_q.set_title("Conowingo Discharge", color=GRAY, fontsize=9)
        ax_q.grid(True, which="both", alpha=0.4)
        ax_q.legend(loc="upper right", framealpha=0.3, fontsize=7)

        station_names = {
            "ACT4976": "Tolly Pt (Start)",
            "ACT4866": "Cove Point",
            "ACT4826": "Point No Point",
        }

        for j, st_id in enumerate(station_ids):
            pred = predictions_dict.get(st_id, pd.DataFrame())
            if pred.empty:
                continue
            ax_c = fig.add_subplot(gs[j + 1])
            pred["time"] = pd.to_datetime(pred["time"])
            mask_c = (pred["time"] >= win_start) & (pred["time"] <= win_end)
            dp = pred[mask_c]
            current_col = "velocity_kts" if "velocity_kts" in dp.columns else "speed_kts"
            if current_col not in dp.columns:
                continue
            ax_c.plot(dp["time"], dp[current_col], color=colors[j], linewidth=1.0)
            ax_c.axhline(0, color=GRAY, linewidth=0.6)
            ax_c.fill_between(dp["time"], dp[current_col], 0,
                               where=dp[current_col] > 0, alpha=0.25, color=colors[j])
            ax_c.fill_between(dp["time"], dp[current_col], 0,
                               where=dp[current_col] < 0, alpha=0.25, color=ACCENT_ORANGE)
            ax_c.set_ylabel("kt", color=GRAY)
            ax_c.set_title(f"{st_id} — {station_names.get(st_id, st_id)} (predicted)", color=GRAY, fontsize=9)
            ax_c.grid(True, alpha=0.4)

        for ax in fig.axes:
            ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
            ax.xaxis.set_major_locator(mdates.DayLocator(interval=2))
            plt.setp(ax.xaxis.get_majorticklabels(), rotation=30, ha="right", fontsize=7)

        plt.tight_layout()
        out = OUTPUT_DIR / f"03_event_case_study_{i+1:02d}_{ev['start'].strftime('%Y%m%d')}.png"
        plt.savefig(out, dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  Saved: {out}")


# ─── Chart 4: Results summary (lag vs. distance down-bay) ────────────────────

def chart_lag_vs_distance(xcorr_dict: dict, station_list: list):
    """
    Scatter plot: each station's lag at peak correlation vs. its distance down-bay (lat proxy).
    If the method is capturing real physics, lag should increase with distance from Conowingo.
    """
    rows = []
    for st in station_list:
        xcorr = xcorr_dict.get(st["id"])
        if xcorr is None or xcorr.empty:
            continue
        best_idx = xcorr["correlation"].abs().idxmax()
        best = xcorr.iloc[best_idx]
        rows.append({
            "id": st["id"],
            "waypoint": st["waypoint"],
            "lat": st["lat"],
            "lag_hours": best["lag_hours"],
            "max_r": best["correlation"],
        })

    if not rows:
        return

    df = pd.DataFrame(rows)
    # Distance proxy: northernmost (highest lat) = closest to dam
    # Conowingo is at ~39.66°N; stations range from 38.11 to 38.93°N
    # Closer to dam = higher lat, so distance_proxy = 39.66 - lat (degrees south of dam)
    df["dist_proxy"] = 39.66 - df["lat"]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle("Lag and Correlation vs. Distance Down-Bay\n(sanity check: if real, lag should increase with distance)", color="white", fontsize=11, fontweight="bold")

    scatter = ax1.scatter(df["dist_proxy"], df["lag_hours"], c=df["max_r"], cmap="RdBu_r", s=120, vmin=-0.3, vmax=0.3, zorder=3)
    for _, row in df.iterrows():
        ax1.annotate(row["waypoint"], (row["dist_proxy"], row["lag_hours"]),
                     textcoords="offset points", xytext=(5, 3), fontsize=7.5, color=GRAY)
    ax1.set_xlabel("Approx. distance south of Conowingo (degrees lat)", color=GRAY)
    ax1.set_ylabel("Lag at peak |r| (hours)", color=GRAY)
    ax1.set_title("Lag vs. distance (should be positive slope)", color=GRAY, fontsize=9)
    ax1.grid(True, alpha=0.4)
    plt.colorbar(scatter, ax=ax1, label="Pearson r")

    bars = ax2.bar(df["waypoint"], df["max_r"].abs(), color=[ACCENT_BLUE if r > 0 else ACCENT_ORANGE for r in df["max_r"]])
    ax2.set_xlabel("Station", color=GRAY)
    ax2.set_ylabel("|r| at peak lag", color=GRAY)
    ax2.set_title("Max |correlation| by station\n(blue = positive r, orange = negative r)", color=GRAY, fontsize=9)
    plt.setp(ax2.xaxis.get_majorticklabels(), rotation=30, ha="right", fontsize=7.5)
    ax2.grid(True, alpha=0.4, axis="y")
    ax2.set_ylim(0, 0.4)

    plt.tight_layout()
    out = OUTPUT_DIR / "04_lag_vs_distance.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {out}")


def chart_salinity_vs_discharge(
    discharge_h: pd.DataFrame,
    sal_anomalies: dict,
    events: pd.DataFrame,
    sal_xcorr: dict,
):
    """
    Three-panel chart for the April 2024 event window:
    top = discharge; middle = salinity at AN, GR, PL overlaid; bottom = xcorr lags.
    """
    if not sal_anomalies:
        print("  No salinity data to chart")
        return

    # Panel 1+2: event window zoom (April 2024, largest event)
    if not events.empty:
        ev = events.iloc[0]  # largest event
        win_start = ev["start"] - pd.Timedelta(days=3)
        win_end = ev["end"] + pd.Timedelta(days=18)
    else:
        win_start = pd.Timestamp("2024-03-25")
        win_end = pd.Timestamp("2024-04-25")

    station_colors = {"AN": ACCENT_BLUE, "GR": ACCENT_GREEN, "PL": ACCENT_PURPLE, "SR": GRAY}
    station_names = {"AN": "Annapolis (Start)", "GR": "Gooses Reef (Mid)", "PL": "Potomac (Lower Bay)", "SR": "Stingray Pt (S Bay)"}

    fig = plt.figure(figsize=(14, 11))
    fig.suptitle("Conowingo Discharge → Bay Salinity: April 2024 Case Study\n"
                 "Salinity drop is a 2–4 day leading indicator of the current anomaly",
                 color="white", fontsize=12, fontweight="bold")
    gs = matplotlib.gridspec.GridSpec(3, 2, hspace=0.45, wspace=0.35, figure=fig)

    # Top-left: discharge event
    ax_q = fig.add_subplot(gs[0, :])
    mask_q = (discharge_h["time"] >= win_start) & (discharge_h["time"] <= win_end)
    dq = discharge_h[mask_q]
    ax_q.fill_between(dq["time"], dq["discharge_cfs"], alpha=0.35, color=ACCENT_RED)
    ax_q.plot(dq["time"], dq["discharge_cfs"], color=ACCENT_RED, linewidth=1.2)
    if "baseline_cfs" in dq.columns:
        ax_q.plot(dq["time"], dq["baseline_cfs"], color=ACCENT_ORANGE, linewidth=1.5, linestyle="--", label="30-day baseline")
    ax_q.set_ylabel("Discharge (cfs)", color=GRAY)
    ax_q.set_yscale("log")
    ax_q.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, _: f"{x/1000:.0f}k"))
    ax_q.set_title("Conowingo Discharge  (peak 310k cfs, Apr 2–4 2024)", color=GRAY, fontsize=9)
    ax_q.grid(True, which="both", alpha=0.4)
    ax_q.legend(loc="upper right", framealpha=0.3, fontsize=7)
    # Mark lag windows
    for lag_d, label, clr in [(5, "5d", "#5555ff"), (9, "9d", ACCENT_GREEN), (14, "14d", ACCENT_ORANGE)]:
        ax_q.axvline(ev["start"] + pd.Timedelta(days=lag_d), color=clr, linewidth=1, linestyle=":", alpha=0.7)
        ax_q.text(ev["start"] + pd.Timedelta(days=lag_d), ax_q.get_ylim()[1] if ax_q.get_ylim()[1] > 0 else 50000,
                  f"+{lag_d}d", color=clr, fontsize=7, ha="center", va="bottom")

    # Middle: salinity time series
    ax_s = fig.add_subplot(gs[1, :])
    for st_id, sal_anom in sal_anomalies.items():
        sal_anom["time"] = pd.to_datetime(sal_anom["time"])
        mask_s = (sal_anom["time"] >= win_start) & (sal_anom["time"] <= win_end)
        ds = sal_anom[mask_s]
        if ds.empty:
            continue
        c = station_colors.get(st_id, GRAY)
        ax_s.plot(ds["time"], ds["salinity_psu"], color=c, linewidth=1.3, label=station_names.get(st_id, st_id))
        if "baseline_psu" in ds.columns:
            ax_s.plot(ds["time"], ds["baseline_psu"], color=c, linewidth=0.8, linestyle="--", alpha=0.5)

    ax_s.set_ylabel("Salinity (PSU)", color=GRAY)
    ax_s.set_title("Bay Salinity by Station — freshwater pulse propagation south", color=GRAY, fontsize=9)
    ax_s.legend(loc="upper right", framealpha=0.3, fontsize=7.5)
    ax_s.grid(True, alpha=0.4)
    # Annotate min salinity at AN
    if "AN" in sal_anomalies:
        sal = sal_anomalies["AN"]
        sal["time"] = pd.to_datetime(sal["time"])
        mask = (sal["time"] >= win_start) & (sal["time"] <= win_end)
        ds = sal[mask]
        if not ds.empty:
            min_idx = ds["salinity_psu"].idxmin()
            min_t = ds.loc[min_idx, "time"]
            min_v = ds.loc[min_idx, "salinity_psu"]
            ax_s.annotate(f"AN min: {min_v:.1f} PSU\n({min_t.strftime('%b %d')})",
                          xy=(min_t, min_v), xytext=(min_t + pd.Timedelta(days=2), min_v + 1.5),
                          color=ACCENT_BLUE, fontsize=7.5,
                          arrowprops=dict(arrowstyle="->", color=ACCENT_BLUE, lw=0.8))

    for ax in [ax_q, ax_s]:
        ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%m/%d"))
        ax.xaxis.set_major_locator(matplotlib.dates.DayLocator(interval=3))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=25, ha="right", fontsize=7)
        ax.set_xlim(win_start, win_end)

    # Bottom: xcorr lag plots per station
    ax_idx = 0
    for st_id, xcorr_sal in sal_xcorr.items():
        if ax_idx >= 2:
            break
        ax = fig.add_subplot(gs[2, ax_idx])
        ax_idx += 1
        c = station_colors.get(st_id, GRAY)
        lags = xcorr_sal["lag_days"].values
        corr = xcorr_sal["correlation"].values
        ax.plot(lags, corr, color=c, linewidth=1.3)
        ax.fill_between(lags, 0, corr, where=corr < 0, alpha=0.3, color=c)
        ax.axhline(0, color=GRAY, linewidth=0.7)
        best_idx = np.argmax(np.abs(corr))
        ax.axvline(lags[best_idx], color=ACCENT_RED, linewidth=1.2, linestyle="--", alpha=0.7)
        ax.scatter([lags[best_idx]], [corr[best_idx]], color=ACCENT_RED, s=35, zorder=5)
        ax.annotate(f"r={corr[best_idx]:+.3f}\n@{lags[best_idx]:.0f}d",
                    xy=(lags[best_idx], corr[best_idx]),
                    xytext=(lags[best_idx] + 1.5, corr[best_idx]),
                    color=ACCENT_RED, fontsize=7.5)
        ax.set_title(f"{station_names.get(st_id, st_id)}\ndischarge → salinity lag", color=GRAY, fontsize=8.5)
        ax.set_xlabel("Lag (days)", color=GRAY)
        ax.set_ylabel("Pearson r", color=GRAY)
        ax.grid(True, alpha=0.4)

    plt.tight_layout()
    out = OUTPUT_DIR / "05_salinity_discharge.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {out}")


if __name__ == "__main__":
    from fetch_data import fetch_all, NOAA_CURRENT_STATIONS
    from analysis import run_analysis, build_results_table

    data = fetch_all(start_year=2022)
    results = run_analysis(data)

    if results:
        print("\nGenerating charts...")
        chart_discharge_history(results["discharge_h"], results["events"])
        chart_xcorr_by_station(results["xcorr"], NOAA_CURRENT_STATIONS)
        chart_event_case_study(results["discharge_h"], data["predictions"], results["events"])
        chart_lag_vs_distance(results["xcorr"], NOAA_CURRENT_STATIONS)
        print(f"\nAll charts saved to {OUTPUT_DIR}/")
