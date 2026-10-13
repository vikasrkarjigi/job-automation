import type { ToolContext, ToolResultValue } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import type { z } from "zod";

export type JsonResult = { [key: string]: ToolResultValue };

/** Pipeline rows are interfaces; tool results must be plain JSON objects. */
export const json = (value: object): JsonResult => JSON.parse(JSON.stringify(value));

/** defineTool whose execute may return pipeline objects; the result is serialized to plain JSON. */
export function defineJsonTool<S extends z.ZodTypeAny>(config: {
  description: string;
  inputSchema: S;
  effect: "read" | "write";
  execute: (input: z.infer<S>, ctx: ToolContext) => Promise<object> | object;
}) {
  return defineTool({
    description: config.description,
    inputSchema: config.inputSchema,
    effect: config.effect,
    async execute(input: z.infer<S>, ctx: ToolContext) {
      return json(await config.execute(input, ctx));
    },
  });
}
