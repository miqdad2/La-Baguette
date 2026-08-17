"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import CakeCreatorModal from "./CakeCreatorModal";

const categories = [
  { name: "Cakes", arabic: "كيك", number: "01", line: "Made for every celebration", accent: "#d86d5d", image: "/assets/products/cake-realistic.webp", model: "/assets/models/cake.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=cakes" },
  { name: "English cakes", arabic: "كيك إنجليزي", number: "02", line: "A timeless afternoon ritual", accent: "#b98263", image: "/assets/products/english-cake-realistic.webp", model: "/assets/models/english-cake.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=english-cakes" },
  { name: "Gateaux", arabic: "جاتوه", number: "03", line: "Little layers of indulgence", accent: "#955848", image: "/assets/products/gateaux-realistic.webp", model: "/assets/models/gateaux.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=mini-desserts" },
  { name: "Croissants & sandwiches", arabic: "كرواسون وساندويتش", number: "04", line: "Golden, flaky, freshly made", accent: "#d89943", image: "/assets/products/croissant-realistic.webp", model: "/assets/models/croissant.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=freshly-baked-2" },
  { name: "Gathering Savories", arabic: "مقبلات التجمعات", number: "05", line: "Pass around something wonderful", accent: "#a67b4c", image: "/assets/products/savories-realistic.webp", model: "/assets/models/savories.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=gathering-platters-2" },
  { name: "Chocolate & Coffee sweet", arabic: "حلويات الشوكولاتة والقهوة", number: "06", line: "Deep cocoa, bright conversation", accent: "#795044", image: "/assets/products/chocolate-coffee-realistic.webp", model: "/assets/models/chocolate-coffee.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=chocolate-assortments" },
  { name: "Arabic Sweets", arabic: "حلويات عربية", number: "07", line: "Tradition, finished beautifully", accent: "#a98a4e", image: "/assets/products/arabic-sweets-realistic.webp", model: "/assets/models/arabic-sweets.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=arabic-coffee-sweets" },
  { name: "Ice Cream", arabic: "آيس كريم", number: "08", line: "A little joy in every scoop", accent: "#8a9b79", image: "/assets/products/ice-cream-realistic.webp", model: "/assets/models/ice-cream.glb", orderUrl: "https://order.labaguette.com.kw/NPLXmejr4q?category=ice-cream-menu-2" },
];

function ProductPhoto3D({ index, onOrder }: { index: number; onOrder: () => void }) {
  const [pose, setPose] = useState({ x: 0, y: 0 });
  const drag = useRef({ active: false, startX: 0, startY: 0, moved: false });

  return <div
    className="photo-orbit"
    role="button"
    tabIndex={0}
    aria-label={`Interact with ${categories[index].name}; click to order`}
    style={{ "--tilt-x": `${pose.x}deg`, "--tilt-y": `${pose.y}deg`, "--light-x": `${50 + pose.y * 1.6}%`, "--light-y": `${42 - pose.x * 1.6}%` } as React.CSSProperties}
    onPointerDown={(event) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { active: true, startX: event.clientX, startY: event.clientY, moved: false };
    }}
    onPointerMove={(event) => {
      if (!drag.current.active) return;
      const dx = event.clientX - drag.current.startX;
      const dy = event.clientY - drag.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
      setPose({ x: Math.max(-9, Math.min(9, -dy / 12)), y: Math.max(-14, Math.min(14, dx / 11)) });
    }}
    onPointerUp={(event) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      const shouldOrder = !drag.current.moved;
      drag.current.active = false;
      setPose({ x: 0, y: 0 });
      if (shouldOrder) onOrder();
    }}
    onPointerCancel={() => { drag.current.active = false; setPose({ x: 0, y: 0 }); }}
    onKeyDown={(event) => {
      if (event.key === "ArrowRight") setPose((value) => ({ ...value, y: Math.min(14, value.y + 5) }));
      if (event.key === "ArrowLeft") setPose((value) => ({ ...value, y: Math.max(-14, value.y - 5) }));
      if (event.key === "Escape") setPose({ x: 0, y: 0 });
      if (event.key === "Enter" || event.key === " ") onOrder();
    }}
  >
    <span className="photo-depth-shadow" />
    <img src={categories[index].image} alt={categories[index].name} draggable={false} />
    <span className="photo-light" />
  </div>;
}

