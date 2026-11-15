# Forma

A dependency-free, browser-based concept studio for contemporary homes. Open `forma/` from the portfolio, or serve the repository and visit `http://localhost:8000/forma/`.

## Designing

- Begin with the furnished two-floor Courtyard House concept, or start a blank home through **Project settings → Start a new, blank project**.
- Add 17 types of spaces: bedrooms, bathrooms, kitchens, living and dining rooms, staircases, offices, utility rooms, terraces, hallways, closets, pantries, laundries, garages, entries/foyers, storage rooms, and balconies. Hallways and closets are directly available in the sidebar; **Browse all spaces** or **Add a space** opens the full library.
- Select rooms to edit names, dimensions, positions, and floor finishes. Drag rooms in 2D with half-meter snapping. Overlaps are allowed for exploratory composition.
- Add up to eight floors, switch floors, and remove floors with undo support.
- Explore the active floor in 2D or an axonometric 3D concept view with partial-height walls.
- Pan, zoom, fit the plan, and toggle dimensions, furniture, labels, and the grid.
- Undo and redo up to 60 project edits. Shortcuts are available at the bottom of the workspace.
- Settings include the project name, design language (project metadata), and ceiling height (reflected in the axonometric wall study).

## Sample home designs

Open **Sample designs** in the sidebar (inside the navigation menu on mobile), or **Project settings → Browse sample home designs**. The gallery includes twelve independent, editable concepts:

| Design | Total floor area | Bedrooms | Bathrooms | Floors | Design approach |
| --- | ---: | ---: | ---: | ---: | --- |
| The Pocket Retreat | 80 m² | 1 | 1 | 1 | Compact minimalist home with a garden deck |
| The Garden Bungalow | 150 m² | 2 | 1 | 1 | Single-level plan with a central hall |
| The Courtyard House | 205 m² | 3 | 2 | 2 | Original compact family-home concept |
| The Terrace Townhouse | 252 m² | 3 | 3 | 3 | Narrow-lot home with a balcony and roof terrace |
| The L-Shaped Residence | 248 m² | 3 | 2 | 1 | Separate social/private wings framing a terrace |
| The Family Pavilion | 450 m² | 4 | 4 | 2 | Double garage, guest suite, and stepped upper floor |
| The Urban Duplex | 240 m² | 3 | 3 | 2 | Compact single-family two-storey home with a laundry |
| The Garden Duplex | 364 m² | 4 | 4 | 2 | Guest bedroom, garage, garden terrace, and upper balcony |
| The Palm Maisonette | 176 m² | 2 | 2 | 2 | Private ground-floor entrance, garden deck, and balcony |
| The Terrace Maisonette | 288 m² | 3 | 3 | 2 | Guest bedroom, upper lounge, and L-shaped sky terrace |
| The Horizon Mansion | 720 m² | 5 | 6 | 2 | Triple garage, guest suite, and broad upper balcony |
| The Grand Courtyard Estate | 1,088 m² | 6 | 7 | 3 | U-shaped garden court, cinema, wellness studio, and roof terraces |

Here, **duplex** means a single-family home across two storeys, not two separate dwellings. The maisonettes are self-contained two-level homes with private ground-floor entrances. Mansions offer larger rooms, additional suites, and dedicated leisure spaces.

Areas include terraces, balconies, stairs, and garages; they are not conditioned-area measurements. The gallery computes metrics from the same project data used in the editor.

**Explore design** opens a preview with a whole-house 3D concept, property site plan, and a cutaway of each floor. Viewing or canceling does not change the workspace. **Use this design** opens a fresh copy for editing; it replaces the current local workspace only after that confirmation. Download a backup using **Back up current design** first if needed. Undo restores the previous project until reload.

All rooms, floor finishes, floor levels, and lot settings can be edited, saved locally, exported, and reopened like any other project. Opening the same sample again starts from its original layout rather than previous edits. Existing saved projects and the original startup concept are not automatically changed.

## House, lot, and property

Select **House & property** in the sidebar, or **Property** above the canvas:

