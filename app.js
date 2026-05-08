import {
  meshState,
  createPrimitiveMesh,
  deleteMesh,
  renderMeshScene,
  pickMeshFace,
  pickMeshVertex,
  paintMeshFaceTexel,
  fillMeshFace,
  clearMeshes,
  setMeshVisibility,
  translateVertex,
  translateFace,
  translateMesh,
  extrudeFace,
  bevelFace,
  subdivideFace,
  deleteFace,
  sampleMeshTexel,
  drawTexelLine,
  drawMeshVertexHandles,
  duplicateMesh,
  createLibraryMesh,
  createLibraryMeshes,
  isCompoundLibraryKind,
  listLibraryKinds,
  libraryDisplayName,
  createLayer,
  deleteLayer,
  setLayerExpanded,
  setLayerVisibility,
  assignMeshToLayer,
  TEX_SIZE
} from "./mesh-workflow.js";

const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const toolButtonsRoot = document.getElementById("toolButtons");
const colorPicker = document.getElementById("colorPicker");
const secondaryColorPicker = document.getElementById("secondaryColorPicker");
const brushSizeInput = document.getElementById("brushSize");
const brushSizeValue = document.getElementById("brushSizeValue");
const shapeTypeSelect = document.getElementById("shapeType");
const shapeRadiusInput = document.getElementById("shapeRadius");
const shapeRadiusValue = document.getElementById("shapeRadiusValue");
const shapeSegmentsInput = document.getElementById("shapeSegments");
const shapeSegmentsValue = document.getElementById("shapeSegmentsValue");
const hollowToggle = document.getElementById("hollowToggle");
const wallThicknessInput = document.getElementById("wallThickness");
const wallThicknessValue = document.getElementById("wallThicknessValue");
const stampList = document.getElementById("stampList");
const leftStampList = document.getElementById("leftStampList");
const leftStampSection = document.getElementById("leftStampSection");
const leftSaveStampBtn = document.getElementById("leftSaveStampBtn");
const leftStampEmpty = document.getElementById("leftStampEmpty");
const leftLayersSection = document.getElementById("leftLayersSection");
const leftObjectLibrarySection = document.getElementById("leftObjectLibrarySection");
const objectLibraryList = document.getElementById("objectLibraryList");
const transformSection = document.getElementById("transformSection");
const objectList = document.getElementById("objectList");
const activeToolText = document.getElementById("activeTool");
const hintText = document.getElementById("hint");
const modeLabel = document.getElementById("modeLabel");
const lightingToggle = document.getElementById("lightingToggle");
const lightX = document.getElementById("lightX");
const lightY = document.getElementById("lightY");
const lightZ = document.getElementById("lightZ");
const ambientStrengthInput = document.getElementById("ambientStrength");
const hemiStrengthInput = document.getElementById("hemiStrength");
const shadowStrengthInput = document.getElementById("shadowStrength");
const reflectionStrengthInput = document.getElementById("reflectionStrength");
const unifiedClayToggle = document.getElementById("unifiedClayToggle");
const viewportBgMode = document.getElementById("viewportBgMode");
const modeModelBtn = document.getElementById("modeModelBtn");
const modePaintBtn = document.getElementById("modePaintBtn");
const shapeSection = document.getElementById("shapeSection");
const paintSection = document.getElementById("paintSection");
const undoBtn = document.getElementById("undoBtn");
const quickResetBtn = document.getElementById("quickResetBtn");
const redoBtn = document.getElementById("redoBtn");
const saveBtn = document.getElementById("saveBtn");
const newObjectBtn = document.getElementById("newObjectBtn");
const duplicateObjectBtn = document.getElementById("duplicateObjectBtn");
const newLayerBtn = document.getElementById("newLayerBtn");
const uiThemeToggle = document.getElementById("uiThemeToggle");
const themeLabel = document.getElementById("themeLabel");
const downloadFormat = document.getElementById("downloadFormat");
const downloadBtn = document.getElementById("downloadBtn");
const scaleXInput = document.getElementById("scaleX");
const scaleYInput = document.getElementById("scaleY");
const scaleZInput = document.getElementById("scaleZ");
const slantXInput = document.getElementById("slantX");
const slantZInput = document.getElementById("slantZ");
const scaleXValue = document.getElementById("scaleXValue");
const scaleYValue = document.getElementById("scaleYValue");
const scaleZValue = document.getElementById("scaleZValue");
const slantXValue = document.getElementById("slantXValue");
const slantZValue = document.getElementById("slantZValue");
const applyTransformBtn = document.getElementById("applyTransformBtn");
const resetTransformBtn = document.getElementById("resetTransformBtn");
const workflowVoxelBtn = document.getElementById("workflowVoxelBtn");
const workflowMeshBtn = document.getElementById("workflowMeshBtn");
const meshSection = document.getElementById("meshSection");
const meshShapeType = document.getElementById("meshShapeType");
const meshSizeInput = document.getElementById("meshSize");
const meshSizeValue = document.getElementById("meshSizeValue");
const meshBaseColor = document.getElementById("meshBaseColor");
const addMeshBtn = document.getElementById("addMeshBtn");
const clearMeshesBtn = document.getElementById("clearMeshesBtn");
const meshList = document.getElementById("meshList");
const meshStats = document.getElementById("meshStats");
const brushSection = document.getElementById("brushSection");
const selectionStampSection = document.getElementById("selectionStampSection");
const cameraInfo = document.getElementById("cameraInfo");

const GRID_SIZE = 40;
const VOXEL_SIZE = 14;
const MODEL_BASE_COLOR = "#9ca3af";
const STORAGE_KEY = "simplepixel-autosave-v2";
const MAX_HISTORY = 40;

const camera = {
  // Start from user-specified angles (degrees): yaw -53, pitch -9.2, zoom 1.42
  yaw: -0.925,  // ≈ -53°
  pitch: -0.161, // ≈ -9.2°
  zoom: 1.42,
  panX: 0,
  // Nudge the whole scene up so the object+grid start centered vertically.
  panY: -150
};

const state = {
  workflow: "mesh",
  mode: "modeling",
  tool: "hand",
  brushSize: 1,
  voxels: new Map(),
  objects: new Map(),
  activeObjectId: "obj-1",
  selectedKeys: new Set(),
  copiedStamp: null,
  stamps: [],
  stampIndex: -1,
  isPointerDown: false,
  isOrbiting: false,
  isPanning: false,
  isSpaceDown: false,
  moveDrag: null,
  shapeDrag: null,
  hoverTarget: null,
  history: [],
  redoHistory: [],
  lastPaintKey: "",
  selectionAnchor: null,
  lightEnabled: true,
  lightDir: normalizeVector({ x: -0.6, y: 0.8, z: 0.5 }),
  ambientStrength: 0.28,
  hemiStrength: 0.36,
  shadowStrength: 0.24,
  reflectionStrength: 0.14,
  unifiedClayPreview: true,
  viewportBackground: "light",
  uiThemeMode: "light-cherry"
};

const toolDefs = [
  // Hand is universal navigation.
  { id: "hand", label: "Hand", keybind: "H", modes: ["modeling", "painting"], workflows: ["voxel", "mesh"] },
  { id: "objectSelect", label: "Object Select", keybind: "Q", modes: ["modeling"], workflows: ["voxel", "mesh"] },

  // ---- Voxel MODELING tools ----
  { id: "shape", label: "Shape Maker", keybind: "G", modes: ["modeling"], workflows: ["voxel"] },
  { id: "pen", label: "Pen", keybind: "V", modes: ["modeling"], workflows: ["voxel"] },
  { id: "erase", label: "Erase", keybind: "E", modes: ["modeling"], workflows: ["voxel"] },
  { id: "select", label: "Select", keybind: "S", modes: ["modeling"], workflows: ["voxel"] },
  { id: "move", label: "Move", keybind: "T", modes: ["modeling"], workflows: ["voxel"] },
  { id: "stamp", label: "Stamp", keybind: "R", modes: ["modeling", "painting"], workflows: ["voxel", "mesh"] },
  { id: "melt", label: "Melt", keybind: "M", modes: ["modeling"], workflows: ["voxel"] },
  { id: "weld", label: "Weld", keybind: "W", modes: ["modeling"], workflows: ["voxel"] },
  { id: "smooth", label: "Smooth", modes: ["modeling"], workflows: ["voxel"] },

  // ---- Voxel PAINTING tools ----
  { id: "paintPen", label: "Paint Pen", keybind: "V", modes: ["painting"], workflows: ["voxel"] },
  { id: "fill", label: "Fill", keybind: "B", modes: ["painting"], workflows: ["voxel", "mesh"] },
  { id: "gradient", label: "Gradient", keybind: "G", modes: ["painting"], workflows: ["voxel"] },
  { id: "paintEyedrop", label: "Eyedropper", keybind: "I", modes: ["painting"], workflows: ["voxel"] },

  // ---- Mesh MODELING tools ----
  { id: "vertex", label: "Vertex Pull", keybind: "V", modes: ["modeling"], workflows: ["mesh"] },
  { id: "faceMove", label: "Face Move", keybind: "F", modes: ["modeling"], workflows: ["mesh"] },
  { id: "meshMove", label: "Mesh Move", keybind: "T", modes: ["modeling"], workflows: ["mesh"] },
  { id: "extrude", label: "Extrude Face", keybind: "X", modes: ["modeling"], workflows: ["mesh"] },
  { id: "bevel", label: "Bevel Face", keybind: "K", modes: ["modeling"], workflows: ["mesh"] },
  { id: "subdivide", label: "Subdivide Face", keybind: "U", modes: ["modeling"], workflows: ["mesh"] },
  { id: "deleteFace", label: "Delete Face", keybind: "D", modes: ["modeling"], workflows: ["mesh"] },
  { id: "objectLib", label: "Object Library", keybind: "L", modes: ["modeling"], workflows: ["mesh"] },

  // ---- Mesh PAINTING tools ----
  { id: "meshPen", label: "Pen", keybind: "P", modes: ["painting"], workflows: ["mesh"] },
  { id: "meshErase", label: "Erase", keybind: "E", modes: ["painting"], workflows: ["mesh"] },
  { id: "meshLine", label: "Line", keybind: "L", modes: ["painting"], workflows: ["mesh"] },
  { id: "meshEyedrop", label: "Eyedropper", keybind: "I", modes: ["painting"], workflows: ["mesh"] }
];

boot();

function boot() {
  initializeObjects();
  buildToolButtons();
  bindUiEvents();
  bindMeshUi();
  if (!loadAutosave()) seedScene();
  if (meshState.meshes.size === 0) seedMeshScene();
  snapshotHistory("Initial");
  shapeSegmentsValue.textContent = shapeSegmentsInput.value;
  wallThicknessValue.textContent = wallThicknessInput.value;
  meshSizeValue.textContent = meshSizeInput.value;
  unifiedClayToggle.checked = state.unifiedClayPreview;
  viewportBgMode.value = state.viewportBackground;
  uiThemeToggle.checked = state.uiThemeMode === "dark-lavender";
  syncViewportBackgroundClass();
  applyUiThemeMode();
  setMode("modeling");
  applyWorkflow(state.workflow);
  rebuildObjectList();
  rebuildStampList();
  rebuildMeshList();
  buildObjectLibraryButtons();
  render();
}

function seedMeshScene() {
  // Place the starter cube so its bottom rests on the grid floor (world y = -GRID_SIZE/2).
  const size = 4;
  const floorY = -GRID_SIZE / 2;
  // Create a fresh starter layer to host the primitive.
  const layer = createLayer("Cube");
  createLibraryMeshes("cube", layer.id, { center: { x: 0, y: floorY, z: 0 }, size, color: "#9aa0a6" });
}

function buildObjectLibraryButtons() {
  if (!objectLibraryList) return;
  objectLibraryList.innerHTML = "";
  for (const kind of listLibraryKinds()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "object-library-button";
    btn.dataset.kind = kind;
    btn.title = `Add ${libraryDisplayName(kind)} (low-poly editable template)`;
    btn.innerHTML = `<span class="lib-thumb">${getLibraryThumbSvg(kind)}</span><span class="lib-label">${libraryDisplayName(kind)}</span>`;
    btn.addEventListener("click", () => addLibraryMeshFromButton(kind));
    objectLibraryList.appendChild(btn);
  }
}

function addLibraryMeshFromButton(kind) {
  if (state.workflow !== "mesh") return;
  const floorY = -GRID_SIZE / 2;
  const size = parseFloat(meshSizeInput?.value) || 4;
  const color = meshBaseColor?.value || "#9aa0a6";
  snapshotHistory(`Add ${libraryDisplayName(kind)}`);
  // Compound shapes always become their own layer (so the parts stay grouped).
  // Single primitives drop into the active layer if it's empty (from "New
  // Layer"), otherwise they spawn their own layer for cleanliness.
  const isCompound = isCompoundLibraryKind(kind);
  let layer;
  if (!isCompound) {
    const active = meshState.layers.get(meshState.activeLayerId);
    if (active && active.meshIds.length === 0) {
      layer = active;
    }
  }
  if (!layer) layer = createLayer(libraryDisplayName(kind));
  const meshes = createLibraryMeshes(kind, layer.id, { center: { x: 0, y: floorY, z: 0 }, size, color });
  if (meshes && meshes.length) {
    meshState.activeMeshId = meshes[0].id;
    meshState.activeLayerId = layer.id;
    meshState.selectedFace = null;
    saveAutosave();
    rebuildMeshList();
    render();
  }
}

// Tiny silhouette icons for the Object Library cards.
function getLibraryThumbSvg(kind) {
  const c = `viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
  switch (kind) {
    case "stairs":
      return `<svg ${c}><path d="M3 21h4v-4h4v-4h4V9h4V5h2"/></svg>`;
    case "arch":
      return `<svg ${c}><path d="M4 21V11a8 8 0 0 1 16 0v10"/><path d="M4 21h16"/></svg>`;
    case "roof":
      return `<svg ${c}><path d="M3 16L12 5l9 11"/><path d="M3 16h18"/></svg>`;
    case "window":
      return `<svg ${c}><rect x="4" y="4" width="16" height="16"/><path d="M12 4v16M4 12h16"/></svg>`;
    case "tree":
      return `<svg ${c}><path d="M12 3l4 5h-2l3 4h-2l3 4H6l3-4H7l3-4H8l4-5z"/><path d="M11 16h2v5h-2z" fill="currentColor"/></svg>`;
    case "rock":
      return `<svg ${c}><path d="M5 18l3-7 3-3 4 1 4 5-2 5-7 1z"/></svg>`;
    case "pipe":
      return `<svg ${c}><rect x="9" y="3" width="6" height="18" rx="2"/><path d="M9 7h6M9 17h6"/></svg>`;
    case "door":
      return `<svg ${c}><rect x="6" y="3" width="12" height="18"/><circle cx="15" cy="13" r="0.8" fill="currentColor"/></svg>`;
    case "cube":
      return `<svg ${c}><path d="M12 3l8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>`;
    case "sphere":
      return `<svg ${c}><circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/></svg>`;
    case "cylinder":
      return `<svg ${c}><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12"/><path d="M19 6v12"/><ellipse cx="12" cy="18" rx="7" ry="2.5"/></svg>`;
    case "triangular_prism":
      return `<svg ${c}><path d="M4 19l8-14 8 14z"/><path d="M4 19l4-2 8-1 4 3"/></svg>`;
    case "pyramid":
      return `<svg ${c}><path d="M4 19L12 4l8 15z"/><path d="M4 19L12 12l8 7"/></svg>`;
    default:
      return `<svg ${c}><rect x="5" y="5" width="14" height="14"/></svg>`;
  }
}

