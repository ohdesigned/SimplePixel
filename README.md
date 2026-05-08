# SimplePixel

`SimplePixel` is a browser-based editor for stylized 3D pixel-art game assets. It supports two parallel workflows that you can toggle from the top bar:

- **Low-Poly Mesh** (default) — PS1/N64-style triangle meshes with per-face pixel textures, nearest-neighbor rendering, and affine texture mapping. Build silhouettes from primitives, then paint pixel detail directly onto each face.
- **Voxel** — the original voxel-style sculpt + paint workflow with melt/weld/smooth, stamps, transforms, and per-voxel painting.

## Low-Poly Mesh workflow

- Add primitives: **cube, sphere, cylinder, triangular prism, pyramid**.
- Each face owns its own 16×16 pixel texture; click a face in **Painting** mode to paint individual pixels (nearest-neighbor, no blur).
- Affine textured rendering — visually authentic to PS1-era games.
- Soft baked face shading (no fake reflections), with a unified scene outline for readable silhouettes.
- Lighting direction still drives subtle shading; reflections are intentionally absent for the retro look.
- Files are kept low-poly; visual detail comes from textures rather than mesh density.

### Mesh controls

- **Hand**: orbit (drag), pan (Space + drag), zoom (mouse wheel).
- **Pen**: paint a single texel on the clicked face. Right-click erases (white).
- **Fill**: floods the entire face with the active color.
- **Erase**: paints white onto a texel.
- **Select**: click to select a face / set the active mesh.

## Voxel workflow (legacy/alt)

- Primitive creation: cube, sphere, cylinder, triangular prism, pyramid (voxelized).
- Tools: pen, erase, fill, gradient, select, move, stamp, melt, weld, smooth.
- Stamp library, undo/redo, autosave.
- Transform panel (scale & slant) for selections or active object.

## Run locally

ES modules require a local HTTP server (you cannot just open `index.html` from the file system).

```bash
# Any of these will work:
npx serve .
python -m http.server 8000
node --experimental-fetch -e "require('http').createServer((r,s)=>require('fs').createReadStream(decodeURI('.'+r.url.replace(/\?.*/,''))).pipe(s)).listen(8000)"
```

Then open `http://localhost:8000`.

## Files

- `index.html` — layout & controls.
- `app.js` — voxel system, UI, camera, autosave, history, tools.
- `mesh-workflow.js` — low-poly mesh primitives, affine textured rendering, face picking, per-face pixel painting.
- `style.css` — theming and layout.

## Hotkeys

- `H` Hand, `V` Pen, `E` Erase, `S` Select, `T` Move, `R` Stamp.
- `M` Melt, `W` Weld (voxel only).
- `G` Shape Maker (voxel only).
- `C` Toggle Unified Clay Preview (voxel only).
- `Ctrl+Z` undo, `Ctrl+Y` redo, `Ctrl+C` copy selection, `Ctrl+P` save selection as stamp.
- Mouse wheel zoom; Space + drag pan from any tool.