- **Site plan** shows the entire rectangular lot, ground-floor spaces, dashed upper-floor footprints, landscaping, driveway, street frontage, and lot dimensions.
- **3D view** assembles every floor at its actual level into one contemporary exterior concept on the lot. Windows, roofs, deck surfaces, trees, and the street are illustrative. Toggle **Show full-height walls & roofs** for an open-top study, or select a floor to edit its interior.
- **Edit property** controls lot width/depth (8–200 m), the house origin, street name, landscaping, and the driveway. These controls are also available through project settings.
- House X/Y offsets locate the common origin of every floor relative to the left/rear boundaries. Room X/Y positions stay relative to the house origin. The street is along the front/bottom boundary.
- The overview reports lot area, building footprint, site coverage, and house height. Footprint is the union of enclosed room projections across all floors, excluding terraces and balconies; overlapping spaces count once for this metric.
- Rooms extending beyond the property boundary remain visible and trigger a warning. This is not a setback, boundary survey, or zoning compliance check.
- Zoom, pan, fit, dimensions, and labels work in property views. SVG exports capture the chosen floor or whole-property view; JSON includes the lot settings.

## Rotating the 3D model

Both floor cutaways and whole-house property views support orbit rotation:

- In **3D view**, use the default select tool (**V**) and drag with a mouse or one finger to rotate horizontally and tilt vertically. The near side of the model follows the pointer: dragging right turns it right, and dragging down tilts it down. Rotation works when starting on the house or the canvas; a drag does not edit rooms or navigate to another floor.
- Use the **Rotate** and **Tilt** sliders for precise angles. Sliders also support keyboard arrow keys. Horizontal rotation wraps through 360 degrees; tilt is limited to 10–80 degrees to keep the model upright.
- A click/tap without dragging still selects a room or opens a floor for editing. Choose **Pan** (**H**) to move the canvas instead of orbiting.
- **Reset** in the 3D orbit panel restores the default 45-degree rotation, 30-degree tilt, zoom, and canvas position. **Fit to canvas** resets only zoom and pan, retaining rotation.
- The north indicator follows the camera. Exterior facades, windows, surface ordering, and the property all rotate with the model.
- The current angle is shared between floor/property views for this page session. Rotation is view state: it does not change the design or create undo entries, and it resets on reload or opening a saved design. An SVG export captures the current angle.

## Saving and export

Changes save to this browser's local storage. **Save project** explicitly retries saving. Save failures are shown in the workspace; download a JSON backup if browser storage is unavailable. **Export** downloads either the current SVG canvas view or a complete editable `.forma.json` project.

### Upload a saved design and continue

1. Select **Open design** in the top bar (the upload icon on smaller screens), or **Project settings → Open project**.
2. Choose a `.forma.json` / `.json` file, or drop one onto the upload area. Files must be at most 1 MB.
3. Review the project name, file name, floor/space counts, floor area, and lot dimensions. The current workspace is unchanged during preview or if validation fails. A backup action lets you download the current design before replacing it.
4. Select **Open & continue**. All floors, rooms, dimensions, materials, and property settings become editable and save locally as you work. The previous workspace can be restored with Undo until reload.

Import validates file size, identifiers, room dimensions, lot settings, and supported settings. Older projects without property settings are upgraded with a default 26 × 32 m lot without changing their floor plans. Images, SVG exports, PDFs, and external CAD files cannot be imported as editable designs.

The Forma logo reloads the locally saved workspace. No accounts or backend are required. Google Fonts provides optional typography; system sans-serif fonts are used if unavailable.

## Scope

This is a conceptual planning tool, **not construction or permit documentation**. Wall thickness, openings, furniture, and site landscaping are illustrative. The app does not check building regulations, structural safety, accessibility, circulation, collisions, or staircase compliance. Floor area is the sum of room rectangles across all floors, including terraces and stairs; overlapping areas count separately. Work with licensed professionals before construction.

## Validation

```sh
node --test forma/model.test.js forma/property-view.test.js forma/camera.test.js forma/samples.test.js
```

The tests cover all space types, totals, room placement, edits, saved-design file validation, legacy import, lot validation, union footprint area, exterior wall detection, orbit projection and angle limits, surface ordering, and both 3D renderers from every viewing quadrant. Sample tests check exact metrics, lot fit, non-overlapping rooms, supported upper-floor rooms, aligned stairs, fresh-copy isolation, project round trips, and preview rendering. UI can be previewed with the repository's **Preview apps portfolio** VS Code task.