function bindMeshUi() {
  workflowVoxelBtn.addEventListener("click", () => applyWorkflow("voxel"));
  workflowMeshBtn.addEventListener("click", () => applyWorkflow("mesh"));
  meshSizeInput.addEventListener("input", () => {
    meshSizeValue.textContent = meshSizeInput.value;
  });
  addMeshBtn.addEventListener("click", () => {
    snapshotHistory("Add mesh primitive");
    const size = Number(meshSizeInput.value);
    const floorY = -GRID_SIZE / 2;
    const kind = meshShapeType.value;
    // Reuse the active layer if it's empty (so "New Layer + Add Mesh" works
    // as expected); otherwise create a fresh layer for the new primitive.
    const active = meshState.layers.get(meshState.activeLayerId);
    const layer = (active && active.meshIds.length === 0)
      ? active
      : createLayer(libraryDisplayName(kind));
    createLibraryMeshes(kind, layer.id, {
      center: { x: 0, y: floorY, z: 0 },
      size,
      color: meshBaseColor.value
    });
    meshState.activeLayerId = layer.id;
    rebuildMeshList();
    saveAutosave();
    render();
  });
  clearMeshesBtn.addEventListener("click", () => {
    snapshotHistory("Clear meshes");
    clearMeshes();
    rebuildMeshList();
    saveAutosave();
    render();
  });
}

function applyWorkflow(workflow) {
  state.workflow = workflow;
  workflowVoxelBtn.classList.toggle("active", workflow === "voxel");
  workflowMeshBtn.classList.toggle("active", workflow === "mesh");
  // If the current tool isn't valid in this context, pick a sensible default.
  const def = toolDefs.find((t) => t.id === state.tool);
  if (!def || !toolMatchesContext(def)) state.tool = pickDefaultToolForContext();
  syncSectionVisibility();
  updateActiveToolUi();
  saveAutosave();
  render();
}

function syncSectionVisibility() {
  const isModeling = state.mode === "modeling";
  const isPainting = state.mode === "painting";
  const isVoxel = state.workflow === "voxel";
  const isMesh = state.workflow === "mesh";

  // Modeling-only sections.
  meshSection.classList.toggle("hidden", !(isMesh && isModeling));
  selectionStampSection.classList.toggle("hidden", !(isVoxel && isModeling));
  transformSection.classList.toggle("hidden", !(isVoxel && isModeling));
  shapeSection.classList.toggle("hidden", !(isVoxel && isModeling && state.tool === "shape"));

  // Painting-only sections.
  paintSection.classList.toggle("hidden", !isPainting);

  // Brush is meaningful in voxel (both modes) and mesh painting; hidden in mesh modeling.
  brushSection.classList.toggle("hidden", isMesh && isModeling);

  // Left-side stamp panel: visible whenever in the voxel workflow.
  if (leftStampSection) {
    leftStampSection.classList.toggle("hidden", !isVoxel);
  }

  // Left-side Object Library: visible only in mesh modeling when the tool is active.
  if (leftObjectLibrarySection) {
    leftObjectLibrarySection.classList.toggle("hidden", !(isMesh && isModeling && state.tool === "objectLib"));
  }

  // Layers / Objects panel: hide the voxel object list in mesh workflow and vice versa.
  if (objectList) objectList.classList.toggle("hidden", !isVoxel);
  if (meshList) meshList.classList.toggle("hidden", !isMesh);
  if (meshStats) meshStats.classList.toggle("hidden", !isMesh);
  if (newObjectBtn) newObjectBtn.classList.toggle("hidden", !isVoxel);
  // Duplicate works in both workflows (mesh or voxel) so leave it visible.
  if (duplicateObjectBtn) duplicateObjectBtn.classList.toggle("hidden", false);
  if (newLayerBtn) newLayerBtn.classList.toggle("hidden", !isMesh);
}

function rebuildMeshList() {
  if (!meshList) return;
  meshList.innerHTML = "";

  // Migrate any loose meshes (no layerId) into a default layer so old saves
  // still display correctly.
  if (meshState.meshes.size > 0 && meshState.layers.size === 0) {
    const fallback = createLayer("Default Layer");
    for (const mesh of meshState.meshes.values()) {
      assignMeshToLayer(mesh.id, fallback.id);
    }
  }

  let totalFaces = 0;
  let totalTris = 0;

  for (const layer of meshState.layers.values()) {
    // ---- Layer header row ---------------------------------------------------
    const header = document.createElement("div");
    header.className = "layer-row";
    if (layer.id === meshState.activeLayerId) header.classList.add("active-layer");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "layer-toggle";
    toggle.textContent = layer.expanded ? "▾" : "▸";
    toggle.title = layer.expanded ? "Collapse layer" : "Expand layer";
    toggle.addEventListener("click", () => {
      setLayerExpanded(layer.id, !layer.expanded);
      rebuildMeshList();
    });

    const name = document.createElement("button");
    name.type = "button";
    name.className = "layer-name";
    name.textContent = layer.name;
    name.title = "Click to activate this layer (new shapes will be added here)";
    name.addEventListener("click", () => {
      meshState.activeLayerId = layer.id;
      // Activate the first mesh in this layer (if any) so the gizmo follows.
      if (layer.meshIds.length) meshState.activeMeshId = layer.meshIds[0];
      rebuildMeshList();
      render();
    });
    name.addEventListener("dblclick", () => {
      const newName = prompt("Rename layer:", layer.name);
      if (newName && newName.trim()) {
        layer.name = newName.trim();
        saveAutosave();
        rebuildMeshList();
      }
    });

    const eye = document.createElement("button");
    eye.type = "button";
    eye.textContent = layer.visible !== false ? "Hide" : "Show";
    eye.addEventListener("click", () => {
      setLayerVisibility(layer.id, !(layer.visible !== false));
      rebuildMeshList();
      saveAutosave();
      render();
    });

    const count = document.createElement("span");
    count.className = "layer-count";
    count.textContent = `${layer.meshIds.length}`;

    header.append(toggle, name, eye, count);
    header.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openLayerContextMenu(e.clientX, e.clientY, layer.name, () => deleteLayerById(layer.id));
    });
    meshList.append(header);

    // ---- Children -----------------------------------------------------------
    if (layer.expanded) {
      for (const meshId of layer.meshIds) {
        const mesh = meshState.meshes.get(meshId);
        if (!mesh) continue;
        totalFaces += mesh.faces.length;
        for (const f of mesh.faces) totalTris += f.triangles.length;

        const row = document.createElement("div");
        row.className = "object-item mesh-child";
        if (mesh.id === meshState.activeMeshId) row.classList.add("active");

        const meshName = document.createElement("button");
        meshName.type = "button";
        meshName.className = "object-name";
        meshName.textContent = mesh.name;
        meshName.addEventListener("click", () => {
          meshState.activeMeshId = mesh.id;
          meshState.activeLayerId = layer.id;
          meshState.selectedFace = null;
          rebuildMeshList();
          render();
        });
        meshName.addEventListener("dblclick", () => {
          const newName = prompt("Rename shape:", mesh.name);
          if (newName && newName.trim()) {
            mesh.name = newName.trim();
            saveAutosave();
            rebuildMeshList();
          }
        });

        const meshEye = document.createElement("button");
        meshEye.type = "button";
        meshEye.textContent = mesh.visible ? "Hide" : "Show";
        meshEye.addEventListener("click", () => {
          setMeshVisibility(mesh.id, !mesh.visible);
          rebuildMeshList();
          saveAutosave();
          render();
        });

        const meshCount = document.createElement("span");
        meshCount.textContent = `${mesh.faces.length}f`;

        row.append(meshName, meshEye, meshCount);
        row.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          openLayerContextMenu(e.clientX, e.clientY, mesh.name, () => deleteMeshById(mesh.id));
        });
        meshList.append(row);
      }
    } else {
      // Even when collapsed, accumulate stats for the footer line.
      for (const meshId of layer.meshIds) {
        const mesh = meshState.meshes.get(meshId);
        if (!mesh) continue;
        totalFaces += mesh.faces.length;
        for (const f of mesh.faces) totalTris += f.triangles.length;
      }
    }
  }

  if (meshStats) {
    meshStats.textContent = meshState.meshes.size === 0
      ? "No shapes yet. Click Add Mesh or pick from the Object Library."
      : `${meshState.layers.size} layer(s), ${meshState.meshes.size} shape(s), ${totalFaces} faces, ${totalTris} triangles.`;
  }
}

function deleteLayerById(layerId) {
  const layer = meshState.layers.get(layerId);
  if (!layer) return;
  // Don't strand the user with zero layers.
  if (meshState.layers.size <= 1) {
    hintText.textContent = "Can't delete the last remaining layer. Use Quick Reset to start over.";
    return;
  }
  snapshotHistory(`Delete layer ${layer.name}`);
  deleteLayer(layerId);
  meshState.selectedFace = null;
  meshState.hoverFace = null;
  rebuildMeshList();
  saveAutosave();
  render();
}

function newMeshLayer() {
  if (state.workflow !== "mesh") return;
  snapshotHistory("New layer");
  const layer = createLayer();
  meshState.activeLayerId = layer.id;
  rebuildMeshList();
  saveAutosave();
  render();
}

function initializeObjects() {
  state.objects.set("obj-1", { id: "obj-1", name: "Object 1", visible: true });
  state.activeObjectId = "obj-1";
}

function buildToolButtons() {
  for (const tool of toolDefs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<span class="tool-icon" aria-hidden="true">${getToolIconSvg(tool.id)}</span>`;
    btn.dataset.toolId = tool.id;
    btn.setAttribute("aria-label", tool.label);
    btn.title = tool.keybind ? `${tool.label} (${tool.keybind})` : tool.label;
    btn.addEventListener("click", () => setTool(tool.id));
    toolButtonsRoot.append(btn);
  }
  updateActiveToolUi();
}

function getToolIconSvg(toolId) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  switch (toolId) {
    case "hand":
      return `<svg ${common}><path d="M8 11V6a1 1 0 112 0v5"/><path d="M12 11V5a1 1 0 112 0v6"/><path d="M16 11V7a1 1 0 112 0v6"/><path d="M6 12.5V9.5a1 1 0 112 0V12"/><path d="M6 12l2 6h8l2-4v-3"/></svg>`;
    case "shape":
      return `<svg ${common}><rect x="5" y="5" width="14" height="14"/><path d="M5 5l7-3 7 3"/><path d="M12 2v17"/></svg>`;
    case "pen":
      return `<svg ${common}><path d="M4 20l4.5-1 9.5-9.5-3.5-3.5L5 15.5 4 20z"/><path d="M12.5 7.5l3.5 3.5"/></svg>`;
    case "erase":
      return `<svg ${common}><path d="M7 15l6-7 6 6-5 5H9l-2-2z"/><path d="M4 19h16"/></svg>`;
    case "fill":
      return `<svg ${common}><path d="M6 11l6-6 6 6-6 6-6-6z"/><path d="M18 18h3"/><path d="M4 20h16"/></svg>`;
    case "gradient":
      return `<svg ${common}><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 8v8"/><path d="M12 8v8"/><path d="M16 8v8"/></svg>`;
    case "select":
      return `<svg ${common}><rect x="6" y="6" width="12" height="12"/><rect x="4" y="4" width="2" height="2"/><rect x="18" y="4" width="2" height="2"/><rect x="4" y="18" width="2" height="2"/><rect x="18" y="18" width="2" height="2"/></svg>`;
    case "move":
      return `<svg ${common}><path d="M12 3v18"/><path d="M3 12h18"/><path d="M12 3l-2 2"/><path d="M12 3l2 2"/><path d="M12 21l-2-2"/><path d="M12 21l2-2"/><path d="M3 12l2-2"/><path d="M3 12l2 2"/><path d="M21 12l-2-2"/><path d="M21 12l-2 2"/></svg>`;
    case "stamp":
      return `<svg ${common}><path d="M12 4c2.5 0 4 1.5 4 3.5 0 1.2-.6 2.2-1.6 3H9.6C8.6 9.7 8 8.7 8 7.5 8 5.5 9.5 4 12 4z"/><path d="M7 10.5h10v3H7z"/><path d="M5 18h14"/></svg>`;
    case "melt":
      return `<svg ${common}><path d="M12 4c-2.5 3-5 5.5-5 8.5A5 5 0 0012 18a5 5 0 005-5.5C17 9.5 14.5 7 12 4z"/></svg>`;
    case "weld":
      return `<svg ${common}><path d="M8 9a3 3 0 100 6h3"/><path d="M16 9a3 3 0 110 6h-3"/><path d="M10 12h4"/></svg>`;
    case "smooth":
      return `<svg ${common}><path d="M3 14c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/></svg>`;
    case "vertex":
      return `<svg ${common}><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 4v3"/><path d="M12 17v3"/><path d="M4 12h3"/><path d="M17 12h3"/></svg>`;
    case "faceMove":
      return `<svg ${common}><rect x="6" y="6" width="12" height="12"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/></svg>`;
    case "meshMove":
      return `<svg ${common}><path d="M12 3v18"/><path d="M3 12h18"/><path d="M12 3l-2 2"/><path d="M12 3l2 2"/><path d="M12 21l-2-2"/><path d="M12 21l2-2"/><path d="M3 12l2-2"/><path d="M3 12l2 2"/><path d="M21 12l-2-2"/><path d="M21 12l-2 2"/></svg>`;
    case "extrude":
      return `<svg ${common}><rect x="4" y="10" width="9" height="9"/><path d="M13 10l5-5"/><path d="M22 5h-5"/><path d="M22 5v5"/></svg>`;
    case "bevel":
      return `<svg ${common}><path d="M5 19h14"/><path d="M5 19l3-10h8l3 10"/><path d="M8 9l-1-2"/><path d="M16 9l1-2"/></svg>`;
    case "subdivide":
      return `<svg ${common}><rect x="4" y="4" width="16" height="16"/><path d="M12 4v16"/><path d="M4 12h16"/></svg>`;
    case "deleteFace":
      return `<svg ${common}><rect x="5" y="5" width="14" height="14"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/></svg>`;
    case "objectLib":
      return `<svg ${common}><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><path d="M17 13v8M13 17h8"/></svg>`;
    case "objectSelect":
      return `<svg ${common}><path d="M5 12l4-7 6 4-3 4 5 5-3 3-5-5-4 4z"/></svg>`;
    case "meshPen":
      return `<svg ${common}><path d="M4 20l4.5-1 9.5-9.5-3.5-3.5L5 15.5 4 20z"/><path d="M12.5 7.5l3.5 3.5"/><rect x="14" y="3" width="3" height="3"/></svg>`;
    case "meshErase":
      return `<svg ${common}><path d="M7 15l6-7 6 6-5 5H9l-2-2z"/><path d="M4 19h16"/></svg>`;
    case "meshLine":
      return `<svg ${common}><circle cx="5" cy="19" r="2" fill="currentColor"/><circle cx="19" cy="5" r="2" fill="currentColor"/><path d="M7 17L17 7"/></svg>`;
    case "meshEyedrop":
      return `<svg ${common}><path d="M16 3l5 5"/><path d="M19 6l-9 9-3 3-3 1 1-3 3-3 9-9z"/></svg>`;
    case "paintPen":
      return `<svg ${common}><path d="M4 20l4.5-1 9.5-9.5-3.5-3.5L5 15.5 4 20z"/><path d="M12.5 7.5l3.5 3.5"/><circle cx="18" cy="6" r="2" fill="currentColor"/></svg>`;
    case "paintEyedrop":
      return `<svg ${common}><path d="M16 3l5 5"/><path d="M19 6l-9 9-3 3-3 1 1-3 3-3 9-9z"/></svg>`;
    default:
      return `<svg ${common}><circle cx="12" cy="12" r="6"/></svg>`;
  }
}

