import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";

class NodeFileReader {
  result = null;
  onloadend = null;
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((value) => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((value) => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString("base64")}`; this.onloadend?.(); }); }
}
globalThis.FileReader = NodeFileReader;

const out = new URL("../public/assets/models/", import.meta.url);
await mkdir(out, { recursive: true });

const mat = (color, roughness = .55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const cream = mat("#fff1dc", .78), pink = mat("#e88878", .62), sponge = mat("#d89548", .82);
const chocolate = mat("#4a241c", .42), darkChocolate = mat("#25130f", .34), glaze = mat("#6f3023", .2);
const berry = mat("#b52135", .48), blueberry = mat("#273c66", .5), leaf = mat("#477047", .7);
const pastry = mat("#cf7a24", .68), pastryLight = mat("#eda54b", .7), pistachio = mat("#799344", .75);
const ceramic = mat("#eee6d8", .3), sage = mat("#718879", .55), gold = mat("#b88a3e", .28, .45);

function mesh(geometry, material, position = [0,0,0], rotation = [0,0,0], scale = [1,1,1]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position); item.rotation.set(...rotation); item.scale.set(...scale);
  item.castShadow = true; item.receiveShadow = true; return item;
}
function cyl(r, h, material, y = 0, segments = 64) { return mesh(new THREE.CylinderGeometry(r, r, h, segments), material, [0,y,0]); }
function sphere(r, material, position, scale = [1,1,1]) { return mesh(new THREE.SphereGeometry(r, 28, 20), material, position, [0,0,0], scale); }
function torus(major, tube, material, position, rotation = [Math.PI/2,0,0], arc = Math.PI*2) { return mesh(new THREE.TorusGeometry(major, tube, 18, 64, arc), material, position, rotation); }
function berryCrown(group, radius, y, count = 10) {
  for (let i=0;i<count;i++) {
    const a = i / count * Math.PI * 2;
    const m = i % 3 === 0 ? blueberry : berry;
    const r = i % 3 === 0 ? .12 : .16;
    group.add(sphere(r, m, [Math.cos(a)*radius, y + (i%2)*.08, Math.sin(a)*radius], [1, .9, 1]));
    if (i % 3 !== 0) group.add(mesh(new THREE.ConeGeometry(.08,.12,5), leaf, [Math.cos(a)*radius, y+.17, Math.sin(a)*radius]));
  }
}
function cake() {
  const g = new THREE.Group();
  g.add(cyl(1.28,1.45,cream,-.22), torus(1.18,.11,pink,[0,.49,0]), torus(1.18,.10,cream,[0,-.9,0]));
  for (let i=0;i<16;i++) { const a=i/16*Math.PI*2; g.add(sphere(.13,i%2?pink:cream,[Math.cos(a)*1.12,-.91,Math.sin(a)*1.12],[1,.72,1])); }
  for (let i=0;i<10;i++) { const a=i/10*Math.PI*2; const x=Math.cos(a)*1.29,z=Math.sin(a)*1.29; g.add(torus(.16,.035,pink,[x,-.22,z],[0,a,0],Math.PI)); }
  berryCrown(g,.78,.72,12); g.rotation.y=.18; return g;
}
function englishCake() {
  const g=new THREE.Group();
  g.add(cyl(1.35,.52,sponge,-.48),cyl(1.35,.52,sponge,.31),torus(1.12,.20,cream,[0,-.08,0]),torus(1.12,.12,berry,[0,-.18,0]),cyl(1.36,.08,cream,.62));
  berryCrown(g,.66,.76,9); return g;
}
function gateaux() {
  const g=new THREE.Group();
  g.add(cyl(1.35,.52,darkChocolate,-.52),cyl(1.35,.54,chocolate,.02),cyl(1.36,.2,glaze,.42),torus(1.16,.08,glaze,[0,.49,0]));
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;g.add(torus(.24,.055,chocolate,[Math.cos(a)*.7,.72,Math.sin(a)*.7],[Math.PI/2,a,0],Math.PI*1.55));}
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;g.add(sphere(.045,pistachio,[Math.cos(a)*.95,.62,Math.sin(a)*.95]));} return g;
}
function croissant() {
  const g=new THREE.Group();
  const count=11;
  for(let i=0;i<count;i++){const t=i/(count-1),a=Math.PI*.18+t*Math.PI*.64;const x=Math.cos(a)*1.2,z=Math.sin(a)*.55;const s=.48-Math.abs(t-.5)*.42;g.add(sphere(.52,i%2?pastry:pastryLight,[x,(.5-Math.abs(t-.5))*.22-.15,z],[s*1.55,.62,s]));}
  g.rotation.set(-.12,.2,-.1); return g;
}
function savories() {
  const g=new THREE.Group(); g.add(cyl(1.55,.12,ceramic,-.48),torus(1.42,.08,gold,[0,-.4,0]));
  const forms=[[ -.75,0,-.55],[0,0,-.62],[.72,0,-.48],[-.72,0,.35],[0,0,.42],[.72,0,.34]];
  forms.forEach((p,i)=>{g.add(mesh(new THREE.CylinderGeometry(.34,.4,.35,i%2?6:3),i%3===0?pastryLight:pastry,[p[0],-.18,p[2]],[0,i*.45,0]));g.add(sphere(.05,pistachio,[p[0],.04,p[2]]));}); return g;
}
function coffeeChocolate() {
  const g=new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.63,.5,1.05,48),ceramic,[-.52,-.12,0]),torus(.5,.1,ceramic,[-.03,-.06,0],[Math.PI/2,0,0],Math.PI*1.55),cyl(.51,.04,darkChocolate,.42));
  const spots=[[.42,-.5,-.38],[.78,-.34,.12],[.34,-.22,.48],[1.02,-.52,.48]];
  spots.forEach((p,i)=>g.add(mesh(i%2?new THREE.BoxGeometry(.55,.32,.55):new THREE.CylinderGeometry(.33,.33,.30,8),i%2?chocolate:glaze,p,[0,i*.37,0]))); return g;
}
function arabicSweets() {
  const g=new THREE.Group();g.add(cyl(1.55,.12,gold,-.5));
  for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++){const px=x*.52,pz=z*.56+(x%2)*.15;g.add(mesh(new THREE.CylinderGeometry(.29,.32,.28,4),x%2?pastry:pastryLight,[px,-.25,pz],[0,Math.PI/4,0]));g.add(sphere(.045,pistachio,[px,-.07,pz]));}
  return g;
}
function iceCream() {
  const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.78,.5,1.22,48),ceramic,[0,-.5,0]),torus(.7,.05,sage,[0,.08,0]));
  g.add(sphere(.58,pistachio,[-.42,.35,.02]),sphere(.59,chocolate,[.18,.58,-.02]),sphere(.55,cream,[.55,.28,.08]));
  g.add(mesh(new THREE.ConeGeometry(.16,.9,4),pastryLight,[.35,1.05,.06],[0,0,-.4])); return g;
}

const models = { cake:cake(), "english-cake":englishCake(), gateaux:gateaux(), croissant:croissant(), savories:savories(), "chocolate-coffee":coffeeChocolate(), "arabic-sweets":arabicSweets(), "ice-cream":iceCream() };
const exporter = new GLTFExporter();
for (const [name, scene] of Object.entries(models)) {
  scene.name = `LaBaguette_${name}`;
  const binary = await new Promise((resolve,reject)=>exporter.parse(scene,resolve,reject,{binary:true,onlyVisible:true}));
  await writeFile(new URL(`${name}.glb`,out),Buffer.from(binary));
  console.log(`${name}.glb`);
}
