// Low-poly mesh + pixel texture workflow.
// Renders triangle meshes via 2D canvas using PS1-style affine texture mapping.
// Each face owns a small pixel texture rendered with nearest-neighbor sampling.

export const TEX_SIZE = 16;
export const DEFAULT_FACE_COLOR = "#9aa0a6";

export const meshState = {
  meshes: new Map(),
  layers: new Map(),
  activeMeshId: null,
  activeLayerId: null,
  selectedFace: null,
  hoverFace: null,
  activeDrag: null
};

let nextMeshId = 1;
let nextLayerId = 1;

export function createLayer(name) {
  const id = `layer-${nextLayerId++}`;
  const layer = {
    id,
    name: name || `Layer ${meshState.layers.size + 1}`,
    expanded: true,
    visible: true,
    meshIds: []
  };
  meshState.layers.set(id, layer);
  meshState.activeLayerId = id;
  return layer;
}

export function deleteLayer(layerId) {
  const layer = meshState.layers.get(layerId);
  if (!layer) return;
  for (const meshId of [...layer.meshIds]) {
    meshState.meshes.delete(meshId);
  }
  meshState.layers.delete(layerId);
  if (meshState.activeLayerId === layerId) {
    meshState.activeLayerId = meshState.layers.values().next().value?.id || null;
  }
  if (meshState.activeMeshId && !meshState.meshes.has(meshState.activeMeshId)) {
    meshState.activeMeshId = meshState.meshes.values().next().value?.id || null;
  }
}

export function assignMeshToLayer(meshId, layerId) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return;
  if (mesh.layerId && mesh.layerId !== layerId) {
    const prev = meshState.layers.get(mesh.layerId);
    if (prev) prev.meshIds = prev.meshIds.filter((id) => id !== meshId);
  }
  mesh.layerId = layerId;
  const layer = meshState.layers.get(layerId);
  if (layer && !layer.meshIds.includes(meshId)) layer.meshIds.push(meshId);
}

export function setLayerExpanded(layerId, expanded) {
  const layer = meshState.layers.get(layerId);
  if (layer) layer.expanded = !!expanded;
}

export function setLayerVisibility(layerId, visible) {
  const layer = meshState.layers.get(layerId);
  if (!layer) return;
  layer.visible = !!visible;
  // Cascade to child meshes for rendering simplicity.
  for (const meshId of layer.meshIds) {
    const mesh = meshState.meshes.get(meshId);
    if (mesh) mesh.visible = !!visible;
  }
}

// Ensure there's an active layer; create one if needed.
function ensureActiveLayer(suggestedName) {
  let layer = meshState.layers.get(meshState.activeLayerId);
  if (!layer) layer = createLayer(suggestedName);
  return layer;
}

export function createMesh(name, layerId) {
  const id = `mesh-${nextMeshId++}`;
  const mesh = {
    id,
    name: name || `Mesh ${meshState.meshes.size + 1}`,
    visible: true,
    layerId: null,
    vertices: [],
    faces: []
  };
  meshState.meshes.set(id, mesh);
  meshState.activeMeshId = id;
  // Attach to a layer (provided or active or a fresh one).
  const target = layerId
    ? (meshState.layers.get(layerId) || ensureActiveLayer(name))
    : ensureActiveLayer(name);
  assignMeshToLayer(id, target.id);
  return mesh;
}

export function deleteMesh(id) {
  const mesh = meshState.meshes.get(id);
  if (mesh && mesh.layerId) {
    const layer = meshState.layers.get(mesh.layerId);
    if (layer) layer.meshIds = layer.meshIds.filter((m) => m !== id);
  }
  meshState.meshes.delete(id);
  if (meshState.activeMeshId === id) {
    const next = meshState.meshes.values().next().value;
    meshState.activeMeshId = next ? next.id : null;
  }
}

function makeFaceTexture(color = DEFAULT_FACE_COLOR) {
  const c = document.createElement("canvas");
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = color;
  g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // Subtle pixel detail so the user can see the texel grid orientation.
  g.fillStyle = shadeColor(color, -0.08);
  g.fillRect(0, TEX_SIZE - 1, TEX_SIZE, 1);
  g.fillRect(TEX_SIZE - 1, 0, 1, TEX_SIZE);
  return c;
}

function addQuadFace(mesh, indices, baseColor, normalSeed) {
  // Quad uses two triangles sharing UV layout (0,0)-(1,0)-(1,1)-(0,1).
  const texture = makeFaceTexture(baseColor);
  const faceId = mesh.faces.length;
  mesh.faces.push({
    id: faceId,
    kind: "quad",
    vertexIndices: indices,
    triangles: [
      { v: [indices[0], indices[1], indices[2]], uv: [[0, 0], [TEX_SIZE, 0], [TEX_SIZE, TEX_SIZE]] },
      { v: [indices[0], indices[2], indices[3]], uv: [[0, 0], [TEX_SIZE, TEX_SIZE], [0, TEX_SIZE]] }
    ],
    texture,
    color: baseColor,
    normalSeed
  });
}

function addTriFace(mesh, indices, baseColor, normalSeed) {
  const texture = makeFaceTexture(baseColor);
  const faceId = mesh.faces.length;
  mesh.faces.push({
    id: faceId,
    kind: "tri",
    vertexIndices: indices,
    triangles: [
      { v: [indices[0], indices[1], indices[2]], uv: [[0, 0], [TEX_SIZE, 0], [TEX_SIZE / 2, TEX_SIZE]] }
    ],
    texture,
    color: baseColor,
    normalSeed
  });
}

export function createPrimitiveMesh(kind, { center = { x: 0, y: 0, z: 0 }, size = 1, color = DEFAULT_FACE_COLOR } = {}) {
  const mesh = createMesh(displayName(kind));
  const s = size;
  switch (kind) {
    case "cube":
      buildCube(mesh, center, s, color);
      break;
    case "sphere":
      buildSphere(mesh, center, s, color, 10, 8);
      break;
    case "cylinder":
      buildCylinder(mesh, center, s, color, 12);
      break;
    case "triangular_prism":
      buildTriangularPrism(mesh, center, s, color);
      break;
    case "pyramid":
      buildPyramid(mesh, center, s, color);
      break;
    default:
      buildCube(mesh, center, s, color);
  }
  return mesh;
}