function bindUiEvents() {
  modeModelBtn.addEventListener("click", () => setMode("modeling"));
  modePaintBtn.addEventListener("click", () => setMode("painting"));

  brushSizeInput.addEventListener("input", () => {
    state.brushSize = Number(brushSizeInput.value);
    brushSizeValue.textContent = String(state.brushSize);
  });

  shapeRadiusInput.addEventListener("input", () => {
    shapeRadiusValue.textContent = shapeRadiusInput.value;
  });
  shapeSegmentsInput.addEventListener("input", () => {
    shapeSegmentsValue.textContent = shapeSegmentsInput.value;
  });
  wallThicknessInput.addEventListener("input", () => {
    wallThicknessValue.textContent = wallThicknessInput.value;
  });

  document.getElementById("addShapeBtn").addEventListener("click", () => {
    snapshotHistory("Add primitive");
    addPrimitive(
      shapeTypeSelect.value,
      Number(shapeRadiusInput.value),
      Number(shapeSegmentsInput.value),
      false,
      0
    );
    saveAutosave();
    rebuildObjectList();
    render();
  });

  document.getElementById("saveStampBtn").addEventListener("click", saveSelectionAsStamp);
  if (leftSaveStampBtn) leftSaveStampBtn.addEventListener("click", saveSelectionAsStamp);
  bindTransformUi();
  document.getElementById("clearBtn").addEventListener("click", clearScene);
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  saveBtn.addEventListener("click", () => {
    saveAutosave();
    hintText.textContent = "Saved.";
    render();
  });
  quickResetBtn.addEventListener("click", quickReset);
  newObjectBtn.addEventListener("click", createObject);
  duplicateObjectBtn.addEventListener("click", duplicateActiveSelection);
  if (newLayerBtn) newLayerBtn.addEventListener("click", newMeshLayer);
  downloadBtn.addEventListener("click", () => {
    if (downloadFormat.value === "obj") {
      downloadObj();
    } else {
      downloadJson();
    }
  });

  lightingToggle.addEventListener("change", () => {
    state.lightEnabled = lightingToggle.checked;
    render();
  });

  for (const slider of [lightX, lightY, lightZ]) {
    slider.addEventListener("input", () => {
      state.lightDir = normalizeVector({
        x: Number(lightX.value),
        y: Number(lightY.value),
        z: Number(lightZ.value)
      });
      render();
    });
  }
  ambientStrengthInput.addEventListener("input", () => {
    state.ambientStrength = Number(ambientStrengthInput.value);
    render();
  });
  hemiStrengthInput.addEventListener("input", () => {
    state.hemiStrength = Number(hemiStrengthInput.value);
    render();
  });
  shadowStrengthInput.addEventListener("input", () => {
    state.shadowStrength = Number(shadowStrengthInput.value);
    render();
  });
  reflectionStrengthInput.addEventListener("input", () => {
    state.reflectionStrength = Number(reflectionStrengthInput.value);
    render();
  });
  unifiedClayToggle.addEventListener("change", () => {
    state.unifiedClayPreview = unifiedClayToggle.checked;
    saveAutosave();
    render();
  });
  viewportBgMode.addEventListener("change", () => {
    state.viewportBackground = viewportBgMode.value;
    syncViewportBackgroundClass();
    saveAutosave();
    render();
  });
  uiThemeToggle.addEventListener("change", () => {
    state.uiThemeMode = uiThemeToggle.checked ? "dark-lavender" : "light-cherry";
    applyUiThemeMode();
    saveAutosave();
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);
  canvas.addEventListener("wheel", onCanvasWheel, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      state.isSpaceDown = true;
      e.preventDefault();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeLayerContextMenu();
      if (state.tool !== "hand") setTool("hand");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      copySelectionToClipboardStamp();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
      e.preventDefault();
      saveSelectionAsStamp();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicateActiveSelection();
      return;
    }
    if (state.tool === "move" && state.selectedKeys.size > 0) {
      const handled = handleMoveNudgeKey(e);
      if (handled) return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && state.tool === "objectSelect") {
      e.preventDefault();
      deleteActiveLayer();
      return;
    }
    if (e.key.toLowerCase() === "c") {
      state.unifiedClayPreview = !state.unifiedClayPreview;
      unifiedClayToggle.checked = state.unifiedClayPreview;
      saveAutosave();
      render();
      return;
    }
    const key = e.key.toLowerCase();
    // Look up a tool whose keybind matches AND is valid in current workflow+mode.
    const match = toolDefs.find((t) => t.keybind && t.keybind.toLowerCase() === key && toolMatchesContext(t));
    if (match) setTool(match.id);
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") state.isSpaceDown = false;
  });
}

function onCanvasWheel(e) {
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  const zoomFactor = delta > 0 ? 0.9 : 1.1;
  camera.zoom = clamp(camera.zoom * zoomFactor, 0.3, 4.5);
  render();
}

function bindTransformUi() {
  const pairings = [
    [scaleXInput, scaleXValue],
    [scaleYInput, scaleYValue],
    [scaleZInput, scaleZValue],
    [slantXInput, slantXValue],
    [slantZInput, slantZValue]
  ];
  for (const [input, output] of pairings) {
    input.addEventListener("input", () => {
      output.textContent = Number(input.value).toFixed(2);
    });
    output.textContent = Number(input.value).toFixed(2);
  }
  applyTransformBtn.addEventListener("click", () => {
    snapshotHistory("Transform");
    const applied = applySelectionTransform({
      scaleX: Number(scaleXInput.value),
      scaleY: Number(scaleYInput.value),
      scaleZ: Number(scaleZInput.value),
      slantX: Number(slantXInput.value),
      slantZ: Number(slantZInput.value)
    });
    if (applied) {
      saveAutosave();
      rebuildObjectList();
      render();
    }
  });
  resetTransformBtn.addEventListener("click", resetTransformControls);
}

function resetTransformControls() {
  scaleXInput.value = "1";
  scaleYInput.value = "1";
  scaleZInput.value = "1";
  slantXInput.value = "0";
  slantZInput.value = "0";
  scaleXValue.textContent = "1.00";
  scaleYValue.textContent = "1.00";
  scaleZValue.textContent = "1.00";
  slantXValue.textContent = "0.00";
  slantZValue.textContent = "0.00";
}

function handleMoveNudgeKey(e) {
  const key = e.key;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return false;
  e.preventDefault();
  let dx = 0;
  let dy = 0;
  let dz = 0;
  if (e.shiftKey) {
    if (key === "ArrowUp") dy = 1;
    if (key === "ArrowDown") dy = -1;
    if (key === "ArrowLeft") dx = -1;
    if (key === "ArrowRight") dx = 1;
  } else if (e.altKey) {
    if (key === "ArrowUp") {
      dx = 1;
      dz = -1;
    }
    if (key === "ArrowDown") {
      dx = -1;
      dz = 1;
    }
    if (key === "ArrowLeft") {
      dx = -1;
      dz = -1;
    }
    if (key === "ArrowRight") {
      dx = 1;
      dz = 1;
    }
  } else {
    if (key === "ArrowLeft") dx = -1;
    if (key === "ArrowRight") dx = 1;
    if (key === "ArrowUp") dz = -1;
    if (key === "ArrowDown") dz = 1;
  }
  if (dx === 0 && dy === 0 && dz === 0) return true;
  snapshotHistory("Move nudge");
  if (translateSelection(dx, dy, dz)) {
    saveAutosave();
    rebuildObjectList();
    render();
  }
  return true;
}

function onPointerDown(e) {
  state.isPointerDown = true;
  state.lastPaintKey = "";
  if (state.tool === "hand" && e.button === 2) {
    state.isPanning = true;
    return;
  }
  if (state.isSpaceDown && e.button === 0) {
    state.isPanning = true;
    return;
  }
  if (state.tool === "hand" && e.button === 0) {
    state.isOrbiting = true;
    return;
  }
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    state.isOrbiting = true;
    return;
  }
  if (state.workflow === "mesh") {
    snapshotHistory("Mesh stroke");
    applyMeshToolFromPointerEvent(e, true);
    return;
  }
  if (state.tool === "shape" && e.button === 0) {
    startShapeDrag(e);
    return;
  }
  if (state.tool === "move" && state.selectedKeys.size > 0) {
    snapshotHistory("Move selection");
    startMoveDrag(e);
    return;
  }
  snapshotHistory("Stroke");
  applyToolFromPointerEvent(e, true);
}

function onPointerMove(e) {
  if (state.workflow === "mesh") {
    if (state.isOrbiting) {
      camera.yaw += e.movementX * 0.01;
      camera.pitch = clamp(camera.pitch + e.movementY * 0.01, -1.45, 1.45);
      render();
      return;
    }
    if (state.isPanning) {
      camera.panX += e.movementX;
      camera.panY += e.movementY;
      render();
      return;
    }
    const c = canvasCoords(e);
    const hit = pickMeshFace(c.x, c.y, projectWithDepth);
    meshState.hoverFace = hit;
    if (state.isPointerDown) {
      applyMeshToolFromPointerEvent(e, false);
    } else {
      render();
    }
    return;
  }
  const target = getPointerTarget(e.offsetX, e.offsetY);
  state.hoverTarget = target;
  if (!state.isPointerDown) {
    render();
    return;
  }
  if (state.isOrbiting) {
    camera.yaw += e.movementX * 0.01;
    camera.pitch = clamp(camera.pitch + e.movementY * 0.01, -1.45, 1.45);
    render();
    return;
  }
  if (state.isPanning) {
    camera.panX += e.movementX;
    camera.panY += e.movementY;
    render();
    return;
  }
  if (state.moveDrag) {
    handleMoveDrag(e);
    return;
  }
  if (state.shapeDrag) {
    updateShapeDrag(e);
    render();
    return;
  }
  applyToolFromPointerEvent(e, false);
}

function onPointerUp(e) {
  if (state.shapeDrag) finishShapeDrag();
  if (state.workflow === "mesh" && meshState.activeDrag) finishMeshDrag(e);
  state.isPointerDown = false;
  state.isOrbiting = false;
  state.isPanning = false;
  state.selectionAnchor = null;
  state.moveDrag = null;
  state.shapeDrag = null;
  saveAutosave();
}

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height
  };
}

function screenDeltaToWorld(dxScreen, dyScreen) {
  // Inverse rotate a screen-plane delta back into world space (camera basis).
  // Screen Y points downward, so callers should pass dyScreen with the canvas convention.
  const cy = Math.cos(camera.yaw);
  const sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  return {
    x: cy * dxScreen - sp * sy * dyScreen,
    y: cp * dyScreen,
    z: -sy * dxScreen - sp * cy * dyScreen
  };
}

function applyMeshToolFromPointerEvent(e, isNewStroke) {
  const c = canvasCoords(e);

  // ---- Modeling tools ----
  if (state.mode === "modeling") {
    return applyMeshModelingTool(e, c, isNewStroke);
  }
  // ---- Painting tools ----
  return applyMeshPaintingTool(e, c, isNewStroke);
}

function applyMeshModelingTool(e, c, isNewStroke) {
  const tool = state.tool;
  const screenDx = e.movementX / (VOXEL_SIZE * camera.zoom);
  const screenDy = -e.movementY / (VOXEL_SIZE * camera.zoom);

  if (tool === "objectSelect") {
    if (isNewStroke) {
      // First, try to grab a rotation handle (round dots) on the currently
      // active mesh, then a stretch handle (square dots).
      const activeMesh = meshState.meshes.get(meshState.activeMeshId);
      if (activeMesh) {
        const rot = pickObjectRotationHandle(activeMesh, c.x, c.y);
        if (rot) {
          startObjectRotateDrag(activeMesh, rot, c.x, c.y);
          render();
          return;
        }
        const handle = pickObjectStretchHandle(activeMesh, c.x, c.y);
        if (handle) {
          snapshotHistory("Stretch object");
          meshState.activeDrag = {
            type: "stretch",
            meshId: activeMesh.id,
            axisIdx: handle.axisIdx,
            sign: handle.sign,
            anchorVal: handle.anchorVal,
            handleVal: handle.handleVal,
            startScreen: { x: c.x, y: c.y },
            handleScreen: handle.handleScreen,
            anchorScreen: handle.anchorScreen,
            originalVerts: activeMesh.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z }))
          };
          render();
          return;
        }
      }
      // Otherwise click selects the mesh under the cursor (or clears selection).
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (hit) {
        meshState.activeMeshId = hit.meshId;
        meshState.selectedFace = null;
        const picked = meshState.meshes.get(hit.meshId);
        if (picked && picked.layerId) meshState.activeLayerId = picked.layerId;
      } else {
        meshState.activeMeshId = null;
      }
      rebuildMeshList();
      render();
      return;
    }
    // Continued drag: stretch or rotate.
    if (meshState.activeDrag) {
      if (meshState.activeDrag.type === "stretch") applyObjectStretchDrag(c);
      else if (meshState.activeDrag.type === "rotate") applyObjectRotateDrag(c);
    }
    return;
  }

  if (tool === "vertex") {
    if (isNewStroke) {
      const v = pickMeshVertex(c.x, c.y, projectWithDepth, 12);
      if (!v) return;
      meshState.activeDrag = { type: "vertex", meshId: v.meshId, vertexIndex: v.vertexIndex };
      meshState.activeMeshId = v.meshId;
      render();
      return;
    }
    if (meshState.activeDrag && meshState.activeDrag.type === "vertex") {
      const w = screenDeltaToWorld(screenDx, screenDy);
      translateVertex(meshState.activeDrag.meshId, meshState.activeDrag.vertexIndex, w.x, w.y, w.z);
      saveAutosave();
      render();
    }
    return;
  }

  if (tool === "faceMove" || tool === "meshMove") {
    if (isNewStroke) {
      // Mesh Move also supports rotation when the user grabs a rotation handle
      // floating around the active mesh's bounding box. Check that first so
      // the handles take priority over translating the whole mesh.
      if (tool === "meshMove") {
        const activeMesh = meshState.meshes.get(meshState.activeMeshId);
        if (activeMesh) {
          const rot = pickObjectRotationHandle(activeMesh, c.x, c.y);
          if (rot) {
            startObjectRotateDrag(activeMesh, rot, c.x, c.y);
            render();
            return;
          }
        }
      }
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (!hit) return;
      meshState.activeDrag = {
        type: tool === "faceMove" ? "face" : "mesh",
        meshId: hit.meshId,
        faceIndex: hit.faceIndex
      };
      meshState.activeMeshId = hit.meshId;
      meshState.selectedFace = hit;
      rebuildMeshList();
      render();
      return;
    }
    if (meshState.activeDrag) {
      if (meshState.activeDrag.type === "rotate") {
        applyObjectRotateDrag(c);
      } else {
        const w = screenDeltaToWorld(screenDx, screenDy);
        if (meshState.activeDrag.type === "face") {
          translateFace(meshState.activeDrag.meshId, meshState.activeDrag.faceIndex, w.x, w.y, w.z);
        } else {
          translateMesh(meshState.activeDrag.meshId, w.x, w.y, w.z);
        }
        saveAutosave();
        render();
      }
    }
    return;
  }

  if (tool === "extrude") {
    if (isNewStroke) {
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (!hit) return;
      // Single-shot extrude with a default distance. Could be drag-based, but
      // for predictability we extrude by 1 unit per click.
      extrudeFace(hit.meshId, hit.faceIndex, 1);
      meshState.activeMeshId = hit.meshId;
      meshState.selectedFace = null;
      saveAutosave();
      rebuildMeshList();
      render();
    }
    return;
  }

  if (tool === "bevel") {
    if (isNewStroke) {
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (!hit) return;
      bevelFace(hit.meshId, hit.faceIndex, 0.25, 0.4);
      meshState.activeMeshId = hit.meshId;
      meshState.selectedFace = null;
      saveAutosave();
      rebuildMeshList();
      render();
    }
    return;
  }

  if (tool === "subdivide") {
    if (isNewStroke) {
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (!hit) return;
      subdivideFace(hit.meshId, hit.faceIndex);
      meshState.activeMeshId = hit.meshId;
      meshState.selectedFace = null;
      saveAutosave();
      rebuildMeshList();
      render();
    }
    return;
  }

  if (tool === "deleteFace") {
    if (isNewStroke) {
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (!hit) return;
      deleteFace(hit.meshId, hit.faceIndex);
      meshState.selectedFace = null;
      saveAutosave();
      rebuildMeshList();
      render();
    }
    return;
  }

  if (tool === "stamp") {
    if (!isNewStroke) return;
    // Mesh stamp = duplicate the active mesh and offset slightly so the copy is visible.
    const sourceId = meshState.activeMeshId;
    if (!sourceId) return;
    const copy = duplicateMesh(sourceId, { x: 4, y: 0, z: 4 });
    if (copy) {
      meshState.selectedFace = null;
      saveAutosave();
      rebuildMeshList();
      render();
    }
    return;
  }

  // Hand falls through: just select a face/mesh on click.
  if (isNewStroke) {
    const hit = pickMeshFace(c.x, c.y, projectWithDepth);
    if (hit) {
      meshState.activeMeshId = hit.meshId;
      meshState.selectedFace = hit;
      rebuildMeshList();
      render();
    }
  }
}

