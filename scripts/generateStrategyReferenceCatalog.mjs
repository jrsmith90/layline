import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CORPUS_PATH = path.join(
  ROOT,
  "Reference Data",
  "Layline_Chapter_Reference_Extraction.json",
);
const OUTPUT_PATH = path.join(ROOT, "lib", "reference", "generatedStrategyReferences.ts");

/**
 * The summaries below stay compact for runtime/UI use, while the excerpts are
 * extracted directly from the reference corpus so the catalog remains source-backed.
 */
const CONFIG = {
  start_side_alignment: {
    summary:
      "Use first-leg strategy to choose the section of line: start right to go right, start left to go left, and use the middle when you need to preserve options.",
    sources: [
      {
        sourceFile: "Chapter 3 1_2.pdf",
        page: 2,
        cues: [
          "Simply put, start right 10 go right",
          "Simply put: Start right to go right",
          "start in the middle to keep your options open",
        ],
        maxLength: 220,
      },
    ],
  },
  start_execution: {
    summary:
      "A good start preserves clear air, acceleration room, and freedom to maneuver after the gun; near the favored end but clear of the crowd beats winning the crowd.",
    sources: [
      {
        sourceFile: "Chapter 3 1_2.pdf",
        page: 4,
        cues: [
          "A start near the favored end, but clear of congestion, is best.",
          "near—but not right at—the favored end",
        ],
        maxLength: 260,
      },
      {
        sourceFile: "Chapter 3 2_2.pdf",
        page: 1,
        cues: ["A good start is one which finds us in the front row"],
        maxLength: 220,
      },
    ],
  },
  upwind_core: {
    summary:
      "Plan upwind strategy around better wind, exploitable shifts, and favorable current, and scale commitment to how predictable those factors really are.",
    sources: [
      {
        sourceFile: "Chapter 7 2_2.pdf",
        page: 1,
        cues: [
          "There are three factors in planning strategy. We look for better wind.",
          "Strategy is Wind, Wind Shifts, and Currents",
        ],
        maxLength: 260,
      },
    ],
  },
  oscillating_shift: {
    summary:
      "In oscillating breeze, stay in phase by tacking on headers and sailing the lifted tack instead of forcing one corner too early.",
    sources: [
      {
        sourceFile: "Chapter 7 2_2.pdf",
        page: 6,
        cues: [
          "We continue tacking on the headers in the oscillating shifts.",
          "An oscillating breeze, shifting back and forth.",
          "Stay in Phase—Tack on the Headers",
        ],
        maxLength: 240,
      },
    ],
  },
  current_and_sailing_wind: {
    summary:
      "Current is strategic both because it changes your path and because it changes the sailing wind, so it can break ties when the wind picture is close.",
    sources: [
      {
        sourceFile: "Chapter 7 2_2.pdf",
        page: 11,
        cues: [
          "When current is not uniform, take advantage of the shift in sailing wind.",
          "take advantage of the shift in sailing wind",
        ],
        maxLength: 260,
      },
      {
        sourceFile: "Chapter 13_Wind.pdf",
        page: 9,
        cues: [
          "Current a strategic factor not only in its own right",
          "Curent a strategic factor not only in its own right",
          "changes our sailing wind",
        ],
        maxLength: 220,
      },
    ],
  },
  forecast_confidence: {
    summary:
      "Local observations during the hour before the race are the most critical weather input; use the forecast to frame expectations, then sail the wind you actually have.",
    sources: [
      {
        sourceFile: "Chapter 13_Wind.pdf",
        page: 2,
        cues: [
          "the most critical weather information is the information we gather ourselves, during the hour before the race.",
          "Our forecast will have two components",
        ],
        maxLength: 260,
      },
      {
        sourceFile: "Chapter 13_Wind.pdf",
        page: 5,
        cues: ["Sail the wind, not the forecast."],
        maxLength: 160,
      },
    ],
  },
  keep_options_open: {
    summary:
      "When the next shift or side advantage is unclear, lower commitment, keep watching for change, and preserve options instead of forcing a corner.",
    sources: [
      {
        sourceFile: "Chapter 7 2_2.pdf",
        page: 1,
        cues: [
          "When we are unsure of what to expect, our strategy will change.",
          "When we are unsure of",
          "we would not pursue the strategy as wholeheartedly",
        ],
        maxLength: 260,
      },
      {
        sourceFile: "Chapter 3 1_2.pdf",
        page: 2,
        cues: ["start in the middle to keep your options open"],
        maxLength: 180,
      },
    ],
  },
  tactical_observation: {
    summary:
      "Describe position clearly, including relation to the course and how much of each tack remains, so the whole team understands the constraint behind the next call.",
    sources: [
      {
        sourceFile: "Chapter 8 4_4.pdf",
        page: 8,
        cues: [
          "Describing your position on the course and in relation to other boats is essential to tactical decision making.",
          "ratio of each tack remaining",
        ],
        maxLength: 260,
      },
    ],
  },
  tactical_risk_control: {
    summary:
      "When the picture is uncertain, lean on what you control: boat handling, boat speed, staying near the fleet, and taking only the shifts you can read.",
    sources: [
      {
        sourceFile: "Chapter 8 4_4.pdf",
        page: 7,
        cues: [
          "The trick is to rely on things you can control",
          "staying near the fleet",
        ],
        maxLength: 260,
      },
      {
        sourceFile: "Chapter 8 3_4.pdf",
        page: 3,
        cues: [
          "if you don't know what to expect, then minimize leverage to minimize the impact of shifts.",
          "minimize leverage to minimize the impact of shifts",
        ],
        maxLength: 240,
      },
    ],
  },
};