function CakeMesh({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF("/assets/models/cake-meshy.glb", false, true);

  useEffect(() => {
    scene.traverse((object) => {
      if (!("isMesh" in object) || !object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    onReady();
  }, [scene, onReady]);

  return <primitive object={scene} scale={1.42} rotation={[-0.04, -0.28, 0]} position={[0, -0.04, 0]} />;
}

function ProductModel360({ onOrder }: { onOrder: () => void }) {
  const [ready, setReady] = useState(false);
  const drag = useRef({ x: 0, y: 0, moved: false });

  return <div
    className={`model-orbit ${ready ? "ready" : ""}`}
    role="application"
    aria-label="Interactive realistic cake. Drag left or right for a full 360 degree view; tap without dragging to order."
    onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, moved: false }; }}
    onPointerMove={(event) => {
      if (Math.abs(event.clientX - drag.current.x) + Math.abs(event.clientY - drag.current.y) > 8) drag.current.moved = true;
    }}
    onPointerUp={() => { if (!drag.current.moved) onOrder(); }}
  >
    <img className="model-poster" src={categories[0].image} alt="Realistic berry celebration cake" draggable={false} />
    <Canvas
      shadows
      dpr={[1, 1.65]}
      camera={{ position: [0, 0.48, 4.95], fov: 31, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#fff8e9", "#7c897e", 1.7]} />
      <directionalLight position={[3.5, 5.5, 4]} intensity={3.8} color="#fff2da" castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={2.1} color="#dfeaff" />
      <spotLight position={[0, 6, -4]} intensity={2.2} angle={0.65} penumbra={0.8} color="#ffffff" />
      <Suspense fallback={null}><CakeMesh onReady={() => setReady(true)} /></Suspense>
      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.055}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.29}
        maxPolarAngle={Math.PI * 0.62}
        rotateSpeed={0.72}
        target={[0, 0, 0]}
      />
    </Canvas>
    {!ready && <span className="model-loading">Preparing the cake in 360°</span>}
  </div>;
}

useGLTF.preload("/assets/models/cake-meshy.glb", false, true);

export default function Home() {
  const [active, setActive] = useState(0);
  const [menu, setMenu] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const current = categories[active];
  const order = () => window.location.assign(current.orderUrl);
  return <main className="site-shell" style={{ "--accent": current.accent } as React.CSSProperties}>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="La Baguette home"><span className="brand-mark"><img src="/assets/la-baguette-mark.png" alt="" /></span><span>LA BAGUETTE<small>KUWAIT · SINCE 1983</small></span></a>
      <nav className={menu ? "nav open" : "nav"} aria-label="Primary navigation"><a href="#collection">Collection</a><a href="#story">Our story</a><a href="https://order.labaguette.com.kw/">Order online</a></nav>
      <div className="header-actions"><button className="language" aria-label="Switch to Arabic">عربي</button><button className="mini-order" onClick={() => setCreatorOpen(true)}>Create your own cake</button><button className="menu" onClick={() => setMenu(!menu)} aria-label="Toggle menu"><span /><span /></button></div>
    </header>
    <CakeCreatorModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    <section className="hero" id="top">
      <div className="hero-copy">
        <div className="eyebrow"><span>{current.number}</span> Crafted in Kuwait since 1983</div>
        <h1 key={`title-${active}`}>A delicious<br /><em>reason</em> to gather.</h1>
        <p key={`line-${active}`}>{current.line}. Discover our <strong>{current.name}</strong>, created to make everyday moments feel worth celebrating.</p>
        <button className="order-button" onClick={order}><span>Explore {current.name}</span><b>↗</b></button>
        <button className="sound-note" aria-label="Interactive product image"><i /> Drag to explore · Tap to order</button>
      </div>
      <div className="stage" aria-label={`Interactive ${current.name} product view`}>
        <div className="halo" />
        <div className="canvas-wrap" key={active}>{active === 0 ? <ProductModel360 onOrder={order} /> : <ProductPhoto3D index={active} onOrder={order} />}</div>
        <span className="ingredient ingredient-a">✦</span><span className="ingredient ingredient-b">•</span><span className="ingredient ingredient-c">✦</span>
        <div className="click-coach" aria-hidden="true"><span><b>↔</b></span><div><small>{active === 0 ? "DRAG FOR A TRUE 360° VIEW" : "DRAG TO EXPLORE · CLICK TO ORDER"}</small><strong>{active === 0 ? "Rotate the real 3D cake" : `Discover ${current.name}`}</strong></div></div>
        <div className="product-label"><small>NOW SHOWING</small><strong>{current.name}</strong><span>{current.arabic}</span></div>
      </div>
      <div className="hero-side"><span className="vertical-copy">THE ART OF SWEET MOMENTS</span><div className="pager"><button onClick={() => setActive((active + 7) % 8)} aria-label="Previous category">↑</button><b>{current.number}</b><span>/ 08</span><button onClick={() => setActive((active + 1) % 8)} aria-label="Next category">↓</button></div></div>
      <div className="hero-categories" id="collection"><div className="category-dock-title"><small>EXPLORE THE COLLECTION</small><span>Choose your craving</span></div><div className="hero-category-track">{categories.map((category, index) => <button key={category.name} className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-pressed={index === active}><img src={category.image} alt="" /><span>{category.number}</span><b>{category.name}</b><i>↗</i></button>)}</div></div>
    </section>
    <section className="story" id="story"><span className="story-kicker">La Baguette · Since 1983</span><h2>Made for the moments<br />you remember.</h2><p>From the first morning croissant to the cake at the centre of your celebration, every La Baguette creation is made to bring people closer.</p><a href="https://order.labaguette.com.kw/">Begin your order <span>→</span></a></section>
  </main>;
}