function applyMeshPaintingTool(e, c, isNewStroke) {
  const tool = state.tool;
  const isRightClick = e.button === 2 || (e.buttons & 2) === 2;

  if (tool === "stamp") {
    if (!isNewStroke) return;
    const sourceId = meshState.activeMeshId;
    if (!sourceId) return;
    const copy = duplicateMesh(sourceId, { x: 4, y: 0, z: 4 });
    if (copy) {
      saveAutosave();
      rebuildMeshList();
      render();
    }
    return;
  }

  if (tool === "meshEyedrop") {
    if (!isNewStroke) return;
    const hit = pickMeshFace(c.x, c.y, projectWithDepth);
    if (!hit) return;
    const sampled = sampleMeshTexel(hit.meshId, hit.faceIndex, hit.uv.u, hit.uv.v);
    if (sampled) {
      colorPicker.value = sampled;
      meshState.activeMeshId = hit.meshId;
      meshState.selectedFace = hit;
      rebuildMeshList();
      render();
    }
    return;
  }

  if (tool === "meshLine") {
    if (isNewStroke) {
      const hit = pickMeshFace(c.x, c.y, projectWithDepth);
      if (!hit) return;
      meshState.activeDrag = {
        type: "line",
        meshId: hit.meshId,
        faceIndex: hit.faceIndex,
        startU: hit.uv.u,
        startV: hit.uv.v,
        startScreen: { x: c.x, y: c.y },
        currentScreen: { x: c.x, y: c.y }
      };
      render();
      return;
    }
    if (meshState.activeDrag && meshState.activeDrag.type === "line") {
      meshState.activeDrag.currentScreen = { x: c.x, y: c.y };
      render();
    }
    return;
  }

  if (tool === "fill") {
    if (!isNewStroke) return;
    const hit = pickMeshFace(c.x, c.y, projectWithDepth);
    if (!hit) return;
    fillMeshFace(hit.meshId, hit.faceIndex, isRightClick ? "#ffffff" : colorPicker.value);
    saveAutosave();
    render();
    return;
  }

  // meshPen / meshErase: continuous painting on drag.
  const hit = pickMeshFace(c.x, c.y, projectWithDepth);
  if (!hit) return;
  const color = (tool === "meshErase" || isRightClick) ? "#ffffff" : colorPicker.value;
  paintMeshFaceTexel(hit.meshId, hit.faceIndex, hit.uv.u, hit.uv.v, color, state.brushSize);
  saveAutosave();
  render();
}

function finishMeshDrag(e) {
  if (!meshState.activeDrag) return;
  if (meshState.activeDrag.type === "line") {
    const c = canvasCoords(e);
    const hit = pickMeshFace(c.x, c.y, projectWithDepth);
    const drag = meshState.activeDrag;
    // Only commit if we ended on the same face (so UV space is consistent).
    if (hit && hit.meshId === drag.meshId && hit.faceIndex === drag.faceIndex) {
      drawTexelLine(drag.meshId, drag.faceIndex, drag.startU, drag.startV, hit.uv.u, hit.uv.v, colorPicker.value, state.brushSize);
      saveAutosave();
      render();
    }
  }
  meshState.activeDrag = null;
}

function applyToolFromPointerEvent(e, isNewStroke) {
  const picked = pickVoxelFromPointer(e.offsetX, e.offsetY);
  const target = getPointerTarget(e.offsetX, e.offsetY);
  if (!target) return;
  let changed = false;

  const isRightClick = e.button === 2 || (e.buttons & 2) === 2;
  if (isRightClick && state.tool === "pen") {
    eraseAt(target.x, target.y, target.z, state.brushSize);
    changed = true;
    render();
    return;
  }
  if (isRightClick && state.tool === "paintPen") {
    if (picked) {
      const sampled = state.voxels.get(keyFor(picked.x, picked.y, picked.z));
      if (sampled && sampled.color) colorPicker.value = sampled.color;
    }
    render();
    return;
  }

  switch (state.tool) {
    case "hand":
      break;
    case "objectSelect": {
      if (!isNewStroke) break;
      if (picked) {
        const v = state.voxels.get(keyFor(picked.x, picked.y, picked.z));
        if (v && v.objectId && state.objects.has(v.objectId)) {
          state.activeObjectId = v.objectId;
          rebuildObjectList();
          render();
        }
      }
      break;
    }
    case "pen":
      // Voxel modeling-only: adds gray voxels.
      paintAt(target.x, target.y, target.z, MODEL_BASE_COLOR, state.brushSize);
      changed = true;
      break;
    case "paintPen":
      // Voxel painting-only: colors an existing voxel.
      if (!picked) break;
      paintExistingAt(picked.x, picked.y, picked.z, colorPicker.value, state.brushSize);
      changed = true;
      break;
    case "paintEyedrop": {
      if (!picked) break;
      const sampled = state.voxels.get(keyFor(picked.x, picked.y, picked.z));
      if (sampled && sampled.color) colorPicker.value = sampled.color;
      break;
    }
    case "erase":
      eraseAt(target.x, target.y, target.z, state.brushSize);
      changed = true;
      break;
    case "fill":
      if (!picked) break;
      floodFill(picked.x, picked.y, picked.z, colorPicker.value);
      changed = true;
      break;
    case "gradient":
      if (!picked) break;
      applyGradientAround(picked.x, picked.y, picked.z, state.brushSize + 1);
      changed = true;
      break;
    case "select":
      updateSelection(target, isNewStroke);
      break;
    case "move":
      updateSelection(target, true);
      break;
    case "stamp":
      placeStampAt(target.x, target.y + 1, target.z, state.mode === "modeling");
      changed = true;
      break;
    case "melt":
      meltAround(target.x, target.y, target.z);
      changed = true;
      break;
    case "weld":
      weldAround(target.x, target.y, target.z);
      changed = true;
      break;
    case "smooth":
      smoothAround(target.x, target.y, target.z);
      changed = true;
      break;
    default:
      break;
  }
  if (changed) {
    saveAutosave();
    rebuildObjectList();
  }
  render();
}

function updateSelection(picked, isNewStroke) {
  if (isNewStroke || !state.selectionAnchor) {
    state.selectionAnchor = { x: picked.x, y: picked.y, z: picked.z };
    state.selectedKeys.clear();
  }
  const a = state.selectionAnchor;
  const minX = Math.min(a.x, picked.x);
  const maxX = Math.max(a.x, picked.x);
  const minY = Math.min(a.y, picked.y);
  const maxY = Math.max(a.y, picked.y);
  const minZ = Math.min(a.z, picked.z);
  const maxZ = Math.max(a.z, picked.z);

  state.selectedKeys.clear();
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const key = keyFor(x, y, z);
        if (state.voxels.has(key)) state.selectedKeys.add(key);
      }
    }
  }
}

function startMoveDrag(e) {
  state.moveDrag = {
    accumX: 0,
    accumY: 0
  };
  handleMoveDrag(e, true);
}

function handleMoveDrag(e, isFirst = false) {
  if (!state.moveDrag) return;
  if (!isFirst) {
    state.moveDrag.accumX += e.movementX;
    state.moveDrag.accumY += e.movementY;
  }

  const threshold = 14;
  let dx = 0;
  let dy = 0;
  let dz = 0;

  const stepX = truncTowardsZero(state.moveDrag.accumX / threshold);
  const stepY = truncTowardsZero(state.moveDrag.accumY / threshold);
  if (stepX === 0 && stepY === 0) return;

  if (e.shiftKey) {
    // Vertical move while dragging with shift.
    dy = -stepY;
  } else if (e.altKey) {
    // Diagonal move: horizontal + depth together.
    dx = stepX;
    dz = stepY;
  } else if (Math.abs(stepX) >= Math.abs(stepY)) {
    dx = stepX;
  } else {
    dz = stepY;
  }

  if (translateSelection(dx, dy, dz)) {
    state.moveDrag.accumX -= stepX * threshold;
    state.moveDrag.accumY -= stepY * threshold;
    saveAutosave();
    rebuildObjectList();
    render();
  }
}

function truncTowardsZero(value) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function translateSelection(dx, dy, dz) {
  if (state.selectedKeys.size === 0) return false;
  if (dx === 0 && dy === 0 && dz === 0) return false;
  const selected = [];
  for (const key of state.selectedKeys) {
    const voxel = state.voxels.get(key);
    if (voxel) selected.push(voxel);
  }
  if (selected.length === 0) return false;

  for (const voxel of selected) {
    if (!inBounds(voxel.x + dx, voxel.y + dy, voxel.z + dz)) return false;
  }

  for (const voxel of selected) {
    state.voxels.delete(keyFor(voxel.x, voxel.y, voxel.z));
  }

  state.selectedKeys.clear();
  for (const voxel of selected) {
    const nx = voxel.x + dx;
    const ny = voxel.y + dy;
    const nz = voxel.z + dz;
    const key = keyFor(nx, ny, nz);
    state.voxels.set(key, {
      x: nx,
      y: ny,
      z: nz,
      color: voxel.color,
      objectId: voxel.objectId
    });
    state.selectedKeys.add(key);
  }
  return true;
}

function applySelectionTransform({ scaleX, scaleY, scaleZ, slantX, slantZ }) {
  const keys = getTransformTargetKeys();
  if (keys.length === 0) return false;
  const voxels = [];
  for (const key of keys) {
    const v = state.voxels.get(key);
    if (v) voxels.push(v);
  }
  if (voxels.length === 0) return false;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const v of voxels) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    minZ = Math.min(minZ, v.z);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
    maxZ = Math.max(maxZ, v.z);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  for (const v of voxels) {
    state.voxels.delete(keyFor(v.x, v.y, v.z));
  }

  state.selectedKeys.clear();
  for (const v of voxels) {
    const lx = v.x - cx;
    const ly = v.y - cy;
    const lz = v.z - cz;
    const tx = lx * scaleX + ly * slantX;
    const ty = ly * scaleY;
    const tz = lz * scaleZ + ly * slantZ;
    const nx = Math.round(cx + tx);
    const ny = Math.round(cy + ty);
    const nz = Math.round(cz + tz);
    if (!inBounds(nx, ny, nz)) continue;
    const key = keyFor(nx, ny, nz);
    state.voxels.set(key, {
      x: nx,
      y: ny,
      z: nz,
      color: v.color,
      objectId: v.objectId
    });
    state.selectedKeys.add(key);
  }
  return true;
}

function startShapeDrag(e) {
  const target = getPointerTarget(e.offsetX, e.offsetY);
  if (!target) return;
  snapshotHistory("Shape drag");
  state.shapeDrag = {
    anchor: { x: target.x, y: target.y, z: target.z },
    current: { x: target.x, y: target.y, z: target.z }
  };
}

function updateShapeDrag(e) {
  if (!state.shapeDrag) return;
  const target = getPointerTarget(e.offsetX, e.offsetY);
  if (!target) return;
  state.shapeDrag.current = { x: target.x, y: target.y, z: target.z };
}

function finishShapeDrag() {
  if (!state.shapeDrag) return;
  const drag = state.shapeDrag;
  const dx = Math.abs(drag.current.x - drag.anchor.x);
  const dy = Math.abs(drag.current.y - drag.anchor.y);
  const dz = Math.abs(drag.current.z - drag.anchor.z);
  const radius = clamp(Math.max(dx, dy, dz), 1, 12);
  addPrimitive(
    shapeTypeSelect.value,
    radius,
    Number(shapeSegmentsInput.value),
    false,
    0,
    drag.anchor
  );
  saveAutosave();
  rebuildObjectList();
  render();
}

function getPointerTarget(px, py) {
  const picked = pickVoxelFromPointer(px, py);
  return picked || pickCursorGridPoint(px, py, 0);
}

function getTransformTargetKeys() {
  if (state.selectedKeys.size > 0) {
    return Array.from(state.selectedKeys.values());
  }
  const keys = [];
  for (const [key, voxel] of state.voxels.entries()) {
    if (voxel.objectId === state.activeObjectId) keys.push(key);
  }
  return keys;
}

function placeStampAt(x, y, z, forceModelColor = false) {
  const stamp = state.stampIndex >= 0 ? state.stamps[state.stampIndex] : state.copiedStamp;
  if (!stamp) return;
  for (const item of stamp.voxels) {
    setVoxel(
      x + item.x,
      y + item.y,
      z + item.z,
      forceModelColor ? MODEL_BASE_COLOR : item.color,
      state.activeObjectId
    );
  }
}

function saveSelectionAsStamp() {
  const voxels = getSelectionStampVoxels();
  if (!voxels) return;
  state.stamps.push({
    name: `Stamp ${state.stamps.length + 1}`,
    voxels
  });
  state.stampIndex = state.stamps.length - 1;
  rebuildStampList();
  saveAutosave();
}

function copySelectionToClipboardStamp() {
  const voxels = getSelectionStampVoxels();
  if (!voxels) return;
  state.copiedStamp = { name: "Clipboard", voxels };
  state.stampIndex = -1;
  setTool("stamp");
  hintText.textContent = "Copied selection. Use Stamp tool to place, or Ctrl+P to save into library.";
  saveAutosave();
}

function getSelectionStampVoxels() {
  if (state.selectedKeys.size === 0) return null;
  const voxels = [];
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  for (const key of state.selectedKeys) {
    const v = state.voxels.get(key);
    if (!v) continue;
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    minZ = Math.min(minZ, v.z);
  }
  for (const key of state.selectedKeys) {
    const v = state.voxels.get(key);
    if (!v) continue;
    voxels.push({
      x: v.x - minX,
      y: v.y - minY,
      z: v.z - minZ,
      color: v.color
    });
  }
  return voxels;
}

function rebuildStampList() {
  const targets = [stampList, leftStampList].filter(Boolean);
  for (const target of targets) target.innerHTML = "";
  state.stamps.forEach((stamp, i) => {
    for (const target of targets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = stamp.name;
      if (state.stampIndex === i) btn.classList.add("active");
      btn.addEventListener("click", () => {
        state.stampIndex = i;
        setTool("stamp");
        rebuildStampList();
      });
      target.append(btn);
    }
  });
  if (leftStampEmpty) {
    leftStampEmpty.classList.toggle("hidden", state.stamps.length > 0);
  }
}