function displayName(kind) {
  return ({
    cube: "Cube",
    sphere: "Sphere",
    cylinder: "Cylinder",
    triangular_prism: "Triangular Prism",
    pyramid: "Pyramid"
  }[kind]) || "Mesh";
}

function buildCube(mesh, c, s, color) {
  const v = (x, y, z) => mesh.vertices.push({ x: c.x + x * s, y: c.y + y * s, z: c.z + z * s }) - 1;
  const i0 = v(-1, -1, -1);
  const i1 = v(1, -1, -1);
  const i2 = v(1, 1, -1);
  const i3 = v(-1, 1, -1);
  const i4 = v(-1, -1, 1);
  const i5 = v(1, -1, 1);
  const i6 = v(1, 1, 1);
  const i7 = v(-1, 1, 1);
  // Each face gets its own texture so users can paint each side individually.
  addQuadFace(mesh, [i4, i5, i6, i7], color, "front");
  addQuadFace(mesh, [i1, i0, i3, i2], color, "back");
  addQuadFace(mesh, [i0, i4, i7, i3], color, "left");
  addQuadFace(mesh, [i5, i1, i2, i6], color, "right");
  addQuadFace(mesh, [i3, i7, i6, i2], color, "top");
  addQuadFace(mesh, [i0, i1, i5, i4], color, "bottom");
}

function buildSphere(mesh, c, s, color, longSegs = 10, latSegs = 8) {
  const grid = [];
  for (let lat = 0; lat <= latSegs; lat++) {
    const theta = (lat / latSegs) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const row = [];
    for (let lon = 0; lon <= longSegs; lon++) {
      const phi = (lon / longSegs) * Math.PI * 2;
      const x = sinT * Math.cos(phi);
      const y = cosT;
      const z = sinT * Math.sin(phi);
      const idx = mesh.vertices.length;
      mesh.vertices.push({ x: c.x + x * s, y: c.y + y * s, z: c.z + z * s });
      row.push(idx);
    }
    grid.push(row);
  }
  for (let lat = 0; lat < latSegs; lat++) {
    for (let lon = 0; lon < longSegs; lon++) {
      const a = grid[lat][lon];
      const b = grid[lat][lon + 1];
      const cIdx = grid[lat + 1][lon + 1];
      const d = grid[lat + 1][lon];
      addQuadFace(mesh, [a, b, cIdx, d], color, `s_${lat}_${lon}`);
    }
  }
}

function buildCylinder(mesh, c, s, color, segs = 12) {
  const top = [];
  const bot = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const x = Math.cos(t);
    const z = Math.sin(t);
    const tIdx = mesh.vertices.length;
    mesh.vertices.push({ x: c.x + x * s, y: c.y + s, z: c.z + z * s });
    top.push(tIdx);
    const bIdx = mesh.vertices.length;
    mesh.vertices.push({ x: c.x + x * s, y: c.y - s, z: c.z + z * s });
    bot.push(bIdx);
  }
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    addQuadFace(mesh, [bot[i], bot[j], top[j], top[i]], color, `side_${i}`);
  }
  // Cap centers.
  const topCenter = mesh.vertices.length;
  mesh.vertices.push({ x: c.x, y: c.y + s, z: c.z });
  const botCenter = mesh.vertices.length;
  mesh.vertices.push({ x: c.x, y: c.y - s, z: c.z });
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    addTriFace(mesh, [topCenter, top[i], top[j]], color, `top_${i}`);
    addTriFace(mesh, [botCenter, bot[j], bot[i]], color, `bot_${i}`);
  }
}

function buildTriangularPrism(mesh, c, s, color) {
  const v = (x, y, z) => mesh.vertices.push({ x: c.x + x * s, y: c.y + y * s, z: c.z + z * s }) - 1;
  const a = v(-1, -1, -1);
  const b = v(1, -1, -1);
  const tip = v(0, 1, -1);
  const a2 = v(-1, -1, 1);
  const b2 = v(1, -1, 1);
  const tip2 = v(0, 1, 1);
  // Two triangle caps + three rectangular sides.
  addTriFace(mesh, [a, b, tip], color, "back");
  addTriFace(mesh, [a2, tip2, b2], color, "front");
  addQuadFace(mesh, [a, a2, b2, b], color, "bottom");
  addQuadFace(mesh, [a, tip, tip2, a2], color, "left");
  addQuadFace(mesh, [b, b2, tip2, tip], color, "right");
}

function buildPyramid(mesh, c, s, color) {
  const v = (x, y, z) => mesh.vertices.push({ x: c.x + x * s, y: c.y + y * s, z: c.z + z * s }) - 1;
  const a = v(-1, -1, -1);
  const b = v(1, -1, -1);
  const cIdx = v(1, -1, 1);
  const d = v(-1, -1, 1);
  const tip = v(0, 1, 0);
  addQuadFace(mesh, [a, b, cIdx, d], color, "bottom");
  addTriFace(mesh, [a, tip, b], color, "back");
  addTriFace(mesh, [b, tip, cIdx], color, "right");
  addTriFace(mesh, [cIdx, tip, d], color, "front");
  addTriFace(mesh, [d, tip, a], color, "left");
}

// ----- Stylized primitive asset library --------------------------------------
// Each generator emits a single editable low-poly mesh so users can grab any
// vertex/face afterwards. Bottoms align to y = 0 (the floor grid) when
// `center.y` equals the provided y baseline (callers usually pass {y: 0}).

const LIBRARY_KINDS = [
  "stairs", "arch", "roof", "window", "tree", "rock", "pipe", "door",
  "cube", "sphere", "cylinder", "triangular_prism", "pyramid"
];

