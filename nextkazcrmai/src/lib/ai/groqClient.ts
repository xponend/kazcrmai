import Groq from "groq-sdk";

let client: Groq | undefined;

export function getGroq(): Groq {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set");
    }
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS ?? 12_000);

/**
 * Run a Groq promise with a hard timeout. The Groq SDK does not always honour
 * AbortSignal cleanly, so we race it. A timeout rejects with a typed error.
 */
export async function withGroqTimeout<T>(promise: Promise<T>, ms = GROQ_TIMEOUT_MS): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Groq timeout after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
