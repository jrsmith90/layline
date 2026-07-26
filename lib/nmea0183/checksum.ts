export function computeChecksum(sentence: string): string {
  const withoutDelimiter = sentence.trim().replace(/^[$!]/, "");
  const payload = withoutDelimiter.split("*")[0];

  let checksum = 0;
  for (let i = 0; i < payload.length; i += 1) {
    checksum ^= payload.charCodeAt(i);
  }

  return checksum.toString(16).toUpperCase().padStart(2, "0");
}

export type ChecksumValidation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateChecksum(sentence: string): ChecksumValidation {
  const trimmed = sentence.trim();

  if (!trimmed.startsWith("$") && !trimmed.startsWith("!")) {
    return { ok: false, reason: "Sentence must start with $ or !" };
  }

  const starIndex = trimmed.indexOf("*");
  if (starIndex === -1) {
    return { ok: false, reason: "Sentence is missing a checksum delimiter (*)" };
  }

  const providedChecksum = trimmed.slice(starIndex + 1, starIndex + 3).toUpperCase();
  if (!/^[0-9A-F]{2}$/.test(providedChecksum)) {
    return { ok: false, reason: "Checksum is not two hex characters" };
  }

  const expectedChecksum = computeChecksum(trimmed);
  if (expectedChecksum !== providedChecksum) {
    return {
      ok: false,
      reason: `Checksum mismatch (expected ${expectedChecksum}, got ${providedChecksum})`,
    };
  }

  return { ok: true };
}