export function listLibraryKinds() {
  return LIBRARY_KINDS.slice();
}

export function libraryDisplayName(kind) {
  return ({
    stairs: "Stairs",
    arch: "Arch",
    roof: "Roof",
    window: "Window",
    tree: "Tree",
    rock: "Rock",
    pipe: "Pipe",
    door: "Door",
    cube: "Cube",
    sphere: "Sphere",
    cylinder: "Cylinder",
    triangular_prism: "Triangular Prism",
    pyramid: "Pyramid"
  }[kind]) || "Object";
}

export function createLibraryMesh(kind, opts) {
  // Backwards-compatible single-mesh path: stuffs all sub-shapes into one mesh.
  const mesh = createMesh(libraryDisplayName(kind));
  const center = (opts && opts.center) || { x: 0, y: 0, z: 0 };
  const size = (opts && opts.size) || 4;
  const color = (opts && opts.color) || DEFAULT_FACE_COLOR;
  const baseY = center.y;
  switch (kind) {
    case "stairs": buildLibStairs(mesh, center.x, baseY, center.z, size, color); break;
    case "arch": buildLibArch(mesh, center.x, baseY, center.z, size, color); break;
    case "roof": buildLibRoof(mesh, center.x, baseY, center.z, size, color); break;
    case "window": buildLibWindow(mesh, center.x, baseY, center.z, size, color); break;
    case "tree": buildLibTree(mesh, center.x, baseY, center.z, size); break;
    case "rock": buildLibRock(mesh, center.x, baseY, center.z, size, color); break;
    case "pipe": buildLibPipe(mesh, center.x, baseY, center.z, size, color); break;
    case "door": buildLibDoor(mesh, center.x, baseY, center.z, size, color); break;
    case "cube": buildCube(mesh, { x: center.x, y: baseY + size, z: center.z }, size, color); break;
    case "sphere": buildSphere(mesh, { x: center.x, y: baseY + size, z: center.z }, size, color, 10, 8); break;
    case "cylinder": buildCylinder(mesh, { x: center.x, y: baseY + size, z: center.z }, size, color, 12); break;
    case "triangular_prism": buildTriangularPrism(mesh, { x: center.x, y: baseY + size, z: center.z }, size, color); break;
    case "pyramid": buildPyramid(mesh, { x: center.x, y: baseY + size, z: center.z }, size, color); break;
    default: buildCube(mesh, { x: center.x, y: baseY + size, z: center.z }, size, color);
  }
  return mesh;
}

// Multi-mesh builder. Returns an array of sub-meshes assigned to `layerId`.
// Compound templates (arch, stairs, window, tree, door) are split into
// individually editable parts so users can grab one piece at a time.
export function createLibraryMeshes(kind, layerId, { center = { x: 0, y: 0, z: 0 }, size = 4, color = DEFAULT_FACE_COLOR } = {}) {
  const baseY = center.y;
  const cx = center.x;
  const cz = center.z;
  const meshes = [];
  const mk = (name) => {
    const m = createMesh(name, layerId);
    meshes.push(m);
    return m;
  };
  switch (kind) {
    case "stairs": {
      const steps = 4;
      const totalH = size * 2;
      const totalD = size * 2;
      const stepH = totalH / steps;
      const stepD = totalD / steps;
      for (let i = 0; i < steps; i++) {
        const halfH = (stepH * (i + 1)) / 2;
        const halfD = stepD / 2;
        const cy = baseY + halfH;
        const czStep = cz - size + i * stepD + halfD;
        addBox(mk(`Step ${i + 1}`), cx, cy, czStep, size, halfH, halfD, color, `step${i}`);
      }
      break;
    }
    case "arch": {
      const halfW = size;
      const totalH = size * 2;
      const halfD = size * 0.4;
      const pillarHalfW = size * 0.18;
      const beamHalfH = size * 0.22;
      const pillarHalfH = (totalH - beamHalfH * 2) / 2;
      const pillarCy = baseY + pillarHalfH;
      addBox(mk("Left Pillar"), cx - (halfW - pillarHalfW), pillarCy, cz, pillarHalfW, pillarHalfH, halfD, color, "leftPillar");
      addBox(mk("Right Pillar"), cx + (halfW - pillarHalfW), pillarCy, cz, pillarHalfW, pillarHalfH, halfD, color, "rightPillar");
      addBox(mk("Top Beam"), cx, baseY + totalH - beamHalfH, cz, halfW, beamHalfH, halfD, color, "topBeam");
      break;
    }
    case "window": {
      const halfW = size;
      const halfH = size;
      const halfD = size * 0.12;
      const frame = size * 0.18;
      const cy = baseY + halfH;
      addBox(mk("Top Frame"), cx, cy + halfH - frame, cz, halfW, frame, halfD, color, "top");
      addBox(mk("Bottom Frame"), cx, cy - halfH + frame, cz, halfW, frame, halfD, color, "bot");
      const sideHalfH = halfH - frame * 2;
      addBox(mk("Left Frame"), cx - halfW + frame, cy, cz, frame, sideHalfH, halfD, color, "left");
      addBox(mk("Right Frame"), cx + halfW - frame, cy, cz, frame, sideHalfH, halfD, color, "right");
      const innerW = halfW - frame * 2;
      const innerH = sideHalfH;
      addBox(mk("Mullion"), cx, cy, cz, frame * 0.4, innerH, halfD * 0.7, color, "mullion");
      addBox(mk("Transom"), cx, cy, cz, innerW, frame * 0.4, halfD * 0.7, color, "transom");
      break;
    }
    case "tree": {
      const trunkColor = "#7c4a17";
      const leafColor = "#3a8b3f";
      const trunkHalfH = size * 0.5;
      const trunkHalfW = size * 0.16;
      addBox(mk("Trunk"), cx, baseY + trunkHalfH, cz, trunkHalfW, trunkHalfH, trunkHalfW, trunkColor, "trunk");
      const tiers = 3;
      const tierTotalH = size * 1.2;
      const tierH = tierTotalH / tiers;
      const baseLeaf = baseY + trunkHalfH * 2;
      for (let i = 0; i < tiers; i++) {
        const w = size * (0.78 - i * 0.18);
        const cy = baseLeaf + tierH * i + tierH / 2;
        addBox(mk(`Foliage ${i + 1}`), cx, cy, cz, w, tierH / 2, w, leafColor, `leaf${i}`);
      }
      break;
    }
    case "door": {
      const halfW = size * 0.7;
      const halfH = size;
      const halfD = size * 0.18;
      addBox(mk("Door Slab"), cx, baseY + halfH, cz, halfW, halfH, halfD, color, "door");
      addBox(mk("Knob"), cx + halfW * 0.6, baseY + halfH * 0.95, cz + halfD, halfW * 0.08, halfH * 0.08, halfD * 0.4, "#caa15c", "knob");
      break;
    }
    // Single-mesh templates: just route through the existing single-mesh builder.
    case "roof":
      buildLibRoof(mk("Roof"), cx, baseY, cz, size, color);
      break;
    case "rock":
      buildLibRock(mk("Rock"), cx, baseY, cz, size, color);
      break;
    case "pipe":
      buildLibPipe(mk("Pipe"), cx, baseY, cz, size, color);
      break;
    case "cube":
      buildCube(mk("Cube"), { x: cx, y: baseY + size, z: cz }, size, color);
      break;
    case "sphere":
      buildSphere(mk("Sphere"), { x: cx, y: baseY + size, z: cz }, size, color, 10, 8);
      break;
    case "cylinder":
      buildCylinder(mk("Cylinder"), { x: cx, y: baseY + size, z: cz }, size, color, 12);
      break;
    case "triangular_prism":
      buildTriangularPrism(mk("Triangular Prism"), { x: cx, y: baseY + size, z: cz }, size, color);
      break;
    case "pyramid":
      buildPyramid(mk("Pyramid"), { x: cx, y: baseY + size, z: cz }, size, color);
      break;
    default:
      buildCube(mk("Cube"), { x: cx, y: baseY + size, z: cz }, size, color);
  }
  return meshes;
}

