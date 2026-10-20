import type { NextRequest } from "next/server";
import { SESSION_COOKIE, validSession } from "@/auth";
import { trackerWorkbook } from "@/export-xlsx";
import { readState } from "@/store";
import { dayKey, loadTracker } from "@/tracker";

export async function GET(req: NextRequest) {
  if (!validSession(req.cookies.get(SESSION_COOKIE)?.value)) return new Response("Log in first.", { status: 401 });
  const data = await readState(() => loadTracker());
  const bytes = await trackerWorkbook(data, req.nextUrl.origin);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="shortlist-${dayKey()}.xlsx"`,
    },
  });
}
