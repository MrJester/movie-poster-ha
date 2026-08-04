# Presentation System and Visual Editor Plan

Status: Product specification
Implementation status: Layered schema, semantic Theme mappings,
portrait/landscape Frame assets, Presentation Library publication, packaged
assets, and precision editor controls are implemented. As of 0.1.0-beta.55,
the approved beta.45-compatible renderer is the production default while the
declarative renderer is isolated behind an explicit development switch. Frame
conversion now proceeds one preset at a time and requires automated, local,
and deployed Home Assistant visual acceptance before promotion.
Scope: Presentation design only; Plex and playback behavior are explicitly out
of scope.

## 1. Objective

Movie Poster will provide a responsive, composable presentation system in which
users can select built-in designs, customize copies of those designs, create a
presentation from a blank canvas, and export or import complete presentation
packages.

The system must clearly separate five concepts:

1. A **Frame** is the physical enclosure.
2. A **Theme** applies a semantic visual language to that enclosure and its
   content.
3. A **Layout** arranges dynamic content.
4. **Orientation** controls the linked portrait and landscape canvases.
5. A **Profile** packages the complete presentation into one reusable,
   shareable object.

The current model of interdependent CSS classes will be replaced incrementally
with declarative, schema-versioned resources. Arbitrary JavaScript, HTML, and
CSS are not allowed in imported resources.

## 2. Non-goals

- A Profile does not contain a Plex server, library, collection, user, player,
  grace period, rotation interval, or refresh interval.
- Importing a Profile cannot alter playback or source behavior.
- The first editor does not include an animation timeline or arbitrary
  keyframes.
- The first release does not include an online community marketplace.
- Precision canvas authoring is not required on phones.
- Users cannot edit built-in resources in place.

## 3. Product model

### 3.1 Frame

A Frame defines the physical display enclosure and its safe opening. It owns:

- structural geometry;
- bezel, cabinet, trim, ornament, and physical materials;
- portrait and landscape assets;
- background, bezel, lighting, foreground, and mask layers;
- attachment points for lights and decorative effects;
- safe content opening and bleed boundaries;
- structural animation presets, such as marquee bulb chasing;
- semantic mappings that explain how Theme tokens power the Frame.

A Frame does not own content placement, titles, metadata visibility, font
families, or hard-coded theme colors.

Examples include Marquee, Cyber Noir, Comic Hero, Theater Classic, Indie Nature,
Golden Age, and Steampunk.

### 3.2 Theme

A Theme is a universal set of semantic design tokens. Frames interpret those
tokens through their own attachment points. A Theme may define:

- primary and secondary light colors;
- primary and secondary accents;
- heading, body, muted, and inverse text colors;
- surface, elevated surface, backdrop, and border colors;
- heading and body font stacks;
- font weights, tracking, casing, and text effects;
- glow intensity and shadow character;
- animation speed, intensity, direction, delay, and staggering;
- progress-track and progress-fill treatments;
- ambient background treatment.

Theme selection must make a visible, coordinated difference on every compatible
Frame without replacing the Frame or changing its geometry.

Initial built-in themes are Classic, Art Deco, Neon, Minimal, and OLED.

### 3.3 Layout

A Layout is a declarative component tree with normalized geometry and
constraints. It owns:

- component presence and visibility;
- position and stacking order;
- width, height, and aspect behavior;
- alignment and distribution;
- padding, gap, and grouping;
- min/max sizes and responsive constraints;
- orientation-specific overrides;
- overflow and text-fitting policy.

A Layout does not own Frame geometry or physical decoration.

Initial built-in layouts are Cinematic, Poster, and Split.

### 3.4 Orientation

Portrait and Landscape are linked design canvases. A shared component definition
is the default. Any component may be unlocked to receive a separate position,
size, order, or visibility override in one orientation.

Auto chooses the canvas matching the viewport. It does not invent a third
layout, alter a Frame, or silently hide content beyond explicit responsive
rules.

### 3.5 Profile

A Profile is the complete portable presentation package. It contains:

- stable ID, name, description, author, attribution, and timestamps;
- schema version and application compatibility range;
- references to versioned built-in resources;
- embedded snapshots of custom Frames, Themes, and Layouts;
- orientation and viewport-fit policy;
- component tree and custom overrides;
- packaged image and font assets;
- motion and accessibility preferences;
- preview/thumbnail metadata.

Profiles are stored in a local Presentation Library. They may be duplicated,
renamed, exported, imported, assigned to displays, and deleted when not built
in.

Built-in Profiles and resources are immutable. Customizing one creates a
user-owned copy.

## 4. Dynamic component catalog

The initial blank-canvas component palette includes:

