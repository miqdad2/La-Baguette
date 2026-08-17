import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
const endpoint = "https://api.meshy.ai/openapi/v2/text-to-3d";

function config() {
  const key = process.env.MESHY_API_KEY;
  if (!key || process.env.MESHY_GENERATION_ENABLED !== "true") return { error: "AI 3D generation is ready, but the secure Meshy API key has not been enabled yet." };
  return { key };
}

async function meshy(path: string, key: string, init?: RequestInit) {
  const response = await fetch(`${endpoint}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Meshy request failed (${response.status})`);
  return data;
}

export async function POST(request: NextRequest) {
  const state = config();
  if (state.error || !state.key) return NextResponse.json({ error: state.error }, { status: 503 });
  try {
    const body = await request.json();
    if (body.action === "preview") {
      const description = String(body.prompt || "").trim();
      if (description.length < 12) return NextResponse.json({ error: "Please describe the cake in a little more detail." }, { status: 400 });
      const prompt = `Photorealistic luxury bakery celebration cake, complete full 360-degree product model. ${description}. Real edible ingredients, detailed frosting and sponge, realistic proportions, physically based materials, studio-ready, single centered cake, no text, no logo, no floating or disconnected geometry.`.slice(0, 600);
      const result = await meshy("", state.key, { method: "POST", body: JSON.stringify({ mode: "preview", prompt, ai_model: "meshy-7", model_type: "standard", should_remesh: false, target_formats: ["glb"] }) });
      return NextResponse.json({ id: result.result });
    }
    if (body.action === "refine" && /^[\w-]{8,100}$/.test(String(body.previewId || ""))) {
      const result = await meshy("", state.key, { method: "POST", body: JSON.stringify({ mode: "refine", preview_task_id: body.previewId, enable_pbr: true, target_formats: ["glb"] }) });
      return NextResponse.json({ id: result.result });
    }
    return NextResponse.json({ error: "Invalid generation request." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed." }, { status: 500 });
  }
}

function isAllowedModelHost(hostname: string) {
  return hostname === "meshy.ai" || hostname.endsWith(".meshy.ai");
}

async function proxyModel(rawUrl: string) {
  let modelUrl: URL;
  try {
    modelUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid model URL." }, { status: 400 });
  }
  if (modelUrl.protocol !== "https:" || !isAllowedModelHost(modelUrl.hostname)) {
    return NextResponse.json({ error: "Model URL is not allowed." }, { status: 400 });
  }
  const upstream = await fetch(modelUrl.toString(), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Could not fetch the model (${upstream.status}).` }, { status: 502 });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: { "Content-Type": "model/gltf-binary", "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const state = config();
  if (state.error || !state.key) return NextResponse.json({ error: state.error }, { status: 503 });

  const model = request.nextUrl.searchParams.get("model");
  if (model) return proxyModel(model);

  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[\w-]{8,100}$/.test(id)) return NextResponse.json({ error: "Invalid task." }, { status: 400 });
  try {
    const result = await meshy(`/${id}`, state.key);
    return NextResponse.json({ status: result.status, progress: result.progress || 0, modelUrl: result.model_urls?.glb, error: result.task_error?.message });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check generation." }, { status: 500 });
  }
}
