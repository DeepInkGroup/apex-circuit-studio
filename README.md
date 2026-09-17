# Apex Circuit Studio

A 3D kart track designer built with Vite and Three.js.

**Live site:** https://deepinkgroup.github.io/apex-circuit-studio/

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Build for production with `npm run build`.

## Design and drive

- Start on an empty 2D canvas. Click to place corners, then click the first point or Close loop to complete the circuit.
- Use Move, Insert, and Delete to reshape the track. Undo and redo also support Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. New circuit clears the canvas and can be undone.
- Scroll to zoom; hold Space and drag to pan. The grid spacing is 5 meters. The dashed boundary shows the buildable area.
- Switch between 2D editor, 3D world, and Circuit only. The latter provides a plain silhouette and SVG export.
- Adjust track width, Corner flow, curb width, runoff width, and the corner join limit. Curbs are clipped against a repaired road footprint, so tight bends do not create spikes through the asphalt.
- Enable **Show geometry guides** to inspect the centerline, left and right offsets, repaired track edge, curb edge, and any offset crossings.
- Choose daylight, parkland or woodland, landscape density, trees, paddock facilities, and barriers. Scenery is placed outside the repaired track and runoff footprint.
- Save circuits in the current browser and load them from My circuits.
- Test drive with WASD or arrow keys. R resets the kart; Escape exits. Touch controls are provided on touch devices.
- Off-track grass slows the kart. Complete a forward circuit for a timed lap.

Driving uses arcade physics. Layouts are freely editable; crossing centerlines are repaired into a shared paved footprint. Saved circuits are local to the browser. Fonts use Google Fonts with local fallbacks.

## Browser check

Run `npm run test:geometry` to check sharp corners, hairpins, close points, S-curves, wide tracks, and closed layouts for invalid triangles, self-intersections, excessive curb width, and asphalt penetration.

With the app running on port 5174, `npm run test:ui` checks blank creation, editing, the three views, SVG export, geometry guides, saved parameters, driving, reset, and mobile sizing using installed Microsoft Edge.
