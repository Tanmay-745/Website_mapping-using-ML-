import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// LLM Generation Endpoint
app.post("/api/generate", async (c) => {
  try {
    const { prompt, context, apiKey } = await c.req.json();

    // Use provided key or fall back to environment variable
    const OPENAI_API_KEY = apiKey || Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      console.error("Missing OpenAI API Key");
      return c.json({ error: "OpenAI API Key not configured" }, 500);
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // Or "gpt-3.5-turbo" if preferred for cost
        messages: [
          {
            role: "system",
            content: "You are an expert legal assistant specializing in drafting Indian legal notices (LRN, LDN, OTS, etc.). Your output should be professional, legally precise, and formatted in HTML (using tags like <p>, <h3>, <ul>, <strong>, etc.) suitable for a rich text editor. Do not wrap the output in markdown code blocks."
          },
          {
            role: "user",
            content: `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`
          }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      return c.json({ error: `OpenAI API Error: ${errorData.error?.message || response.statusText}` }, response.status);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Clean up any potential markdown code blocks if the model adds them despite instructions
    const cleanContent = generatedContent.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    return c.json({ result: cleanContent });

  } catch (error) {
    console.error("LLM Generation Error:", error);
    return c.json({ error: "Failed to generate content" }, 500);
  }
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

Deno.serve(app.fetch);