- poster;
- backdrop;
- logo;
- mode heading;
- media title;
- subtitle or tagline;
- year;
- content rating;
- runtime;
- summary;
- playback progress;
- active Plex username;
- player name;
- playback state;
- custom static text.

Every component has a stable component ID, accessible name, normalized bounds,
z-index, visibility rules, style-token bindings, and optional
orientation-specific overrides.

## 5. Responsive rendering contract

The renderer uses normalized, resolution-independent geometry. Serialized
coordinates are percentages or normalized units, never device-specific pixels.
The editor may display equivalent pixels for the selected preview device.

The default viewport policy is **maximum-size contain**:

1. Preserve the authored canvas aspect ratio.
2. Scale the complete presentation to the largest size that fits.
3. Never crop the authored presentation.
4. Center the presentation in the available viewport.
5. Minimize unused space.
6. Fill unavoidable surrounding space with the Theme's ambient backdrop.
7. Respect browser and device safe-area insets.

Profiles may eventually opt into a Fill policy, but Fit is the required initial
behavior. The editor displays safe and bleed guides and warns when text or
controls become unreadable at a selected target size.

The test matrix must cover small phones, tablets, common laptops, 1080p and 4K
televisions, portrait signage, ultrawide displays, and rotated 4K displays.

## 6. Frame asset model

Custom Frames use named, optional layers:

1. `background`
2. `bezel`
3. `lighting`
4. `foreground`
5. `content_mask`

Each orientation can provide its own assets and content opening. Raster assets
must retain transparency where required. Asset types, dimensions, decoded
sizes, and package sizes are validated before storage.

Movie Poster will provide downloadable portrait and landscape design kits with:

- transparent PNG templates;
- full canvas and safe opening guides;
- bleed and glow boundaries;
- reference dimensions and aspect ratios;
- an example completed Frame;
- a manifest example;
- export instructions.

## 7. Visual editor

### 7.1 Starting point

Users may:

- start from a built-in Profile or preset;
- duplicate an existing custom Profile;
- start from a completely blank canvas.

### 7.2 Desktop and tablet editor

The precision editor provides:

- drag, resize, rotate where supported, and reorder;
- layer panel and z-index controls;
- multi-select;
- alignment and distribution;
- grid, guides, snapping, safe areas, and rulers;
- numeric property inspector;
- colors, token bindings, typography, shadows, glow, and opacity;
- show/hide and conditional visibility;
- linked orientation controls and per-orientation overrides;
- Fit preview across a selectable device matrix;
- zoom and pan;
- keyboard movement and shortcuts;
- undo and redo;
- reset component, section, or entire Profile;
- asset manager;
- accessibility and overflow warnings.

### 7.3 Phone editor

Phones provide:

- profile selection and assignment;
- responsive preview;
- basic property editing;
- visibility toggles;
- colors, text, and asset replacement.

Precision positioning is reserved for desktop and tablet.

### 7.4 Preview states

The editor can preview:

- Coming Soon;
- Now Playing;
- Paused;
- no artwork;
- long title and summary stress content;
- connection warning.

Preview data is synthetic and never changes live Plex state.

### 7.5 Draft and publish workflow

Edits autosave to a local draft. Draft changes do not affect the active display.
The editor provides undo/redo and an explicit **Publish** action. Publishing
creates a validated immutable revision and notifies displays assigned to that
Profile.

## 8. Safe animation system

Animations are selected from validated presets rather than authored with an
arbitrary timeline. Supported controls may include:

- preset;
- speed;
- intensity;
- delay;
- direction;
- staggering;
- iteration policy.

Every animation has a reduced-motion fallback. Imported packages cannot supply
JavaScript, arbitrary CSS keyframes, shaders, or executable content.

## 9. Presentation Library

The first Presentation Library is local to Home Assistant. It contains:

- built-in Profiles;
- user Profiles;
- drafts;
- published revisions;
- thumbnails and metadata;
- import/export controls.

Community designs may initially enter the built-in catalog through reviewed
pull requests. An online catalog is a future, separate project.

The library should support search, filtering, duplication, rename, attribution,
compatibility status, last modified time, and assignment visibility.

## 10. Package format

Exports use a single `.movieposter` archive. It is a ZIP-compatible container
with a structure similar to:

```text
presentation.movieposter
├── manifest.json
├── profile.json
├── resources/
│   ├── frames/
│   ├── themes/
│   └── layouts/
├── assets/
│   ├── images/
│   └── fonts/
└── previews/
```

The manifest includes schema version, package ID, author and attribution,
compatibility range, asset hashes, file sizes, and resource IDs.

Imports are unpacked into a temporary location, validated completely, scanned
for unsupported entries and traversal attempts, and committed to storage only
after every check passes.

## 11. Versioning and upgrade behavior

