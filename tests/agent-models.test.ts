import { describe, expect, it } from "vitest";
import { friendlyStartFailure, modelChain, parseCursorError, shouldTryNextModel } from "../src/agent-models.ts";

describe("agent model fallback", () => {
  it("defaults to composer, grok, then claude ids", () => {
    delete process.env.SHORTLIST_AGENT_MODELS;
    expect(modelChain().slice(0, 3)).toEqual(["composer-2.5", "grok-4.7", "claude-opus-5-5"]);
  });

  it("tries the next model on usage_limit_exceeded", () => {
    const err = parseCursorError(400, '{"error":{"code":"usage_limit_exceeded","message":"On-demand usage is required"}}');
    expect(shouldTryNextModel(err, 0, 3)).toBe(true);
    expect(shouldTryNextModel(err, 2, 3)).toBe(false);
  });

  it("explains account limits in plain language", () => {
    const err = parseCursorError(400, '{"error":{"code":"usage_limit_exceeded","message":"On-demand usage is required"}}');
    const msg = friendlyStartFailure([
      { model: "composer-2.5", err },
      { model: "grok-4.7", err },
    ]);
    expect(msg).toMatch(/on-demand usage/i);
    expect(msg).toMatch(/Composer.*Grok/);
  });
});
