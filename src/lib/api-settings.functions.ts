import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Checks whether the saved Gemini key is present and answers Google; never returns the key. */
export const checkGeminiKey = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ model: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_API_KEY"];
    if (!key) return { configured: false, ok: false, message: "No Gemini key saved yet.", models: [] as string[] };
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return { configured: true, ok: false, message: `Google rejected the key (status ${res.status}).`, models: [] };
    const body = (await res.json()) as { data?: { id: string }[] };
    const models = (body.data ?? []).map((m) => m.id.replace("models/", "")).filter((m) => m.startsWith("gemini") && !/tts|image|embedding|banana/.test(m));
    return { configured: true, ok: models.includes(data.model), message: models.includes(data.model) ? "Key works." : "Key works, but this model isn't available to it.", models };
  });