- Built-in resources use stable IDs and explicit versions.
- Compatible bug fixes may be adopted automatically.
- A major visual redesign requires an explicit Profile migration or user
  upgrade.
- Custom resources are embedded snapshots and do not change after import.
- Published Profiles are immutable revisions.
- Editing a published Profile creates or updates a draft.
- The previous published revision remains available for rollback.
- Unknown or invalid resources fail closed without breaking other Profiles.

## 12. Storage and API direction

Presentation data should move out of the flat config-entry options structure
into versioned Home Assistant storage. Config-entry options retain playback and
source behavior plus the assigned Profile ID.

The presentation API should expose operations for:

- list/get/create/duplicate/delete Profiles;
- create/update/discard drafts;
- validate and publish revisions;
- assign a Profile to a display;
- import/export packages;
- upload/list/delete assets;
- list built-in resource catalogs;
- render or request thumbnails.

All writes require Home Assistant authentication and server-side schema
validation.

## 13. Accessibility and safety

- All editor controls are keyboard accessible.
- Components retain semantic roles and accessible names.
- Color contrast is measured and warnings are shown.
- Reduced-motion behavior is mandatory.
- Text cannot disappear solely because it exceeds a preset's expected length;
  it must fit, clamp with a warning, or follow an explicit overflow rule.
- Imported fonts and images are validated, size-limited, and served locally.
- Attribution and font-license metadata are retained in exported packages.
- No package may contain executable content or remote scripts.

## 14. Performance requirements

- Published Profile rendering must not depend on the editor runtime.
- The wall display loads only the resolved Profile and referenced assets.
- Profile parsing and validation occur before display publication.
- Large images are normalized and derivative sizes may be generated.
- Animation properties should favor compositor-safe opacity and transform
  changes.
- The display must remain functional if optional custom assets fail.
- Revisions and assets use cache-safe content hashes.

## 15. Migration from the current implementation

The migration must be incremental:

1. Freeze the current presets as compatibility resources.
2. Define schemas and semantic token names independently of the renderer.
3. Build a new renderer behind a feature flag.
4. Convert Marquee + Classic + Cinematic first as the reference implementation.
5. Validate the reference across the complete device matrix.
6. Convert remaining Themes against Marquee.
7. Convert remaining Layouts.
8. Convert each Frame individually, including portrait/landscape assets and
   Theme attachment mappings.
9. Translate existing saved Profiles into schema-versioned compatibility
   Profiles.
10. Add the library, package import/export, and editor only after the renderer
    contract is stable.
11. Retire the legacy CSS path after visual parity and migration tests pass.

Existing users must keep a functional presentation throughout migration. No
release should simultaneously redesign all presets and replace the rendering
engine.

### 15.1 Renderer recovery boundary

The production display and Display Studio preview use the compatibility
renderer unless a developer explicitly adds `renderer=declarative` to the page
query. A saved Profile, schema version, Frame selection, or editor state must
never activate the development renderer implicitly.

Only one visual path may be active at a time:

- compatibility mode owns the legacy Frame, content, and practical-light DOM;
- declarative mode owns structural Frame layers, authored components, and
  Frame-native motion;
- neither mode may display the other mode's physical artwork, pseudo-elements,
  content stage, glow layers, or motion scene underneath its own output.

Presentation Library documents and custom assets remain stored while this
boundary is in place. Published schema-two geometry is previewed through the
development renderer until that renderer passes the promotion gates below.

A Frame may move from compatibility to production declarative rendering only
after all of the following pass:

1. structural tests prove there is exactly one active renderer;
2. portrait and landscape screenshots pass the approved visual baseline;
3. long-title, missing-artwork, metadata, summary, progress, and motion states
   remain inside the Frame's safe opening;
4. Chromium and WebKit acceptance suites pass without resource failures;
5. the deployed Home Assistant build is reviewed at representative desktop,
   tablet, and wall-display sizes.

## 16. Delivery phases

### Phase 0: Stabilize

- Stop visual expansion of the legacy renderer.
- Document known regressions and select a stable compatibility baseline.
- Add screenshot fixtures for existing built-in combinations.

### Phase 1: Schemas and tokens

- Define Profile, Frame, Theme, Layout, component, asset, and animation schemas.
- Define semantic Theme tokens and validation.
- Define normalized geometry and responsive constraints.
- Add schema migration and package security tests.

### Phase 2: Reference renderer

- Implement maximum-size contain and ambient viewport fill.
- Implement Marquee + Classic + Cinematic in both orientations.
- Implement the dynamic component catalog.
- Pass the complete device and content-stress matrices.

### Phase 3: Built-in resource conversion

- Convert all Themes using universal tokens.
- Convert Poster and Split Layouts.
- Convert each remaining Frame with explicit Theme mappings.
- Establish visual acceptance snapshots for every supported combination.