function addPrimitive(kind, radius, segments = 24, hollow = false, wallThickness = 2, center = null) {
  const cx = center ? center.x : Math.floor(GRID_SIZE / 2);
  const cy = center ? center.y : Math.floor(GRID_SIZE / 2);
  const cz = center ? center.z : Math.floor(GRID_SIZE / 2);
  const color = MODEL_BASE_COLOR;
  const samplesPerAxis = clamp(Math.floor(segments / 16), 1, 4);
  const sampleStep = 1 / samplesPerAxis;
  const thicknessNorm = wallThickness / Math.max(1, radius * 2);

  for (let x = -radius; x <= radius; x += 1) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let z = -radius; z <= radius; z += 1) {
        let insideCount = 0;
        let shellCount = 0;
        const total = samplesPerAxis ** 3;
        for (let sx = 0; sx < samplesPerAxis; sx += 1) {
          for (let sy = 0; sy < samplesPerAxis; sy += 1) {
            for (let sz = 0; sz < samplesPerAxis; sz += 1) {
              const ox = (sx + 0.5) * sampleStep - 0.5;
              const oy = (sy + 0.5) * sampleStep - 0.5;
              const oz = (sz + 0.5) * sampleStep - 0.5;
              const sdf = primitiveSdf(kind, x + ox, y + oy, z + oz, radius);
              if (sdf <= 0) insideCount += 1;
              if (Math.abs(sdf) <= thicknessNorm && sdf <= thicknessNorm * 0.8) shellCount += 1;
            }
          }
        }
        const fillRatio = insideCount / total;
        const shellRatio = shellCount / total;
        if (!hollow && fillRatio < 0.45) continue;
        if (hollow && shellRatio < 0.22) continue;
        setVoxel(cx + x, cy + y, cz + z, color, state.activeObjectId);
      }
    }
  }
}

function primitiveSdf(kind, x, y, z, radius) {
  const nx = x / Math.max(1, radius);
  const ny = y / Math.max(1, radius);
  const nz = z / Math.max(1, radius);
  switch (kind) {
    case "cube":
      return Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) - 1;
    case "sphere": {
      return Math.sqrt(nx * nx + ny * ny + nz * nz) - 1;
    }
    case "cylinder": {
      const radial = Math.sqrt(nx * nx + nz * nz) - 1;
      return Math.max(radial, Math.abs(ny) - 1);
    }
    case "pyramid": {
      const h = clamp((ny + 1) * 0.5, 0, 1);
      const maxR = 1 - h;
      const radial = Math.sqrt(nx * nx + nz * nz) - maxR;
      return Math.max(radial, Math.abs(ny) - 1);
    }
    case "triangular_prism": {
      const tri = Math.abs(nx) * 1.15 + ny * 0.9;
      const base = tri - 1;
      const depth = Math.abs(nz) - 1;
      return Math.max(base, depth);
    }
    default:
      return 1;
  }
}

function meltAround(x, y, z) {
  forEachInBrush(x, y, z, state.brushSize + 1, (sx, sy, sz) => {
    const key = keyFor(sx, sy, sz);
    const voxel = state.voxels.get(key);
    if (!voxel) return;
    const below = keyFor(sx, sy - 1, sz);
    if (!state.voxels.has(below) && inBounds(sx, sy - 1, sz)) {
      state.voxels.delete(key);
      setVoxel(sx, sy - 1, sz, mixColor(voxel.color, "#5f3b2a", 0.1));
    }
  });
}

function weldAround(x, y, z) {
  const targetColor = MODEL_BASE_COLOR;
  const cluster = [];
  forEachInBrush(x, y, z, state.brushSize + 1, (sx, sy, sz) => {
    const key = keyFor(sx, sy, sz);
    const voxel = state.voxels.get(key);
    if (voxel) cluster.push(voxel);
  });
  for (const voxel of cluster) {
    voxel.color = mixColor(voxel.color, targetColor, 0.6);
  }
}

function smoothAround(x, y, z) {
  const toAdd = [];
  const toDelete = [];

  forEachInBrush(x, y, z, state.brushSize + 1, (sx, sy, sz) => {
    const key = keyFor(sx, sy, sz);
    const filledNeighbors = countNeighbors(sx, sy, sz);
    if (state.voxels.has(key)) {
      if (filledNeighbors <= 1) toDelete.push(key);
    } else if (filledNeighbors >= 5) {
      toAdd.push({ x: sx, y: sy, z: sz, color: MODEL_BASE_COLOR, objectId: state.activeObjectId });
    }
  });

  for (const key of toDelete) state.voxels.delete(key);
  for (const item of toAdd) setVoxel(item.x, item.y, item.z, item.color, item.objectId);
}

function countNeighbors(x, y, z) {
  const offsets = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  let count = 0;
  for (const [dx, dy, dz] of offsets) {
    if (state.voxels.has(keyFor(x + dx, y + dy, z + dz))) count += 1;
  }
  return count;
}

function applyGradientAround(x, y, z, size) {
  const c1 = colorPicker.value;
  const c2 = secondaryColorPicker.value;
  forEachInBrush(x, y, z, size, (sx, sy, sz) => {
    const key = keyFor(sx, sy, sz);
    if (!state.voxels.has(key)) return;
    if (!isSurfaceVoxel(sx, sy, sz)) return;
    const t = clamp((sx - x + size) / (size * 2), 0, 1);
    state.voxels.get(key).color = mixColor(c1, c2, t);
  });
}

function floodFill(startX, startY, startZ, targetColor) {
  const startKey = keyFor(startX, startY, startZ);
  if (!state.voxels.has(startKey)) return;
  if (!isSurfaceVoxel(startX, startY, startZ)) return;
  const sourceColor = state.voxels.get(startKey).color;
  if (sourceColor.toLowerCase() === targetColor.toLowerCase()) return;

  const q = [[startX, startY, startZ]];
  const visited = new Set();
  while (q.length > 0) {
    const [x, y, z] = q.pop();
    const key = keyFor(x, y, z);
    if (visited.has(key)) continue;
    visited.add(key);
    const voxel = state.voxels.get(key);
    if (!voxel || voxel.color.toLowerCase() !== sourceColor.toLowerCase()) continue;
    if (!isSurfaceVoxel(x, y, z)) continue;
    voxel.color = targetColor;
    q.push([x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]);
  }
}

function paintAt(x, y, z, color, size) {
  forEachInBrush(x, y, z, size, (sx, sy, sz) => {
    setVoxel(sx, sy, sz, color, state.activeObjectId);
  });
}

function paintExistingAt(x, y, z, color, size) {
  forEachInBrush(x, y, z, size, (sx, sy, sz) => {
    const key = keyFor(sx, sy, sz);
    if (state.voxels.has(key)) {
      const voxel = state.voxels.get(key);
      if (!isObjectVisible(voxel.objectId)) return;
      if (!isSurfaceVoxel(sx, sy, sz)) return;
      voxel.color = color;
    }
  });
}

function isSurfaceVoxel(x, y, z) {
  const offsets = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  for (const [dx, dy, dz] of offsets) {
    const neighbor = state.voxels.get(keyFor(x + dx, y + dy, z + dz));
    if (!neighbor || !isObjectVisible(neighbor.objectId)) return true;
  }
  return false;
}

function eraseAt(x, y, z, size) {
  forEachInBrush(x, y, z, size, (sx, sy, sz) => {
    const key = keyFor(sx, sy, sz);
    const voxel = state.voxels.get(key);
    if (!voxel) return;
    if (state.mode === "modeling" && voxel.objectId !== state.activeObjectId) return;
    state.voxels.delete(key);
  });
}

function forEachInBrush(cx, cy, cz, size, fn) {
  for (let x = -size + 1; x <= size - 1; x += 1) {
    for (let y = -size + 1; y <= size - 1; y += 1) {
      for (let z = -size + 1; z <= size - 1; z += 1) {
        if (x * x + y * y + z * z > size * size) continue;
        const tx = cx + x;
        const ty = cy + y;
        const tz = cz + z;
        if (inBounds(tx, ty, tz)) fn(tx, ty, tz);
      }
    }
  }
}

function setVoxel(x, y, z, color, objectId = state.activeObjectId) {
  if (!inBounds(x, y, z)) return;
  const key = keyFor(x, y, z);
  state.voxels.set(key, { x, y, z, color, objectId });
}

function keyFor(x, y, z) {
  return `${x}|${y}|${z}`;
}

function inBounds(x, y, z) {
  return x >= 0 && y >= 0 && z >= 0 && x < GRID_SIZE && y < GRID_SIZE && z < GRID_SIZE;
}

function pickVoxelFromPointer(px, py) {
  const sorted = getSortedVoxelsByDepth().reverse();
  for (const v of sorted) {
    const corners = getVoxelCorners(v.x, v.y, v.z);
    const faces = [
      [corners[0], corners[1], corners[2], corners[3]],
      [corners[3], corners[2], corners[6], corners[7]],
      [corners[1], corners[5], corners[6], corners[2]]
    ];
    for (const face of faces) {
      if (pointInPolygon(px, py, face)) {
        return v;
      }
    }
  }
  return null;
}

function pickCursorGridPoint(px, py, yLevel) {
  let best = null;
  let bestDist = Infinity;
  const step = 1;
  for (let x = 0; x < GRID_SIZE; x += step) {
    for (let z = 0; z < GRID_SIZE; z += step) {
      const p = project(x + 0.5, yLevel + 0.5, z + 0.5);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = { x, y: yLevel, z };
      }
    }
  }
  if (!best) return null;
  return {
    x: clamp(Math.round(best.x), 0, GRID_SIZE - 1),
    y: clamp(Math.round(best.y), 0, GRID_SIZE - 1),
    z: clamp(Math.round(best.z), 0, GRID_SIZE - 1)
  };
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > py) !== (yj > py))
      && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getSortedVoxelsByDepth() {
  return Array.from(state.voxels.values())
    .filter((v) => isObjectVisible(v.objectId))
    .sort((a, b) => depth(a) - depth(b));
}

function isObjectVisible(objectId) {
  const object = state.objects.get(objectId);
  return !object || object.visible;
}

function depth(v) {
  const p = rotate(v.x, v.y, v.z);
  return p.z;
}

function project(x, y, z) {
  const r = rotate(x - GRID_SIZE / 2, y - GRID_SIZE / 2, z - GRID_SIZE / 2);
  return {
    // Center the projected world on the canvas midpoints.
    x: canvas.width * 0.5 + (r.x * VOXEL_SIZE + camera.panX) * camera.zoom,
    y: canvas.height * 0.5 + ((-r.y * VOXEL_SIZE) + camera.panY) * camera.zoom
  };
}

function rotate(x, y, z) {
  const cy = Math.cos(camera.yaw);
  const sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);

  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const y1 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  return { x: x1, y: y1, z: z2 };
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGridPlane();
  if (state.workflow === "mesh") {
    renderMeshScene(ctx, canvas, projectWithDepth, state.lightDir, { outline: true });
    if (state.mode === "modeling" && state.tool === "vertex") {
      drawMeshVertexHandles(ctx, projectWithDepth, { activeMeshOnly: true });
    }
    if (state.mode === "modeling" && state.tool === "objectSelect") {
      const activeMesh = meshState.meshes.get(meshState.activeMeshId);
      if (activeMesh) drawObjectSelectGizmo(activeMesh);
    }
    if (state.mode === "modeling" && state.tool === "meshMove") {
      const activeMesh = meshState.meshes.get(meshState.activeMeshId);
      if (activeMesh) drawMeshMoveGizmo(activeMesh);
    }
    drawMeshLineDragPreview();
    drawMeshHud();
    updateCameraInfo();
    return;
  }
  const sorted = getSortedVoxelsByDepth();
  drawWholeModelOutline(sorted);
  for (const voxel of sorted) drawVoxel(voxel);
  drawHoverPreview();
  drawShapeDragPreview();
  drawSelectionOutline();
  updateCameraInfo();
}

function projectWithDepth(x, y, z) {
  const r = rotate(x, y, z);
  return {
    x: canvas.width * 0.5 + (r.x * VOXEL_SIZE + camera.panX) * camera.zoom,
    y: canvas.height * 0.5 + ((-r.y * VOXEL_SIZE) + camera.panY) * camera.zoom,
    depth: r.z
  };
}

// Compute the world-space axis-aligned bounding box of a mesh.
function meshBoundingBox(mesh) {
  if (!mesh || !mesh.vertices.length) return null;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const v of mesh.vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

// Build a list of stretch-handle descriptors for a mesh's bounding box.
// Each handle owns an axis (0=x,1=y,2=z), sign (+1/-1), the world-space
// position of the handle and its opposite anchor, and projected screen coords.
function getObjectStretchHandles(mesh) {
  const bbox = meshBoundingBox(mesh);
  if (!bbox) return [];
  const midX = (bbox.minX + bbox.maxX) / 2;
  const midY = (bbox.minY + bbox.maxY) / 2;
  const midZ = (bbox.minZ + bbox.maxZ) / 2;
  const defs = [
    { axisIdx: 0, sign: +1, hx: bbox.maxX, hy: midY, hz: midZ, ax: bbox.minX, ay: midY, az: midZ },
    { axisIdx: 0, sign: -1, hx: bbox.minX, hy: midY, hz: midZ, ax: bbox.maxX, ay: midY, az: midZ },
    { axisIdx: 1, sign: +1, hx: midX, hy: bbox.maxY, hz: midZ, ax: midX, ay: bbox.minY, az: midZ },
    { axisIdx: 1, sign: -1, hx: midX, hy: bbox.minY, hz: midZ, ax: midX, ay: bbox.maxY, az: midZ },
    { axisIdx: 2, sign: +1, hx: midX, hy: midY, hz: bbox.maxZ, ax: midX, ay: midY, az: bbox.minZ },
    { axisIdx: 2, sign: -1, hx: midX, hy: midY, hz: bbox.minZ, ax: midX, ay: midY, az: bbox.maxZ }
  ];
  return defs.map((d) => ({
    axisIdx: d.axisIdx,
    sign: d.sign,
    anchorVal: d.sign > 0 ? (d.axisIdx === 0 ? bbox.minX : d.axisIdx === 1 ? bbox.minY : bbox.minZ)
                          : (d.axisIdx === 0 ? bbox.maxX : d.axisIdx === 1 ? bbox.maxY : bbox.maxZ),
    handleVal: d.sign > 0 ? (d.axisIdx === 0 ? bbox.maxX : d.axisIdx === 1 ? bbox.maxY : bbox.maxZ)
                          : (d.axisIdx === 0 ? bbox.minX : d.axisIdx === 1 ? bbox.minY : bbox.minZ),
    handleScreen: projectWithDepth(d.hx, d.hy, d.hz),
    anchorScreen: projectWithDepth(d.ax, d.ay, d.az),
    bbox
  }));
}

// Three rotation handles, one per world axis, placed at distinct edge midpoints
// of the bounding box so they don't overlap the face-center stretch handles.
function getObjectRotationHandles(mesh) {
  const bbox = meshBoundingBox(mesh);
  if (!bbox) return [];
  const midX = (bbox.minX + bbox.maxX) / 2;
  const midY = (bbox.minY + bbox.maxY) / 2;
  const midZ = (bbox.minZ + bbox.maxZ) / 2;
  const pivot = { x: midX, y: midY, z: midZ };
  return [
    { axisIdx: 0, color: "#ff5555", world: { x: midX, y: bbox.maxY, z: bbox.maxZ }, pivot },
    { axisIdx: 1, color: "#5cdb5c", world: { x: bbox.maxX, y: midY, z: bbox.maxZ }, pivot },
    { axisIdx: 2, color: "#5fa8ff", world: { x: bbox.maxX, y: bbox.maxY, z: midZ }, pivot }
  ];
}

function pickObjectRotationHandle(mesh, cx, cy) {
  const handles = getObjectRotationHandles(mesh);
  const radius = 12; // pixels
  let best = null;
  let bestDist = radius;
  for (const h of handles) {
    const s = projectWithDepth(h.world.x, h.world.y, h.world.z);
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d < bestDist) {
      bestDist = d;
      best = { ...h, screen: s };
    }
  }
  return best;
}