// Compound templates that benefit from multiple sub-meshes.
const COMPOUND_LIBRARY_KINDS = new Set(["arch", "stairs", "window", "tree", "door"]);
export function isCompoundLibraryKind(kind) {
  return COMPOUND_LIBRARY_KINDS.has(kind);
}

// Add an axis-aligned box centered at (cx,cy,cz) with half-extents (hx,hy,hz).
function addBox(mesh, cx, cy, cz, hx, hy, hz, color, prefix) {
  const start = mesh.vertices.length;
  const push = (x, y, z) => mesh.vertices.push({ x: cx + x * hx, y: cy + y * hy, z: cz + z * hz }) - 1;
  const i0 = push(-1, -1, -1);
  const i1 = push(1, -1, -1);
  const i2 = push(1, 1, -1);
  const i3 = push(-1, 1, -1);
  const i4 = push(-1, -1, 1);
  const i5 = push(1, -1, 1);
  const i6 = push(1, 1, 1);
  const i7 = push(-1, 1, 1);
  const p = prefix || `box${start}`;
  addQuadFace(mesh, [i4, i5, i6, i7], color, `${p}_front`);
  addQuadFace(mesh, [i1, i0, i3, i2], color, `${p}_back`);
  addQuadFace(mesh, [i0, i4, i7, i3], color, `${p}_left`);
  addQuadFace(mesh, [i5, i1, i2, i6], color, `${p}_right`);
  addQuadFace(mesh, [i3, i7, i6, i2], color, `${p}_top`);
  addQuadFace(mesh, [i0, i1, i5, i4], color, `${p}_bottom`);
}

function buildLibStairs(mesh, cx, baseY, cz, size, color) {
  const steps = 4;
  const totalH = size * 2;
  const totalD = size * 2;
  const stepH = totalH / steps;
  const stepD = totalD / steps;
  for (let i = 0; i < steps; i++) {
    const blockH = stepH * (i + 1);
    const halfH = blockH / 2;
    const halfD = stepD / 2;
    const cyStep = baseY + halfH;
    const czStep = cz - size + i * stepD + halfD;
    addBox(mesh, cx, cyStep, czStep, size, halfH, halfD, color, `step${i}`);
  }
}

function buildLibArch(mesh, cx, baseY, cz, size, color) {
  const halfW = size;
  const totalH = size * 2;
  const halfD = size * 0.4;
  const pillarHalfW = size * 0.18;
  const beamHalfH = size * 0.22;
  const pillarHalfH = (totalH - beamHalfH * 2) / 2;
  const pillarCy = baseY + pillarHalfH;
  addBox(mesh, cx - (halfW - pillarHalfW), pillarCy, cz, pillarHalfW, pillarHalfH, halfD, color, "leftPillar");
  addBox(mesh, cx + (halfW - pillarHalfW), pillarCy, cz, pillarHalfW, pillarHalfH, halfD, color, "rightPillar");
  const beamCy = baseY + totalH - beamHalfH;
  addBox(mesh, cx, beamCy, cz, halfW, beamHalfH, halfD, color, "topBeam");
}

function buildLibRoof(mesh, cx, baseY, cz, size, color) {
  // Gable / pitched roof. Square footprint 2*size x 2*size, ridge runs along z.
  const halfW = size;
  const halfD = size;
  const ridgeH = size * 1.2;
  const v = (x, y, z) => mesh.vertices.push({ x: cx + x, y: baseY + y, z: cz + z }) - 1;
  const a = v(-halfW, 0, -halfD);
  const b = v(halfW, 0, -halfD);
  const cIdx = v(halfW, 0, halfD);
  const d = v(-halfW, 0, halfD);
  const ridgeBack = v(0, ridgeH, -halfD);
  const ridgeFront = v(0, ridgeH, halfD);
  addQuadFace(mesh, [a, d, cIdx, b], color, "roof_bottom");
  addTriFace(mesh, [d, ridgeFront, cIdx], color, "roof_front_gable");
  addTriFace(mesh, [a, b, ridgeBack], color, "roof_back_gable");
  addQuadFace(mesh, [a, ridgeBack, ridgeFront, d], color, "roof_left_slope");
  addQuadFace(mesh, [b, cIdx, ridgeFront, ridgeBack], color, "roof_right_slope");
}

