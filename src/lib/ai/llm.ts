import { groq } from "@ai-sdk/groq";

export const llm = groq(
  process.env.GROQ_MODEL ?? "openai/gpt-oss-20b"
);