function applyObjectRotateDrag(currentScreen) {
  const drag = meshState.activeDrag;
  if (!drag || drag.type !== "rotate") return;
  const mesh = meshState.meshes.get(drag.meshId);
  if (!mesh) return;
  const ps = drag.pivotScreen;
  // Angle around the pivot in screen space, from drag start to current cursor.
  const startA = Math.atan2(drag.startScreen.y - ps.y, drag.startScreen.x - ps.x);
  const curA = Math.atan2(currentScreen.y - ps.y, currentScreen.x - ps.x);
  let delta = curA - startA;
  const cosA = Math.cos(delta);
  const sinA = Math.sin(delta);
  const pv = drag.pivot;
  const axis = drag.axisIdx;
  for (let i = 0; i < mesh.vertices.length; i++) {
    const o = drag.originalVerts[i];
    const v = mesh.vertices[i];
    if (axis === 0) {
      const dy = o.y - pv.y;
      const dz = o.z - pv.z;
      v.x = o.x;
      v.y = pv.y + dy * cosA - dz * sinA;
      v.z = pv.z + dy * sinA + dz * cosA;
    } else if (axis === 1) {
      const dx = o.x - pv.x;
      const dz = o.z - pv.z;
      v.x = pv.x + dx * cosA + dz * sinA;
      v.y = o.y;
      v.z = pv.z - dx * sinA + dz * cosA;
    } else {
      const dx = o.x - pv.x;
      const dy = o.y - pv.y;
      v.x = pv.x + dx * cosA - dy * sinA;
      v.y = pv.y + dx * sinA + dy * cosA;
      v.z = o.z;
    }
  }
  saveAutosave();
  render();
}

function startObjectRotateDrag(mesh, handle, cx, cy) {
  const pivotScreen = projectWithDepth(handle.pivot.x, handle.pivot.y, handle.pivot.z);
  snapshotHistory("Rotate object");
  meshState.activeDrag = {
    type: "rotate",
    meshId: mesh.id,
    axisIdx: handle.axisIdx,
    pivot: { ...handle.pivot },
    pivotScreen,
    startScreen: { x: cx, y: cy },
    originalVerts: mesh.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z }))
  };
}

function pickObjectStretchHandle(mesh, cx, cy) {
  const handles = getObjectStretchHandles(mesh);
  const radius = 14; // pixels
  let best = null;
  let bestDist = radius;
  for (const h of handles) {
    const dx = h.handleScreen.x - cx;
    const dy = h.handleScreen.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      bestDist = d;
      best = h;
    }
  }
  return best;
}

function applyObjectStretchDrag(currentScreen) {
  const drag = meshState.activeDrag;
  if (!drag) return;
  const mesh = meshState.meshes.get(drag.meshId);
  if (!mesh) return;
  const ax = drag.handleScreen.x - drag.anchorScreen.x;
  const ay = drag.handleScreen.y - drag.anchorScreen.y;
  const lenSq = ax * ax + ay * ay;
  if (lenSq < 1e-6) return;
  const dx = currentScreen.x - drag.startScreen.x;
  const dy = currentScreen.y - drag.startScreen.y;
  // Project the cursor delta onto the screen-space axis vector. `factor`
  // expresses how many "current axis lengths" the user has dragged outward.
  const factor = (dx * ax + dy * ay) / lenSq;
  const oldRange = drag.handleVal - drag.anchorVal;
  if (Math.abs(oldRange) < 1e-6) return;
  // Clamp so the user can't flip the box inside-out.
  const minScale = 0.05;
  const newRange = oldRange * (1 + factor);
  const safeRange = Math.sign(oldRange) * Math.max(Math.abs(newRange), Math.abs(oldRange) * minScale);
  const scale = safeRange / oldRange;
  const axisIdx = drag.axisIdx;
  const anchor = drag.anchorVal;
  const orig = drag.originalVerts;
  for (let i = 0; i < mesh.vertices.length; i++) {
    const o = orig[i];
    const v = mesh.vertices[i];
    if (axisIdx === 0) {
      v.x = anchor + (o.x - anchor) * scale;
      v.y = o.y;
      v.z = o.z;
    } else if (axisIdx === 1) {
      v.x = o.x;
      v.y = anchor + (o.y - anchor) * scale;
      v.z = o.z;
    } else {
      v.x = o.x;
      v.y = o.y;
      v.z = anchor + (o.z - anchor) * scale;
    }
  }
  saveAutosave();
  render();
}

