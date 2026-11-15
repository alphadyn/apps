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

## House, lot, and property

Select **House & property** in the sidebar, or **Property** above the canvas:

- **Site plan** shows the entire rectangular lot, ground-floor spaces, dashed upper-floor footprints, landscaping, driveway, street frontage, and lot dimensions.
- **3D view** assembles every floor at its actual level into one contemporary exterior concept on the lot. Windows, roofs, deck surfaces, trees, and the street are illustrative. Toggle **Show full-height walls & roofs** for an open-top study, or select a floor to edit its interior.
- **Edit property** controls lot width/depth (8–200 m), the house origin, street name, landscaping, and the driveway. These controls are also available through project settings.
- House X/Y offsets locate the common origin of every floor relative to the left/rear boundaries. Room X/Y positions stay relative to the house origin. The street is along the front/bottom boundary.
- The overview reports lot area, building footprint, site coverage, and house height. Footprint is the union of enclosed room projections across all floors, excluding terraces and balconies; overlapping spaces count once for this metric.
- Rooms extending beyond the property boundary remain visible and trigger a warning. This is not a setback, boundary survey, or zoning compliance check.
- Zoom, pan, fit, dimensions, and labels work in property views. SVG exports capture the chosen floor or whole-property view; JSON includes the lot settings.

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
node --test forma/model.test.js forma/property-view.test.js
```

The tests cover all space types, totals, room placement, edits, saved-design file validation, legacy import, lot validation, union footprint area, exterior wall detection, and the whole-property renderer. UI can be previewed with the repository's **Preview apps portfolio** VS Code task.
