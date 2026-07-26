const SUPPORTED_FILE_TYPES = [
  "GPX",
  "USR (when a compatible parser is available)",
  "CSV",
  "JSON",
  "Layline route files",
  "Layline sailing logs",
  "Polar files",
];

export function FileImportPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] p-3 text-sm leading-6 text-[color:var(--text)]">
        File import (waypoints, routes, tracks, sailing sessions, polar files) lands in a later
        phase, alongside the preview, duplicate-resolution, and merge/replace workflow it needs.
        Layline&apos;s course library already supports importing GPX-based courses today.
      </div>

      <div>
        <div className="layline-kicker mb-2">Planned file types</div>
        <ul className="grid grid-cols-1 gap-1.5 text-sm text-[color:var(--text-soft)] sm:grid-cols-2">
          {SUPPORTED_FILE_TYPES.map((type) => (
            <li key={type} className="rounded-md border border-[color:var(--divider)] px-3 py-2">
              {type}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-dashed border-[color:var(--divider)] p-3 text-xs leading-5 text-[color:var(--muted)]">
        A future FTP configuration section (host, port, username, password, starting folder) will
        let you pull files directly from the Vulcan. Anonymous access on port 21, and paths like
        /userdata/ or /WaypointsRoutesTracks/, are suggested starting points only — not guaranteed
        to exist on every Vulcan network or software version.
      </div>
    </div>
  );
}