// Draw the bounding box outline + face stretch handles for the active mesh.
function drawObjectSelectGizmo(mesh) {
  const bbox = meshBoundingBox(mesh);
  if (!bbox) return;
  const corners = [
    [bbox.minX, bbox.minY, bbox.minZ],
    [bbox.maxX, bbox.minY, bbox.minZ],
    [bbox.maxX, bbox.minY, bbox.maxZ],
    [bbox.minX, bbox.minY, bbox.maxZ],
    [bbox.minX, bbox.maxY, bbox.minZ],
    [bbox.maxX, bbox.maxY, bbox.minZ],
    [bbox.maxX, bbox.maxY, bbox.maxZ],
    [bbox.minX, bbox.maxY, bbox.maxZ]
  ].map((p) => projectWithDepth(p[0], p[1], p[2]));
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  ctx.save();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "#ffd43b";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (const [a, b] of edges) {
    ctx.moveTo(corners[a].x, corners[a].y);
    ctx.lineTo(corners[b].x, corners[b].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Stretch handles (square dots).
  const handles = getObjectStretchHandles(mesh);
  for (const h of handles) {
    const sx = h.handleScreen.x;
    const sy = h.handleScreen.y;
    const axisColor = h.axisIdx === 0 ? "#ff5555" : h.axisIdx === 1 ? "#5cdb5c" : "#5fa8ff";
    // Draw a short tick from box center toward the handle for orientation cue.
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h.anchorScreen.x, h.anchorScreen.y);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    // Filled handle dot.
    ctx.fillStyle = axisColor;
    ctx.strokeStyle = "#1c1c1c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(sx - 5, sy - 5, 10, 10);
    ctx.fill();
    ctx.stroke();
  }
  drawRotationHandles(mesh);
  ctx.restore();
}

// Draw the 3 rotation handles (round dots with crosshair) per axis.
function drawRotationHandles(mesh) {
  const rotHandles = getObjectRotationHandles(mesh);
  ctx.save();
  for (const h of rotHandles) {
    const s = projectWithDepth(h.world.x, h.world.y, h.world.z);
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Lightweight gizmo for Mesh Move tool: just bounding box + rotation handles
// (no stretch handles, since meshMove doesn't stretch).
function drawMeshMoveGizmo(mesh) {
  const bbox = meshBoundingBox(mesh);
  if (!bbox) return;
  const corners = [
    [bbox.minX, bbox.minY, bbox.minZ],
    [bbox.maxX, bbox.minY, bbox.minZ],
    [bbox.maxX, bbox.minY, bbox.maxZ],
    [bbox.minX, bbox.minY, bbox.maxZ],
    [bbox.minX, bbox.maxY, bbox.minZ],
    [bbox.maxX, bbox.maxY, bbox.minZ],
    [bbox.maxX, bbox.maxY, bbox.maxZ],
    [bbox.minX, bbox.maxY, bbox.maxZ]
  ].map((p) => projectWithDepth(p[0], p[1], p[2]));
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(255, 212, 59, 0.55)";
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  for (const [a, b] of edges) {
    ctx.moveTo(corners[a].x, corners[a].y);
    ctx.lineTo(corners[b].x, corners[b].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  drawRotationHandles(mesh);
  ctx.restore();
}

function drawMeshHud() {
  if (state.mode !== "painting") return;
  ctx.save();
  ctx.fillStyle = colorPicker.value;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.fillRect(canvas.width - 28, 12, 16, 16);
  ctx.strokeRect(canvas.width - 28, 12, 16, 16);
  ctx.restore();
}

function drawMeshLineDragPreview() {
  const drag = meshState.activeDrag;
  if (!drag || drag.type !== "line" || !state.isPointerDown) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(drag.startScreen.x, drag.startScreen.y);
  ctx.lineTo(drag.currentScreen.x, drag.currentScreen.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colorPicker.value;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.arc(drag.startScreen.x, drag.startScreen.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function updateCameraInfo() {
  if (!cameraInfo) return;
  const yawDeg = (camera.yaw * 180) / Math.PI;
  const pitchDeg = (camera.pitch * 180) / Math.PI;
  cameraInfo.textContent = `Camera: yaw ${yawDeg.toFixed(1)}°, pitch ${pitchDeg.toFixed(1)}°, zoom ${camera.zoom.toFixed(2)}`;
}

function drawWholeModelOutline(voxels) {
  if (!voxels || voxels.length < 4) return;
  const points = voxels.map((v) => project(v.x + 0.5, v.y + 0.5, v.z + 0.5));
  const hull = convexHull(points);
  if (hull.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(hull[0].x, hull[0].y);
  for (let i = 1; i < hull.length; i += 1) {
    ctx.lineTo(hull[i].x, hull[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = state.mode === "modeling" ? "rgba(35,35,35,0.6)" : "rgba(20,20,20,0.35)";
  ctx.lineWidth = state.mode === "modeling" ? 2 : 1.25;
  ctx.stroke();
  ctx.restore();
}

function convexHull(points) {
  if (points.length <= 1) return points.slice();
  const sorted = points
    .map((p) => ({ x: p.x, y: p.y }))
    .sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function drawGridPlane() {
  ctx.strokeStyle = state.mode === "modeling" ? "rgba(172,178,185,0.22)" : "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_SIZE; x += 2) {
    const a = project(x, 0, 0);
    const b = project(x, 0, GRID_SIZE);
    line(a, b);
  }
  for (let z = 0; z <= GRID_SIZE; z += 2) {
    const a = project(0, 0, z);
    const b = project(GRID_SIZE, 0, z);
    line(a, b);
  }
}

function line(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawVoxel(voxel) {
  const corners = getVoxelCorners(voxel.x, voxel.y, voxel.z);
  const centerNormal = getSmoothedNormal(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
  const topNormal = blendNormals(centerNormal, getSmoothedNormal(voxel.x + 0.5, voxel.y + 1.01, voxel.z + 0.5));
  const frontNormal = blendNormals(centerNormal, getSmoothedNormal(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 1.01));
  const sideNormal = blendNormals(centerNormal, getSmoothedNormal(voxel.x + 1.01, voxel.y + 0.5, voxel.z + 0.5));
  const faces = [
    { points: [corners[0], corners[1], corners[2], corners[3]], normal: topNormal, center: { x: voxel.x + 0.5, y: voxel.y + 1, z: voxel.z + 0.5 }, id: "top" },
    { points: [corners[3], corners[2], corners[6], corners[7]], normal: frontNormal, center: { x: voxel.x + 0.5, y: voxel.y + 0.5, z: voxel.z + 1 }, id: "front" },
    { points: [corners[1], corners[5], corners[6], corners[2]], normal: sideNormal, center: { x: voxel.x + 1, y: voxel.y + 0.5, z: voxel.z + 0.5 }, id: "side" }
  ];

  for (const face of faces) {
    const shade = state.lightEnabled ? calcShade(face.normal, face.center) : 1;
    const baseColor = state.mode === "modeling"
      ? "#8e9399"
      : (state.unifiedClayPreview ? getClayColor(voxel.color) : voxel.color);
    const color = multiplyColor(baseColor, shade);
    const isSelected = state.selectedKeys.has(keyFor(voxel.x, voxel.y, voxel.z));
    const drawEdge = shouldDrawFaceEdge(voxel, face.id);
    fillPoly(face.points, color, isSelected, drawEdge);
  }
}

function getVoxelCorners(x, y, z) {
  return [
    project(x, y + 1, z),
    project(x + 1, y + 1, z),
    project(x + 1, y + 1, z + 1),
    project(x, y + 1, z + 1),
    project(x, y, z),
    project(x + 1, y, z),
    project(x + 1, y, z + 1),
    project(x, y, z + 1)
  ];
}

function fillPoly(points, color, selected, drawEdge) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  const shouldStroke = selected || (state.mode === "painting" && drawEdge);
  if (shouldStroke) {
    ctx.strokeStyle = selected ? "#ffe066" : "rgba(44,58,52,0.24)";
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
  }
}

function shouldDrawFaceEdge(voxel, faceId) {
  const lookup = {
    top: [0, 1, 0],
    front: [0, 0, 1],
    side: [1, 0, 0]
  };
  const [dx, dy, dz] = lookup[faceId] || [0, 0, 0];
  const neighbor = state.voxels.get(keyFor(voxel.x + dx, voxel.y + dy, voxel.z + dz));
  return !neighbor || !isObjectVisible(neighbor.objectId);
}

function drawHoverPreview() {
  if (!state.hoverTarget) return;
  const h = state.hoverTarget;
  const y = h.y;
  if (!inBounds(h.x, y, h.z)) return;
  const corners = getVoxelCorners(h.x, y, h.z);
  const faces = [
    [corners[0], corners[1], corners[2], corners[3]],
    [corners[3], corners[2], corners[6], corners[7]],
    [corners[1], corners[5], corners[6], corners[2]]
  ];
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = state.mode === "painting" ? colorPicker.value : MODEL_BASE_COLOR;
  ctx.strokeStyle = "#ffffff";
  for (const face of faces) {
    ctx.beginPath();
    ctx.moveTo(face[0].x, face[0].y);
    for (let i = 1; i < face.length; i += 1) ctx.lineTo(face[i].x, face[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSelectionOutline() {
  if (state.selectedKeys.size === 0) return;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const key of state.selectedKeys) {
    const v = state.voxels.get(key);
    if (!v) continue;
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    minZ = Math.min(minZ, v.z);
    maxX = Math.max(maxX, v.x + 1);
    maxY = Math.max(maxY, v.y + 1);
    maxZ = Math.max(maxZ, v.z + 1);
  }
  const p0 = project(minX, maxY, minZ);
  const p1 = project(maxX, maxY, minZ);
  const p2 = project(maxX, maxY, maxZ);
  const p3 = project(minX, maxY, maxZ);
  ctx.strokeStyle = "#ffd43b";
  ctx.lineWidth = 2;
  line(p0, p1);
  line(p1, p2);
  line(p2, p3);
  line(p3, p0);
}

function drawShapeDragPreview() {
  if (!state.shapeDrag) return;
  const drag = state.shapeDrag;
  const dx = Math.abs(drag.current.x - drag.anchor.x);
  const dy = Math.abs(drag.current.y - drag.anchor.y);
  const dz = Math.abs(drag.current.z - drag.anchor.z);
  const r = clamp(Math.max(dx, dy, dz), 1, 12);
  const min = { x: drag.anchor.x - r, y: drag.anchor.y - r, z: drag.anchor.z - r };
  const max = { x: drag.anchor.x + r + 1, y: drag.anchor.y + r + 1, z: drag.anchor.z + r + 1 };
  const p = [
    project(min.x, min.y, min.z),
    project(max.x, min.y, min.z),
    project(max.x, min.y, max.z),
    project(min.x, min.y, max.z),
    project(min.x, max.y, min.z),
    project(max.x, max.y, min.z),
    project(max.x, max.y, max.z),
    project(min.x, max.y, max.z)
  ];
  ctx.save();
  ctx.strokeStyle = "#ffd43b";
  ctx.lineWidth = 1.5;
  line(p[0], p[1]); line(p[1], p[2]); line(p[2], p[3]); line(p[3], p[0]);
  line(p[4], p[5]); line(p[5], p[6]); line(p[6], p[7]); line(p[7], p[4]);
  line(p[0], p[4]); line(p[1], p[5]); line(p[2], p[6]); line(p[3], p[7]);
  ctx.restore();
}

function calcShade(normal, point) {
  const n = normalizeVector(normal);
  const d = n.x * state.lightDir.x + n.y * state.lightDir.y + n.z * state.lightDir.z;
  const direct = clamp(0.48 + d * 0.28, 0.2, 0.95);
  const ambient = state.ambientStrength;
  const hemi = ((n.y * 0.5) + 0.5) * state.hemiStrength;
  const shadow = computeSoftShadow(point, state.lightDir) * state.shadowStrength;
  const viewDir = getViewDirection();
  const fresnel = Math.pow(1 - clamp(n.x * viewDir.x + n.y * viewDir.y + n.z * viewDir.z, 0, 1), 2.5);
  const reflection = fresnel * state.reflectionStrength;
  return clamp(ambient + hemi + direct - shadow + reflection, 0.2, 1.25);
}

function getSmoothedNormal(x, y, z) {
  const step = 0.75;
  const gx = sampleSmoothField(x + step, y, z) - sampleSmoothField(x - step, y, z);
  const gy = sampleSmoothField(x, y + step, z) - sampleSmoothField(x, y - step, z);
  const gz = sampleSmoothField(x, y, z + step) - sampleSmoothField(x, y, z - step);
  const n = normalizeVector({ x: gx, y: gy, z: gz });
  return (Math.abs(n.x) + Math.abs(n.y) + Math.abs(n.z)) < 0.01 ? { x: 0, y: 1, z: 0 } : n;
}

function sampleField(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const voxel = state.voxels.get(keyFor(ix, iy, iz));
  if (!voxel) return 0;
  return isObjectVisible(voxel.objectId) ? 1 : 0;
}

function sampleSmoothField(x, y, z) {
  let value = 0;
  let weightSum = 0;
  for (let ix = -1; ix <= 1; ix += 1) {
    for (let iy = -1; iy <= 1; iy += 1) {
      for (let iz = -1; iz <= 1; iz += 1) {
        const sx = x + ix * 0.85;
        const sy = y + iy * 0.85;
        const sz = z + iz * 0.85;
        const dist2 = ix * ix + iy * iy + iz * iz;
        const w = 1 / (1 + dist2);
        value += sampleField(sx, sy, sz) * w;
        weightSum += w;
      }
    }
  }
  return weightSum > 0 ? value / weightSum : 0;
}

function computeSoftShadow(point, dir) {
  const steps = 7;
  let occlusion = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i * 0.9;
    const px = point.x - dir.x * t;
    const py = point.y - dir.y * t;
    const pz = point.z - dir.z * t;
    occlusion += sampleSmoothField(px, py, pz) / steps;
  }
  return clamp(occlusion, 0, 1);
}

function getViewDirection() {
  const cp = Math.cos(camera.pitch);
  return normalizeVector({
    x: Math.sin(camera.yaw) * cp,
    y: Math.sin(camera.pitch),
    z: Math.cos(camera.yaw) * cp
  });
}

function blendNormals(a, b) {
  return normalizeVector({
    x: a.x * 0.7 + b.x * 0.3,
    y: a.y * 0.7 + b.y * 0.3,
    z: a.z * 0.7 + b.z * 0.3
  });
}

function getClayColor(originalColor) {
  const rgb = hexToRgb(originalColor);
  const luma = (rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722) / 255;
  const warm = {
    r: Math.round(172 + luma * 32),
    g: Math.round(174 + luma * 28),
    b: Math.round(178 + luma * 24)
  };
  return rgbToHex(warm.r, warm.g, warm.b);
}

function multiplyColor(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const nr = clamp(Math.round(r * factor), 0, 255);
  const ng = clamp(Math.round(g * factor), 0, 255);
  const nb = clamp(Math.round(b * factor), 0, 255);
  return rgbToHex(nr, ng, nb);
}

function mixColor(a, b, t) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  return rgbToHex(
    Math.round(c1.r + (c2.r - c1.r) * t),
    Math.round(c1.g + (c2.g - c1.g) * t),
    Math.round(c1.b + (c2.b - c1.b) * t)
  );
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value) {
  return value.toString(16).padStart(2, "0");
}

function normalizeVector(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapshotHistory() {
  // History captures only the *model* (workflow + voxels + meshes + objects).
  // Tool, mode, theme, and other UI state are intentionally excluded so that
  // undo/redo restores what you built rather than which button was pressed.
  state.history.push(JSON.stringify(exportModelState()));
  state.redoHistory = [];
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

function undo() {
  if (state.history.length <= 1) return;
  const latest = state.history.pop();
  if (latest) state.redoHistory.push(latest);
  const payload = JSON.parse(state.history[state.history.length - 1]);
  importModelState(payload);
  saveAutosave();
  render();
}

function redo() {
  if (state.redoHistory.length === 0) return;
  const snapshot = state.redoHistory.pop();
  if (!snapshot) return;
  state.history.push(snapshot);
  importModelState(JSON.parse(snapshot));
  saveAutosave();
  render();
}

function exportModelState() {
  return {
    workflow: state.workflow,
    activeObjectId: state.activeObjectId,
    objects: Array.from(state.objects.values()),
    voxels: serializeVoxels(),
    meshes: serializeMeshes(),
    layers: serializeLayers(),
    activeMeshId: meshState.activeMeshId,
    activeLayerId: meshState.activeLayerId
  };
}

function importModelState(payload) {
  // Switch workflow if it changed but DON'T touch tool/mode/UI selections.
  if (payload.workflow && payload.workflow !== state.workflow) {
    state.workflow = payload.workflow;
    if (workflowVoxelBtn) workflowVoxelBtn.classList.toggle("active", state.workflow === "voxel");
    if (workflowMeshBtn) workflowMeshBtn.classList.toggle("active", state.workflow === "mesh");
  }
  state.activeObjectId = payload.activeObjectId || state.activeObjectId;
  state.objects = new Map((payload.objects || []).map((item) => [item.id, item]));
  if (state.objects.size === 0) initializeObjects();
  state.voxels.clear();
  for (const voxel of payload.voxels || []) {
    setVoxel(voxel.x, voxel.y, voxel.z, voxel.color, voxel.objectId || state.activeObjectId);
  }
  deserializeMeshes(payload);
  // Validate the active tool against current context; only swap it out if the
  // restored workflow now makes the tool invalid.
  const def = toolDefs.find((t) => t.id === state.tool);
  if (!def || !toolMatchesContext(def)) state.tool = pickDefaultToolForContext();
  syncSectionVisibility();
  updateActiveToolUi();
  rebuildObjectList();
  rebuildMeshList();
  rebuildStampList();
}

function serializeMeshes() {
  const meshes = [];
  for (const mesh of meshState.meshes.values()) {
    const faces = mesh.faces.map((face) => ({
      id: face.id,
      kind: face.kind,
      vertexIndices: face.vertexIndices.slice(),
      triangles: face.triangles.map((t) => ({ v: t.v.slice(), uv: t.uv.map((p) => p.slice()) })),
      texture: textureToBase64(face.texture),
      color: face.color,
      normalSeed: face.normalSeed
    }));
    meshes.push({
      id: mesh.id,
      name: mesh.name,
      visible: mesh.visible !== false,
      layerId: mesh.layerId || null,
      vertices: mesh.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z })),
      faces
    });
  }
  return meshes;
}

function serializeLayers() {
  const layers = [];
  for (const layer of meshState.layers.values()) {
    layers.push({
      id: layer.id,
      name: layer.name,
      expanded: layer.expanded !== false,
      visible: layer.visible !== false,
      meshIds: layer.meshIds.slice()
    });
  }
  return layers;
}

function deserializeMeshes(payload) {
  if (!payload || !Array.isArray(payload.meshes)) return;
  meshState.meshes.clear();
  meshState.layers.clear();
  meshState.selectedFace = null;
  meshState.hoverFace = null;
  meshState.activeDrag = null;
  // Restore layers first so meshes can resolve their parent.
  if (Array.isArray(payload.layers) && payload.layers.length) {
    for (const l of payload.layers) {
      meshState.layers.set(l.id, {
        id: l.id,
        name: l.name || "Layer",
        expanded: l.expanded !== false,
        visible: l.visible !== false,
        meshIds: []
      });
    }
  }
  for (const m of payload.meshes) {
    const restored = {
      id: m.id,
      name: m.name,
      visible: m.visible !== false,
      layerId: m.layerId || null,
      vertices: (m.vertices || []).map((v) => ({ x: v.x, y: v.y, z: v.z })),
      faces: (m.faces || []).map((face) => ({
        id: face.id,
        kind: face.kind,
        vertexIndices: face.vertexIndices.slice(),
        triangles: face.triangles.map((t) => ({ v: t.v.slice(), uv: t.uv.map((p) => p.slice()) })),
        texture: base64ToTexture(face.texture),
        color: face.color,
        normalSeed: face.normalSeed
      }))
    };
    meshState.meshes.set(restored.id, restored);
  }
  // Migrate older saves with no layers: bucket every loose mesh into a default
  // layer so the tree always renders.
  if (meshState.layers.size === 0 && meshState.meshes.size > 0) {
    const fallback = createLayer("Default Layer");
    for (const mesh of meshState.meshes.values()) {
      assignMeshToLayer(mesh.id, fallback.id);
    }
  } else {
    // Resync the meshIds list on each layer using the freshly loaded meshes
    // so we don't keep references to ids that no longer exist.
    for (const layer of meshState.layers.values()) layer.meshIds = [];
    for (const mesh of meshState.meshes.values()) {
      const layer = mesh.layerId && meshState.layers.get(mesh.layerId);
      if (layer) layer.meshIds.push(mesh.id);
    }
    // Catch any mesh that lost its layer reference (e.g. orphaned save data).
    for (const mesh of meshState.meshes.values()) {
      if (!mesh.layerId || !meshState.layers.has(mesh.layerId)) {
        const fallback = meshState.layers.values().next().value || createLayer("Default Layer");
        assignMeshToLayer(mesh.id, fallback.id);
      }
    }
  }
  meshState.activeMeshId = payload.activeMeshId && meshState.meshes.has(payload.activeMeshId)
    ? payload.activeMeshId
    : (meshState.meshes.values().next().value?.id || null);
  meshState.activeLayerId = payload.activeLayerId && meshState.layers.has(payload.activeLayerId)
    ? payload.activeLayerId
    : (meshState.layers.values().next().value?.id || null);
}

function textureToBase64(canvas) {
  if (!canvas) return null;
  const w = canvas.width, h = canvas.height;
  const c = canvas.getContext("2d");
  const img = c.getImageData(0, 0, w, h);
  let s = "";
  const data = img.data;
  // String.fromCharCode in chunks to avoid call-stack limits on big arrays.
  const CHUNK = 0x4000;
  for (let i = 0; i < data.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, data.subarray(i, Math.min(i + CHUNK, data.length)));
  }
  return `${w},${h},${btoa(s)}`;
}

function base64ToTexture(packed) {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (!packed || typeof packed !== "string") {
    ctx.fillStyle = "#9aa0a6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }
  const [wStr, hStr, b64] = packed.split(",");
  const w = Number(wStr) || TEX_SIZE;
  const h = Number(hStr) || TEX_SIZE;
  canvas.width = w;
  canvas.height = h;
  try {
    const bin = atob(b64 || "");
    const data = new Uint8ClampedArray(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    if (data.length === w * h * 4) {
      ctx.putImageData(new ImageData(data, w, h), 0, 0);
      return canvas;
    }
  } catch {
    // Fall through to flat fill below.
  }
  ctx.fillStyle = "#9aa0a6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function saveAutosave() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exportState()));
  } catch {
    // Ignore storage quota errors.
  }
}

function loadAutosave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    importState(JSON.parse(raw));
    return true;
  } catch {
    return false;
  }
}

function exportState() {
  return {
    workflow: state.workflow,
    mode: state.mode,
    activeObjectId: state.activeObjectId,
    objects: Array.from(state.objects.values()),
    stamps: state.stamps,
    stampIndex: state.stampIndex,
    lightEnabled: state.lightEnabled,
    lightDir: state.lightDir,
    ambientStrength: state.ambientStrength,
    hemiStrength: state.hemiStrength,
    shadowStrength: state.shadowStrength,
    reflectionStrength: state.reflectionStrength,
    unifiedClayPreview: state.unifiedClayPreview,
    viewportBackground: state.viewportBackground,
    uiThemeMode: state.uiThemeMode,
    voxels: serializeVoxels(),
    meshes: serializeMeshes(),
    layers: serializeLayers(),
    activeMeshId: meshState.activeMeshId,
    activeLayerId: meshState.activeLayerId
  };
}

function importState(payload) {
  state.workflow = payload.workflow || "mesh";
  state.mode = payload.mode || "modeling";
  state.activeObjectId = payload.activeObjectId || "obj-1";
  state.objects = new Map((payload.objects || []).map((item) => [item.id, item]));
  if (state.objects.size === 0) initializeObjects();
  state.stamps = payload.stamps || [];
  state.stampIndex = Number.isInteger(payload.stampIndex) ? payload.stampIndex : -1;
  state.lightEnabled = payload.lightEnabled ?? true;
  state.lightDir = payload.lightDir ? normalizeVector(payload.lightDir) : state.lightDir;
  state.ambientStrength = payload.ambientStrength ?? state.ambientStrength;
  state.hemiStrength = payload.hemiStrength ?? state.hemiStrength;
  state.shadowStrength = payload.shadowStrength ?? state.shadowStrength;
  state.reflectionStrength = payload.reflectionStrength ?? state.reflectionStrength;
  state.unifiedClayPreview = payload.unifiedClayPreview ?? true;
  state.viewportBackground = payload.viewportBackground || "light";
  state.uiThemeMode = payload.uiThemeMode || "light-cherry";
  lightingToggle.checked = state.lightEnabled;
  lightX.value = String(state.lightDir.x.toFixed(2));
  lightY.value = String(state.lightDir.y.toFixed(2));
  lightZ.value = String(state.lightDir.z.toFixed(2));
  ambientStrengthInput.value = String(state.ambientStrength);
  hemiStrengthInput.value = String(state.hemiStrength);
  shadowStrengthInput.value = String(state.shadowStrength);
  reflectionStrengthInput.value = String(state.reflectionStrength);
  unifiedClayToggle.checked = state.unifiedClayPreview;
  viewportBgMode.value = state.viewportBackground;
  uiThemeToggle.checked = state.uiThemeMode === "dark-lavender";
  syncViewportBackgroundClass();
  applyUiThemeMode();
  state.voxels.clear();
  for (const voxel of payload.voxels || []) {
    setVoxel(voxel.x, voxel.y, voxel.z, voxel.color, voxel.objectId || state.activeObjectId);
  }
  deserializeMeshes(payload);
  rebuildObjectList();
  rebuildStampList();
  rebuildMeshList();
  setMode(state.mode);
}

function createObject() {
  snapshotHistory("Create object");
  const nextId = `obj-${Date.now()}`;
  const name = `Object ${state.objects.size + 1}`;
  state.objects.set(nextId, { id: nextId, name, visible: true });
  state.activeObjectId = nextId;
  rebuildObjectList();
  saveAutosave();
}

function duplicateActiveObject() {
  const source = state.objects.get(state.activeObjectId);
  if (!source) return;
  snapshotHistory("Duplicate object");
  const nextId = `obj-${Date.now()}`;
  state.objects.set(nextId, {
    id: nextId,
    name: `${source.name} Copy`,
    visible: true
  });
  for (const voxel of state.voxels.values()) {
    if (voxel.objectId !== source.id) continue;
    setVoxel(voxel.x + 2, voxel.y, voxel.z + 2, voxel.color, nextId);
  }
  state.activeObjectId = nextId;
  rebuildObjectList();
  saveAutosave();
  render();
}

function duplicateActiveMesh() {
  const sourceId = meshState.activeMeshId;
  if (!sourceId) return;
  snapshotHistory("Duplicate mesh");
  const copy = duplicateMesh(sourceId, { x: 4, y: 0, z: 4 });
  if (copy) {
    meshState.selectedFace = null;
    saveAutosave();
    rebuildMeshList();
    render();
  }
}

function duplicateActiveSelection() {
  if (state.workflow === "mesh") duplicateActiveMesh();
  else duplicateActiveObject();
}

function deleteActiveLayer() {
  if (state.workflow === "mesh") {
    deleteMeshById(meshState.activeMeshId);
  } else {
    deleteObjectById(state.activeObjectId);
  }
}

function deleteMeshById(meshId) {
  if (!meshId) return;
  const mesh = meshState.meshes.get(meshId);
  if (!mesh) return;
  snapshotHistory(`Delete ${mesh.name}`);
  deleteMesh(meshId);
  meshState.selectedFace = null;
  meshState.hoverFace = null;
  rebuildMeshList();
  saveAutosave();
  render();
}

function deleteObjectById(objectId) {
  const target = state.objects.get(objectId);
  if (!target) return;
  if (state.objects.size <= 1) {
    hintText.textContent = "Can't delete the last remaining object. Use Quick Reset to start over.";
    return;
  }
  snapshotHistory(`Delete ${target.name}`);
  for (const [key, voxel] of state.voxels) {
    if (voxel.objectId === target.id) state.voxels.delete(key);
  }
  state.objects.delete(target.id);
  if (state.selectedKeys && state.selectedKeys.size) {
    for (const key of [...state.selectedKeys]) {
      if (!state.voxels.has(key)) state.selectedKeys.delete(key);
    }
  }
  if (state.activeObjectId === target.id) {
    const next = state.objects.values().next().value;
    state.activeObjectId = next ? next.id : null;
  }
  rebuildObjectList();
  saveAutosave();
  render();
}

function rebuildObjectList() {
  objectList.innerHTML = "";
  for (const object of state.objects.values()) {
    const row = document.createElement("div");
    row.className = "object-item";
    if (object.id === state.activeObjectId) row.classList.add("active");

    const name = document.createElement("button");
    name.type = "button";
    name.className = "object-name";
    name.textContent = object.name;
    name.addEventListener("click", () => {
      state.activeObjectId = object.id;
      rebuildObjectList();
    });

    const eye = document.createElement("button");
    eye.type = "button";
    eye.textContent = object.visible ? "Hide" : "Show";
    eye.addEventListener("click", () => {
      object.visible = !object.visible;
      rebuildObjectList();
      saveAutosave();
      render();
    });

    const count = document.createElement("span");
    count.textContent = `${countObjectVoxels(object.id)}`;
    row.append(name, eye, count);
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openLayerContextMenu(e.clientX, e.clientY, object.name, () => deleteObjectById(object.id));
    });
    objectList.append(row);
  }
}

let openContextMenuEl = null;
let contextMenuOutsideListener = null;

function openLayerContextMenu(clientX, clientY, label, onDelete) {
  closeLayerContextMenu();
  const menu = document.createElement("div");
  menu.className = "context-menu";
  const heading = document.createElement("div");
  heading.className = "context-menu-title";
  heading.textContent = label;
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "context-menu-item danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    closeLayerContextMenu();
    onDelete();
  });
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "context-menu-item";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeLayerContextMenu);
  menu.append(heading, deleteBtn, cancelBtn);
  document.body.append(menu);
  // Position the menu inside the viewport.
  const margin = 6;
  const { innerWidth, innerHeight } = window;
  menu.style.left = `${Math.min(clientX, innerWidth - menu.offsetWidth - margin)}px`;
  menu.style.top = `${Math.min(clientY, innerHeight - menu.offsetHeight - margin)}px`;
  openContextMenuEl = menu;
  // Close on any subsequent pointer-down or alternate context menu, escape handled by keydown.
  contextMenuOutsideListener = (e) => {
    if (openContextMenuEl && !openContextMenuEl.contains(e.target)) closeLayerContextMenu();
  };
  setTimeout(() => {
    document.addEventListener("mousedown", contextMenuOutsideListener);
    document.addEventListener("contextmenu", contextMenuOutsideListener);
  }, 0);
}

function closeLayerContextMenu() {
  if (openContextMenuEl) {
    openContextMenuEl.remove();
    openContextMenuEl = null;
  }
  if (contextMenuOutsideListener) {
    document.removeEventListener("mousedown", contextMenuOutsideListener);
    document.removeEventListener("contextmenu", contextMenuOutsideListener);
    contextMenuOutsideListener = null;
  }
}

function countObjectVoxels(objectId) {
  let count = 0;
  for (const voxel of state.voxels.values()) {
    if (voxel.objectId === objectId) count += 1;
  }
  return count;
}

function clearScene() {
  snapshotHistory("Clear");
  if (state.workflow === "mesh") {
    clearMeshes();
    rebuildMeshList();
  } else {
    state.voxels.clear();
    state.selectedKeys.clear();
    rebuildObjectList();
  }
  saveAutosave();
  render();
}

function quickReset() {
  if (state.workflow === "mesh") {
    clearMeshes();
    seedMeshScene();
    rebuildMeshList();
  } else {
    state.voxels.clear();
    state.selectedKeys.clear();
    state.stamps = [];
    state.stampIndex = -1;
    state.objects.clear();
    initializeObjects();
    seedScene();
    rebuildObjectList();
    rebuildStampList();
  }
  snapshotHistory("Quick reset");
  saveAutosave();
  render();
}

function setTool(toolId) {
  const def = toolDefs.find((t) => t.id === toolId);
  if (!def) return;
  if (!toolMatchesContext(def)) return;
  state.tool = toolId;
  meshState.activeDrag = null;
  syncSectionVisibility();
  updateActiveToolUi();
  render();
}

function pickDefaultToolForContext() {
  // Pick a sensible default tool given current workflow + mode.
  const candidates = state.workflow === "mesh" && state.mode === "modeling"
    ? ["hand", "vertex", "faceMove"]
    : state.workflow === "mesh" && state.mode === "painting"
    ? ["meshPen", "hand"]
    : state.workflow === "voxel" && state.mode === "modeling"
    ? ["hand", "shape", "pen"]
    : ["paintPen", "hand"];
  for (const id of candidates) {
    const def = toolDefs.find((t) => t.id === id);
    if (def && toolMatchesContext(def)) return id;
  }
  const first = toolDefs.find(toolMatchesContext);
  return first ? first.id : "hand";
}

function updateActiveToolUi() {
  const def = toolDefs.find((t) => t.id === state.tool);
  const label = def ? def.label : state.tool;
  activeToolText.textContent = `${state.workflow === "mesh" ? "Low-Poly Mesh" : "Voxel"} | ${state.mode === "modeling" ? "Modeling" : "Painting"} | Tool: ${label}`;
  hintText.textContent = getHintForTool(state.tool);

  // Shape Maker subsection visibility is tool-dependent, so it lives here.
  shapeSection.classList.toggle("hidden", !(state.workflow === "voxel" && state.mode === "modeling" && state.tool === "shape"));

  for (const btn of toolButtonsRoot.querySelectorAll("button")) {
    const tool = toolDefs.find((t) => t.id === btn.dataset.toolId);
    const visible = tool && toolMatchesContext(tool);
    btn.classList.toggle("hidden", !visible);
    btn.classList.toggle("active", visible && btn.dataset.toolId === state.tool);
  }
}

function toolMatchesContext(tool) {
  return tool.modes.includes(state.mode) && tool.workflows.includes(state.workflow);
}

function getHintForTool(toolId) {
  const wf = state.workflow;
  const md = state.mode;
  if (toolId === "hand") return "Hand: left-drag orbit, right-drag pan, mouse wheel zoom, Space+drag pan.";
  if (wf === "mesh" && md === "modeling") {
    switch (toolId) {
      case "vertex": return "Vertex Pull: drag a vertex (yellow dots) to reshape geometry.";
      case "faceMove": return "Face Move: click-drag a face to translate just that face's vertices in screen space.";
      case "meshMove": return "Mesh Move: click-drag the mesh to translate. Drag the colored round handles to rotate around X (red), Y (green), or Z (blue).";
      case "extrude": return "Extrude: click a face, drag to extrude it along its normal (creates side faces).";
      case "bevel": return "Bevel: click a face to inset + extrude (creates a beveled border).";
      case "subdivide": return "Subdivide: click a face to split it into 4 smaller faces (more texture detail).";
      case "deleteFace": return "Delete Face: click a face to remove it.";
      case "stamp": return "Stamp: click anywhere to duplicate the active mesh next to it.";
      case "objectSelect": return "Object Select: click to select a mesh. Drag SQUARE handles to stretch, ROUND handles to rotate (X red, Y green, Z blue). Delete removes it.";
      case "meshMove": return "Mesh Move: drag the mesh to translate it. Drag the round colored handles around the box to rotate (X red, Y green, Z blue).";
      default: return "Mesh modeling: pick a tool to edit geometry.";
    }
  }
  if (wf === "mesh" && md === "painting") {
    switch (toolId) {
      case "meshPen": return "Mesh Pen: click a face to paint a single pixel (nearest-neighbor, 16×16 per face).";
      case "meshErase": return "Mesh Erase: click a face to clear a pixel (white).";
      case "meshLine": return "Mesh Line: drag from one texel on a face to another to draw a line.";
      case "meshEyedrop": return "Eyedropper: click a face to sample its texel color into the active color.";
      case "fill": return "Fill: click a face to flood it entirely with the active color.";
      case "stamp": return "Stamp: click to duplicate the active mesh.";
      default: return "Mesh painting: paint per-face pixel textures.";
    }
  }
  if (wf === "voxel" && md === "modeling") {
    switch (toolId) {
      case "shape": return "Shape Maker: click-drag to set size, release to place a primitive.";
      case "pen": return "Pen: click to add gray voxels. Right-click erases.";
      case "erase": return "Erase: click to remove voxels.";
      case "melt": return "Melt: click to soften nearby voxels.";
      case "weld": return "Weld: click to fuse nearby voxels.";
      case "smooth": return "Smooth: click to smooth roughness.";
      case "select": return "Select: drag to select a region of voxels.";
      case "move": return "Move: drag to translate selection. Shift=vertical, Alt=diagonal, arrows nudge.";
      case "stamp": return "Stamp: click to place a saved voxel stamp.";
      case "objectSelect": return "Object Select: click a voxel to select its object. Use the Transform panel to resize. Delete removes it.";
      default: return "Voxel modeling.";
    }
  }
  if (wf === "voxel" && md === "painting") {
    switch (toolId) {
      case "paintPen": return "Paint Pen: click a voxel to color it with the active color. Right-click samples color.";
      case "fill": return "Fill: flood-fills connected matching voxels with the active color.";
      case "gradient": return "Gradient: blends primary and secondary colors over a region.";
      case "paintEyedrop": return "Eyedropper: click a voxel to sample its color into the active color.";
      case "stamp": return "Stamp: click to place saved stamp colors onto existing voxel surfaces.";
      default: return "Voxel painting.";
    }
  }
  return "";
}

function setMode(mode) {
  state.mode = mode;
  modeModelBtn.classList.toggle("active", mode === "modeling");
  modePaintBtn.classList.toggle("active", mode === "painting");
  modeLabel.textContent = mode === "modeling" ? "(Modeling)" : "(Painting)";
  state.tool = pickDefaultToolForContext();
  syncSectionVisibility();
  updateActiveToolUi();
  syncViewportBackgroundClass();
  saveAutosave();
  render();
}

function seedScene() {
  // Place the starter voxel cube so its bottom sits on the grid floor (voxel y = 0).
  const mid = Math.floor(GRID_SIZE / 2);
  const radius = 3;
  for (let x = -radius; x <= radius; x += 1) {
    for (let y = 0; y <= radius * 2; y += 1) {
      for (let z = -radius; z <= radius; z += 1) {
        setVoxel(mid + x, y, mid + z, MODEL_BASE_COLOR, state.activeObjectId);
      }
    }
  }
}

function syncViewportBackgroundClass() {
  canvas.classList.toggle("bg-dark", state.viewportBackground === "dark");
  canvas.classList.toggle("bg-light", state.viewportBackground !== "dark");
}

function applyUiThemeMode() {
  const dark = state.uiThemeMode === "dark-lavender";
  document.body.classList.toggle("theme-dark-lavender", dark);
  if (themeLabel) themeLabel.textContent = dark ? "Dark" : "Light";
}

function serializeVoxels() {
  return Array.from(state.voxels.values()).map((v) => ({
    x: v.x,
    y: v.y,
    z: v.z,
    color: v.color,
    objectId: v.objectId
  }));
}

function downloadJson() {
  const payload = {
    format: "simplepixel-voxel-v1",
    gridSize: GRID_SIZE,
    objects: Array.from(state.objects.values()),
    voxels: serializeVoxels()
  };
  downloadBlob("asset.json", JSON.stringify(payload, null, 2), "application/json");
}

function downloadObj() {
  let obj = "# SimplePixel OBJ export\n";
  let vertexIndex = 1;
  const voxels = serializeVoxels();
  for (const voxel of voxels) {
    const { x, y, z } = voxel;
    obj += `v ${x} ${y} ${z}\n`;
    obj += `v ${x + 1} ${y} ${z}\n`;
    obj += `v ${x + 1} ${y + 1} ${z}\n`;
    obj += `v ${x} ${y + 1} ${z}\n`;
    obj += `v ${x} ${y} ${z + 1}\n`;
    obj += `v ${x + 1} ${y} ${z + 1}\n`;
    obj += `v ${x + 1} ${y + 1} ${z + 1}\n`;
    obj += `v ${x} ${y + 1} ${z + 1}\n`;
    obj += `f ${vertexIndex} ${vertexIndex + 1} ${vertexIndex + 2} ${vertexIndex + 3}\n`;
    obj += `f ${vertexIndex + 4} ${vertexIndex + 5} ${vertexIndex + 6} ${vertexIndex + 7}\n`;
    obj += `f ${vertexIndex} ${vertexIndex + 1} ${vertexIndex + 5} ${vertexIndex + 4}\n`;
    obj += `f ${vertexIndex + 1} ${vertexIndex + 2} ${vertexIndex + 6} ${vertexIndex + 5}\n`;
    obj += `f ${vertexIndex + 2} ${vertexIndex + 3} ${vertexIndex + 7} ${vertexIndex + 6}\n`;
    obj += `f ${vertexIndex + 3} ${vertexIndex} ${vertexIndex + 4} ${vertexIndex + 7}\n`;
    vertexIndex += 8;
  }
  downloadBlob("asset.obj", obj, "text/plain");
}

function downloadBlob(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