function buildLibWindow(mesh, cx, baseY, cz, size, color) {
  // Frame: 4 thin boxes around an opening. Hollow center, no glass.
  const halfW = size;
  const halfH = size;
  const halfD = size * 0.12;
  const frame = size * 0.18;
  const cy = baseY + halfH;
  // Top + bottom
  addBox(mesh, cx, cy + halfH - frame, cz, halfW, frame, halfD, color, "top");
  addBox(mesh, cx, cy - halfH + frame, cz, halfW, frame, halfD, color, "bot");
  // Left + right (between top/bottom)
  const sideHalfH = halfH - frame * 2;
  addBox(mesh, cx - halfW + frame, cy, cz, frame, sideHalfH, halfD, color, "left");
  addBox(mesh, cx + halfW - frame, cy, cz, frame, sideHalfH, halfD, color, "right");
  // Mullion + transom for that classic windowpane look.
  const innerW = halfW - frame * 2;
  const innerH = sideHalfH;
  addBox(mesh, cx, cy, cz, frame * 0.4, innerH, halfD * 0.7, color, "mullion");
  addBox(mesh, cx, cy, cz, innerW, frame * 0.4, halfD * 0.7, color, "transom");
}

function buildLibTree(mesh, cx, baseY, cz, size) {
  const trunkColor = "#7c4a17";
  const leafColor = "#3a8b3f";
  const trunkHalfH = size * 0.5;
  const trunkHalfW = size * 0.16;
  addBox(mesh, cx, baseY + trunkHalfH, cz, trunkHalfW, trunkHalfH, trunkHalfW, trunkColor, "trunk");
  // Stacked tiered foliage (Christmas-tree silhouette) for clean low-poly look.
  const tiers = 3;
  const tierTotalH = size * 1.2;
  const tierH = tierTotalH / tiers;
  const baseLeaf = baseY + trunkHalfH * 2;
  for (let i = 0; i < tiers; i++) {
    const w = size * (0.78 - i * 0.18);
    const cy = baseLeaf + tierH * i + tierH / 2;
    addBox(mesh, cx, cy, cz, w, tierH / 2, w, leafColor, `leaf${i}`);
  }
}

function buildLibRock(mesh, cx, baseY, cz, size, color) {
  // Low-poly sphere with deterministic but uneven displacement.
  const center = { x: cx, y: baseY + size * 0.7, z: cz };
  buildSphere(mesh, center, size * 0.9, color, 6, 5);
  for (let i = 0; i < mesh.vertices.length; i++) {
    const v = mesh.vertices[i];
    const seed = (v.x * 12.9898 + v.y * 78.233 + v.z * 37.719);
    const n = Math.sin(seed) * 43758.5453;
    const r1 = (n - Math.floor(n)) - 0.5;
    const r2 = (Math.sin(seed * 1.7) * 12345.6789);
    const r3 = (r2 - Math.floor(r2)) - 0.5;
    const r4 = (Math.sin(seed * 3.3) * 9876.5432);
    const r5 = (r4 - Math.floor(r4)) - 0.5;
    v.x += r1 * size * 0.18;
    v.y += r3 * size * 0.18;
    v.z += r5 * size * 0.18;
  }
  // Flatten anything that dipped below the floor.
  for (const v of mesh.vertices) if (v.y < baseY) v.y = baseY;
}

function buildLibPipe(mesh, cx, baseY, cz, size, color) {
  const radius = size * 0.45;
  const halfH = size;
  const segs = 12;
  buildCylinderXYZ(mesh, { x: cx, y: baseY + halfH, z: cz }, radius, halfH, color, segs);
}

function buildLibDoor(mesh, cx, baseY, cz, size, color) {
  // Tall thin slab: width=size, height=2*size, depth=0.18*size.
  const halfW = size * 0.7;
  const halfH = size;
  const halfD = size * 0.18;
  addBox(mesh, cx, baseY + halfH, cz, halfW, halfH, halfD, color, "door");
  // A small inset "knob" detail.
  addBox(mesh, cx + halfW * 0.6, baseY + halfH * 0.95, cz + halfD, halfW * 0.08, halfH * 0.08, halfD * 0.4, "#caa15c", "knob");
}

function buildCylinderXYZ(mesh, c, radius, halfHeight, color, segs = 12) {
  const top = [];
  const bot = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const x = Math.cos(t);
    const z = Math.sin(t);
    top.push(mesh.vertices.push({ x: c.x + x * radius, y: c.y + halfHeight, z: c.z + z * radius }) - 1);
    bot.push(mesh.vertices.push({ x: c.x + x * radius, y: c.y - halfHeight, z: c.z + z * radius }) - 1);
  }
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    addQuadFace(mesh, [bot[i], bot[j], top[j], top[i]], color, `pipe_side_${i}`);
  }
  const tc = mesh.vertices.push({ x: c.x, y: c.y + halfHeight, z: c.z }) - 1;
  const bc = mesh.vertices.push({ x: c.x, y: c.y - halfHeight, z: c.z }) - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    addTriFace(mesh, [tc, top[i], top[j]], color, `pipe_top_${i}`);
    addTriFace(mesh, [bc, bot[j], bot[i]], color, `pipe_bot_${i}`);
  }
}

