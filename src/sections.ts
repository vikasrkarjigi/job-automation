export interface Sections {
  split: "headings" | "undivided";
  required: string;
  preferred: string;
  other: string;
}

const REQUIRED_HEADING =
  /^(requirements|required|required qualifications|minimum qualifications|basic qualifications|qualifications|must haves?|what you bring|what you('|’)ll need|what we('|’)re looking for|you have)\b/i;
const PREFERRED_HEADING =
  /^(preferred|preferred qualifications|nice to haves?|bonus|bonus points|pluses|plus|extra credit)\b/i;
const OTHER_HEADING =
  /^(about|responsibilities|what you('|’)ll do|the role|benefits|perks|compensation|who we are|our team|location|how to apply|why join)\b/i;

function headingText(line: string): string | null {
  const t = line.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  if (!t || t.length > 60) return null;
  if (!/:$/.test(t) && /[.,;]$/.test(t)) return null;
  return t.replace(/:$/, "").trim();
}

export function splitSections(description: string): Sections {
  const buckets = { required: [] as string[], preferred: [] as string[], other: [] as string[] };
  let current: keyof typeof buckets = "other";
  let sawSplit = false;
  for (const line of description.split(/\r?\n/)) {
    const h = headingText(line);
    if (h && PREFERRED_HEADING.test(h)) {
      current = "preferred";
      sawSplit = true;
      continue;
    }
    if (h && REQUIRED_HEADING.test(h)) {
      current = "required";
      sawSplit = true;
      continue;
    }
    if (h && OTHER_HEADING.test(h)) {
      current = "other";
      continue;
    }
    buckets[current].push(line);
  }
  if (!sawSplit) {
    return { split: "undivided", required: description, preferred: "", other: "" };
  }
  return {
    split: "headings",
    required: buckets.required.join("\n"),
    preferred: buckets.preferred.join("\n"),
    other: buckets.other.join("\n"),
  };
}
