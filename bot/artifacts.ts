import { defineArtifacts } from "@cursor/bdk/artifacts";
import { z } from "zod";

export default defineArtifacts({
  kinds: {
    "tailored-resume": {
      description: "The LaTeX resume tailored for one job. Re-tagged with submitted true when the user presses Submit, so it is the exact file sent.",
      schema: z.object({
        jobId: z.string(),
        company: z.string(),
        title: z.string(),
        score: z.string(),
        submitted: z.boolean(),
      }),
    },
  },
});