function shadeColor(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = clamp(Math.round(r + 255 * amt), 0, 255);
  g = clamp(Math.round(g + 255 * amt), 0, 255);
  b = clamp(Math.round(b + 255 * amt), 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function renderMeshScene(ctx, canvas, projectFn, lightDir, options = {}) {
  ctx.imageSmoothingEnabled = false;

  const projected = [];
  for (const mesh of meshState.meshes.values()) {
    if (!mesh.visible) continue;
    const projVerts = mesh.vertices.map((v) => projectFn(v.x, v.y, v.z));
    for (const face of mesh.faces) {
      // Compute face normal in world space using first triangle (works for both quads and tris).
      const v0 = mesh.vertices[face.vertexIndices[0]];
      const v1 = mesh.vertices[face.vertexIndices[1]];
      const v2 = mesh.vertices[face.vertexIndices[2]];
      const normal = computeNormal(v0, v1, v2);
      // Average projected depth for painter's sort.
      let depthSum = 0;
      for (const i of face.vertexIndices) depthSum += projVerts[i].depth;
      const avgDepth = depthSum / face.vertexIndices.length;
      projected.push({ mesh, face, projVerts, normal, avgDepth });
    }
  }

  projected.sort((a, b) => b.avgDepth - a.avgDepth);

  for (const item of projected) {
    drawMeshFace(ctx, item, lightDir, options);
  }

  if (options.outline !== false) drawSceneOutline(ctx, projected);
  if (meshState.selectedFace) drawFaceHighlight(ctx, meshState.selectedFace, "#ffd43b");
  if (meshState.hoverFace) drawFaceHighlight(ctx, meshState.hoverFace, "rgba(255,255,255,0.55)");
}

function drawMeshFace(ctx, item, lightDir, options) {
  const { face, projVerts, normal } = item;
  // Soft baked face shading: ambient + lambert-ish, no specular.
  const ndl = normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z;
  const lit = clamp(0.55 + ndl * 0.35, 0.42, 1);

  for (const tri of face.triangles) {
    const a = projVerts[tri.v[0]];
    const b = projVerts[tri.v[1]];
    const c = projVerts[tri.v[2]];
    if (!a || !b || !c) continue;
    drawTexturedTriangle(
      ctx, face.texture,
      a.x, a.y, b.x, b.y, c.x, c.y,
      tri.uv[0][0], tri.uv[0][1],
      tri.uv[1][0], tri.uv[1][1],
      tri.uv[2][0], tri.uv[2][1],
      lit
    );
  }
}

function drawTexturedTriangle(ctx, texture, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2, lit) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  const m = solveAffine(u0, v0, x0, y0, u1, v1, x1, y1, u2, v2, x2, y2);
  if (!m) {
    ctx.restore();
    return;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.drawImage(texture, 0, 0);

  // Apply baked lighting tint by drawing a translucent black/white overlay in untransformed space.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (lit < 1) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - lit) * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  } else if (lit > 1) {
    ctx.fillStyle = `rgba(255,255,255,${(lit - 1) * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function solveAffine(u0, v0, x0, y0, u1, v1, x1, y1, u2, v2, x2, y2) {
  const det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (Math.abs(det) < 1e-9) return null;
  const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det;
  const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / det;
  const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / det;
  const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / det;
  const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / det;
  const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / det;
  return { a, b, c, d, e, f };
}

function drawSceneOutline(ctx, projected) {
  if (projected.length === 0) return;
  const points = [];
  for (const item of projected) {
    for (const idx of item.face.vertexIndices) {
      const p = item.projVerts[idx];
      if (p) points.push({ x: p.x, y: p.y });
    }
  }
  if (points.length < 3) return;
  const hull = convexHull(points);
  if (hull.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(hull[0].x, hull[0].y);
  for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i].x, hull[i].y);
  ctx.closePath();
  ctx.strokeStyle = "rgba(35,35,35,0.7)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function drawFaceHighlight(ctx, hit, color) {
  const { meshId, faceIndex, projVerts } = hit;
  const mesh = meshState.meshes.get(meshId);
  if (!mesh || !projVerts) return;
  const face = mesh.faces[faceIndex];
  if (!face) return;
  ctx.save();
  ctx.beginPath();
  const first = projVerts[face.vertexIndices[0]];
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < face.vertexIndices.length; i++) {
    const p = projVerts[face.vertexIndices[i]];
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function computeNormal(a, b, c) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

export function pickMeshFace(px, py, projectFn) {
  let best = null;
  let bestDepth = Infinity;
  for (const mesh of meshState.meshes.values()) {
    if (!mesh.visible) continue;
    const projVerts = mesh.vertices.map((v) => projectFn(v.x, v.y, v.z));
    for (let i = 0; i < mesh.faces.length; i++) {
      const face = mesh.faces[i];
      for (const tri of face.triangles) {
        const a = projVerts[tri.v[0]];
        const b = projVerts[tri.v[1]];
        const c = projVerts[tri.v[2]];
        if (!pointInTriangle(px, py, a.x, a.y, b.x, b.y, c.x, c.y)) continue;
        const depth = (a.depth + b.depth + c.depth) / 3;
        if (depth < bestDepth) {
          bestDepth = depth;
          const bary = barycentric(px, py, a.x, a.y, b.x, b.y, c.x, c.y);
          if (!bary) continue;
          const u = bary.u * tri.uv[0][0] + bary.v * tri.uv[1][0] + bary.w * tri.uv[2][0];
          const v = bary.u * tri.uv[0][1] + bary.v * tri.uv[1][1] + bary.w * tri.uv[2][1];
          best = {
            meshId: mesh.id,
            faceIndex: i,
            triIndex: face.triangles.indexOf(tri),
            uv: { u, v },
            projVerts
          };
        }
      }
    }
  }
  return best;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function barycentric(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = bx - ax, v0y = by - ay;
  const v1x = cx - ax, v1y = cy - ay;
  const v2x = px - ax, v2y = py - ay;
  const den = v0x * v1y - v1x * v0y;
  if (Math.abs(den) < 1e-9) return null;
  const v = (v2x * v1y - v1x * v2y) / den;
  const w = (v0x * v2y - v2x * v0y) / den;
  const u = 1 - v - w;
  return { u, v, w };
}

export function paintMeshFaceTexel(meshId, faceIndex, u, v, color, brushSize = 1) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;
  const g = face.texture.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = color;
  const tx = clamp(Math.floor(u), 0, TEX_SIZE - 1);
  const ty = clamp(Math.floor(v), 0, TEX_SIZE - 1);
  const r = Math.max(0, Math.floor(brushSize) - 1);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx;
      const y = ty + dy;
      if (x < 0 || y < 0 || x >= TEX_SIZE || y >= TEX_SIZE) continue;
      g.fillRect(x, y, 1, 1);
    }
  }
  return true;
}

export function fillMeshFace(meshId, faceIndex, color) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;
  const g = face.texture.getContext("2d");
  g.fillStyle = color;
  g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  return true;
}

export function clearMeshes() {
  meshState.meshes.clear();
  meshState.layers.clear();
  meshState.activeMeshId = null;
  meshState.activeLayerId = null;
  meshState.selectedFace = null;
  meshState.hoverFace = null;
}

export function setMeshVisibility(meshId, visible) {
  const mesh = meshState.meshes.get(meshId);
  if (mesh) mesh.visible = visible;
}

export function duplicateMesh(meshId, offset = { x: 0, y: 0, z: 0 }) {
  const src = meshState.meshes.get(meshId);
  if (!src) return null;
  // Place the copy in the same layer as its source.
  const copy = createMesh(`${src.name} Copy`, src.layerId);
  copy.vertices = src.vertices.map((v) => ({ x: v.x + offset.x, y: v.y + offset.y, z: v.z + offset.z }));
  // Re-create faces with cloned textures so painting on one doesn't bleed into the other.
  copy.faces = src.faces.map((face, i) => {
    const clonedTex = document.createElement("canvas");
    clonedTex.width = TEX_SIZE;
    clonedTex.height = TEX_SIZE;
    const cg = clonedTex.getContext("2d");
    cg.imageSmoothingEnabled = false;
    cg.drawImage(face.texture, 0, 0);
    return {
      id: i,
      kind: face.kind,
      vertexIndices: face.vertexIndices.slice(),
      triangles: face.triangles.map((t) => ({ v: t.v.slice(), uv: t.uv.map((p) => p.slice()) })),
      texture: clonedTex,
      color: face.color,
      normalSeed: face.normalSeed
    };
  });
  meshState.activeMeshId = copy.id;
  return copy;
}

export function pickMeshVertex(px, py, projectFn, threshold = 10) {
  let best = null;
  let bestDist = threshold;
  for (const mesh of meshState.meshes.values()) {
    if (!mesh.visible) continue;
    for (let i = 0; i < mesh.vertices.length; i++) {
      const v = mesh.vertices[i];
      const p = projectFn(v.x, v.y, v.z);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = { meshId: mesh.id, vertexIndex: i, screen: p };
      }
    }
  }
  return best;
}

export function translateVertex(meshId, vertexIndex, dx, dy, dz) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const v = mesh.vertices[vertexIndex];
  if (!v) return false;
  v.x += dx;
  v.y += dy;
  v.z += dz;
  return true;
}

export function translateFace(meshId, faceIndex, dx, dy, dz) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;
  // Move all unique vertices belonging to this face.
  const seen = new Set();
  for (const idx of face.vertexIndices) {
    if (seen.has(idx)) continue;
    seen.add(idx);
    const v = mesh.vertices[idx];
    v.x += dx;
    v.y += dy;
    v.z += dz;
  }
  return true;
}

export function translateMesh(meshId, dx, dy, dz) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  for (const v of mesh.vertices) {
    v.x += dx;
    v.y += dy;
    v.z += dz;
  }
  return true;
}

export function extrudeFace(meshId, faceIndex, distance) {
  // Duplicates the face's vertices, offsets them along the face normal,
  // re-points the face to the new vertices, and stitches the gap with side faces.
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;
  const v0 = mesh.vertices[face.vertexIndices[0]];
  const v1 = mesh.vertices[face.vertexIndices[1]];
  const v2 = mesh.vertices[face.vertexIndices[2]];
  const n = computeNormal(v0, v1, v2);

  const oldIndices = face.vertexIndices.slice();
  const newIndices = oldIndices.map((idx) => {
    const old = mesh.vertices[idx];
    const newIdx = mesh.vertices.length;
    mesh.vertices.push({
      x: old.x + n.x * distance,
      y: old.y + n.y * distance,
      z: old.z + n.z * distance
    });
    return newIdx;
  });

  // Side faces: connect each old/new edge.
  for (let i = 0; i < oldIndices.length; i++) {
    const j = (i + 1) % oldIndices.length;
    const a = oldIndices[i];
    const b = oldIndices[j];
    const c = newIndices[j];
    const d = newIndices[i];
    addQuadFace(mesh, [a, b, c, d], face.color, `extrude_${faceIndex}_${i}`);
  }

  // Re-point the original face to the new (extruded) ring of vertices.
  face.vertexIndices = newIndices;
  rebuildFaceTriangles(face);
  return true;
}

export function insetFace(meshId, faceIndex, amount) {
  // Move the face's vertices toward its centroid by amount (0..1 fraction of size).
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;
  const cx = face.vertexIndices.reduce((s, i) => s + mesh.vertices[i].x, 0) / face.vertexIndices.length;
  const cy = face.vertexIndices.reduce((s, i) => s + mesh.vertices[i].y, 0) / face.vertexIndices.length;
  const cz = face.vertexIndices.reduce((s, i) => s + mesh.vertices[i].z, 0) / face.vertexIndices.length;
  const seen = new Set();
  for (const idx of face.vertexIndices) {
    if (seen.has(idx)) continue;
    seen.add(idx);
    const v = mesh.vertices[idx];
    v.x += (cx - v.x) * amount;
    v.y += (cy - v.y) * amount;
    v.z += (cz - v.z) * amount;
  }
  return true;
}

export function bevelFace(meshId, faceIndex, amount = 0.25, distance = 0.6) {
  // Inset, then extrude — produces a beveled bordered look.
  if (!insetFace(meshId, faceIndex, amount)) return false;
  return extrudeFace(meshId, faceIndex, distance);
}

export function subdivideFace(meshId, faceIndex) {
  // Quad: split into 4 quads using midpoints + center.
  // Triangle: split into 3 sub-triangles using midpoints + centroid.
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;

  if (face.kind === "quad") {
    const [ai, bi, ci, di] = face.vertexIndices;
    const a = mesh.vertices[ai];
    const b = mesh.vertices[bi];
    const c = mesh.vertices[ci];
    const d = mesh.vertices[di];
    const midAB = pushVertex(mesh, midpoint(a, b));
    const midBC = pushVertex(mesh, midpoint(b, c));
    const midCD = pushVertex(mesh, midpoint(c, d));
    const midDA = pushVertex(mesh, midpoint(d, a));
    const center = pushVertex(mesh, {
      x: (a.x + b.x + c.x + d.x) / 4,
      y: (a.y + b.y + c.y + d.y) / 4,
      z: (a.z + b.z + c.z + d.z) / 4
    });
    // Replace original face with one of the four sub-quads, then add the other three.
    face.vertexIndices = [ai, midAB, center, midDA];
    rebuildFaceTriangles(face);
    addQuadFace(mesh, [midAB, bi, midBC, center], face.color, `sub_${faceIndex}_b`);
    addQuadFace(mesh, [center, midBC, ci, midCD], face.color, `sub_${faceIndex}_c`);
    addQuadFace(mesh, [midDA, center, midCD, di], face.color, `sub_${faceIndex}_d`);
    return true;
  }

  if (face.kind === "tri") {
    const [ai, bi, ci] = face.vertexIndices;
    const a = mesh.vertices[ai];
    const b = mesh.vertices[bi];
    const c = mesh.vertices[ci];
    const centroid = pushVertex(mesh, {
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
      z: (a.z + b.z + c.z) / 3
    });
    face.vertexIndices = [ai, bi, centroid];
    rebuildFaceTriangles(face);
    addTriFace(mesh, [bi, ci, centroid], face.color, `sub_${faceIndex}_b`);
    addTriFace(mesh, [ci, ai, centroid], face.color, `sub_${faceIndex}_c`);
    return true;
  }
  return false;
}

export function deleteFace(meshId, faceIndex) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  if (faceIndex < 0 || faceIndex >= mesh.faces.length) return false;
  mesh.faces.splice(faceIndex, 1);
  // Re-id remaining faces so their internal id matches array index.
  for (let i = 0; i < mesh.faces.length; i++) mesh.faces[i].id = i;
  return true;
}

export function sampleMeshTexel(meshId, faceIndex, u, v) {
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return null;
  const face = mesh.faces[faceIndex];
  if (!face) return null;
  const g = face.texture.getContext("2d");
  const tx = clamp(Math.floor(u), 0, TEX_SIZE - 1);
  const ty = clamp(Math.floor(v), 0, TEX_SIZE - 1);
  const data = g.getImageData(tx, ty, 1, 1).data;
  return rgbToHex(data[0], data[1], data[2]);
}

export function drawTexelLine(meshId, faceIndex, u0, v0, u1, v1, color, brushSize = 1) {
  // Bresenham within the face texture.
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return false;
  const face = mesh.faces[faceIndex];
  if (!face) return false;
  let x0 = clamp(Math.floor(u0), 0, TEX_SIZE - 1);
  let y0 = clamp(Math.floor(v0), 0, TEX_SIZE - 1);
  const x1 = clamp(Math.floor(u1), 0, TEX_SIZE - 1);
  const y1 = clamp(Math.floor(v1), 0, TEX_SIZE - 1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    paintMeshFaceTexel(meshId, faceIndex, x0, y0, color, brushSize);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return true;
}

function pushVertex(mesh, v) {
  const idx = mesh.vertices.length;
  mesh.vertices.push({ x: v.x, y: v.y, z: v.z });
  return idx;
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function rebuildFaceTriangles(face) {
  // Recompute triangle indices for face after vertex change.
  if (face.kind === "quad") {
    const [a, b, c, d] = face.vertexIndices;
    face.triangles = [
      { v: [a, b, c], uv: [[0, 0], [TEX_SIZE, 0], [TEX_SIZE, TEX_SIZE]] },
      { v: [a, c, d], uv: [[0, 0], [TEX_SIZE, TEX_SIZE], [0, TEX_SIZE]] }
    ];
  } else {
    const [a, b, c] = face.vertexIndices;
    face.triangles = [
      { v: [a, b, c], uv: [[0, 0], [TEX_SIZE, 0], [TEX_SIZE / 2, TEX_SIZE]] }
    ];
  }
}

function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function drawMeshVertexHandles(ctx, projectFn, options = {}) {
  const { activeMeshOnly = true, color = "#ffd43b", radius = 4 } = options;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1;
  for (const mesh of meshState.meshes.values()) {
    if (!mesh.visible) continue;
    if (activeMeshOnly && mesh.id !== meshState.activeMeshId) continue;
    for (const v of mesh.vertices) {
      const p = projectFn(v.x, v.y, v.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function exportMeshes() {
  const meshes = [];
  for (const mesh of meshState.meshes.values()) {
    meshes.push({
      id: mesh.id,
      name: mesh.name,
      visible: mesh.visible,
      vertices: mesh.vertices.slice(),
      faces: mesh.faces.map((f) => ({
        kind: f.kind,
        vertexIndices: f.vertexIndices.slice(),
        color: f.color,
        textureData: f.texture.toDataURL()
      }))
    });
  }
  return meshes;
}
