const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");

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
const newObjectBtn = document.getElementById("newObjectBtn");
const duplicateObjectBtn = document.getElementById("duplicateObjectBtn");
const uiThemeToggle = document.getElementById("uiThemeToggle");
const themeLabel = document.getElementById("themeLabel");
const downloadFormat = document.getElementById("downloadFormat");
const downloadBtn = document.getElementById("downloadBtn");

const GRID_SIZE = 40;
const VOXEL_SIZE = 14;
const MODEL_BASE_COLOR = "#9ca3af";
const STORAGE_KEY = "simplepixel-autosave-v2";
const MAX_HISTORY = 40;

const camera = {
  yaw: -0.62,
  pitch: 0.72,
  zoom: 1,
  panX: 0,
  panY: 0
};

const state = {
  mode: "modeling",
  tool: "pen",
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
  moveDrag: null,
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
  { id: "pen", label: "Pen", keybind: "Q", modes: ["modeling", "painting"] },
  { id: "erase", label: "Erase", keybind: "W", modes: ["modeling", "painting"] },
  { id: "fill", label: "Fill", modes: ["painting"] },
  { id: "gradient", label: "Gradient", modes: ["painting"] },
  { id: "select", label: "Select", keybind: "E", modes: ["modeling", "painting"] },
  { id: "move", label: "Move", keybind: "T", modes: ["modeling", "painting"] },
  { id: "stamp", label: "Stamp", keybind: "R", modes: ["modeling", "painting"] },
  { id: "melt", label: "Melt", modes: ["modeling"] },
  { id: "weld", label: "Weld", modes: ["modeling"] },
  { id: "smooth", label: "Smooth", modes: ["modeling"] }
];

boot();

function boot() {
  initializeObjects();
  buildToolButtons();
  bindUiEvents();
  if (!loadAutosave()) seedScene();
  snapshotHistory("Initial");
  shapeSegmentsValue.textContent = shapeSegmentsInput.value;
  wallThicknessValue.textContent = wallThicknessInput.value;
  unifiedClayToggle.checked = state.unifiedClayPreview;
  viewportBgMode.value = state.viewportBackground;
  uiThemeToggle.checked = state.uiThemeMode === "dark-lavender";
  syncViewportBackgroundClass();
  applyUiThemeMode();
  setMode("modeling");
  rebuildObjectList();
  rebuildStampList();
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
      hollowToggle.checked,
      Number(wallThicknessInput.value)
    );
    saveAutosave();
    rebuildObjectList();
    render();
  });

  document.getElementById("saveStampBtn").addEventListener("click", saveSelectionAsStamp);
  document.getElementById("clearBtn").addEventListener("click", clearScene);
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  quickResetBtn.addEventListener("click", quickReset);
  newObjectBtn.addEventListener("click", createObject);
  duplicateObjectBtn.addEventListener("click", duplicateActiveObject);
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

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
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
    if (state.tool === "move" && state.selectedKeys.size > 0) {
      const handled = handleMoveNudgeKey(e);
      if (handled) return;
    }
    if (e.key.toLowerCase() === "c") {
      state.unifiedClayPreview = !state.unifiedClayPreview;
      unifiedClayToggle.checked = state.unifiedClayPreview;
      saveAutosave();
      render();
      return;
    }
    if (e.key.toLowerCase() === "q") setTool("pen");
    if (e.key.toLowerCase() === "w") setTool("erase");
    if (e.key.toLowerCase() === "e") setTool("select");
    if (e.key.toLowerCase() === "r") setTool("stamp");
    if (e.key.toLowerCase() === "t") setTool("move");
  });
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
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    state.isOrbiting = true;
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
  const picked = pickVoxelFromPointer(e.offsetX, e.offsetY);
  state.hoverTarget = picked || pickCursorGridPoint(e.offsetX, e.offsetY, Math.floor(GRID_SIZE / 2));
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
  if (state.moveDrag) {
    handleMoveDrag(e);
    return;
  }
  applyToolFromPointerEvent(e, false);
}

function onPointerUp() {
  state.isPointerDown = false;
  state.isOrbiting = false;
  state.selectionAnchor = null;
  state.moveDrag = null;
  saveAutosave();
}

function applyToolFromPointerEvent(e, isNewStroke) {
  const picked = pickVoxelFromPointer(e.offsetX, e.offsetY);
  const freeCursorTarget = pickCursorGridPoint(e.offsetX, e.offsetY, 0);
  const target = picked || freeCursorTarget;
  if (!target) return;
  let changed = false;

  const isRightClick = e.button === 2 || (e.buttons & 2) === 2;
  if (isRightClick && state.tool === "pen") {
    eraseAt(target.x, target.y, target.z, state.brushSize);
    changed = true;
    render();
    return;
  }

  switch (state.tool) {
    case "pen":
      if (state.mode === "modeling") {
        paintAt(target.x, target.y, target.z, MODEL_BASE_COLOR, state.brushSize);
      } else {
        if (!picked) break;
        paintExistingAt(picked.x, picked.y, picked.z, colorPicker.value, state.brushSize);
      }
      changed = true;
      break;
    case "erase":
      eraseAt(target.x, target.y, target.z, state.brushSize);
      changed = true;
      break;
    case "fill":
      if (state.mode === "painting") {
        if (!picked) break;
        floodFill(picked.x, picked.y, picked.z, colorPicker.value);
        changed = true;
      }
      break;
    case "gradient":
      if (state.mode === "painting") {
        if (!picked) break;
        applyGradientAround(picked.x, picked.y, picked.z, state.brushSize + 1);
        changed = true;
      }
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
      if (state.mode === "modeling") {
        meltAround(target.x, target.y, target.z);
        changed = true;
      }
      break;
    case "weld":
      if (state.mode === "modeling") {
        weldAround(target.x, target.y, target.z);
        changed = true;
      }
      break;
    case "smooth":
      if (state.mode === "modeling") {
        smoothAround(target.x, target.y, target.z);
        changed = true;
      }
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
  stampList.innerHTML = "";
  state.stamps.forEach((stamp, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = stamp.name;
    if (state.stampIndex === i) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.stampIndex = i;
      setTool("stamp");
      rebuildStampList();
    });
    stampList.append(btn);
  });
}

