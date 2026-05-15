import type { TacticalBoard } from "./types";

function formatSide(value: "starboard" | "port" | "even" | "unknown") {
  switch (value) {
    case "starboard":
      return "starboard";
    case "port":
      return "port";
    case "even":
      return "even";
    default:
      return "unknown";
  }
}

export function selectTacticalBoardStatus(board: TacticalBoard) {
  return board.readiness.status;
}

export function selectShiftHeadline(board: TacticalBoard) {
  if (board.shift.absoluteDeltaDeg == null || board.shift.direction === "unknown") {
    return "Set a mean wind and current wind to start tracking shifts.";
  }

  if (board.shift.direction === "neutral" || board.shift.absoluteDeltaDeg < 1) {
    return "The wind is sitting close to the baseline right now.";
  }

  return `${Math.round(board.shift.absoluteDeltaDeg)} deg ${
    board.shift.direction
  } shift from the baseline wind.`;
}

export function selectStartLineHeadline(board: TacticalBoard) {
  if (board.startLine.favoredEnd === "unknown" || board.startLine.biasDeg == null) {
    return "Add line bearings to see the favored end.";
  }

  if (board.startLine.favoredEnd === "square") {
    return "The line is close to square right now.";
  }

  return `${board.startLine.favoredEnd} end favored by about ${Math.round(
    Math.abs(board.startLine.biasDeg),
  )} deg.`;
}

export function selectPrimaryCalls(board: TacticalBoard) {
  const calls: string[] = [];

  if (board.upwind.favoredTack !== "unknown") {
    if (board.upwind.favoredTack === "even") {
      calls.push("Windward mark is close to centered on the current wind.");
    } else {
      calls.push(
        `Windward mark sits ${formatSide(
          board.upwind.favoredTack,
        )} of the wind, so that tack has the cleaner first look.`,
      );
    }
  }

  if (board.downwind.dominantReach !== "unknown") {
    if (board.downwind.dominantReach === "even") {
      calls.push("Run geometry is balanced around the jibe bearing.");
    } else {
      calls.push(
        `${formatSide(
          board.downwind.dominantReach,
        )} reach is currently dominant on the run.`,
      );
    }
  }

  if (board.startLine.favoredEnd !== "unknown") {
    if (board.startLine.favoredEnd === "square") {
      calls.push("Starting line is close to square.");
    } else {
      calls.push(`${board.startLine.favoredEnd} end has the better angle at the gun.`);
    }
  }

  if (calls.length === 0) {
    calls.push("Add core setup values to unlock the tactical board.");
  }

  return calls;
}
