import ExcelJS from "exceljs";
import { statusLine } from "./status.ts";
import type { TrackerData } from "./types.ts";

type Col = { header: string; width: number };

function sheet(book: ExcelJS.Workbook, name: string, cols: Col[], rows: (string | number | Date | null)[][]) {
  const ws = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, width: c.width }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F1F1" } };
  for (const r of rows) ws.addRow(r.map((v) => v ?? ""));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  ws.eachRow((row, i) => {
    if (i > 1) row.alignment = { vertical: "top", wrapText: true };
  });
}

const date = (iso: string | null) => (iso ? new Date(iso) : null);

export async function trackerWorkbook(data: TrackerData, siteUrl = ""): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "Shortlist";
  const jobs = [...data.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const resumeUrl = (id: string) => (siteUrl ? `${siteUrl}/resume/${id}` : `resumes/${id}.tex`);

  sheet(
    book,
    "All jobs",
    [
      { header: "Found", width: 18 },
      { header: "Title", width: 32 },
      { header: "Company", width: 22 },
      { header: "Location", width: 20 },
      { header: "Status and reason", width: 60 },
      { header: "Score before", width: 12 },
      { header: "Score after", width: 12 },
      { header: "Posting", width: 40 },
      { header: "Resume", width: 40 },
      { header: "Submitted", width: 18 },
      { header: "People", width: 8 },
      { header: "Job id", width: 36 },
    ],
    jobs.map((j) => [
      date(j.createdAt),
      j.title,
      j.company,
      j.location,
      statusLine(j),
      j.scoreBefore,
      j.scoreAfter,
      j.sources[0]?.url ?? "",
      j.resumePath ? resumeUrl(j.id) : "",
      date(j.submittedAt),
      j.people.length,
      j.id,
    ]),
  );

  sheet(
    book,
    "Applied",
    [
      { header: "Submitted", width: 18 },
      { header: "Title", width: 32 },
      { header: "Company", width: 22 },
      { header: "Score after", width: 12 },
      { header: "Resume sent", width: 40 },
      { header: "Posting", width: 40 },
    ],
    jobs
      .filter((j) => j.stage === "submitted")
      .map((j) => [date(j.submittedAt), j.title, j.company, j.scoreAfter, resumeUrl(j.id), j.sources[0]?.url ?? ""]),
  );

  sheet(
    book,
    "Not applied",
    [
      { header: "Found", width: 18 },
      { header: "Title", width: 32 },
      { header: "Company", width: 22 },
      { header: "Why", width: 70 },
      { header: "Posting", width: 40 },
    ],
    jobs
      .filter((j) => j.stage === "ignored" || j.stage === "skipped_by_you")
      .map((j) => [date(j.createdAt), j.title, j.company, j.stage === "skipped_by_you" ? "You skipped it" : (j.reason ?? ""), j.sources[0]?.url ?? ""]),
  );

  sheet(
    book,
    "Outreach",
    [
      { header: "Company", width: 22 },
      { header: "Job", width: 30 },
      { header: "Name", width: 22 },
      { header: "Role", width: 28 },
      { header: "Source", width: 10 },
      { header: "LinkedIn", width: 40 },
      { header: "Email", width: 28 },
      { header: "Invite", width: 14 },
      { header: "Email status", width: 14 },
      { header: "LinkedIn note", width: 70 },
    ],
    jobs.flatMap((j) =>
      j.people.map((p) => [
        j.company,
        j.title,
        `${p.firstName} ${p.lastName}`.trim(),
        p.role,
        p.source === "apollo" ? "Apollo" : "Vibe",
        p.linkedinUrl,
        p.email,
        p.invite === "sent" ? "Sent" : p.invite === "held_by_cap" ? "Held by cap" : "Not sent",
        p.emailStatus === "sent" ? "Sent" : p.emailStatus === "draft" ? "Draft" : "No email",
        p.note,
      ]),
    ),
  );

  sheet(
    book,
    "Runs",
    [
      { header: "Started", width: 18 },
      { header: "Kind", width: 12 },
      { header: "Fetched", width: 10 },
      { header: "Older than 24h", width: 14 },
      { header: "Passed filters", width: 14 },
      { header: "Shortlisted", width: 12 },
      { header: "Ignored", width: 10 },
      { header: "Note", width: 40 },
      { header: "Failures", width: 60 },
    ],
    [...data.runs]
      .reverse()
      .map((r) => [
        date(r.startedAt),
        r.kind === "morning" ? "Scheduled" : "After approval",
        r.fetched,
        r.droppedStale,
        r.passedFilters,
        r.shortlisted,
        r.ignored,
        r.note,
        r.failed.map((f) => `${f.jobId}: ${f.error}`).join("; "),
      ]),
  );

  return Buffer.from(await book.xlsx.writeBuffer());
}
