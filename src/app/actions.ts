"use server";

import { revalidatePath } from "next/cache";
import { approve, confirmKeyword, markSent, markSubmitted, runApproved, skip } from "@/orchestrator";

const id = (form: FormData) => String(form.get("jobId") ?? "");

export async function approveJob(form: FormData) {
  approve(id(form));
  runApproved();
  revalidatePath("/");
}

export async function skipJob(form: FormData) {
  skip(id(form));
  revalidatePath("/");
}

export async function answerKeyword(form: FormData) {
  const term = String(form.get("term") ?? "");
  const answer = form.get("answer") === "yes" ? "yes" : "no";
  const note = String(form.get("note") ?? "").trim();
  if (!term) return;
  confirmKeyword(term, answer, note);
  revalidatePath("/");
}

export async function confirmSubmitted(form: FormData) {
  markSubmitted(id(form));
  revalidatePath("/");
}

export async function sayYesToSend(form: FormData) {
  markSent(id(form));
  revalidatePath("/");
}