### Phase 3A: Hyper-realistic visual production

- Rebuild every built-in Frame to the Marquee/Cyber Noir realism standard,
  using high-resolution layered artwork instead of flat decorative CSS where
  physical materials, depth, reflections, wear, lighting, or texture matter.
- Produce coordinated portrait and landscape assets with intentional content
  masks, safe zones, bezel depth, foreground occlusion, and ambient spill.
- Give every Theme a complete art direction covering typography, semantic
  colors, illuminated materials, practical light colors, glow behavior,
  animation character, shadows, reflections, and readable information states.
- Define Frame-specific Theme mappings so a Theme changes the complete visual
  treatment without changing the Frame's physical geometry or identity.
- Upgrade Layouts and component styles to feel deliberately composed inside
  each realistic enclosure rather than placed on top of it.
- Create high-resolution reference mockups and reviewed live-HA screenshots for
  every Frame, Theme, Layout, and Orientation combination.
- Treat Marquee as the minimum realism and finish benchmark; built-ins that do
  not meet that bar remain in development rather than shipping as complete.

### Phase 4: Local Presentation Library

- Move presentation storage to versioned Home Assistant storage.
- Add drafts, published revisions, assignment, duplication, and rollback.
- Migrate current flat Profiles.

### Phase 5: Package and asset system

- Add `.movieposter` import/export.
- Add image/font upload and validation.
- Publish blank Frame design kits.
- Add previews, attribution, and compatibility reporting.

### Phase 6: Visual editor

- Add blank and preset starting points.
- Add canvas, layer panel, property inspector, snapping, and linked
  orientations.
- Add state and device previews.
- Add autosaved drafts, undo/redo, validation, and Publish.

### Phase 7: Hardening

- Accessibility audit.
- Performance and memory testing on wall-display hardware.
- Failure and rollback testing.
- Documentation and contributor guide for new built-in presentations.

## 17. Acceptance criteria

The project is successful when:

- Frame, Theme, Layout, and Orientation can be changed independently.
- Every built-in Theme produces a coordinated visible result on every Frame.
- Changing a Theme never changes Frame geometry.
- Changing a Layout never changes Frame assets or Theme tokens.
- The complete design remains visible on every supported viewport.
- Portrait and Landscape share defaults and support explicit overrides.
- A blank Profile can be authored without code.
- Built-ins cannot be modified; Customize creates a user copy.
- Draft editing never changes a live display before Publish.
- Export followed by import reproduces the same published design and assets.
- Importing a presentation cannot modify Plex or playback settings.
- Invalid or malicious packages are rejected without damaging stored Profiles.
- Reduced motion, keyboard editing, contrast warnings, and overflow warnings are
  supported.
- Existing installations migrate without losing their active presentation.

## 18. Testing strategy

Required automated coverage includes:

- schema validation and migration unit tests;
- malicious archive and asset-limit tests;
- semantic-token contract tests;
- component-tree and constraint-layout tests;
- cross-product Frame/Theme/Layout tests;
- portrait, landscape, and Auto behavior;
- device matrix containment tests;
- long-content and missing-content tests;
- reduced-motion and accessibility checks;
- visual regression screenshots for published built-ins;
- draft/publish/rollback integration tests;
- package round-trip tests;
- legacy Profile migration tests.

Visual changes to built-in resources require reviewed before/after snapshots and
must not be accepted solely because containment tests pass.

### Live Home Assistant visual acceptance gate

Automated unit, schema, package, and local browser tests are necessary but are
not sufficient for release. Every presentation-system change must also be
validated in an authenticated, running Home Assistant installation after the
candidate build is installed.

The live acceptance pass must:

- open both the display and Display Studio through Home Assistant's actual
  panel routing and WebSocket connection;
- verify the installed frontend version matches the candidate commit before
  judging the result;
- capture and review screenshots at representative phone, tablet, desktop,
  portrait-signage, landscape-signage, 1080p, and 4K viewports;
- exercise real editor interactions, including preset and blank creation,
  selection, drag, resize, exact geometry, orientation overrides, autosave,
  publish, reopen, rollback, import, and export;
- verify Frames, Themes, Layouts, preview states, long text, missing artwork,
  reduced motion, and both orientations visually rather than only checking
  element bounds;
- confirm that the complete design remains visible, controls do not overlap the
  preview, text remains readable, artwork is not unintentionally cropped, and
  animation effects do not bleed outside their intended frame;
- inspect Home Assistant browser logs and integration logs for new warnings or
  errors; and
- retain reviewed screenshots or a concise visual QA report with the release
  evidence.

If the live installation is still serving an earlier build, the result is
recorded as "not yet testable" rather than treated as a pass.
