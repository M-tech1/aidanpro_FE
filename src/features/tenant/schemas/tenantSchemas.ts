import { z } from "zod";

export const agentConfigSchema = z.object({
  greeting: z.string().optional(),
  system_prompt: z.string().optional(),
  tone: z.string().optional(),
  store_transcripts: z.boolean().optional(),
  store_recordings: z.boolean().optional(),
  retention_days: z.number().min(1).max(365).optional(),
  change_note: z.string().optional()
});

export type AgentConfigFormValues = z.infer<typeof agentConfigSchema>;