function normalizeWhitespace(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceWindow(text, index, cueLength, maxLength) {
  let start = Math.max(
    text.lastIndexOf(". ", index),
    text.lastIndexOf("? ", index),
    text.lastIndexOf("! ", index),
    text.lastIndexOf(": ", index),
  );
  start = start === -1 ? 0 : start + 2;

  let endCandidates = [
    text.indexOf(". ", index + cueLength),
    text.indexOf("? ", index + cueLength),
    text.indexOf("! ", index + cueLength),
  ].filter((value) => value >= 0);

  let end =
    endCandidates.length > 0
      ? Math.min(...endCandidates) + 1
      : Math.min(text.length, start + maxLength);

  let snippet = text.slice(start, end).trim();
  if (snippet.length > maxLength) {
    snippet = `${snippet.slice(0, maxLength).trimEnd()}...`;
  }
  return snippet;
}

function extractExcerpt(text, cues, maxLength) {
  const normalized = normalizeWhitespace(text);

  for (const cue of cues) {
    const normalizedCue = normalizeWhitespace(cue);
    const index = normalized.toLowerCase().indexOf(normalizedCue.toLowerCase());
    if (index >= 0) {
      return sentenceWindow(normalized, index, normalizedCue.length, maxLength);
    }
  }

  return normalized.slice(0, maxLength).trim();
}

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
const pageIndex = new Map();

for (const document of corpus) {
  for (const page of document.pages) {
    pageIndex.set(`${document.source_file}::${page.page}`, page.text);
  }
}

const generatedCatalog = Object.fromEntries(
  Object.entries(CONFIG).map(([key, config]) => {
    const sources = config.sources.map((source) => {
      const pageText = pageIndex.get(`${source.sourceFile}::${source.page}`);
      if (!pageText) {
        throw new Error(`Missing source page for ${source.sourceFile} page ${source.page}`);
      }

      return {
        sourceFile: source.sourceFile,
        page: source.page,
        excerpt: extractExcerpt(pageText, source.cues, source.maxLength ?? 220),
      };
    });

    return [
      key,
      {
        summary: config.summary,
        sources,
      },
    ];
  }),
);

const output = `// Generated by scripts/generateStrategyReferenceCatalog.mjs
// Source: Reference Data/Layline_Chapter_Reference_Extraction.json

export type ReferenceBasisKey =
  | "start_side_alignment"
  | "start_execution"
  | "upwind_core"
  | "oscillating_shift"
  | "current_and_sailing_wind"
  | "forecast_confidence"
  | "keep_options_open"
  | "tactical_observation"
  | "tactical_risk_control";

export type StrategyReferenceSource = {
  sourceFile: string;
  page: number;
  excerpt: string;
};

export type StrategyReferenceEntry = {
  summary: string;
  sources: StrategyReferenceSource[];
};

export const STRATEGY_REFERENCE_CATALOG: Record<ReferenceBasisKey, StrategyReferenceEntry> = ${JSON.stringify(
    generatedCatalog,
    null,
    2,
  )};
`;

fs.writeFileSync(OUTPUT_PATH, output);
console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