function addPrimitive(kind, radius, segments = 24, hollow = false, wallThickness = 2) {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  const cz = Math.floor(GRID_SIZE / 2);
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
    case "cone": {
      const h = clamp((ny + 1) * 0.5, 0, 1);
      const maxR = 1 - h;
      const radial = Math.sqrt(nx * nx + nz * nz) - maxR;
      return Math.max(radial, Math.abs(ny) - 1);
    }
    case "stair": {
      const step = Math.floor(((nx + 1) * 0.5) * 6) / 6;
      return ny - step;
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
    const t = clamp((sx - x + size) / (size * 2), 0, 1);
    state.voxels.get(key).color = mixColor(c1, c2, t);
  });
}

function floodFill(startX, startY, startZ, targetColor) {
  const startKey = keyFor(startX, startY, startZ);
  if (!state.voxels.has(startKey)) return;
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
      voxel.color = color;
    }
  });
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
    x: canvas.width * 0.56 + (r.x * VOXEL_SIZE + camera.panX) * camera.zoom,
    y: canvas.height * 0.63 + ((-r.y * VOXEL_SIZE) + camera.panY) * camera.zoom
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
  const sorted = getSortedVoxelsByDepth();
  for (const voxel of sorted) drawVoxel(voxel);
  drawHoverPreview();
  drawSelectionOutline();
}

function drawGridPlane() {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
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
    const baseColor = state.unifiedClayPreview ? getClayColor(voxel.color) : voxel.color;
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
  if (selected || drawEdge) {
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
  state.history.push(JSON.stringify(exportState()));
  state.redoHistory = [];
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

function undo() {
  if (state.history.length <= 1) return;
  const latest = state.history.pop();
  if (latest) state.redoHistory.push(latest);
  const payload = JSON.parse(state.history[state.history.length - 1]);
  importState(payload);
  saveAutosave();
  render();
}

function redo() {
  if (state.redoHistory.length === 0) return;
  const snapshot = state.redoHistory.pop();
  if (!snapshot) return;
  state.history.push(snapshot);
  importState(JSON.parse(snapshot));
  saveAutosave();
  render();
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
    voxels: serializeVoxels()
  };
}

function importState(payload) {
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
  rebuildObjectList();
  rebuildStampList();
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
    objectList.append(row);
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
  state.voxels.clear();
  state.selectedKeys.clear();
  saveAutosave();
  rebuildObjectList();
  render();
}

function quickReset() {
  state.voxels.clear();
  state.selectedKeys.clear();
  state.stamps = [];
  state.stampIndex = -1;
  state.objects.clear();
  initializeObjects();
  seedScene();
  snapshotHistory("Quick reset");
  rebuildObjectList();
  rebuildStampList();
  saveAutosave();
  render();
}

function setTool(toolId) {
  if (!toolDefs.find((tool) => tool.id === toolId && tool.modes.includes(state.mode))) return;
  state.tool = toolId;
  updateActiveToolUi();
}

function updateActiveToolUi() {
  activeToolText.textContent = `Mode: ${state.mode} | Tool: ${state.tool}`;
  if (state.tool === "move") {
    hintText.textContent = "Move: drag to move, Shift+drag vertical, Alt+drag diagonal, arrows nudge, T for tool.";
  } else {
    hintText.textContent = state.mode === "modeling"
      ? "Modeling: click to add gray voxels, shift+drag to orbit."
      : "Painting: click existing voxels to color them in pixel-art style.";
  }
  for (const btn of toolButtonsRoot.querySelectorAll("button")) {
    const def = toolDefs.find((tool) => tool.id === btn.dataset.toolId);
    const enabled = def && def.modes.includes(state.mode);
    btn.classList.toggle("disabled", !enabled);
    btn.classList.toggle("active", btn.dataset.toolId === state.tool && enabled);
  }
}

function setMode(mode) {
  state.mode = mode;
  const preferredTool = mode === "modeling" ? "pen" : "pen";
  state.tool = preferredTool;
  modeModelBtn.classList.toggle("active", mode === "modeling");
  modePaintBtn.classList.toggle("active", mode === "painting");
  modeLabel.textContent = mode === "modeling" ? "(Modeling)" : "(Painting)";
  hintText.textContent = mode === "modeling"
    ? "Modeling: click to add gray voxels, shift+drag to orbit."
    : "Painting: click existing voxels to color them in pixel-art style.";
  updateActiveToolUi();
  syncViewportBackgroundClass();
  saveAutosave();
  render();
}

function seedScene() {
  const mid = Math.floor(GRID_SIZE / 2);
  const radius = 3;
  for (let x = -radius; x <= radius; x += 1) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let z = -radius; z <= radius; z += 1) {
        setVoxel(mid + x, mid + y, mid + z, MODEL_BASE_COLOR, state.activeObjectId);
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
