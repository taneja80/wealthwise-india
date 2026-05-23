import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string {
  return process.env[name] ?? "";
}

export const env = {
  jwtSecret: required("JWT_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  ollamaUrl: optional("OLLAMA_URL") || "http://localhost:11434",
  ollamaModel: optional("OLLAMA_MODEL") || "llama3.2",
};
