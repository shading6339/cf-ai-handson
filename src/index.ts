export interface Env {
  AI: Ai;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
};

type AiResponse = {
  response?: string;
  choices?: { message?: { content?: string } }[];
};

function extractText(result: AiResponse): string {
  return result.response ?? result.choices?.[0]?.message?.content ?? "";
}

const MODELS = [
  { id: "@cf/qwen/qwen2.5-coder-32b-instruct", label: "Qwen2.5 Coder 32B" },
  { id: "@cf/meta/llama-3.1-8b-instruct-fp8-fast", label: "Llama 3.1 8B fp8-fast" },
  { id: "@cf/meta/llama-3.1-8b-instruct-fp8", label: "Llama 3.1 8B fp8" },
  { id: "@cf/meta/llama-3.2-3b-instruct", label: "Llama 3.2 3B" },
  { id: "@cf/ibm-granite/granite-4.0-h-micro", label: "Granite 4.0 h-micro" },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // ヘルスチェック
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({ status: "ok", message: "Cloudflare Workers AI ハンズオン" }),
        { headers: JSON_HEADERS }
      );
    }

    // ────────────────────────────────────────────
    // オリジナルエンドポイント
    // ────────────────────────────────────────────
    if (url.pathname === "/generate" && request.method === "POST") {
      try {
        const body = await request.json() as { prompt?: string; model?: string };
        const prompt = body.prompt ?? "Hello!";
        const model = (body.model as BaseAiTextGenerationModels) ??
          "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

        const allowed = MODELS.map(m => m.id);
        if (!allowed.includes(model)) {
          return new Response(
            JSON.stringify({ error: `許可されていないモデルです: ${model}` }),
            { status: 400, headers: JSON_HEADERS }
          );
        }

        const start = Date.now();
        const result = await env.AI.run(model as BaseAiTextGenerationModels, {
          messages: [
            { role: "system", content: "You are a helpful assistant. Answer concisely in the same language as the user." },
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
        }) as AiResponse;
        const elapsed = Date.now() - start;

        return new Response(
          JSON.stringify({ model, prompt, response: extractText(result), elapsed_ms: elapsed }),
          { headers: JSON_HEADERS }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: JSON_HEADERS });
      }
    }

    // ────────────────────────────────────────────
    // Ollama互換エンドポイント（VSCode Copilot連携用）
    // ────────────────────────────────────────────

    // GET /api/version
    if (url.pathname === "/api/version" && request.method === "GET") {
      return new Response(JSON.stringify({ version: "0.20.6" }), { headers: JSON_HEADERS });
    }

    // GET /api/tags — VSCodeがモデル一覧取得に使うエンドポイント
    if (url.pathname === "/api/tags" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          models: MODELS.map(m => ({
            name: m.id,
            model: m.id,
            modified_at: new Date().toISOString(),
            size: 0,
            digest: "",
            details: {
              format: "workers-ai",
              family: "cloudflare",
              parameter_size: "unknown",
              quantization_level: "unknown",
            },
          })),
        }),
        { headers: JSON_HEADERS }
      );
    }

    // POST /api/show — モデル詳細（Copilotが呼ぶことがある）
    if (url.pathname === "/api/show" && request.method === "POST") {
      const body = await request.json() as { model?: string };
      return new Response(
        JSON.stringify({
          model: body.model ?? MODELS[0].id,
          details: { format: "workers-ai", family: "cloudflare" },
          capabilities: ["completion"],
        }),
        { headers: JSON_HEADERS }
      );
    }

    // ────────────────────────────────────────────
    // OpenAI互換エンドポイント（補完）
    // ────────────────────────────────────────────

    // GET /v1/models
    if ((url.pathname === "/v1/models" || url.pathname === "/models") && request.method === "GET") {
      return new Response(
        JSON.stringify({
          object: "list",
          data: MODELS.map(m => ({ id: m.id, object: "model", created: 0, owned_by: "cloudflare" })),
        }),
        { headers: JSON_HEADERS }
      );
    }

    // POST /v1/chat/completions
    if ((url.pathname === "/v1/chat/completions" || url.pathname === "/chat/completions") && request.method === "POST") {
      try {
        const body = await request.json() as {
          model?: string;
          messages?: { role: string; content: string }[];
          max_tokens?: number;
          temperature?: number;
        };

        const model = (body.model ?? "@cf/qwen/qwen2.5-coder-32b-instruct") as BaseAiTextGenerationModels;
        const messages = body.messages ?? [{ role: "user", content: "Hello" }];

        const result = await env.AI.run(model, {
          messages,
          max_tokens: body.max_tokens ?? 1024,
          temperature: body.temperature ?? 0.6,
        }) as AiResponse;

        const content = extractText(result);

        return new Response(
          JSON.stringify({
            id: `chatcmpl-${crypto.randomUUID()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          }),
          { headers: JSON_HEADERS }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: { message: String(e), type: "server_error" } }),
          { status: 500, headers: JSON_HEADERS }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
} satisfies ExportedHandler<Env>;