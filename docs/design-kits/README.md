# Movie Poster Frame Design Kit

These templates are the canonical starting canvases for custom Frame artwork.
They use the same normalized geometry as the presentation renderer.

## Canvases

- Portrait: 1080 × 1920 (9:16)
- Landscape: 1920 × 1080 (16:9)

Each template marks:

- the full asset bleed boundary;
- the maximum glow boundary;
- the required transparent content opening; and
- a conservative text-safe region.

The PNGs are transparent and intended for painting or compositing software.
The SVG sources retain editable guide labels. Remove guide artwork before
exporting a production layer.

## Layer export

Export only the layers used by the Frame:

1. `background`
2. `bezel`
3. `lighting`
4. `foreground`
5. `content_mask`

Use transparent PNG or WebP for layers that reveal live content. Keep portrait
and landscape geometry coordinated, but author each orientation intentionally.
Do not stretch one orientation into the other.

All exported paths must live below `assets/` in a `.movieposter` package. See
`frame-manifest.example.json` for the expected asset map and normalized content
opening.

## Promote an editor-authored presentation

Built-ins are never written directly by Home Assistant. After a design has
been published, visually reviewed, and exported as a `.movieposter` package,
create a source-review bundle from the repository root:

```bash
./scripts/promote_presentation.py reviewed.movieposter reviewed_marquee
```

The resulting `reviewed_marquee.builtin-candidate.zip` contains validated
Frame, Theme, Layout, and Profile snapshots plus the package assets. Locked
custom-image layers named `frame_background`, `frame_bezel`, `frame_lighting`,
`frame_foreground`, or `frame_content_mask` are promoted into the matching
physical Frame slots. All other layers remain Layout components. Review the
candidate and its live screenshots before copying it into the built-in catalog.

This developer step is intentionally outside Home Assistant: the integration
must never rewrite its installed source files or silently replace a built-in.
