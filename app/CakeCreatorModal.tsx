"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";

const ORDER_URL = "https://order.labaguette.com.kw/";
type Tab = "ready" | "photo" | "ai";
type Task = { status?: string; progress?: number; modelUrl?: string; error?: string };

function RemoteCake({ url, onReady }: { url: string; onReady: () => void }) {
  const { scene } = useGLTF(url, false, true);
  useEffect(() => { onReady(); }, [scene, onReady]);
  return <Bounds fit clip observe margin={1.25}><Center><primitive object={scene} /></Center></Bounds>;
}

function Viewer({ url }: { url: string }) {
  const [ready, setReady] = useState(false);
  return <div className="creator-model"><Canvas dpr={[1, 1.6]} camera={{ position: [0, .5, 4], fov: 34 }}>
    <ambientLight intensity={1.35} /><hemisphereLight args={["#fff6e5", "#718078", 1.7]} /><directionalLight position={[4, 6, 5]} intensity={3.6} /><directionalLight position={[-4, 2, -3]} intensity={1.7} />
    <Suspense fallback={null}><RemoteCake url={url} onReady={() => setReady(true)} /></Suspense><OrbitControls autoRotate autoRotateSpeed={.45} enableDamping enablePan={false} minDistance={2} maxDistance={8} />
  </Canvas><span>{ready ? "Drag to rotate in 360°" : "Loading your cake in 3D…"}</span></div>;
}

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function CakeCreatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("ai");
  const [photo, setPhoto] = useState("");
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [message, setMessage] = useState("Happy Birthday!");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Elegant");
  const [stage, setStage] = useState<"prompt" | "generating" | "result">("prompt");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [modelUrl, setModelUrl] = useState("");
  const [colour, setColour] = useState("Blush pink");

  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = prior; window.removeEventListener("keydown", escape); };
  }, [open, onClose]);

  const waitFor = async (id: string, label: string) => {
    for (let count = 0; count < 180; count += 1) {
      const task: Task = await json(`/api/meshy?id=${encodeURIComponent(id)}`);
      setStatus(label); setProgress(task.progress || 0);
      if (task.status === "SUCCEEDED") return task;
      if (task.status === "FAILED") throw new Error(task.error || "Meshy could not create this model. Please refine the description and try again.");
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
    }
    throw new Error("Generation timed out. Please try again.");
  };

  const generate = async () => {
    setError(""); setProgress(0); setStage("generating"); setStatus("Building the 360° cake shape");
    try {
      const preview = await json("/api/meshy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", prompt: `${style} design. ${prompt}` }) });
      await waitFor(preview.id, "Building the 360° cake shape");
      setStatus("Applying photorealistic PBR textures"); setProgress(0);
      const refine = await json("/api/meshy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refine", previewId: preview.id }) });
      const finished = await waitFor(refine.id, "Applying photorealistic PBR textures");
      if (!finished.modelUrl) throw new Error("The model finished without a GLB file.");
      setModelUrl(`/api/meshy?model=${encodeURIComponent(finished.modelUrl)}`); setStage("result");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Generation failed."); setStage("prompt"); }
  };

  const talk = () => {
    const Speech = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: (event: { results: { 0: { 0: { transcript: string } } }[] }) => void; start: () => void } }).webkitSpeechRecognition;
    if (!Speech) return setError("Voice input is not supported by this browser. You can type your idea instead.");
    const recognition = new Speech(); recognition.lang = "en-US"; recognition.onresult = (event) => setPrompt(event.results[0][0].transcript); recognition.start();
  };

  const reset = () => { setStage("prompt"); setProgress(0); setStatus(""); setError(""); setModelUrl(""); };
  if (!open) return null;

  return <div className="creator-overlay" role="dialog" aria-modal="true" aria-label="Create your own cake" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="creator-dialog">
      <button className="creator-close" onClick={onClose} aria-label="Close cake creator">×</button>
      <header className="creator-head"><small>YOUR CELEBRATION, DESIGNED WITH YOU</small><h2>Create your cake.</h2><p>Choose a ready cake, place a memory on one, or turn your idea into an original 360° cake.</p></header>
      <nav className="creator-tabs" aria-label="Cake creator options">
        <button className={tab === "ready" ? "active" : ""} onClick={() => setTab("ready")}>♜ Ready cakes</button>
        <button className={tab === "photo" ? "active" : ""} onClick={() => setTab("photo")}>▧ 2D photo cake</button>
        <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>✦ AI 3D cake <i>NEW</i></button>
      </nav>

      {tab === "ready" && <div className="ready-panel"><div><small>LA BAGUETTE COLLECTION</small><h3>Beautiful cakes, ready to order.</h3><p>Explore today’s collection, choose your favourite and complete your order through La Baguette.</p><a href={ORDER_URL}>View ready cakes <span>↗</span></a></div><img src="/assets/products/cake-realistic.webp" alt="La Baguette celebration cake" /></div>}

      {tab === "photo" && <div className="photo-studio">
        <div className="creator-card"><small>YOUR PHOTO</small><h3>Put a memory on your cake</h3><p>Upload a photograph, position it inside the edible print, and add your message.</p><label className="upload-button">↑ Upload photo<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPhoto(URL.createObjectURL(file)); }} /></label>
          <label>Zoom <input type="range" min="1" max="1.9" step=".01" value={zoom} onChange={(event) => setZoom(+event.target.value)} /></label><label>Horizontal position <input type="range" min="-45" max="45" value={posX} onChange={(event) => setPosX(+event.target.value)} /></label><label>Vertical position <input type="range" min="-45" max="45" value={posY} onChange={(event) => setPosY(+event.target.value)} /></label>
          <div className="field-grid"><label>Border style<select><option>Cream ring</option><option>Chocolate pearls</option><option>Fresh berries</option></select></label><label>Message<input value={message} onChange={(event) => setMessage(event.target.value)} /></label><label>Size<select><option>Medium · 10–14 guests</option><option>Large · 16–20 guests</option></select></label><label>Flavour<select><option>Belgian chocolate</option><option>Vanilla berry</option><option>Red velvet</option></select></label></div>
        </div>
        <div className="creator-card photo-preview"><small>LIVE PREVIEW</small><h3>Your edible photo cake</h3><div className="cake-top"><div className="edible-photo">{photo ? <img src={photo} alt="Uploaded cake design" style={{ transform: `translate(${posX}%,${posY}%) scale(${zoom})` }} /> : <img className="edible-photo-sample" src="/assets/products/cake-realistic.webp" alt="Sample cake preview" draggable={false} />}</div><b>{message}</b></div><p className="review-price">Price confirmed after bakery review</p><a className="wide-action" href={ORDER_URL}>Continue with this design ↗</a></div>
      </div>}

      {tab === "ai" && <div className="ai-studio">
        {stage === "prompt" && <div className="idea-card"><span className="ai-badge">✦ AI-ASSISTED</span><small>START WITH THE STORY</small><h3>Who are we celebrating?</h3><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the person, occasion, flavours, colours and details they love. For example: A joyful birthday cake for someone who loves berries, soft pink details and elegant celebrations." maxLength={430} /><div className="idea-actions"><button onClick={talk}>◉ Talk to AI</button><label>Design style <select value={style} onChange={(event) => setStyle(event.target.value)}><option>Elegant</option><option>Playful</option><option>Minimal</option><option>Romantic</option><option>Luxury</option></select></label><button className="primary" onClick={generate} disabled={prompt.trim().length < 12}>✦ Yes, customize my cake</button></div>{error && <p className="creator-error">{error}</p>}</div>}
        {stage === "generating" && <div className="generating-card"><div className="spinner">✦</div><small>MESHY AI · SECURE GENERATION</small><h3>Creating your original cake in 360°</h3><p>{status}. This normally takes several minutes; please keep this window open.</p><div className="progress"><i style={{ width: `${Math.max(4, progress)}%` }} /></div><b>{Math.round(progress)}%</b></div>}
        {stage === "result" && <div className="result-grid"><div className="creator-card"><small>LIVE 3D PREVIEW</small><h3>Your cake, from every side</h3><Viewer key={modelUrl} url={modelUrl} /><div className="result-actions"><button onClick={generate}>↻ Regenerate</button><button onClick={reset}>Change idea</button></div></div><div className="creator-card customize"><small>PERSONALISE</small><h3>Make it unmistakably theirs</h3><div className="field-grid"><label>Design style<select value={style} onChange={(e) => setStyle(e.target.value)}><option>Elegant</option><option>Playful</option><option>Minimal</option><option>Luxury</option></select></label><label>Shape<select><option>Round</option><option>Heart</option><option>Square</option></select></label><label>Size<select><option>Medium · 10–14 guests</option><option>Large · 16–20 guests</option></select></label><label>Flavour<select><option>Belgian chocolate</option><option>Vanilla berry</option><option>Red velvet</option></select></label><label>Frosting<select><option>Buttercream</option><option>Ganache</option><option>Fondant</option></select></label><label>Colour mood<select value={colour} onChange={(e) => setColour(e.target.value)}><option>Blush pink</option><option>Ivory and gold</option><option>Chocolate</option><option>Sage green</option></select></label><label>Celebrating<input placeholder="Name" /></label><label>Cake message<input value={message} onChange={(e) => setMessage(e.target.value)} /></label></div><p className="review-price">Final design, availability and price confirmed by our cake team.</p><a className="wide-action" href={ORDER_URL}>Approve & request this cake ↗</a><button className="start-over" onClick={() => { setPrompt(""); reset(); }}>Start over</button></div></div>}
      </div>}
    </section>
  </div>;
}
