const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatRuntime = (milliseconds) => {
  if (!milliseconds) return "";
  const minutes = Math.round(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${minutes}m`;
};

const THEMES = new Set(["classic", "art_deco", "neon", "minimal", "oled"]);
const THEME_LABELS = {
  classic: "Classic",
  art_deco: "Art Deco",
  neon: "Neon",
  minimal: "Minimal",
  oled: "OLED",
};
const SEMANTIC_COLOR_PROPERTIES = {
  light_primary: "--mp-light-primary",
  light_secondary: "--mp-light-secondary",
  accent_primary: "--mp-accent-primary",
  accent_secondary: "--mp-accent-secondary",
  text_heading: "--mp-text-heading",
  text_body: "--mp-text-body",
  text_muted: "--mp-text-muted",
  text_inverse: "--mp-text-inverse",
  surface: "--mp-surface",
  surface_elevated: "--mp-surface-elevated",
  backdrop: "--mp-backdrop",
  border: "--mp-border",
  progress_track: "--mp-progress-track",
  progress_fill: "--mp-progress-fill",
};

const normalizeTheme = (value) => THEMES.has(value) ? value : "classic";
const ORIENTATIONS = new Set(["auto", "landscape", "portrait"]);
const normalizeOrientation = (value) => ORIENTATIONS.has(value) ? value : "auto";
const LAYOUTS = new Set(["cinematic", "poster", "split"]);
const normalizeLayout = (value) => LAYOUTS.has(value) ? value : "cinematic";
const FRAMES = new Set([
  "marquee", "cyber_noir", "comic_hero", "theater_classic",
  "indie_nature", "golden_age", "steampunk",
]);
const FRAME_LABELS = {
  marquee: "Marquee",
  cyber_noir: "Cyber Noir",
  comic_hero: "Comic Hero",
  theater_classic: "Theater Classic",
  indie_nature: "Indie Nature",
  golden_age: "Golden Age",
  steampunk: "Steampunk",
};
const normalizeFrame = (value) => FRAMES.has(value) ? value : "marquee";
const FONTS = new Set(["system", "cinematic", "serif", "modern", "condensed"]);
const normalizeFont = (value) => FONTS.has(value) ? value : "system";
const COMPONENT_FONTS = new Set([
  "theme_heading", "theme_body", "system", "cinematic", "serif", "modern",
  "condensed",
]);
const componentFontFamily = (value) => ({
  theme_heading: "var(--heading-font, Impact, sans-serif)",
  theme_body: "var(--body-font, 'Trebuchet MS', Arial, sans-serif)",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  cinematic: "Impact, 'Arial Narrow', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  modern: 'Avenir, Montserrat, Arial, sans-serif',
  condensed: "'Arial Narrow', Impact, sans-serif",
})[COMPONENT_FONTS.has(value) ? value : "theme_body"];
const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value ?? "")
  ? value : fallback;
const FRAME_MOTION_PRESETS = new Set([
  "none", "marquee_chase", "cyber_scan", "comic_energy",
  "theater_sconce", "nature_dapple", "golden_footlights",
  "steampunk_mechanical",
]);
const colorContrastRatio = (foreground, background) => {
  const luminance = (color) => {
    const channels = color.slice(1).match(/.{2}/g).map(
      (channel) => parseInt(channel, 16) / 255,
    ).map((channel) => channel <= 0.04045
      ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152
      + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};
const semanticColorStyle = (colors) => Object.entries(SEMANTIC_COLOR_PROPERTIES)
  .flatMap(([key, property]) => /^#[0-9a-f]{6}$/i.test(colors?.[key] || "")
    ? [`${property}:${colors[key]}`] : [])
  .join(";");
const normalizeFontFamily = (value) => {
  const family = String(value ?? "").trim();
  return family && /^[A-Za-z0-9 "'.,-]+$/.test(family) ? family : "";
};
const semanticTypographyStyle = (typography) => {
  const heading = normalizeFontFamily(typography?.heading);
  const body = normalizeFontFamily(typography?.body);
  const tracking = Number(typography?.heading_tracking);
  return [
    heading ? `--heading-font:${heading}` : "",
    body ? `--body-font:${body}` : "",
    Number.isFinite(tracking) && tracking >= -.1 && tracking <= 1
      ? `--mp-heading-tracking:${tracking}em` : "",
  ].filter(Boolean).join(";");
};
const semanticEffectsStyle = (effects) => {
  const glow = Number(effects?.glow);
  return Number.isFinite(glow) && glow >= 0 && glow <= 1
    ? `--mp-glow-strength:${glow};--mp-glow-radius:${2 + glow * 12}px` : "";
};
const safeOpeningStyle = (safeOpening) => {
  const declarations = [];
  for (const orientation of ["portrait", "landscape"]) {
    const bounds = safeOpening?.[orientation];
    const x = Number(bounds?.x);
    const y = Number(bounds?.y);
    const width = Number(bounds?.width);
    const height = Number(bounds?.height);
    if (![x, y, width, height].every(Number.isFinite)
      || x < 0 || y < 0 || width <= 0 || height <= 0
      || x + width > 100 || y + height > 100) continue;
    declarations.push(
      `--mp-safe-${orientation}-top:${y}%`,
      `--mp-safe-${orientation}-right:${100 - x - width}%`,
      `--mp-safe-${orientation}-bottom:${100 - y - height}%`,
      `--mp-safe-${orientation}-left:${x}%`,
    );
  }
  return declarations.join(";");
};
const frameLayoutStyle = (tuning) => {
  const posterShare = Number(tuning?.poster_share);
  const gap = Number(tuning?.gap);
  const detailsPadding = Number(tuning?.details_padding);
  return [
    Number.isFinite(posterShare) && posterShare >= 25 && posterShare <= 70
      ? `--layout-poster-share:${posterShare}%` : "",
    Number.isFinite(gap) && gap >= 0 && gap <= 5
      ? `--layout-gap:clamp(8px,${gap}cqw,24px)` : "",
    Number.isFinite(detailsPadding)
      && detailsPadding >= 0 && detailsPadding <= 5
      ? `--layout-details-pad:clamp(4px,${detailsPadding}cqw,16px)` : "",
  ].filter(Boolean).join(";");
};
const normalizeText = (value, fallback) => String(value ?? "").trim() || fallback;
const LOGO_POSITIONS = new Set(["left", "center", "right"]);
const normalizeLogoPosition = (value) => LOGO_POSITIONS.has(value) ? value : "right";
const previewPoster = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
    <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#48110d"/>
    <stop offset=".55" stop-color="#120807"/><stop offset="1" stop-color="#b77a24"/></linearGradient></defs>
    <rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="295" r="170"
    fill="none" stroke="#f6cf70" stroke-width="7" opacity=".7"/>
    <path d="M0 690L210 430l100 135 85-105 205 230v210H0z" fill="#090706" opacity=".86"/>
    <text x="300" y="155" fill="#f6cf70" font-family="sans-serif" font-size="25"
    text-anchor="middle" letter-spacing="9">MOVIE POSTER</text>
    <text x="300" y="730" fill="#fff7df" font-family="serif" font-size="66"
    font-weight="bold" text-anchor="middle">THE GRAND</text>
    <text x="300" y="795" fill="#fff7df" font-family="serif" font-size="66"
    font-weight="bold" text-anchor="middle">PREMIERE</text>
    <text x="300" y="845" fill="#f6cf70" font-family="sans-serif" font-size="18"
    text-anchor="middle" letter-spacing="7">COMING SOON</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const studioState = () => ({
  schema_version: 1,
  health: { connected: true, message: null },
  presentation: {
    theme: "classic", orientation: "auto",
    show_title: true, show_subtitle: true, show_year: true,
    show_rating: true, show_runtime: true, show_summary: true,
    show_progress: true, show_session: true, enable_motion: true,
    kiosk_mode: false, layout: "cinematic", frame_theme: "marquee",
    accent_color: "#f6cf70", background_color: "#090706",
    heading_font: "cinematic", body_font: "system",
    now_playing_text: "Now Playing", coming_soon_text: "Coming Soon",
    eyebrow_text: "Theater Presentation",
    logo_url: "", logo_position: "right",
  },
  mode: "coming_soon",
  heading: "Coming Soon",
  media: {
    key: "studio-preview", type: "movie", title: "The Grand Premiere",
    subtitle: "Every night deserves a little magic", year: 2026,
    content_rating: "PG-13",
    duration_ms: 7380000, position_ms: 2570000, poster_url: previewPoster(),
    backdrop_url: null,
    summary: "A cinematic preview showing how Movie Poster will look on your Home Assistant display.",
  },
  session: { player: "Home Theater", user: "Movie Fan", state: "playing" },
});

class MoviePosterPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = null;
    this._unsubscribePromise = null;
    this._retryTimer = null;
    this._reloadTimer = null;
    this._controlsTimer = null;
    this._renderIdentity = null;
    this._transitionRevision = 0;
    this._kioskEnabled = false;
    this._kioskElements = new Map();
    this._kioskProperties = new Map();
    this._kioskObserver = null;
    this._nativeKioskPrevious = null;
    this._kioskSuppressed = false;
    this._resumeHandler = () => {
      if (document.visibilityState === "visible") this._scheduleReconnect();
    };
    this._bulbObserver = null;
    this._externalBusId = Date.now();
    const searchParams = new URLSearchParams(window.location.search);
    this._studio = searchParams.get("studio") === "1";
    this._requestedEntryId = searchParams.get("entry_id");
    this._requestedProfileId = searchParams.get("profile") || "default";
    // The approved display remains the production renderer while the
    // declarative canvas is rebuilt behind an explicit development switch.
    // Never infer this mode from a profile: doing so previously allowed the
    // legacy and declarative renderers to overlap on live installations.
    this._rendererMode = searchParams.get("renderer") === "declarative"
      ? "declarative" : "compatibility";
    this._studioLoaded = false;
    this._settings = null;
    this._choices = {
      sources: [], players: [], users: [], profiles: [],
      owner_user_id: "", player_ids_by_user: {},
    };
    this._profiles = {};
    this._presentationLibrary = null;
    this._presentationCatalog = null;
    this._editorProfileId = null;
    this._editorDocument = null;
    this._editorSelectedId = null;
    this._editorSelectedIds = [];
    this._editorSettingsOpenId = null;
    this._editorPreviewState = "coming_soon";
    this._editorSaveTimer = null;
    this._editorUndoStack = [];
    this._editorRedoStack = [];
    this._editorSnapEnabled = true;
    this._editorGridSize = 1;
    this._editorDevicePreset = "responsive";
    this._editorGuidesEnabled = true;
    this._editorZoom = 1;
    this._editorPanX = 0;
    this._editorPanY = 0;
    this._editorKeyHandler = (event) => this._handleEditorKeydown(event);
    if (this._studio) this._state = studioState();
  }

  set hass(value) {
    this._hass = value;
    this._subscribe();
  }

  set panel(value) {
    this._panel = value;
  }

  connectedCallback() {
    this._render();
    this._subscribe();
    document.addEventListener("visibilitychange", this._resumeHandler);
    window.addEventListener("online", this._resumeHandler);
    window.addEventListener("keydown", this._editorKeyHandler);
  }

  disconnectedCallback() {
    this._setKiosk(false);
    clearTimeout(this._retryTimer);
    clearTimeout(this._reloadTimer);
    clearTimeout(this._controlsTimer);
    clearTimeout(this._editorSaveTimer);
    this._bulbObserver?.disconnect();
    this._bulbObserver = null;
    document.removeEventListener("visibilitychange", this._resumeHandler);
    window.removeEventListener("keydown", this._editorKeyHandler);
    window.removeEventListener("online", this._resumeHandler);
    this._retryTimer = null;
    if (this._unsubscribePromise) {
      this._unsubscribePromise.then((unsubscribe) => unsubscribe());
      this._unsubscribePromise = null;
    }
  }

  _subscribe() {
    if (!this.isConnected || !this._hass || this._unsubscribePromise) return;
    this._unsubscribePromise = this._hass.connection.subscribeMessage(
      (state) => {
        if (this._studio) {
          if (this._studioLoaded) return;
          const sample = studioState();
          const presentation = { ...sample.presentation, ...state.presentation };
          this._state = {
            ...sample,
            ...state,
            entry_id: state.entry_id,
            health: state.health || sample.health,
            mode: sample.mode,
            heading: presentation.coming_soon_text,
            presentation,
            media: sample.media,
            session: sample.session,
          };
          this._studioLoaded = true;
          this._render();
          this._loadStudioSettings();
          return;
        }
        const previous = this._state?.media;
        if (previous && state.media && previous.key === state.media.key) {
          state.media.poster_url = previous.poster_url;
          state.media.backdrop_url = previous.backdrop_url;
        }
        this._applyState(state);
      },
      {
        type: "movie_poster/subscribe",
        ...(this._requestedEntryId ? { entry_id: this._requestedEntryId } : {}),
        profile_id: this._requestedProfileId,
      },
    ).catch((error) => {
      this._unsubscribePromise = null;
      this._renderError(error?.message || "Unable to connect to Movie Poster");
      clearTimeout(this._retryTimer);
      this._retryTimer = setTimeout(() => {
        this._retryTimer = null;
        this._subscribe();
      }, 5000);
    });
  }

  async _applyState(state) {
    const previousState = this._state;
    const previousRevision = previousState?.presentation_revision;
    const presentationIdentity = (value) => [
      value?.theme, value?.orientation, value?.layout, value?.frame_theme,
      value?.logo_url, value?.logo_position,
    ].join("|");
    const softMediaChange = Boolean(
      previousState?.media && state.media
      && previousState.media.key !== state.media.key
      && previousState.mode === state.mode
      && presentationIdentity(previousState.presentation)
        === presentationIdentity(state.presentation)
      && state.presentation?.enable_motion !== false
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    this._state = state;
    if (!this._studio) {
      this._setKiosk(state.presentation?.kiosk_mode !== false && !this._kioskSuppressed);
    }
    const identity = [
      state.mode,
      state.media?.key,
      state.presentation?.theme,
      state.presentation?.orientation,
      state.presentation?.layout,
      state.presentation?.frame_theme,
      state.presentation?.logo_url,
      state.presentation?.logo_position,
      state.presentation_revision,
      state.session?.player,
      state.session?.user,
    ].join("|");
    if (identity === this._renderIdentity) {
      this._updateLiveState();
      return;
    }

    const revision = ++this._transitionRevision;
    const urls = [state.media?.poster_url, state.media?.backdrop_url].filter(Boolean);
    await Promise.allSettled(urls.map((url) => this._preload(url)));
    if (revision !== this._transitionRevision || !this.isConnected) return;
    if (softMediaChange) {
      this.shadowRoot.querySelector(".theater")?.classList.add("media-leaving");
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      if (revision !== this._transitionRevision || !this.isConnected) return;
    }
    this._renderIdentity = identity;
    this._softMediaTransition = softMediaChange;
    this._render();
    if (previousRevision !== undefined && state.presentation_revision !== previousRevision) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this._reloadTimer);
    this._reloadTimer = setTimeout(async () => {
      this._reloadTimer = null;
      if (this._unsubscribePromise) {
        try {
          (await this._unsubscribePromise)();
        } catch (_error) {
          // The server may already have removed the retired subscription.
        }
        this._unsubscribePromise = null;
      }
      this._subscribe();
    }, 2500);
  }

  _setKiosk(enable) {
    if (enable === this._kioskEnabled) return;
    this._setNativeKiosk(enable);
    if (typeof window.externalBus === "function") {
      try {
        window.externalBus(JSON.stringify({
          id: ++this._externalBusId,
          type: "kiosk_mode/set",
          payload: { enable },
        }));
      } catch (_error) {
        // Fall through to the browser shell handling below.
      }
    }
    this._setBrowserKiosk(enable);
    this._kioskEnabled = enable;
  }

  _setNativeKiosk(enable) {
    const homeAssistant = document.querySelector("home-assistant");
    const main = homeAssistant?.shadowRoot?.querySelector("home-assistant-main");
    const hass = this._hass || main?.hass || homeAssistant?.hass;
    if (!hass) return;
    if (enable && this._nativeKioskPrevious === null) {
      this._nativeKioskPrevious = Boolean(hass.kioskMode);
    }
    hass.kioskMode = enable ? true : (this._nativeKioskPrevious ?? false);
    if (!enable) this._nativeKioskPrevious = null;
    if (main) {
      main.hass = hass;
      main.requestUpdate();
    }
  }

  _setBrowserKiosk(enable) {
    if (!enable) {
      this._kioskObserver?.disconnect();
      this._kioskObserver = null;
      for (const [element, display] of this._kioskElements) {
        element.style.display = display;
      }
      this._kioskElements.clear();
      for (const [element, properties] of this._kioskProperties) {
        for (const [property, previous] of properties) {
          if (previous.value) {
            element.style.setProperty(property, previous.value, previous.priority);
          } else {
            element.style.removeProperty(property);
          }
        }
      }
      this._kioskProperties.clear();
      window.dispatchEvent(new Event("resize"));
      return;
    }
    this._hideHomeAssistantChrome();
    this._kioskObserver = new MutationObserver(() => this._hideHomeAssistantChrome());
    this._kioskObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  _hideHomeAssistantChrome() {
    const selectors = [
      "#drawer", "ha-sidebar", "app-header", "app-toolbar",
      "ha-top-app-bar-fixed", "ha-menu-button",
    ];
    const roots = [document];
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot) roots.push(element.shadowRoot);
      }
      for (const selector of selectors) {
        for (const element of root.querySelectorAll(selector)) {
          if (!this._kioskElements.has(element)) {
            this._kioskElements.set(element, element.style.display);
          }
          element.style.setProperty("display", "none", "important");
        }
      }
    }
    for (const root of roots) {
      const host = root.host;
      if (host?.matches?.("home-assistant-main, app-drawer-layout")) {
        this._setKioskProperty(host, "--app-drawer-width", "0px");
      }
      for (const layout of root.querySelectorAll("home-assistant-main, app-drawer-layout")) {
        this._setKioskProperty(layout, "--app-drawer-width", "0px");
      }
    }
    window.dispatchEvent(new Event("resize"));
  }

  _setKioskProperty(element, property, value) {
    if (!this._kioskProperties.has(element)) this._kioskProperties.set(element, new Map());
    const properties = this._kioskProperties.get(element);
    if (!properties.has(property)) {
      properties.set(property, {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      });
    }
    element.style.setProperty(property, value, "important");
  }

  _preload(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
  }

  _updateLiveState() {
    this._updateHealth();
    const media = this._state?.media;
    const progress = this.shadowRoot.querySelector(".progress");
    if (!media || !progress || !media.duration_ms) return;
    const percentage = Math.min(
      100,
      Math.max(0, ((media.position_ms ?? 0) / media.duration_ms) * 100),
    );
    progress.querySelector("i").style.width = `${percentage}%`;
    progress.setAttribute("aria-valuenow", String(Math.round(percentage)));
  }

  _updateHealth() {
    const warning = this.shadowRoot.querySelector(".connection-warning");
    if (!warning) return;
    const connected = this._state?.health?.connected !== false;
    warning.hidden = connected;
    warning.textContent = connected ? "" : this._state.health.message;
  }

  _render() {
    const state = this._state;
    if (!state) {
      this.shadowRoot.innerHTML = `${this._styles()}
        <main class="empty"><div><h1>Movie Poster</h1>
        <p>Waiting for Home Assistant display state…</p></div></main>`;
      return;
    }

    const media = state.media;
    if (!media) {
      this.shadowRoot.innerHTML = `${this._styles()}
        <main class="empty"><div><h1>${escapeHtml(state.heading)}</h1>
        <p>Loading movies from Plex… If this persists, check the integration options
        and Home Assistant logs.</p>
        <p class="connection-warning" role="status"
          ${state.health?.connected === false ? "" : "hidden"}>
          ${escapeHtml(state.health?.message)}</p></div></main>`;
      return;
    }

    const hasProgress = media.duration_ms && media.position_ms !== null;
    const progress = hasProgress
      ? Math.min(100, Math.max(0, (media.position_ms / media.duration_ms) * 100))
      : 0;
    const theme = normalizeTheme(state.presentation?.theme);
    const presentation = state.presentation ?? {};
    const meta = [
      presentation.show_year !== false && media.year
        ? `<span class="meta-year">${escapeHtml(media.year)}</span>` : "",
      presentation.show_rating !== false && media.content_rating
        ? `<span class="meta-rating">${escapeHtml(media.content_rating)}</span>` : "",
      presentation.show_runtime !== false && formatRuntime(media.duration_ms)
        ? `<span class="meta-runtime">${escapeHtml(formatRuntime(media.duration_ms))}</span>` : "",
    ].filter(Boolean).join('<span class="meta-separator" aria-hidden="true"> · </span>');
    const motionClass = presentation.enable_motion === false ? " motion-off" : "";
    const transitionClass = this._softMediaTransition ? " media-arriving" : "";
    const studioClass = this._studio ? " studio-preview" : "";
    const orientation = normalizeOrientation(presentation.orientation);
    const layout = normalizeLayout(presentation.layout);
    const frame = normalizeFrame(presentation.frame_theme);
    const resolvedFrame = this._resolvedFrameResource();
    const declarativeRenderer = this._rendererMode === "declarative";
    // Marquee / Classic / Cinematic is the single approved reference preset.
    // Other built-ins keep their frame-specific compatibility styling until
    // they are deliberately migrated and visually approved one at a time.
    const referenceRenderer = frame === "marquee"
      && theme === "classic"
      && layout === "cinematic";
    const rendererClass = `${referenceRenderer ? " renderer-reference" : ""}`
      + ` renderer-${declarativeRenderer ? "declarative" : "compatibility"}`;
    const authoredRenderer = declarativeRenderer
      && Number(state.design?.schema_version) >= 2;
    const authoredClass = authoredRenderer ? " renderer-authored" : "";
    const editorClass = this._editorDocument ? " visual-editor-active" : "";
    const headingFont = normalizeFont(presentation.heading_font || "cinematic");
    const bodyFont = normalizeFont(presentation.body_font);
    const accentColor = normalizeColor(presentation.accent_color, "#f6cf70");
    const backgroundColor = normalizeColor(presentation.background_color, "#090706");
    const frameMotion = this._resolvedFrameMotion();
    const frameMotionPreset = FRAME_MOTION_PRESETS.has(frameMotion.preset)
      ? frameMotion.preset : "none";
    const frameMotionSpeed = Math.min(
      5, Math.max(0.1, Number(frameMotion.speed || 1)),
    );
    const frameMotionIntensity = Math.min(
      1, Math.max(0, Number(frameMotion.intensity || 0)),
    );
    const frameLightCount = Math.min(
      24, Math.max(0, Number(frameMotion.light_count || 0)),
    );
    const logoUrl = String(presentation.logo_url || "").trim();
    const logoPosition = normalizeLogoPosition(presentation.logo_position);
    const backdrop = media.backdrop_url
      ? `url('${escapeHtml(media.backdrop_url)}')` : "none";
    const titleLayer = state.design?.components?.find(
      (component) => component.type === "title",
    );
    const titleMaxLines = Math.min(
      20, Math.max(1, Number(titleLayer?.constraints?.max_lines || 2)),
    );
    const titleMinimum = Math.min(
      20, Math.max(0.1, Number(
        titleLayer?.constraints?.min_font_size || 0.8,
      )),
    );
    const presentationStyle = `style="--backdrop:${backdrop};--legacy-accent:${accentColor};--legacy-background:${backgroundColor};--title-max-lines:${titleMaxLines};--title-design-min:${titleMinimum}cqw;--frame-motion-duration:${4 / frameMotionSpeed}s;--frame-motion-intensity:${frameMotionIntensity};${semanticColorStyle(state.design_style?.colors)};${semanticTypographyStyle(state.design_style?.typography)};${semanticEffectsStyle(state.design_style?.effects)};${safeOpeningStyle(resolvedFrame?.safe_opening)};${frameLayoutStyle(resolvedFrame?.layout_tuning)}"`;

    const hasDetails = presentation.show_title !== false
      || (presentation.show_subtitle !== false && Boolean(media.subtitle))
      || Boolean(meta)
      || (presentation.show_summary !== false && Boolean(media.summary))
      || (presentation.show_session !== false && Boolean(state.session))
      || (presentation.show_progress !== false && Boolean(hasProgress));
    const detailsClass = hasDetails ? " has-details" : "";
    const hasExpandedDetails =
      (presentation.show_summary !== false && Boolean(media.summary))
      || (presentation.show_progress !== false && Boolean(hasProgress));
    const detailsDensityClass = hasExpandedDetails
      ? " details-expanded" : " details-compact";
    const summaryClass = presentation.show_summary !== false ? " show-summary" : "";
    const progressClass = presentation.show_progress !== false ? " show-progress" : "";
    this.shadowRoot.innerHTML = `${this._styles()}${this._studioControls()}
      <main class="theater${studioClass}${rendererClass}${authoredClass}${editorClass}${detailsClass}${detailsDensityClass} theme-${theme} mode-${escapeHtml(state.mode)}${motionClass}${transitionClass}${summaryClass}${progressClass} orientation-${orientation} layout-${layout} frame-${frame} frame-motion-${frameMotionPreset} font-heading-${headingFont} font-body-${bodyFont}"
        ${presentationStyle} aria-label="Movie Poster display">
        <div class="ambient"></div>
        ${this._displayControls()}
        <p class="connection-warning" role="status"
          ${state.health?.connected === false ? "" : "hidden"}>
          ${escapeHtml(state.health?.message)}</p>
        ${this._editorCanvas()}
        <section class="marquee-frame${logoUrl ? ` has-logo logo-at-${logoPosition}` : ""}">
          ${declarativeRenderer
            ? this._frameMotionMarkup(frameMotionPreset, frameLightCount) : ""}
          <div class="cyber-frame-lights${declarativeRenderer ? " renderer-inactive" : ""}" aria-hidden="true">
            <i class="cyber-light-group cyber-light-group-a"></i>
            <i class="cyber-light-group cyber-light-group-b"></i>
            <i class="cyber-light-group cyber-light-group-c"></i>
          </div>
          <div class="marquee-bulbs${declarativeRenderer && frame !== "marquee" ? " renderer-inactive" : ""}" aria-hidden="true">
          </div>
          ${authoredRenderer ? this._authoredCanvas() : ""}
          <div class="frame-stage${declarativeRenderer ? " renderer-inactive" : ""}">
          ${logoUrl ? `<div class="brand-row logo-${logoPosition}">
            <div class="brand-logo logo-${logoPosition}">
              <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(presentation.eyebrow_text || "Theater")} logo">
            </div>
            <span class="eyebrow brand-eyebrow">${escapeHtml(presentation.eyebrow_text || "Theater Presentation")}</span>
          </div>` : ""}
          <div class="frame-ornaments" aria-hidden="true">
            <i class="ornament ornament-left"></i><i class="ornament ornament-right"></i>
          </div>
          <header class="marquee">
            ${logoUrl ? "" : `<span class="eyebrow">${escapeHtml(presentation.eyebrow_text || "Theater Presentation")}</span>`}
            <h1 id="movie-poster-mode" aria-live="polite">${escapeHtml(state.heading)}</h1>
          </header>
          <div class="marquee-divider-bulbs" aria-hidden="true"></div>
          <div class="content">
            <div class="poster-wrap">
              ${media.poster_url
                ? `<img class="poster" src="${escapeHtml(media.poster_url)}"
                     alt="Poster for ${escapeHtml(media.title)}">`
                : `<div class="poster poster-missing" role="img"
                    aria-label="No poster available for ${escapeHtml(media.title)}">No poster available</div>`}
              ${presentation.show_title !== false
                || presentation.show_subtitle !== false
                ? `<footer class="frame-plaque">
                  ${presentation.show_title !== false
                    ? `<strong>${escapeHtml(media.title)}</strong>` : ""}
                  ${presentation.show_subtitle !== false
                    ? `<span>${escapeHtml(media.subtitle || state.heading)}</span>` : ""}
                </footer>` : ""}
            </div>
            <article class="details"${presentation.show_title !== false
              ? ' aria-labelledby="movie-poster-title"' : ""}>
              ${presentation.show_title !== false
                ? `<h2 id="movie-poster-title">${escapeHtml(media.title)}</h2>` : ""}
              ${media.subtitle && presentation.show_subtitle !== false
                ? `<p class="subtitle">${escapeHtml(media.subtitle)}</p>` : ""}
              ${meta ? `<p class="meta">${meta}</p>` : ""}
              ${media.summary && presentation.show_summary !== false
                ? `<p class="summary">${escapeHtml(media.summary)}</p>` : ""}
              ${state.session && presentation.show_session !== false
                ? `<p class="session">${escapeHtml(state.session.user)}
                · ${escapeHtml(state.session.player)}</p>` : ""}
              ${hasProgress && presentation.show_progress !== false
                ? `<div class="progress" role="progressbar"
                aria-label="Playback progress" aria-valuemin="0" aria-valuemax="100"
                aria-valuenow="${Math.round(progress)}">
                <i style="width:${progress}%"></i></div>` : ""}
            </article>
          </div>
          </div>
          ${declarativeRenderer ? this._frameCompositeMarkup() : ""}
        </section>
      </main>`;
    this._bindStudioControls();
    this._bindDisplayControls();
    this._bindMarqueeBulbs();
    this._softMediaTransition = false;
  }

  _bindMarqueeBulbs() {
    this._bulbObserver?.disconnect();
    const frame = this.shadowRoot.querySelector(".marquee-frame");
    if (!frame) return;
    const layout = () => this._layoutMarqueeBulbs(frame);
    layout();
    const poster = frame.querySelector("img.poster");
    if (poster && !poster.complete) {
      poster.addEventListener("load", layout, { once: true });
    }
    requestAnimationFrame(() => requestAnimationFrame(layout));
    this._bulbObserver = new ResizeObserver(layout);
    this._bulbObserver.observe(frame);
  }

  _layoutMarqueeBulbs(frame) {
    frame.classList.toggle(
      "missing-poster",
      Boolean(frame.querySelector(".poster-missing")),
    );
    frame.classList.toggle("frame-short", frame.clientHeight < 900);
    frame.classList.toggle(
      "frame-ultra-compact",
      frame.clientHeight < 420 || frame.clientWidth < 360,
    );
    this._fitHeadingToFrame(frame);
    this._fitMovieTitleToFrame(frame);
    this._fitPosterToFrame(frame);
    this._fitMovieTitleToFrame(frame);
    this._fitAuthoredTitles(frame);
    if (!frame.closest(".frame-marquee")) return;
    const container = frame.querySelector(".marquee-bulbs");
    if (!container) return;
    const theater = frame.closest(".theater");
    const portrait = theater?.classList.contains("orientation-portrait")
      || (theater?.classList.contains("orientation-auto")
        && frame.clientHeight > frame.clientWidth);
    // These normalized centers are registered to the bulbs rendered into the
    // photographic frame assets. Do not derive them from generic spacing:
    // the landscape rails are intentionally asymmetric due to perspective.
    const rail = portrait
      ? {
        left: .14, right: .86, top: .142, bottom: .909,
        sideTop: .184, sideBottom: .872,
        horizontalCount: 12, verticalCount: 17,
      }
      : {
        left: .095, right: .847, top: .156, bottom: .783,
        horizontalLeft: .13, horizontalRight: .812,
        sideTop: .199, sideBottom: .721,
        horizontalCount: 18, verticalCount: 10,
      };
    const horizontalLeft = rail.horizontalLeft ?? rail.left;
    const horizontalRight = rail.horizontalRight ?? rail.right;
    const distribute = (start, end, count) => Array.from(
      { length: count },
      (_, index) => count === 1 ? start : start + (end - start) * index / (count - 1),
    );
    const horizontal = distribute(
      horizontalLeft, horizontalRight, rail.horizontalCount,
    );
    const vertical = distribute(
      rail.sideTop, rail.sideBottom, rail.verticalCount,
    );
    const sourcePoints = [
      ...horizontal.map((x) => ({ x, y: rail.top })),
      ...vertical.map((y) => ({ x: rail.right, y })),
      ...[...horizontal].reverse().map((x) => ({ x, y: rail.bottom })),
      ...[...vertical].reverse().map((y) => ({ x: rail.left, y })),
    ];
    // The portrait photograph is 2:3 while the presentation canvas is 9:16.
    // Frame art uses object-fit: cover, so its sides are cropped. Map source
    // socket centers through the same cover transform instead of placing glow
    // dots at the uncropped source percentages.
    const sourceAspect = portrait ? 2 / 3 : 4 / 3;
    const canvasAspect = frame.clientWidth / frame.clientHeight;
    const croppedFrameAsset = theater?.classList.contains("renderer-declarative");
    const displayedWidth = croppedFrameAsset && sourceAspect > canvasAspect
      ? sourceAspect / canvasAspect : 1;
    const displayedHeight = croppedFrameAsset && sourceAspect < canvasAspect
      ? canvasAspect / sourceAspect : 1;
    const points = sourcePoints.map(({ x, y }) => ({
      x: x * displayedWidth - (displayedWidth - 1) / 2,
      y: y * displayedHeight - (displayedHeight - 1) / 2,
    }));
    const count = points.length;
    if (Number(container.dataset.count) !== count) {
      container.replaceChildren(...Array.from({ length: count }, () =>
        document.createElement("i")));
      container.dataset.count = String(count);
    }
    [...container.children].forEach((bulb, index) => {
      const { x, y } = points[index];
      bulb.style.left = `${x * frame.clientWidth}px`;
      bulb.style.top = `${y * frame.clientHeight}px`;
      bulb.style.setProperty("--bulb-delay", `${-index * 4.8 / count}s`);
    });
  }

  _fitHeadingToFrame(frame) {
    const heading = frame.querySelector("h1");
    if (!heading) return;
    heading.classList.remove("heading-wrap");
    heading.style.removeProperty("font-size");
    const available = heading.clientWidth;
    const required = heading.scrollWidth;
    if (!available || required <= available) return;
    const baseSize = parseFloat(getComputedStyle(heading).fontSize);
    const fittedSize = baseSize * (available / required) * 0.98;
    if (fittedSize < 12) heading.classList.add("heading-wrap");
    heading.style.fontSize = `${fittedSize}px`;
  }

  _fitAuthoredTitles(frame) {
    const frameWidth = frame.clientWidth;
    if (!frameWidth) return;
    frame.querySelectorAll(
      ".authored-component.component-title.constrained-lines",
    ).forEach((title) => {
      const content = title.querySelector(".authored-component-content");
      const preferred = Number(
        title.style.getPropertyValue("--component-preferred-font"),
      ) * frameWidth / 100;
      const minimum = Number(
        title.style.getPropertyValue("--component-min-font"),
      ) * frameWidth / 100;
      if (!content || !Number.isFinite(preferred) || !Number.isFinite(minimum)) {
        return;
      }
      const overflows = () => content.scrollHeight > content.clientHeight + 1;
      title.style.fontSize = `${preferred}px`;
      if (!overflows()) {
        title.classList.remove("title-truncated");
        return;
      }
      let low = Math.min(preferred, minimum);
      let high = preferred;
      title.style.fontSize = `${low}px`;
      if (overflows()) {
        title.classList.add("title-truncated");
        return;
      }
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = (low + high) / 2;
        title.style.fontSize = `${candidate}px`;
        if (overflows()) high = candidate;
        else low = candidate;
      }
      title.style.fontSize = `${low}px`;
      title.classList.remove("title-truncated");
    });
  }

  _fitMovieTitleToFrame(frame) {
    const title = frame.querySelector(".details h2");
    if (!title || getComputedStyle(title).display === "none") return;
    const titleStyle = getComputedStyle(title);
    const maxLines = Math.min(
      20, Math.max(1, Number.parseInt(
        titleStyle.getPropertyValue("--title-max-lines"), 10,
      ) || 2),
    );
    title.classList.remove("title-truncated");
    title.classList.add("title-measuring");
    title.style.removeProperty("font-size");
    const preferred = parseFloat(getComputedStyle(title).fontSize);
    const designMinimum = parseFloat(
      titleStyle.getPropertyValue("--title-design-min"),
    ) || 0;
    const minimum = Math.max(
      12, designMinimum, Math.min(32, frame.clientWidth * .025),
    );
    const fitsConfiguredLines = () => {
      const style = getComputedStyle(title);
      const lineHeight = parseFloat(style.lineHeight)
        || parseFloat(style.fontSize) * 1.05;
      return title.scrollHeight <= lineHeight * maxLines + 1;
    };
    let size = Math.max(minimum, preferred);
    title.style.fontSize = `${size}px`;
    while (size > minimum && !fitsConfiguredLines()) {
      size = Math.max(minimum, size - 1);
      title.style.fontSize = `${size}px`;
    }
    const truncate = !fitsConfiguredLines();
    title.classList.remove("title-measuring");
    if (truncate) title.classList.add("title-truncated");
    title.style.setProperty("--title-min-size", `${minimum}px`);
  }

  _fitPosterToFrame(frame) {
    const poster = frame.querySelector(".poster");
    const marquee = frame.querySelector(".marquee");
    const content = frame.querySelector(".content");
    if (!poster || !marquee || !content) return;
    const stage = frame.querySelector(".frame-stage");
    const fitBoundary = stage && getComputedStyle(stage).display !== "contents"
      ? stage : frame;
    const boundaryStyle = getComputedStyle(fitBoundary);
    const contentStyle = getComputedStyle(content);
    const plaque = frame.querySelector(".frame-plaque");
    const plaqueHeight = plaque && getComputedStyle(plaque).display !== "none"
      ? plaque.offsetHeight + parseFloat(getComputedStyle(plaque).marginTop) : 0;
    const details = frame.querySelector(".details");
    const theater = frame.closest(".theater");
    const autoStacks = theater?.classList.contains("orientation-auto")
      && (window.matchMedia("(orientation: portrait)").matches
        || window.matchMedia("(max-width: 720px)").matches
        || window.innerHeight > window.innerWidth
        || frame.clientHeight > frame.clientWidth);
    const shortLandscape = frame.classList.contains("frame-short")
      && !theater?.classList.contains("orientation-portrait")
      && (theater?.classList.contains("orientation-landscape")
        || (theater?.classList.contains("orientation-auto")
          && window.innerWidth >= window.innerHeight));
    let stacked = (theater?.classList.contains("layout-poster") && !shortLandscape)
      || theater?.classList.contains("orientation-portrait") || autoStacks;
    if (stacked && details && getComputedStyle(details).display !== "none") {
      content.style.display = "grid";
      content.style.gridTemplateColumns = "minmax(0, 1fr)";
    } else {
      content.style.removeProperty("display");
      content.style.removeProperty("grid-template-columns");
      /* Several photographic frames switch to a single-column grid when
         their stage is short. Treat the computed layout as stacked too so
         poster fitting reserves the real details height. */
      const computedColumns = getComputedStyle(content).gridTemplateColumns
        .trim().split(/\s+/).filter(Boolean);
      stacked = Boolean(
        details
        && getComputedStyle(details).display !== "none"
        && getComputedStyle(content).display === "grid"
        && computedColumns.length === 1,
      );
      if (stacked) {
        content.style.display = "grid";
        content.style.gridTemplateColumns = "minmax(0, 1fr)";
      }
    }
    const minimum = frame.classList.contains("frame-ultra-compact")
      ? 36
      : window.innerWidth >= 720
        ? 160
        : Math.min(120, Math.max(48, frame.clientHeight * .15));
    if (!stacked) frame.style.removeProperty("--fitted-poster-width");
    const fit = () => {
      const detailsStyle = details ? getComputedStyle(details) : null;
      const detailsHeight = stacked && details
        ? details.offsetHeight
          + (parseFloat(detailsStyle.marginTop) || 0)
          + (parseFloat(contentStyle.rowGap || contentStyle.gap) || 0)
        : 0;
      const frameBottom = fitBoundary.getBoundingClientRect().bottom
        - parseFloat(boundaryStyle.borderBottomWidth)
        - parseFloat(boundaryStyle.paddingBottom);
      const posterTop = poster.getBoundingClientRect().top;
      const available = stacked
        ? content.clientHeight
          - parseFloat(contentStyle.paddingTop)
          - parseFloat(contentStyle.paddingBottom)
          - plaqueHeight - detailsHeight
          - (theater?.classList.contains("frame-cyber_noir") ? 80 : 12)
        : frameBottom - posterTop
          - parseFloat(contentStyle.paddingBottom) - plaqueHeight - 20;
      frame.style.setProperty(
        "--fitted-poster-height",
        `${Math.max(minimum, available)}px`,
      );
      if (stacked) {
        poster.style.setProperty(
          "height",
          `${Math.max(minimum, available)}px`,
          "important",
        );
        frame.style.setProperty(
          "--fitted-poster-width",
          `${poster.getBoundingClientRect().width}px`,
        );
      }
    };
    if (!stacked) poster.style.removeProperty("height");
    fit();
    if (stacked) {
      fit();
      fit();
      const posterWidth = poster.getBoundingClientRect().width;
      frame.style.setProperty("--fitted-poster-width", `${posterWidth}px`);
    }
  }

  _displayControls() {
    if (this._studio) return "";
    const operations = this._state?.operations ?? {};
    const source = operations.collection || operations.library || "Plex library";
    const hydration = operations.hydrating ? " · loading" : "";
    const progress = operations.hydration_percent == null
      ? "" : ` · ${operations.hydration_percent}%`;
    const lastRefresh = operations.last_refresh
      ? `Last refresh ${new Date(operations.last_refresh).toLocaleString()}`
      : "Library cache not yet completed";
    const adminActions = operations.can_control ? `
      <button type="button" data-display-action="next">Next poster</button>
      <button type="button" data-display-action="refresh">Refresh library</button>
      <button type="button" data-display-action="reset">Reset shuffle</button>` : "";
    return `<aside class="display-controls" aria-label="Movie Poster controls">
      <div class="display-status">
        <strong>${escapeHtml(this._state.mode === "now_playing" ? "Now Playing" : "Coming Soon")}</strong>
        <span>${escapeHtml(source)}${hydration}${progress}</span>
        <span>${Number(operations.loaded_movies || 0).toLocaleString()} loaded ·
          ${Number(operations.remaining_movies || 0).toLocaleString()} remaining</span>
        <span>${escapeHtml(lastRefresh)}</span>
      </div>
      <div class="display-actions">${adminActions}
        <button type="button" data-display-action="exit">Exit kiosk</button>
      </div>
      <small class="display-action-status" role="status"></small>
    </aside>`;
  }

  _bindDisplayControls() {
    if (this._studio) return;
    const theater = this.shadowRoot.querySelector(".theater");
    if (!theater) return;
    const reveal = () => this._revealDisplayControls();
    theater.addEventListener("pointermove", reveal, { passive: true });
    theater.addEventListener("pointerdown", reveal, { passive: true });
    theater.addEventListener("keydown", reveal);
    this.shadowRoot.querySelectorAll("[data-display-action]").forEach((button) => {
      button.addEventListener("click", () => this._runDisplayAction(button));
    });
  }

  _revealDisplayControls() {
    const controls = this.shadowRoot.querySelector(".display-controls");
    if (!controls) return;
    controls.classList.add("visible");
    clearTimeout(this._controlsTimer);
    this._controlsTimer = setTimeout(() => {
      if (!controls.matches(":focus-within, :hover")) controls.classList.remove("visible");
    }, 3500);
  }

  async _runDisplayAction(button) {
    const action = button.dataset.displayAction;
    const status = this.shadowRoot.querySelector(".display-action-status");
    this._revealDisplayControls();
    if (action === "exit") {
      this._kioskSuppressed = true;
      this._setKiosk(false);
      if (status) status.textContent = "Kiosk hidden until this page is reloaded.";
      return;
    }
    if (!this._hass || !this._state?.entry_id) return;
    button.disabled = true;
    if (status) status.textContent = `${button.textContent}…`;
    try {
      const result = await this._hass.callWS({
        type: "movie_poster/control",
        entry_id: this._state.entry_id,
        action,
      });
      if (status) {
        status.textContent = result.changed === false
          ? "This action is available in Coming Soon mode."
          : "Done";
      }
    } catch (error) {
      if (status) status.textContent = error?.message || "Action failed";
    } finally {
      button.disabled = false;
      this._revealDisplayControls();
    }
  }

  _editorCanvas() {
    if (!this._studio || !this._editorDocument) return "";
    const components = this._editorDocument.design?.components || [];
    const motion = this._editorDocument.design?.motion || {};
    const motionPreset = [
      "none", "breathe", "chase", "pulse", "shimmer",
    ].includes(motion.preset) ? motion.preset : "none";
    const motionSpeed = Math.min(5, Math.max(0.1, Number(motion.speed || 1)));
    const motionIntensity = Math.min(
      1, Math.max(0, Number(motion.intensity ?? 0)),
    );
    const motionStagger = Math.min(5, Math.max(0, Number(motion.stagger || 0)));
    const devicePresets = {
      responsive: null,
      phone: 9 / 19.5,
      tablet: 3 / 4,
      television: 16 / 9,
      portrait_signage: 9 / 16,
      ultrawide: 21 / 9,
    };
    const ratio = devicePresets[this._editorDevicePreset];
    const deviceClass = ratio ? " device-preview" : "";
    const deviceStyle = ratio
      ? ` style="--editor-preview-ratio:${ratio};--editor-preview-aspect:${ratio} / 1"`
      : "";
    const editorStyle = `${deviceStyle ? deviceStyle.slice(8, -1) : ""};
      --editor-zoom:${this._editorZoom};
      --editor-pan-x:${this._editorPanX}%;
      --editor-pan-y:${this._editorPanY}%;
      --authored-motion-duration:${4 / motionSpeed}s;
      --authored-motion-intensity:${motionIntensity};
      --authored-motion-shift:${motionIntensity * 2.5}%;
      --authored-motion-opacity:${1 - motionIntensity * 0.35};
      --authored-motion-scale:${1 + motionIntensity * 0.025};
      --authored-motion-brightness:${1 + motionIntensity * 0.35};
      --authored-motion-saturation:${1 + motionIntensity * 0.2}`;
    return `<div class="visual-editor-viewport">
      <section class="visual-editor-canvas authored-motion-${motionPreset}${this._editorSnapEnabled ? " snap-enabled" : ""}${this._editorGuidesEnabled ? " guides-enabled" : ""}${deviceClass}"
      aria-label="Presentation canvas" style="${editorStyle}">
      <div class="editor-design-guides" aria-hidden="true">
        <i class="editor-ruler editor-ruler-horizontal"></i>
        <i class="editor-ruler editor-ruler-vertical"></i>
        <i class="editor-guide editor-guide-safe"></i>
        <i class="editor-guide editor-guide-horizontal"></i>
        <i class="editor-guide editor-guide-vertical"></i>
      </div>
      ${this._frameCompositeMarkup("editor")}
      <div class="authored-component-surface editor-component-surface">
      ${components.filter((component) => component.visible !== false)
        .sort((a, b) => a.z_index - b.z_index)
        .map((component, index) => {
          const bounds = this._editorBounds(component);
          const selected = this._editorSelectedIds.includes(component.id)
            ? " selected" : "";
          const constrained = Number(component.constraints?.max_lines) > 0
            ? " constrained-lines" : "";
          const locked = component.locked ? " locked" : "";
          const clip = ["none", "canvas", "safe_opening"].includes(component.clip)
            ? component.clip : "safe_opening";
          return `<button type="button" class="editor-component component-${component.type} component-clip-${clip}${selected}${constrained}${locked}"
            data-editor-component="${escapeHtml(component.id)}"
            data-component-clip="${clip}"
            style="${this._editorComponentStyle(component, bounds)};
              --authored-motion-delay:${index * motionStagger}s">
            <span class="editor-component-content">${this._componentContent(component)}</span>
            <span class="editor-component-label">${escapeHtml(component.type.replaceAll("_", " "))}</span>
            <span class="editor-resize-handle" data-editor-resize aria-hidden="true"></span>
          </button>`;
        }).join("")}
        ${this._editorContextToolbar()}
      </div>
      </section>
    </div>`;
  }

  _editorContextToolbar() {
    const component = this._selectedEditorComponent();
    if (!component || this._editorSelectedIds.length !== 1) return "";
    const bounds = this._editorBounds(component);
    const left = Math.min(98, Math.max(2, bounds.x + bounds.width));
    const top = Math.min(98, Math.max(2, bounds.y));
    return `<div class="editor-context-toolbar"
      style="left:${left}%;top:${top}%"
      aria-label="${escapeHtml(component.name)} actions">
      <button type="button" data-editor-context="settings"
        aria-expanded="${this._editorSettingsOpenId === component.id}"
        title="Edit ${escapeHtml(component.name)} settings">⚙<span>Settings</span></button>
      <button type="button" data-editor-context="duplicate"
        title="Duplicate ${escapeHtml(component.name)}">⧉</button>
      <button type="button" data-editor-context="lock"
        title="${component.locked ? "Unlock" : "Lock"} ${escapeHtml(component.name)}">
        ${component.locked ? "🔒" : "🔓"}</button>
      <button type="button" data-editor-context="delete"
        title="Remove ${escapeHtml(component.name)}">×</button>
    </div>`;
  }

  _componentContent(component) {
    const media = this._state?.media || {};
    switch (component.type) {
      case "surface": return "";
      case "poster":
        return media.poster_url
          ? `<img src="${escapeHtml(media.poster_url)}" alt="">`
          : "Poster";
      case "backdrop":
        return media.backdrop_url
          ? `<img src="${escapeHtml(media.backdrop_url)}" alt="">`
          : "";
      case "logo":
        return this._state.presentation?.logo_url
          ? `<img src="${escapeHtml(this._state.presentation.logo_url)}" alt="">`
            : "Logo";
      case "custom_image": {
        const assetUrl = this._componentAssetUrl(component);
        return assetUrl
          ? `<img src="${escapeHtml(assetUrl)}" alt="">`
          : "Custom image";
      }
      case "mode_heading": return escapeHtml(this._state.heading || "Coming Soon");
      case "title": return escapeHtml(media.title || "Movie Title");
      case "subtitle": return escapeHtml(media.subtitle || "Subtitle or tagline");
      case "year": return escapeHtml(media.year || "2026");
      case "content_rating": return escapeHtml(media.content_rating || "PG-13");
      case "runtime": return formatRuntime(media.duration_ms) || "2h 3m";
      case "summary": return escapeHtml(media.summary || "Movie summary");
      case "progress": {
        const progress = media.duration_ms
          ? Math.min(100, Math.max(0,
            Number(media.position_ms || 0) / Number(media.duration_ms) * 100))
          : 35;
        return `<i style="width:${progress}%"></i>`;
      }
      case "active_user": return escapeHtml(this._state.session?.user || "Movie Fan");
      case "player_name": return escapeHtml(this._state.session?.player || "Theater");
      case "playback_state": return escapeHtml(this._state.session?.state || "Playing");
      case "static_text": return escapeHtml(component.text || "Custom text");
      default: return escapeHtml(component.type);
    }
  }

  _componentAssetUrl(component) {
    const reference = String(component.asset_ref || "").trim();
    if (!reference) return "";
    const signed = this._state?.design_assets?.[reference];
    if (signed) return signed;
    const encoded = this._presentationLibrary?.profiles?.[
      this._editorProfileId
    ]?.assets?.[reference];
    if (!encoded) return "";
    const extension = reference.split(".").at(-1)?.toLowerCase();
    const mediaType = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    }[extension];
    return mediaType ? `data:${mediaType};base64,${encoded}` : "";
  }

  _authoredCanvas() {
    const components = this._state?.design?.components || [];
    const motion = this._state?.design?.motion || {};
    const motionPreset = [
      "none", "breathe", "chase", "pulse", "shimmer",
    ].includes(motion.preset) ? motion.preset : "none";
    const motionSpeed = Math.min(5, Math.max(0.1, Number(motion.speed || 1)));
    const motionIntensity = Math.min(
      1, Math.max(0, Number(motion.intensity ?? 0)),
    );
    const motionStagger = Math.min(5, Math.max(0, Number(motion.stagger || 0)));
    return `<section class="authored-presentation-canvas authored-motion-${motionPreset}"
      aria-label="Authored movie presentation"
      style="--authored-motion-duration:${4 / motionSpeed}s;
        --authored-motion-intensity:${motionIntensity};
        --authored-motion-shift:${motionIntensity * 2.5}%;
        --authored-motion-opacity:${1 - motionIntensity * 0.35};
        --authored-motion-scale:${1 + motionIntensity * 0.025};
        --authored-motion-brightness:${1 + motionIntensity * 0.35};
        --authored-motion-saturation:${1 + motionIntensity * 0.2}">
      <div class="authored-component-surface">
      ${components.filter((component) => component.visible !== false)
        .sort((a, b) => a.z_index - b.z_index)
        .map((component, index) => {
          const bounds = this._displayComponentBounds(component);
          const constrained = Number(component.constraints?.max_lines) > 0
            ? " constrained-lines" : "";
          const clip = ["none", "canvas", "safe_opening"].includes(component.clip)
            ? component.clip : "safe_opening";
          return `<div class="authored-component component-${escapeHtml(component.type)} component-clip-${clip}${constrained}"
            data-authored-component="${escapeHtml(component.id)}"
            data-component-clip="${clip}"
            style="${this._editorComponentStyle(component, bounds)};
              --authored-motion-delay:${index * motionStagger}s">
            <span class="authored-component-content">${this._componentContent(component)}</span>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  _displayComponentBounds(component) {
    const orientation = normalizeOrientation(this._state?.presentation?.orientation);
    const resolved = orientation === "auto"
      ? (window.matchMedia("(orientation: portrait)").matches
        ? "portrait" : "landscape")
      : orientation;
    return component.orientation_overrides?.[resolved]?.bounds
      || component.bounds;
  }

  _syncStudioPreviewResources() {
    const catalog = this._presentationCatalog;
    const presentation = this._state?.presentation;
    if (!catalog || !presentation) return;
    const frameId = normalizeFrame(presentation.frame_theme);
    const themeId = normalizeTheme(presentation.theme);
    const layoutId = normalizeLayout(presentation.layout);
    const frame = catalog.frames?.[frameId];
    const theme = catalog.themes?.[themeId];
    const layout = catalog.layouts?.[layoutId];
    if (!frame || !theme || !layout) return;

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const override = catalog.frame_layout_overrides?.[
      `${frameId}:${layoutId}`
    ];
    const components = clone(override?.components || layout.components || []);
    const showSession = presentation.show_session !== false;
    const showDetails = [
      "show_title", "show_subtitle", "show_year", "show_rating",
      "show_runtime", "show_summary", "show_progress", "show_session",
    ].some((field) => presentation[field] !== false);
    const visibility = {
      logo: Boolean(String(presentation.logo_url || "").trim()),
      metadata_surface: showDetails,
      title: presentation.show_title !== false,
      subtitle: presentation.show_subtitle !== false,
      year: presentation.show_year !== false,
      content_rating: presentation.show_rating !== false,
      runtime: presentation.show_runtime !== false,
      summary: presentation.show_summary !== false,
      progress: presentation.show_progress !== false,
      active_user: showSession,
      session_separator: showSession,
      player_name: showSession,
    };
    components.forEach((component) => {
      if (Object.hasOwn(visibility, component.id)) {
        component.visible = visibility[component.id];
      }
    });

    this._state.design = {
      schema_version: Number(catalog.schema_version || 2),
      resources: {
        frame: { id: frame.id, version: Number(frame.version || 1) },
        theme: { id: theme.id, version: Number(theme.version || 1) },
        layout: { id: layout.id, version: Number(layout.version || 1) },
      },
      viewport: { fit: "contain", link_orientations: true },
      components,
      motion: {
        preset: override?.motion_preset || theme.effects?.animation || "none",
        speed: 1,
        intensity: Number(theme.effects?.glow || 0),
        stagger: 0.15,
      },
    };
    this._state.design_frame = clone(frame);
    this._state.design_style = {
      id: theme.id,
      version: Number(theme.version || 1),
      colors: clone(theme.tokens || {}),
      typography: clone(theme.typography || {}),
      effects: clone(theme.effects || {}),
    };
  }

  _resolvedFrameResource() {
    const frames = this._presentationCatalog?.frames || {};
    const editorFrameId = this._editorDocument?.design?.resources?.frame?.id;
    if (editorFrameId) {
      return Object.values(frames).find((frame) => frame.id === editorFrameId)
        || this._state?.design_frame;
    }
    // Display Studio mutates presentation.frame_theme locally before saving.
    // Resolve that preview selection from the catalog instead of continuing to
    // render the design_frame snapshot supplied for the previously saved Frame.
    if (this._studio) {
      const selected = frames[normalizeFrame(
        this._state?.presentation?.frame_theme,
      )];
      if (selected) return selected;
    }
    const stateFrame = this._state?.design_frame;
    return Object.values(frames).find((frame) => frame.id === stateFrame?.id)
      || stateFrame;
  }

  _resolvedFrameLayers() {
    return this._resolvedFrameResource()?.layers || [];
  }

  _resolvedFrameMotion() {
    if (this._editorDocument?.design?.frame_motion) {
      return this._editorDocument.design.frame_motion;
    }
    return this._resolvedFrameResource()?.motion || {
      preset: "none", speed: 1, intensity: 0, light_count: 0,
    };
  }

  _frameMotionMarkup(preset, count) {
    const pieces = (className, amount = count) => Array.from(
      { length: amount },
      (_, index) => {
        const position = amount <= 1 ? 50 : 6 + (88 * index / (amount - 1));
        return `<i class="${className}" style="--frame-light-index:${index};--frame-light-count:${amount};--frame-light-position:${position}%"></i>`;
      },
    ).join("");
    switch (preset) {
      case "cyber_scan":
        return `<div class="frame-motion-scene cyber-motion" aria-hidden="true">
          <i class="cyber-scan-beam"></i>${pieces("cyber-powered-node", Math.max(2, count))}
        </div>`;
      case "comic_energy":
        return `<div class="frame-motion-scene comic-motion" aria-hidden="true">
          ${pieces("comic-panel-pulse", Math.max(4, count))}
          <i class="comic-ink-flash"></i>
        </div>`;
      case "theater_sconce":
        return `<div class="frame-motion-scene theater-motion" aria-hidden="true">
          ${pieces("theater-sconce", Math.max(2, count))}
          <i class="curtain-shimmer"></i>
        </div>`;
      case "nature_dapple":
        return `<div class="frame-motion-scene nature-motion" aria-hidden="true">
          ${pieces("leaf-shadow", Math.max(3, count))}
          ${pieces("firefly", Math.max(3, count))}
        </div>`;
      case "golden_footlights":
        return `<div class="frame-motion-scene golden-motion" aria-hidden="true">
          ${pieces("golden-footlight", Math.max(4, count))}
          <i class="golden-shimmer"></i>
        </div>`;
      case "steampunk_mechanical":
        return `<div class="frame-motion-scene steampunk-motion" aria-hidden="true">
          ${pieces("steam-gear", 3)}
          <i class="steam-lamp steam-lamp-left"></i>
          <i class="steam-lamp steam-lamp-right"></i>
          <i class="steam-plume steam-plume-left"></i>
          <i class="steam-plume steam-plume-right"></i>
          <i class="pressure-glow"></i>
        </div>`;
      default:
        // Marquee uses bulbs registered to the photographed sockets instead of
        // an interchangeable overlay. "none" intentionally renders nothing.
        return "";
    }
  }

  _frameCompositeMarkup(scope = "display") {
    const configuredOrientation = normalizeOrientation(
      this._state?.presentation?.orientation,
    );
    let assetOrientation = configuredOrientation === "auto"
      ? (window.matchMedia("(orientation: landscape)").matches
        ? "landscape" : "portrait")
      : configuredOrientation;
    if (scope === "editor" && this._editorDevicePreset !== "responsive") {
      assetOrientation = ["television", "ultrawide"].includes(
        this._editorDevicePreset,
      ) ? "landscape" : "portrait";
    }
    return this._resolvedFrameLayers()
      .filter((layer) => layer.asset)
      .sort((a, b) => Number(a.z_index) - Number(b.z_index))
      .map((layer) => {
        const asset = typeof layer.asset === "string"
          ? { portrait: layer.asset, landscape: layer.asset }
          : layer.asset;
        const portrait = escapeHtml(asset?.portrait || asset?.landscape || "");
        const landscape = escapeHtml(asset?.landscape || asset?.portrait || "");
        if (!portrait || !landscape) return "";
        const selectedAsset = assetOrientation === "landscape"
          ? landscape : portrait;
        const opacity = Math.min(1, Math.max(0, Number(layer.opacity ?? 1)));
        const blend = [
          "normal", "multiply", "screen", "overlay", "soft-light",
        ].includes(layer.blend_mode) ? layer.blend_mode : "normal";
        return `<picture class="design-frame-layer frame-slot-${escapeHtml(layer.slot)}"
          data-frame-layer="${escapeHtml(layer.id)}" data-frame-scope="${scope}"
          style="z-index:${Number(layer.z_index) || 0};opacity:${opacity};mix-blend-mode:${blend}">
          <img src="${selectedAsset}" alt="" aria-hidden="true">
        </picture>`;
      }).join("");
  }

  _studioControls() {
    if (!this._studio) return "";
    const presentation = this._state?.presentation ?? {};
    const settings = this._settings ?? {};
    const editorComponents = this._editorDocument?.design?.components || [];
    const editorFrameLayers = this._editorDocument
      ? this._resolvedFrameLayers() : [];
    const editorFrameMotion = this._editorDocument
      ? this._resolvedFrameMotion() : null;
    const selectedComponent = editorComponents.find(
      (component) => component.id === this._editorSelectedId,
    );
    const selectedComponents = this._selectedEditorComponents();
    const selectedBounds = selectedComponent
      ? this._editorBounds(selectedComponent) : null;
    const selectedIsImage = [
      "poster", "backdrop", "logo", "custom_image",
    ].includes(selectedComponent?.type);
    const selectedIsSurface = selectedComponent?.type === "surface";
    const selectedIsText = Boolean(selectedComponent)
      && !selectedIsImage
      && !["progress", "surface"].includes(selectedComponent.type);
    const editorWarnings = this._editorWarnings();
    const editorOrientation = this._editorOrientation();
    const hasOrientationOverride = Boolean(
      selectedComponent?.orientation_overrides?.[editorOrientation]?.bounds,
    );
    const libraryProfiles = Object.entries(
      this._presentationLibrary?.profiles || {},
    );
    const editorLibraryItem = this._editorProfileId
      ? this._presentationLibrary?.profiles?.[this._editorProfileId] : null;
    const editorRevisions = editorLibraryItem?.published || [];
    const editorAssets = Object.keys(editorLibraryItem?.assets || {}).sort();
    const componentTypes = [
      "surface", "poster", "backdrop", "logo", "custom_image", "mode_heading", "title", "subtitle",
      "year", "content_rating", "runtime", "summary", "progress",
      "active_user", "player_name", "playback_state", "static_text",
    ];
    const options = (items, selected) => items.map(({ value, label }) =>
      `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`
    ).join("");
    return `<aside class="studio" aria-label="Display Studio controls">
      <strong>Display Studio</strong>
      <h3>Playback & Coming Soon</h3>
      ${this._settings ? `<label class="studio-wide">Coming Soon source<select data-setting="source">
        ${options(this._choices.sources, settings.source)}</select></label>
      <label>Preferred player<select data-setting="player_id">
        ${options(this._studioPlayerChoices(), settings.player_id || "")}</select></label>
      <label>Preferred user<select data-setting="user_id">
        ${options(this._choices.users, settings.user_id || "")}</select></label>
      <small class="studio-wide">Players are scoped to the selected user. With Any user selected, players default to the Plex account owner; leave player on Any to follow that user on every known device.</small>
      <label>Stop grace (seconds)<input type="number" min="0" max="600"
        data-setting="grace_seconds" value="${Number(settings.grace_seconds ?? 30)}"></label>
      <label>Poster rotation (seconds)<input type="number" min="2" max="3600"
        data-setting="rotation_seconds" value="${Number(settings.rotation_seconds ?? 15)}"></label>
      <label class="studio-wide">Library refresh (seconds)<input type="number" min="60" max="86400"
        data-setting="library_refresh_seconds" value="${Number(settings.library_refresh_seconds ?? 900)}"></label>`
        : `<p class="studio-wide">Loading Plex libraries, players, and users…</p>`}
      <h3>Presentation</h3>
      <div class="studio-profile-actions studio-wide">
        <button type="button" data-editor-action="new-preset">Customize preset</button>
        <button type="button" data-editor-action="new-blank">Start blank</button>
        <button type="button" data-editor-action="import-package">Import .movieposter</button>
        <input type="file" accept=".movieposter,application/zip"
          data-editor-package-file hidden>
        ${this._editorDocument
          ? `<button type="button" class="primary" data-editor-action="publish">Publish</button>
             <button type="button" data-editor-action="close">Close editor</button>`
          : ""}
      </div>
      ${libraryProfiles.length ? `
        <label class="studio-wide">Presentation Library
          <span class="studio-inline">
            <select data-editor-library-select>
              ${libraryProfiles.map(([identifier, item]) => {
                const document = item.draft
                  || item.published?.find(
                    (revision) => revision.revision === item.active_revision,
                  )?.profile;
                return `<option value="${escapeHtml(identifier)}">${escapeHtml(document?.name || identifier)}${item.draft ? " — Draft" : ""}</option>`;
              }).join("")}
            </select>
            <button type="button" data-editor-action="open-library">Open</button>
          </span>
        </label>
        <div class="studio-profile-actions studio-wide">
          <button type="button" data-editor-action="export-package">Export .movieposter</button>
        </div>` : ""}
      ${this._editorDocument ? `
        <p class="studio-wide editor-draft-label">
          Editing draft: <strong>${escapeHtml(this._editorDocument.name)}</strong>
        </p>
        <div class="studio-profile-actions studio-wide" aria-label="Editor history">
          <button type="button" data-editor-action="undo"
            ${this._editorUndoStack.length ? "" : "disabled"}>Undo</button>
          <button type="button" data-editor-action="redo"
            ${this._editorRedoStack.length ? "" : "disabled"}>Redo</button>
          <label class="studio-check"><input type="checkbox" data-editor-snap
            ${this._editorSnapEnabled ? "checked" : ""}>Snap to 1% grid</label>
          <label class="studio-check"><input type="checkbox" data-editor-guides
            ${this._editorGuidesEnabled ? "checked" : ""}>Guides & rulers</label>
        </div>
        <fieldset class="editor-viewport studio-wide">
          <legend>Canvas view</legend>
          <label>Zoom<input type="range" min=".5" max="1.5" step=".05"
            data-editor-viewport="zoom" value="${this._editorZoom}"></label>
          <output>${Math.round(this._editorZoom * 100)}%</output>
          <label>Pan X<input type="range" min="-50" max="50" step="1"
            data-editor-viewport="pan-x" value="${this._editorPanX}"></label>
          <label>Pan Y<input type="range" min="-50" max="50" step="1"
            data-editor-viewport="pan-y" value="${this._editorPanY}"></label>
          <button type="button" data-editor-action="reset-view">Fit canvas</button>
        </fieldset>
        ${editorRevisions.length ? `
          <label class="studio-wide">Published revision
            <span class="studio-inline">
              <select data-editor-revision>
                ${[...editorRevisions].reverse().map((revision) =>
                  `<option value="${revision.revision}"
                    ${revision.revision === editorLibraryItem.active_revision ? "selected" : ""}>
                    Revision ${revision.revision}
                  </option>`).join("")}
              </select>
              <button type="button" data-editor-action="rollback">Activate</button>
            </span>
          </label>` : ""}
        <label class="studio-wide">Preview state<select data-editor-preview>
          ${[
            ["coming_soon", "Coming Soon"],
            ["now_playing", "Now Playing"],
            ["paused", "Paused"],
            ["no_artwork", "No artwork"],
            ["stress", "Long-content stress test"],
            ["connection_warning", "Connection warning"],
          ].map(([value, label]) =>
            `<option value="${value}" ${this._editorPreviewState === value ? "selected" : ""}>${label}</option>`
          ).join("")}
        </select></label>
        <label class="studio-wide">Preview device<select data-editor-device>
          ${[
            ["responsive", "Responsive orientation"],
            ["phone", "Phone portrait"],
            ["tablet", "Tablet portrait"],
            ["television", "16:9 television"],
            ["portrait_signage", "9:16 portrait signage"],
            ["ultrawide", "21:9 ultrawide"],
          ].map(([value, label]) =>
            `<option value="${value}" ${this._editorDevicePreset === value ? "selected" : ""}>${label}</option>`
          ).join("")}
        </select></label>
        ${editorWarnings.length ? `<div class="editor-warnings studio-wide"
          role="status"><strong>Design checks</strong><ul>${editorWarnings.map(
            (warning) => `<li>${escapeHtml(warning)}</li>`,
          ).join("")}</ul></div>` : ""}
        <fieldset class="editor-motion studio-wide">
          <legend>Profile motion</legend>
          <label>Preset<select data-editor-motion="preset">
            ${[
              ["none", "None"],
              ["breathe", "Breathe"],
              ["pulse", "Pulse"],
              ["shimmer", "Shimmer"],
              ["chase", "Chase"],
            ].map(([value, label]) => `<option value="${value}"
              ${(this._editorDocument.design.motion?.preset || "none") === value
                ? "selected" : ""}>${label}</option>`).join("")}
          </select></label>
          <label>Speed<input type="number" min=".1" max="5" step=".1"
            data-editor-motion="speed"
            value="${Number(this._editorDocument.design.motion?.speed ?? 1)}"></label>
          <label>Intensity<input type="range" min="0" max="1" step=".05"
            data-editor-motion="intensity"
            value="${Number(this._editorDocument.design.motion?.intensity ?? 0)}"></label>
          <label>Layer stagger<input type="number" min="0" max="5" step=".05"
            data-editor-motion="stagger"
            value="${Number(this._editorDocument.design.motion?.stagger ?? 0)}"></label>
        </fieldset>
        <fieldset class="editor-motion studio-wide">
          <legend>Frame practical lights</legend>
          <label>Character<select data-editor-frame-motion="preset">
            ${[
              ["none", "None"],
              ["marquee_chase", "Marquee chase"],
              ["cyber_scan", "Cyber scan"],
              ["comic_energy", "Comic energy"],
              ["theater_sconce", "Theater sconces"],
              ["nature_dapple", "Natural light"],
              ["golden_footlights", "Golden footlights"],
              ["steampunk_mechanical", "Steampunk mechanics"],
            ].map(([value, label]) => `<option value="${value}"
              ${(editorFrameMotion?.preset || "none") === value
                ? "selected" : ""}>${label}</option>`).join("")}
          </select></label>
          <label>Speed<input type="number" min=".1" max="5" step=".1"
            data-editor-frame-motion="speed"
            value="${Number(editorFrameMotion?.speed ?? 1)}"></label>
          <label>Intensity<input type="range" min="0" max="1" step=".05"
            data-editor-frame-motion="intensity"
            value="${Number(editorFrameMotion?.intensity ?? 0)}"></label>
          <label>Light count<input type="number" min="0" max="24" step="1"
            data-editor-frame-motion="light_count"
            value="${Number(editorFrameMotion?.light_count ?? 0)}"></label>
          <small>Theme colors power these lights. Reduced Motion freezes them automatically.</small>
        </fieldset>
        <fieldset class="editor-assets studio-wide">
          <legend>Assets</legend>
          <div class="studio-profile-actions">
            <button type="button" data-editor-action="upload-asset">Upload image or font</button>
            <input type="file" data-editor-asset-file hidden
              accept=".png,.jpg,.jpeg,.webp,.woff,.woff2,.ttf,.otf">
          </div>
          ${editorAssets.length ? editorAssets.map((path) => `
            <div class="editor-asset-row">
              <code title="${escapeHtml(path)}">${escapeHtml(path)}</code>
              ${/\.(png|jpe?g|webp)$/i.test(path)
                ? `<button type="button" data-editor-add-asset="${escapeHtml(path)}">Add to canvas</button>`
                : ""}
              <button type="button" data-editor-delete-asset="${escapeHtml(path)}">Remove</button>
            </div>`).join("") : "<small>No custom assets in this Profile.</small>"}
        </fieldset>
        <label class="studio-wide">Add dynamic component
          <span class="studio-inline">
            <select data-editor-add-type>
              ${componentTypes.map((type) =>
                `<option value="${type}">${escapeHtml(type.replaceAll("_", " "))}</option>`
              ).join("")}
            </select>
            <button type="button" data-editor-action="add">Add</button>
          </span>
        </label>
        ${editorFrameLayers.length || editorComponents.length ? `
          <fieldset class="editor-layers studio-wide">
            <legend>Layers</legend>
            ${[...editorFrameLayers].sort((a, b) => b.z_index - a.z_index)
              .map((layer) => `
                <div class="editor-layer-row structural-layer">
                  <span title="Structural frame layer">${escapeHtml(layer.name)}</span>
                  <span class="layer-order">${Number(layer.z_index)}</span>
                  <span title="Built-in frame layers are locked">Locked</span>
                </div>`).join("")}
            ${[...editorComponents].sort((a, b) => b.z_index - a.z_index)
              .map((component) => `
                <div class="editor-layer-row${this._editorSelectedIds.includes(component.id) ? " selected" : ""}">
                  <button type="button" data-editor-select="${escapeHtml(component.id)}">
                    ${escapeHtml(component.name || component.type.replaceAll("_", " "))}
                  </button>
                  <button type="button" title="Move layer forward"
                    data-editor-layer="forward" data-editor-target="${escapeHtml(component.id)}">↑</button>
                  <button type="button" title="Move layer backward"
                    data-editor-layer="backward" data-editor-target="${escapeHtml(component.id)}">↓</button>
                  <button type="button" title="${component.visible === false ? "Show" : "Hide"} layer"
                    data-editor-layer="visibility" data-editor-target="${escapeHtml(component.id)}">
                    ${component.visible === false ? "Show" : "Hide"}
                  </button>
                  <button type="button" title="${component.locked ? "Unlock" : "Lock"} layer"
                    data-editor-layer="lock" data-editor-target="${escapeHtml(component.id)}">
                    ${component.locked ? "Unlock" : "Lock"}
                  </button>
                </div>`).join("")}
          </fieldset>` : ""}
        ${selectedComponent
          && this._editorSettingsOpenId === selectedComponent.id ? `
          <fieldset class="editor-properties editor-context-popover studio-wide"
            style="--popover-x:${selectedBounds.x + selectedBounds.width / 2};
              --popover-y:${selectedBounds.y + selectedBounds.height}">
            <legend>${selectedComponents.length > 1
              ? `${selectedComponents.length} selected`
              : escapeHtml(selectedComponent.name
                || selectedComponent.type.replaceAll("_", " "))}</legend>
            <button type="button" class="editor-popover-close"
              data-editor-context="close" aria-label="Close component settings">×</button>
            <details class="editor-advanced studio-wide">
              <summary>Advanced position and layer settings</summary>
              <div class="editor-advanced-grid">
            <label class="studio-wide">Layer name<input type="text" maxlength="80"
              data-editor-name value="${escapeHtml(selectedComponent.name
                || selectedComponent.type.replaceAll("_", " "))}"></label>
            ${["x", "y", "width", "height"].map((field) =>
              `<label>${field}<input type="number" min="${field === "width" || field === "height" ? ".1" : "0"}"
                max="100" step=".1" data-editor-bound="${field}"
                value="${Number(selectedBounds[field])}"></label>`
            ).join("")}
            <label>Layer<input type="number" min="-100" max="100"
              data-editor-z value="${Number(selectedComponent.z_index)}"></label>
            <div class="editor-align-actions studio-wide" aria-label="Align component">
              ${[
                ["left", "Left"], ["center", "Center"], ["right", "Right"],
                ["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"],
              ].map(([value, label]) => `<button type="button"
                data-editor-align="${value}">${label}</button>`).join("")}
              <button type="button" data-editor-distribute="horizontal"
                ${selectedComponents.length < 3 ? "disabled" : ""}>Space across</button>
              <button type="button" data-editor-distribute="vertical"
                ${selectedComponents.length < 3 ? "disabled" : ""}>Space down</button>
            </div>
            <label class="studio-check"><input type="checkbox" data-editor-visible
              ${selectedComponent.visible !== false ? "checked" : ""}>Visible</label>
            <label class="studio-check"><input type="checkbox" data-editor-locked
              ${selectedComponent.locked ? "checked" : ""}>Locked</label>
            <label>Blend mode<select data-editor-blend>
              ${["normal", "multiply", "screen", "overlay", "soft-light"]
                .map((value) => `<option value="${value}"
                  ${(selectedComponent.blend_mode || "normal") === value
                    ? "selected" : ""}>${value}</option>`).join("")}
            </select></label>
            <label>Clip layer<select data-editor-clip>
              ${[
                ["safe_opening", "Frame opening"],
                ["canvas", "Full canvas"],
                ["none", "No clipping"],
              ].map(([value, label]) => `<option value="${value}"
                ${(selectedComponent.clip || "safe_opening") === value
                  ? "selected" : ""}>${label}</option>`).join("")}
            </select></label>
            <label class="studio-check studio-wide"><input type="checkbox"
              data-editor-orientation-override ${hasOrientationOverride ? "checked" : ""}>
              Override geometry in ${editorOrientation}</label>
              </div>
            </details>
            ${selectedComponent.type === "static_text"
              ? `<label class="studio-wide">Text<input type="text" maxlength="500"
                data-editor-text value="${escapeHtml(selectedComponent.text || "")}"></label>`
              : ""}
            ${selectedIsText ? `<label>Font<select data-editor-style="font_family">
              ${[
                ["theme_heading", "Theme heading"],
                ["theme_body", "Theme body"],
                ["system", "System"],
                ["cinematic", "Cinematic"],
                ["serif", "Serif"],
                ["modern", "Modern"],
                ["condensed", "Condensed"],
              ].map(([value, label]) => `<option value="${value}"
                ${(selectedComponent.style?.font_family
                  || (["mode_heading", "title"].includes(selectedComponent.type)
                    ? "theme_heading" : "theme_body")) === value
                  ? "selected" : ""}>${label}</option>`).join("")}
            </select></label>
            <label>Theme color<select data-editor-style-ref>
              ${[
                "text_heading", "text_body", "text_muted", "text_inverse",
                "accent_primary", "accent_secondary", "light_primary",
                "light_secondary", "progress_fill",
              ].map((value) => `<option value="${value}"
                ${(selectedComponent.style_ref || "text_heading") === value
                  ? "selected" : ""}>${value.replaceAll("_", " ")}</option>`
              ).join("")}
            </select></label>
            <label class="studio-check"><input type="checkbox"
              data-editor-text-color-override
              ${selectedComponent.style?.text_color ? "checked" : ""}>
              Override theme color</label>
            <label>Text color<input type="color" data-editor-style="text_color"
              ${selectedComponent.style?.text_color ? "" : "disabled"}
              value="${normalizeColor(selectedComponent.style?.text_color, "#ffffff")}"></label>
            <label>Font size<input type="number" min=".1" max="20" step=".1"
              data-editor-style="font_size"
              value="${Number(selectedComponent.style?.font_size ?? 3)}"></label>
            <label>Alignment<select data-editor-style="text_align">
              ${["left", "center", "right"].map((value) =>
                `<option value="${value}" ${(selectedComponent.style?.text_align || "center") === value ? "selected" : ""}>${value}</option>`
              ).join("")}
            </select></label>
            <label>Glow<input type="number" min="0" max="1" step=".05"
              data-editor-style="glow"
              value="${Number(selectedComponent.style?.glow ?? 0)}"></label>
            <label>Rotation<input type="number" min="-180" max="180" step="1"
              data-editor-style="rotation"
              value="${Number(selectedComponent.style?.rotation ?? 0)}"></label>
            <label>Maximum lines<input type="number" min="0" max="20" step="1"
              data-editor-max-lines
              value="${Number(selectedComponent.constraints?.max_lines ?? 0)}"></label>
            <label>Minimum font<input type="number" min=".1" max="20" step=".1"
              data-editor-min-font
              value="${Number(selectedComponent.constraints?.min_font_size ?? 0.8)}"></label>`
              : ""}
            ${selectedIsSurface ? `<label>Theme surface<select data-editor-style-ref>
              ${["surface", "surface_elevated", "backdrop"].map((value) =>
                `<option value="${value}"
                  ${(selectedComponent.style_ref || "surface_elevated") === value
                    ? "selected" : ""}>${value.replaceAll("_", " ")}</option>`
              ).join("")}
            </select></label>` : ""}
            <label>Background<input type="color" data-editor-style="background_color"
              value="${normalizeColor(selectedComponent.style?.background_color, "#10151b")}"></label>
            <label>Opacity<input type="number" min="0" max="1" step=".05"
              data-editor-style="opacity"
              value="${Number(selectedComponent.style?.opacity ?? 1)}"></label>
            ${selectedIsImage ? `<label>Image fit<select data-editor-style="image_fit">
              ${["contain", "cover", "fill"].map((value) =>
                `<option value="${value}"
                  ${(selectedComponent.style?.image_fit
                    || (selectedComponent.type === "backdrop"
                      ? "cover" : "contain")) === value ? "selected" : ""}>
                  ${value}</option>`
              ).join("")}
            </select></label>
            <label class="studio-check"><input type="checkbox"
              data-editor-preserve-aspect
              ${selectedComponent.constraints?.preserve_aspect
                ? "checked" : ""}>Preserve aspect</label>` : ""}
            <button type="button" data-editor-action="delete-component">Remove component</button>
            <button type="button" data-editor-action="duplicate-component">Duplicate</button>
            <button type="button" data-editor-action="reset-component">Reset component</button>
          </fieldset>` : `<small class="studio-wide editor-selection-help">
            Select an item on the canvas, then use its Settings button to edit it.
          </small>`}
        <small class="studio-wide">Drag components to move them. Drag the lower-right handle to resize. Changes autosave to this draft.</small>
      ` : ""}
      <label class="studio-wide">Display profile<select data-profile-select>
        ${options(this._choices.profiles || [], settings.profile_id || this._requestedProfileId)}
      </select></label>
      <div class="studio-profile-actions studio-wide">
        <button type="button" data-profile-action="create">New</button>
        <button type="button" data-profile-action="export">Export</button>
        <button type="button" data-profile-action="import">Import</button>
        <button type="button" data-profile-action="delete"
          ${settings.profile_id === "default" ? "disabled" : ""}>Delete</button>
        <input type="file" accept="application/json" data-profile-file hidden>
      </div>
      <label>Frame<select data-studio="frame_theme">
        ${["marquee", "cyber_noir", "comic_hero", "theater_classic",
          "indie_nature", "golden_age", "steampunk"].map((value) =>
          `<option value="${value}" ${presentation.frame_theme === value ? "selected" : ""}>${FRAME_LABELS[value]}</option>`
        ).join("")}
      </select></label>
      <label>Theme<select data-studio="theme">
        ${["classic", "art_deco", "neon", "minimal", "oled"].map((value) =>
          `<option value="${value}" ${presentation.theme === value ? "selected" : ""}>${THEME_LABELS[value]}</option>`
        ).join("")}
      </select></label>
      <label>Layout<select data-studio="layout">
        ${["cinematic", "poster", "split"].map((value) =>
          `<option value="${value}" ${presentation.layout === value ? "selected" : ""}>${value.replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>`
        ).join("")}
      </select></label>
      <label>Orientation<select data-studio="orientation">
        ${["auto", "landscape", "portrait"].map((value) =>
          `<option value="${value}" ${presentation.orientation === value ? "selected" : ""}>${value.replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>`
        ).join("")}
      </select></label>
      <label>Heading font<select data-studio="heading_font">
        ${["cinematic", "system", "serif", "modern", "condensed"].map((value) =>
          `<option value="${value}" ${presentation.heading_font === value ? "selected" : ""}>${value}</option>`
        ).join("")}
      </select></label>
      <label>Body font<select data-studio="body_font">
        ${["system", "cinematic", "serif", "modern", "condensed"].map((value) =>
          `<option value="${value}" ${presentation.body_font === value ? "selected" : ""}>${value}</option>`
        ).join("")}
      </select></label>
      <label>Accent color<input type="color" data-studio="accent_color"
        value="${normalizeColor(presentation.accent_color, "#f6cf70")}"></label>
      <label>Background<input type="color" data-studio="background_color"
        value="${normalizeColor(presentation.background_color, "#090706")}"></label>
      <label class="studio-wide">Now Playing text<input type="text"
        maxlength="60" data-studio="now_playing_text"
        value="${escapeHtml(presentation.now_playing_text || "Now Playing")}"></label>
      <label class="studio-wide">Coming Soon text<input type="text"
        maxlength="60" data-studio="coming_soon_text"
        value="${escapeHtml(presentation.coming_soon_text || "Coming Soon")}"></label>
      <label class="studio-wide">Marquee label<input type="text"
        maxlength="80" data-studio="eyebrow_text"
        value="${escapeHtml(presentation.eyebrow_text || "Theater Presentation")}"></label>
      <label class="studio-wide">Optional logo URL<input type="text"
        maxlength="500" placeholder="/local/movie-poster-logo.png"
        data-studio="logo_url" value="${escapeHtml(presentation.logo_url || "")}"></label>
      <label>Logo placement<select data-studio="logo_position">
        ${["left", "center", "right"].map((value) =>
          `<option value="${value}" ${normalizeLogoPosition(presentation.logo_position) === value ? "selected" : ""}>top ${value}</option>`
        ).join("")}
      </select></label>
      <h3 class="studio-wide">Movie details</h3>
      ${[["show_title", "Title"], ["show_subtitle", "Tagline"],
        ["show_year", "Year"], ["show_rating", "Content rating"],
        ["show_runtime", "Runtime"],
        ["show_summary", "Summary"], ["show_progress", "Progress"],
        ["show_session", "Session"], ["enable_motion", "Motion"],
        ["kiosk_mode", "Kiosk mode"]].map(([field, label]) =>
          `<label class="studio-check"><input type="checkbox" data-studio="${field}"
          ${presentation[field] !== false ? "checked" : ""}>${label}</label>`
        ).join("")}
      <div class="studio-actions">
        <button type="button" data-studio-action="back">Back to settings</button>
        <button type="button" class="primary" data-studio-action="save">Save & return</button>
      </div>
      <small class="studio-status">Changes are saved to this Movie Poster configuration.</small>
    </aside>`;
  }

  _bindStudioControls() {
    if (!this._studio) return;
    this.shadowRoot.querySelectorAll("[data-studio]").forEach((control) => {
      control.addEventListener("change", () => {
        const field = control.dataset.studio;
        this._state.presentation[field] = control.type === "checkbox"
          ? control.checked : control.value;
        if (field === "coming_soon_text") this._state.heading = control.value;
        this._syncStudioPreviewResources();
        this._renderIdentity = null;
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll("[data-setting]").forEach((control) => {
      control.addEventListener("change", () => {
        this._settings[control.dataset.setting] = control.type === "number"
          ? Number(control.value) : control.value;
        if (control.dataset.setting === "user_id") {
          this._normalizePlaybackSettings();
          this._render();
        }
      });
    });
    this.shadowRoot.querySelector('[data-studio-action="back"]')
      ?.addEventListener("click", () => this._returnToSettings());
    this.shadowRoot.querySelector('[data-studio-action="save"]')
      ?.addEventListener("click", () => this._saveStudio());
    this.shadowRoot.querySelector("[data-profile-select]")
      ?.addEventListener("change", (event) => this._switchProfile(event.target.value));
    this.shadowRoot.querySelectorAll("[data-profile-action]").forEach((button) => {
      button.addEventListener("click", () => this._profileAction(button.dataset.profileAction));
    });
    this.shadowRoot.querySelector("[data-profile-file]")
      ?.addEventListener("change", (event) => this._importProfile(event.target.files?.[0]));
    this.shadowRoot.querySelectorAll("[data-editor-action]").forEach((button) => {
      button.addEventListener("click", () =>
        this._editorAction(button.dataset.editorAction));
    });
    this.shadowRoot.querySelectorAll("[data-editor-component]").forEach((component) => {
      component.addEventListener("pointerdown", (event) =>
        this._startEditorPointer(event, component));
    });
    this.shadowRoot.querySelectorAll("[data-editor-context]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.editorContext;
        const component = this._selectedEditorComponent();
        if (action === "settings") {
          this._editorSettingsOpenId =
            this._editorSettingsOpenId === component?.id ? null : component?.id;
          this._render();
          return;
        }
        if (action === "close") {
          this._editorSettingsOpenId = null;
          this._render();
          return;
        }
        if (action === "duplicate") {
          this._editorAction("duplicate-component");
          return;
        }
        if (action === "delete") {
          this._editorAction("delete-component");
          return;
        }
        if (action === "lock" && component) {
          this._recordEditorHistory();
          component.locked = !component.locked;
          this._render();
          this._scheduleEditorSave();
        }
      });
    });
    this.shadowRoot.querySelectorAll("[data-editor-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        this._selectEditorComponent(button.dataset.editorSelect, event.shiftKey);
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll("[data-editor-layer]").forEach((button) => {
      button.addEventListener("click", () => {
        const component = this._editorDocument?.design?.components?.find(
          (item) => item.id === button.dataset.editorTarget,
        );
        if (!component) return;
        const action = button.dataset.editorLayer;
        if (component.locked && action !== "lock") return;
        this._recordEditorHistory();
        this._selectEditorComponent(component.id);
        if (action === "forward") component.z_index += 1;
        if (action === "backward") component.z_index -= 1;
        if (action === "visibility") {
          component.visible = component.visible === false;
        }
        if (action === "lock") component.locked = !component.locked;
        component.z_index = Math.min(100, Math.max(-100, component.z_index));
        this._render();
        this._scheduleEditorSave();
      });
    });
    this.shadowRoot.querySelector("[data-editor-snap]")
      ?.addEventListener("change", (event) => {
        this._editorSnapEnabled = event.target.checked;
        this._render();
      });
    this.shadowRoot.querySelector("[data-editor-guides]")
      ?.addEventListener("change", (event) => {
        this._editorGuidesEnabled = event.target.checked;
        this._render();
      });
    this.shadowRoot.querySelectorAll("[data-editor-viewport]")
      .forEach((control) => {
        control.addEventListener("input", () => {
          const field = control.dataset.editorViewport;
          if (field === "zoom") {
            this._editorZoom = Math.min(
              1.5, Math.max(0.5, Number(control.value)),
            );
          }
          if (field === "pan-x") {
            this._editorPanX = Math.min(
              50, Math.max(-50, Number(control.value)),
            );
          }
          if (field === "pan-y") {
            this._editorPanY = Math.min(
              50, Math.max(-50, Number(control.value)),
            );
          }
          this._render();
        });
      });
    this.shadowRoot.querySelectorAll("[data-editor-motion]").forEach((control) => {
      control.addEventListener("change", () => {
        if (!this._editorDocument) return;
        this._recordEditorHistory();
        const field = control.dataset.editorMotion;
        const limits = {
          speed: [0.1, 5],
          intensity: [0, 1],
          stagger: [0, 5],
        };
        const value = field === "preset"
          ? control.value
          : Math.min(
            limits[field][1],
            Math.max(limits[field][0], Number(control.value)),
          );
        this._editorDocument.design.motion[field] = value;
        this._render();
        this._scheduleEditorSave();
      });
    });
    this.shadowRoot.querySelectorAll("[data-editor-frame-motion]")
      .forEach((control) => {
        control.addEventListener("change", () => {
          if (!this._editorDocument) return;
          this._recordEditorHistory();
          const field = control.dataset.editorFrameMotion;
          const current = this._resolvedFrameMotion();
          this._editorDocument.design.frame_motion = {
            preset: FRAME_MOTION_PRESETS.has(current.preset)
              ? current.preset : "none",
            speed: Math.min(5, Math.max(0.1, Number(current.speed || 1))),
            intensity: Math.min(
              1, Math.max(0, Number(current.intensity || 0)),
            ),
            light_count: Math.round(Math.min(
              24, Math.max(0, Number(current.light_count || 0)),
            )),
          };
          const motion = this._editorDocument.design.frame_motion;
          if (field === "preset") motion.preset = control.value;
          if (field === "speed") {
            motion.speed = Math.min(5, Math.max(0.1, Number(control.value)));
          }
          if (field === "intensity") {
            motion.intensity = Math.min(
              1, Math.max(0, Number(control.value)),
            );
          }
          if (field === "light_count") {
            motion.light_count = Math.round(Math.min(
              24, Math.max(0, Number(control.value)),
            ));
          }
          this._render();
          this._scheduleEditorSave();
        });
      });
    this.shadowRoot.querySelectorAll("[data-editor-align]").forEach((button) => {
      button.addEventListener("click", () =>
        this._alignEditorComponent(button.dataset.editorAlign));
    });
    this.shadowRoot.querySelectorAll("[data-editor-distribute]").forEach((button) => {
      button.addEventListener("click", () =>
        this._distributeEditorComponents(button.dataset.editorDistribute));
    });
    this.shadowRoot.querySelectorAll("[data-editor-bound]").forEach((input) => {
      input.addEventListener("change", () => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        const field = input.dataset.editorBound;
        const minimum = field === "width" || field === "height" ? 0.1 : 0;
        const bounds = this._editorBounds(component);
        const maximum = field === "x" ? 100 - bounds.width
          : field === "y" ? 100 - bounds.height
            : field === "width" ? 100 - bounds.x : 100 - bounds.y;
        bounds[field] = Math.min(
          maximum, Math.max(minimum, Number(input.value)),
        );
        this._render();
        this._scheduleEditorSave();
      });
    });
    this.shadowRoot.querySelector("[data-editor-z]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.z_index = Math.min(100, Math.max(-100, Number(event.target.value)));
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-visible]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.visible = event.target.checked;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-locked]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component) return;
        this._recordEditorHistory();
        component.locked = event.target.checked;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-name]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.name = event.target.value.trim()
          || component.type.replaceAll("_", " ");
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-blend]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.blend_mode = event.target.value;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-style-ref]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.style_ref = event.target.value;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-text-color-override]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.style ||= {};
        if (event.target.checked) {
          component.style.text_color = "#ffffff";
        } else {
          delete component.style.text_color;
        }
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-clip]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.clip = event.target.value;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-max-lines]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.constraints ||= {};
        component.constraints.max_lines = Math.min(
          20, Math.max(0, Number(event.target.value)),
        );
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-min-font]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.constraints ||= {};
        component.constraints.min_font_size = Math.min(
          20, Math.max(0.1, Number(event.target.value)),
        );
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-preserve-aspect]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.constraints ||= {};
        component.constraints.preserve_aspect = event.target.checked;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-text]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.text = event.target.value;
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelectorAll("[data-editor-style]").forEach((input) => {
      input.addEventListener("change", () => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        component.style ||= {};
        component.style[input.dataset.editorStyle] = input.type === "number"
          ? Number(input.value) : input.value;
        this._render();
        this._scheduleEditorSave();
      });
    });
    this.shadowRoot.querySelector("[data-editor-preview]")
      ?.addEventListener("change", (event) =>
        this._applyEditorPreview(event.target.value));
    this.shadowRoot.querySelector("[data-editor-device]")
      ?.addEventListener("change", (event) => {
        this._editorDevicePreset = event.target.value;
        this._render();
      });
    this.shadowRoot.querySelector("[data-editor-orientation-override]")
      ?.addEventListener("change", (event) => {
        const component = this._selectedEditorComponent();
        if (!component || component.locked) return;
        this._recordEditorHistory();
        const orientation = this._editorOrientation();
        if (event.target.checked) {
          component.orientation_overrides[orientation] = {
            bounds: { ...component.bounds },
          };
        } else {
          delete component.orientation_overrides[orientation];
        }
        this._render();
        this._scheduleEditorSave();
      });
    this.shadowRoot.querySelector("[data-editor-package-file]")
      ?.addEventListener("change", (event) =>
        this._importPresentationPackage(event.target.files?.[0]));
    this.shadowRoot.querySelector("[data-editor-asset-file]")
      ?.addEventListener("change", (event) =>
        this._uploadEditorAsset(event.target.files?.[0]));
    this.shadowRoot.querySelectorAll("[data-editor-delete-asset]").forEach((button) => {
      button.addEventListener("click", () =>
        this._deleteEditorAsset(button.dataset.editorDeleteAsset));
    });
    this.shadowRoot.querySelectorAll("[data-editor-add-asset]").forEach((button) => {
      button.addEventListener("click", () =>
        this._addEditorAssetLayer(button.dataset.editorAddAsset));
    });
  }

  async _editorAction(action) {
    const status = this.shadowRoot.querySelector(".studio-status");
    if (action === "reset-view") {
      this._editorZoom = 1;
      this._editorPanX = 0;
      this._editorPanY = 0;
      this._render();
      return;
    }
    if (action === "new-preset" || action === "new-blank") {
      const name = window.prompt(action === "new-blank"
        ? "Name this blank presentation" : "Name this customized presentation");
      if (!name?.trim()) return;
      try {
        const result = await this._callLibrary("create", {
          name: name.trim(), blank: action === "new-blank",
        });
        this._openEditor(result.profile_id, result.library);
      } catch (error) {
        if (status) status.textContent = error?.message || "Unable to create draft.";
      }
      return;
    }
    if (action === "close") {
      this._closeEditor();
      this._render();
      return;
    }
    if (action === "undo" || action === "redo") {
      this._restoreEditorHistory(action);
      return;
    }
    if (action === "open-library") {
      const identifier = this.shadowRoot
        .querySelector("[data-editor-library-select]")?.value;
      if (!identifier) return;
      const item = this._presentationLibrary?.profiles?.[identifier];
      try {
        if (item?.draft) {
          this._openEditor(identifier);
        } else {
          const result = await this._callLibrary("edit", {
            profile_id: identifier,
          });
          this._openEditor(identifier, result.library);
        }
      } catch (error) {
        if (status) status.textContent = error?.message || "Unable to open profile.";
      }
      return;
    }
    if (action === "export-package") {
      const identifier = this.shadowRoot
        .querySelector("[data-editor-library-select]")?.value;
      if (!identifier) return;
      try {
        const result = await this._callLibrary("export", {
          profile_id: identifier,
        });
        const binary = window.atob(result.package);
        const bytes = Uint8Array.from(binary, (character) =>
          character.charCodeAt(0));
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([bytes], {
          type: "application/zip",
        }));
        link.download = `${identifier}.movieposter`;
        link.click();
        URL.revokeObjectURL(link.href);
        if (status) status.textContent = "Presentation package exported.";
      } catch (error) {
        if (status) status.textContent = error?.message || "Unable to export package.";
      }
      return;
    }
    if (action === "import-package") {
      this.shadowRoot.querySelector("[data-editor-package-file]")?.click();
      return;
    }
    if (action === "upload-asset") {
      this.shadowRoot.querySelector("[data-editor-asset-file]")?.click();
      return;
    }
    if (action === "publish") {
      try {
        await this._flushEditorSave();
        const result = await this._callLibrary("publish", {
          profile_id: this._editorProfileId,
        });
        this._presentationLibrary = result.library;
        if (status) status.textContent = `Published revision ${result.revision}.`;
        this._closeEditor();
        this._render();
      } catch (error) {
        if (status) status.textContent = error?.message || "Unable to publish draft.";
      }
      return;
    }
    if (action === "rollback") {
      const revision = Number(
        this.shadowRoot.querySelector("[data-editor-revision]")?.value,
      );
      if (!revision || !this._editorProfileId) return;
      try {
        const result = await this._callLibrary("rollback", {
          profile_id: this._editorProfileId,
          revision,
        });
        this._presentationLibrary = result.library;
        if (status) status.textContent = `Revision ${revision} is now active.`;
        this._render();
      } catch (error) {
        if (status) status.textContent = error?.message || "Unable to activate revision.";
      }
      return;
    }
    if (action === "add") {
      const type = this.shadowRoot.querySelector("[data-editor-add-type]")?.value;
      if (!type || !this._editorDocument) return;
      this._recordEditorHistory();
      const components = this._editorDocument.design.components;
      const base = type.replaceAll("_", "-");
      let identifier = base;
      let suffix = 2;
      while (components.some((component) => component.id === identifier)) {
        identifier = `${base}-${suffix++}`;
      }
      components.push(this._defaultEditorComponent(type, identifier));
      this._editorSelectedId = identifier;
      this._editorSelectedIds = [identifier];
      this._render();
      this._scheduleEditorSave();
      return;
    }
    if (action === "delete-component") {
      const components = this._editorDocument?.design?.components;
      if (!components) return;
      const selected = new Set(this._editorSelectedIds);
      const deletable = components.filter(
        (component) => !component.locked && selected.has(component.id),
      );
      if (!deletable.length) return;
      this._recordEditorHistory();
      this._editorDocument.design.components = components.filter(
        (component) => component.locked || !selected.has(component.id),
      );
      this._editorSelectedId = null;
      this._editorSelectedIds = [];
      this._render();
      this._scheduleEditorSave();
      return;
    }
    if (action === "duplicate-component") {
      const selected = this._selectedEditorComponents().filter(
        (component) => !component.locked,
      );
      if (!selected.length || !this._editorDocument) return;
      this._recordEditorHistory();
      const components = this._editorDocument.design.components;
      const reservedIds = new Set(components.map((component) => component.id));
      const copies = selected.map((component) => {
        const copy = structuredClone(component);
        const base = `${component.id}-copy`;
        let identifier = base;
        let suffix = 2;
        while (reservedIds.has(identifier)) {
          identifier = `${base}-${suffix++}`;
        }
        reservedIds.add(identifier);
        copy.id = identifier;
        copy.bounds.x = Math.min(100 - copy.bounds.width, copy.bounds.x + 2);
        copy.bounds.y = Math.min(100 - copy.bounds.height, copy.bounds.y + 2);
        return copy;
      });
      components.push(...copies);
      this._editorSelectedIds = copies.map((component) => component.id);
      this._editorSelectedId = this._editorSelectedIds.at(-1);
      this._render();
      this._scheduleEditorSave();
      return;
    }
    if (action === "reset-component") {
      const selected = this._selectedEditorComponents().filter(
        (component) => !component.locked,
      );
      if (!selected.length || !this._editorDocument) return;
      this._recordEditorHistory();
      const replacements = new Map(selected.map((component) => [
        component.id, this._defaultEditorComponent(component.type, component.id),
      ]));
      this._editorDocument.design.components =
        this._editorDocument.design.components.map(
          (component) => replacements.get(component.id) || component,
        );
      this._render();
      this._scheduleEditorSave();
    }
  }

  _defaultEditorComponent(type, identifier) {
    const boundsByType = {
      surface: { x: 20, y: 20, width: 60, height: 40 },
      backdrop: { x: 0, y: 0, width: 100, height: 100 },
      poster: { x: 8, y: 12, width: 40, height: 60 },
      logo: { x: 35, y: 4, width: 30, height: 10 },
      custom_image: { x: 25, y: 20, width: 50, height: 50 },
      summary: { x: 52, y: 45, width: 40, height: 28 },
      progress: { x: 52, y: 82, width: 40, height: 3 },
    };
    return {
      id: identifier,
      name: type.replaceAll("_", " ").replace(/\b\w/g, (value) =>
        value.toUpperCase()),
      type,
      bounds: structuredClone(
        boundsByType[type] || { x: 30, y: 30, width: 40, height: 12 },
      ),
      z_index: type === "backdrop" ? 0 : type === "surface" ? 4 : 10,
      visible: true,
      locked: false,
      blend_mode: "normal",
      clip: "safe_opening",
      style_ref: type === "progress"
        ? "progress_fill" : type === "surface" ? "surface_elevated" : "text_heading",
      style: {},
      constraints: {
        max_lines: type === "title" ? 2 : type === "summary" ? 4 : 0,
        min_font_size: 0.8,
        preserve_aspect: ["poster", "logo", "custom_image"].includes(type),
      },
      text: type === "static_text" ? "Custom text" : "",
      asset_ref: "",
      orientation_overrides: {},
    };
  }

  _addEditorAssetLayer(path) {
    if (!path || !this._editorDocument) return;
    this._recordEditorHistory();
    const components = this._editorDocument.design.components;
    let identifier = "custom-image";
    let suffix = 2;
    while (components.some((component) => component.id === identifier)) {
      identifier = `custom-image-${suffix++}`;
    }
    const component = this._defaultEditorComponent("custom_image", identifier);
    component.name = path.split("/").at(-1) || "Custom Image";
    component.asset_ref = path;
    components.push(component);
    this._editorSelectedId = identifier;
    this._editorSelectedIds = [identifier];
    this._render();
    this._scheduleEditorSave();
  }

  _editorWarnings() {
    const components = this._editorDocument?.design?.components || [];
    if (!components.length) return ["Blank canvas has no components."];
    const warnings = [];
    if (!components.some((component) =>
      component.type === "poster" && component.visible !== false)) {
      warnings.push("No visible poster component.");
    }
    if (!components.some((component) =>
      component.type === "title" && component.visible !== false)) {
      warnings.push("No visible media title component.");
    }
    components.forEach((component) => {
      const bounds = this._editorBounds(component);
      if (bounds.x < 0 || bounds.y < 0 || bounds.width <= 0 || bounds.height <= 0
        || bounds.x + bounds.width > 100 || bounds.y + bounds.height > 100) {
        warnings.push(`${component.id} extends outside the canvas.`);
      }
      if (component.visible === false) {
        warnings.push(`${component.id} is hidden.`);
      }
      const fontSize = Number(component.style?.font_size ?? 3);
      if (!["poster", "backdrop", "logo", "progress"].includes(component.type)
        && fontSize < 1) {
        warnings.push(`${component.id} text may be unreadably small.`);
      }
      const textColor = normalizeColor(component.style?.text_color, "");
      const backgroundColor = normalizeColor(
        component.style?.background_color, "",
      );
      if (textColor && backgroundColor
        && colorContrastRatio(textColor, backgroundColor) < 4.5) {
        warnings.push(`${component.id} text contrast is below 4.5:1.`);
      }
    });
    return warnings.slice(0, 8);
  }

  _selectedEditorComponent() {
    return this._editorDocument?.design?.components?.find(
      (component) => component.id === this._editorSelectedId,
    );
  }

  _selectedEditorComponents() {
    const selected = new Set(this._editorSelectedIds.length
      ? this._editorSelectedIds
      : (this._editorSelectedId ? [this._editorSelectedId] : []));
    return this._editorDocument?.design?.components?.filter(
      (component) => selected.has(component.id),
    ) || [];
  }

  _selectEditorComponent(identifier, additive = false) {
    if (identifier !== this._editorSelectedId) {
      this._editorSettingsOpenId = null;
    }
    if (!additive) {
      this._editorSelectedIds = [identifier];
      this._editorSelectedId = identifier;
      return;
    }
    if (this._editorSelectedIds.includes(identifier)) {
      this._editorSelectedIds = this._editorSelectedIds.filter(
        (item) => item !== identifier,
      );
      this._editorSelectedId = this._editorSelectedIds.at(-1) || null;
    } else {
      this._editorSelectedIds = [...this._editorSelectedIds, identifier];
      this._editorSelectedId = identifier;
    }
  }

  _recordEditorHistory() {
    if (!this._editorDocument) return;
    this._editorUndoStack.push({
      document: structuredClone(this._editorDocument),
      selectedId: this._editorSelectedId,
      selectedIds: [...this._editorSelectedIds],
    });
    if (this._editorUndoStack.length > 50) this._editorUndoStack.shift();
    this._editorRedoStack = [];
  }

  _restoreEditorHistory(direction) {
    const source = direction === "undo"
      ? this._editorUndoStack : this._editorRedoStack;
    const target = direction === "undo"
      ? this._editorRedoStack : this._editorUndoStack;
    if (!source.length || !this._editorDocument) return;
    target.push({
      document: structuredClone(this._editorDocument),
      selectedId: this._editorSelectedId,
      selectedIds: [...this._editorSelectedIds],
    });
    const snapshot = source.pop();
    this._editorDocument = structuredClone(snapshot.document);
    this._editorSelectedId = snapshot.selectedId;
    this._editorSelectedIds = snapshot.selectedIds
      || (snapshot.selectedId ? [snapshot.selectedId] : []);
    this._render();
    this._scheduleEditorSave();
  }

  _handleEditorKeydown(event) {
    if (!this._editorDocument) return;
    if (event.key === "Escape" && this._editorSettingsOpenId) {
      event.preventDefault();
      this._editorSettingsOpenId = null;
      this._render();
      return;
    }
    if (event.target instanceof HTMLInputElement
      || event.target instanceof HTMLTextAreaElement
      || event.target instanceof HTMLSelectElement) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      this._restoreEditorHistory(event.shiftKey ? "redo" : "undo");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      this._editorAction("duplicate-component");
      return;
    }
    if (["Backspace", "Delete"].includes(event.key)) {
      event.preventDefault();
      this._editorAction("delete-component");
      return;
    }
    const movement = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      ArrowUp: [0, -1], ArrowDown: [0, 1],
    }[event.key];
    const components = this._selectedEditorComponents().filter(
      (component) => !component.locked,
    );
    if (!movement || !components.length || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    this._recordEditorHistory();
    const step = event.shiftKey ? 5 : this._editorGridSize;
    const bounds = components.map((component) => this._editorBounds(component));
    const requestedX = movement[0] * step;
    const requestedY = movement[1] * step;
    const deltaX = Math.max(
      -Math.min(...bounds.map((item) => item.x)),
      Math.min(requestedX, 100 - Math.max(...bounds.map(
        (item) => item.x + item.width,
      ))),
    );
    const deltaY = Math.max(
      -Math.min(...bounds.map((item) => item.y)),
      Math.min(requestedY, 100 - Math.max(...bounds.map(
        (item) => item.y + item.height,
      ))),
    );
    bounds.forEach((item) => {
      item.x = this._snapEditorValue(item.x + deltaX);
      item.y = this._snapEditorValue(item.y + deltaY);
    });
    this._render();
    this._scheduleEditorSave();
  }

  _snapEditorValue(value) {
    if (!this._editorSnapEnabled) return Math.round(value * 10) / 10;
    return Math.round(value / this._editorGridSize) * this._editorGridSize;
  }

  _alignEditorComponent(alignment) {
    const components = this._selectedEditorComponents().filter(
      (component) => !component.locked,
    );
    if (!components.length) return;
    this._recordEditorHistory();
    const bounds = components.map((component) => this._editorBounds(component));
    const group = {
      left: Math.min(...bounds.map((item) => item.x)),
      right: Math.max(...bounds.map((item) => item.x + item.width)),
      top: Math.min(...bounds.map((item) => item.y)),
      bottom: Math.max(...bounds.map((item) => item.y + item.height)),
    };
    bounds.forEach((item) => {
      if (alignment === "left") item.x = components.length > 1 ? group.left : 0;
      if (alignment === "center") {
        const center = components.length > 1
          ? (group.left + group.right) / 2 : 50;
        item.x = center - item.width / 2;
      }
      if (alignment === "right") {
        item.x = (components.length > 1 ? group.right : 100) - item.width;
      }
      if (alignment === "top") item.y = components.length > 1 ? group.top : 0;
      if (alignment === "middle") {
        const middle = components.length > 1
          ? (group.top + group.bottom) / 2 : 50;
        item.y = middle - item.height / 2;
      }
      if (alignment === "bottom") {
        item.y = (components.length > 1 ? group.bottom : 100) - item.height;
      }
      item.x = this._snapEditorValue(item.x);
      item.y = this._snapEditorValue(item.y);
    });
    this._render();
    this._scheduleEditorSave();
  }

  _distributeEditorComponents(direction) {
    const components = this._selectedEditorComponents().filter(
      (component) => !component.locked,
    );
    if (components.length < 3) return;
    this._recordEditorHistory();
    const horizontal = direction === "horizontal";
    const ordered = components.map((component) => ({
      component,
      bounds: this._editorBounds(component),
    })).sort((a, b) => horizontal
      ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y);
    const start = horizontal ? ordered[0].bounds.x : ordered[0].bounds.y;
    const last = ordered.at(-1).bounds;
    const end = horizontal ? last.x + last.width : last.y + last.height;
    const occupied = ordered.reduce((total, item) =>
      total + (horizontal ? item.bounds.width : item.bounds.height), 0);
    const gap = (end - start - occupied) / (ordered.length - 1);
    let cursor = start;
    ordered.forEach(({ bounds }) => {
      if (horizontal) {
        bounds.x = this._snapEditorValue(cursor);
        cursor += bounds.width + gap;
      } else {
        bounds.y = this._snapEditorValue(cursor);
        cursor += bounds.height + gap;
      }
    });
    this._render();
    this._scheduleEditorSave();
  }

  _editorOrientation() {
    const configured = normalizeOrientation(this._state?.presentation?.orientation);
    if (configured !== "auto") return configured;
    return window.matchMedia("(orientation: portrait)").matches
      ? "portrait" : "landscape";
  }

  _editorBounds(component) {
    return component.orientation_overrides?.[this._editorOrientation()]?.bounds
      || component.bounds;
  }

  _editorComponentStyle(component, bounds) {
    const style = component.style || {};
    const semanticToken = String(component.style_ref || "text_body")
      .replaceAll("_", "-");
    const textColor = normalizeColor(style.text_color, "")
      || `var(--mp-${semanticToken},#ffffff)`;
    const backgroundColor = normalizeColor(style.background_color, "")
      || (component.type === "surface"
        ? `var(--mp-${semanticToken},#32110d)` : "transparent");
    const fontSize = Math.min(20, Math.max(0.1, Number(style.font_size ?? 3)));
    const minFontSize = Math.min(
      20, Math.max(0.1, Number(component.constraints?.min_font_size ?? 0.8)),
    );
    const opacity = Math.min(1, Math.max(0, Number(style.opacity ?? 1)));
    const alignment = ["left", "center", "right"].includes(style.text_align)
      ? style.text_align : "center";
    const glow = Math.min(1, Math.max(0, Number(style.glow ?? 0)));
    const rotation = Math.min(
      180, Math.max(-180, Number(style.rotation ?? 0)),
    );
    const imageFit = ["contain", "cover", "fill"].includes(style.image_fit)
      ? style.image_fit
      : component.type === "backdrop" ? "cover" : "contain";
    const fontFamily = componentFontFamily(
      style.font_family || (["mode_heading", "title"].includes(component.type)
        ? "theme_heading" : "theme_body"),
    );
    const blend = [
      "normal", "multiply", "screen", "overlay", "soft-light",
    ].includes(component.blend_mode) ? component.blend_mode : "normal";
    const maxLines = Math.min(
      20, Math.max(0, Number(component.constraints?.max_lines ?? 0)),
    );
    const clipInset = [
      -bounds.y / bounds.height * 100,
      -(100 - bounds.x - bounds.width) / bounds.width * 100,
      -(100 - bounds.y - bounds.height) / bounds.height * 100,
      -bounds.x / bounds.width * 100,
    ].map((value) => `${value}%`).join(" ");
    return [
      `left:${bounds.x}%`, `top:${bounds.y}%`,
      `width:${bounds.width}%`, `height:${bounds.height}%`,
      `z-index:${component.z_index}`, `color:${textColor}`,
      `background-color:${backgroundColor}`,
      `font-family:${fontFamily}`,
      `font-size:clamp(${minFontSize}cqw,${fontSize}cqw,20cqw)`,
      `--component-preferred-font:${fontSize}`,
      `--component-min-font:${minFontSize}`,
      `opacity:${opacity}`, `text-align:${alignment}`,
      `--component-image-fit:${imageFit}`,
      `--component-rotation:${rotation}deg`,
      `mix-blend-mode:${blend}`, `--editor-max-lines:${maxLines}`,
      `--component-safe-clip:${clipInset}`,
      `text-shadow:0 0 ${glow * 24}px ${textColor}`,
    ].join(";");
  }

  _startEditorPointer(event, element) {
    if (event.button !== 0 || !this._editorDocument) return;
    event.preventDefault();
    const identifier = element.dataset.editorComponent;
    if (event.shiftKey) {
      const wasSelected = this._editorSelectedIds.includes(identifier);
      this._selectEditorComponent(identifier, true);
      if (wasSelected) {
        this._render();
        return;
      }
    } else if (!this._editorSelectedIds.includes(identifier)) {
      this._selectEditorComponent(identifier);
    }
    const component = this._selectedEditorComponent();
    const canvas = this.shadowRoot.querySelector(".editor-component-surface");
    if (!component || component.locked || !canvas) return;
    this._recordEditorHistory();
    element.classList.add("selected");
    const canvasBox = canvas.getBoundingClientRect();
    const bounds = this._editorBounds(component);
    const selectedBounds = this._selectedEditorComponents().map((item) => ({
      id: item.id,
      bounds: this._editorBounds(item),
      start: { ...this._editorBounds(item) },
    }));
    const start = {
      x: event.clientX, y: event.clientY,
      bounds: { ...bounds },
      resize: Boolean(event.target.closest("[data-editor-resize]")),
      preserveAspect: Boolean(component.constraints?.preserve_aspect),
      aspectRatio: (bounds.width / 100 * canvasBox.width)
        / Math.max(1, bounds.height / 100 * canvasBox.height),
    };
    element.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      const dx = ((moveEvent.clientX - start.x) / canvasBox.width) * 100;
      const dy = ((moveEvent.clientY - start.y) / canvasBox.height) * 100;
      if (start.resize) {
        let width = Math.min(
          100 - bounds.x,
          Math.max(0.1, this._snapEditorValue(start.bounds.width + dx)),
        );
        let height = Math.min(
          100 - bounds.y,
          Math.max(0.1, this._snapEditorValue(start.bounds.height + dy)),
        );
        if (start.preserveAspect) {
          const ratio = start.aspectRatio;
          const widthFromHeight = (
            height / 100 * canvasBox.height * ratio / canvasBox.width * 100
          );
          const heightFromWidth = (
            width / 100 * canvasBox.width / ratio / canvasBox.height * 100
          );
          if (Math.abs(dx * canvasBox.width) >= Math.abs(dy * canvasBox.height)) {
            height = Math.min(100 - bounds.y, Math.max(0.1, heightFromWidth));
            width = Math.min(
              100 - bounds.x,
              height / 100 * canvasBox.height * ratio / canvasBox.width * 100,
            );
          } else {
            width = Math.min(100 - bounds.x, Math.max(0.1, widthFromHeight));
            height = Math.min(
              100 - bounds.y,
              width / 100 * canvasBox.width / ratio / canvasBox.height * 100,
            );
          }
          width = Math.round(width * 10) / 10;
          height = Math.round(height * 10) / 10;
        }
        bounds.width = width;
        bounds.height = height;
      } else {
        const groupLeft = Math.min(...selectedBounds.map((item) => item.start.x));
        const groupRight = Math.max(...selectedBounds.map(
          (item) => item.start.x + item.start.width,
        ));
        const groupTop = Math.min(...selectedBounds.map((item) => item.start.y));
        const groupBottom = Math.max(...selectedBounds.map(
          (item) => item.start.y + item.start.height,
        ));
        const snappedX = this._snapEditorValue(start.bounds.x + dx);
        const snappedY = this._snapEditorValue(start.bounds.y + dy);
        const deltaX = Math.max(
          -groupLeft, Math.min(snappedX - start.bounds.x, 100 - groupRight),
        );
        const deltaY = Math.max(
          -groupTop, Math.min(snappedY - start.bounds.y, 100 - groupBottom),
        );
        selectedBounds.forEach((item) => {
          item.bounds.x = item.start.x + deltaX;
          item.bounds.y = item.start.y + deltaY;
        });
      }
      selectedBounds.forEach((item) => {
        const selectedElement = this.shadowRoot.querySelector(
          `[data-editor-component="${CSS.escape(item.id)}"]`,
        );
        if (!selectedElement) return;
        Object.assign(selectedElement.style, {
          left: `${item.bounds.x}%`,
          top: `${item.bounds.y}%`,
          width: `${item.bounds.width}%`,
          height: `${item.bounds.height}%`,
        });
      });
    };
    const finish = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", finish);
      element.removeEventListener("pointercancel", finish);
      this._render();
      this._scheduleEditorSave();
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", finish);
    element.addEventListener("pointercancel", finish);
  }

  _scheduleEditorSave() {
    clearTimeout(this._editorSaveTimer);
    this._editorSaveTimer = setTimeout(() => {
      this._flushEditorSave().catch((error) => {
        const status = this.shadowRoot.querySelector(".studio-status");
        if (status) status.textContent = error?.message || "Unable to autosave draft.";
      });
    }, 450);
  }

  async _flushEditorSave() {
    clearTimeout(this._editorSaveTimer);
    this._editorSaveTimer = null;
    if (!this._editorDocument || !this._editorProfileId) return;
    const result = await this._callLibrary("update", {
      profile_id: this._editorProfileId,
      document: this._editorDocument,
    });
    this._presentationLibrary = result.library;
  }

  async _callLibrary(action, fields = {}) {
    if (!this._hass || !this._state?.entry_id) throw new Error("Studio is offline");
    return this._hass.callWS({
      type: "movie_poster/presentation_library",
      entry_id: this._state.entry_id,
      action,
      ...fields,
    });
  }

  _openEditor(profileId, library = this._presentationLibrary) {
    const draft = library?.profiles?.[profileId]?.draft;
    if (!draft) return;
    this._presentationLibrary = library;
    this._editorProfileId = profileId;
    this._editorDocument = structuredClone(draft);
    this._editorSelectedId = this._editorDocument.design.components[0]?.id || null;
    this._editorSelectedIds = this._editorSelectedId
      ? [this._editorSelectedId] : [];
    this._editorUndoStack = [];
    this._editorRedoStack = [];
    this._editorZoom = 1;
    this._editorPanX = 0;
    this._editorPanY = 0;
    this._render();
  }

  _closeEditor() {
    clearTimeout(this._editorSaveTimer);
    this._editorSaveTimer = null;
    this._editorProfileId = null;
    this._editorDocument = null;
    this._editorSelectedId = null;
    this._editorSelectedIds = [];
    this._editorSettingsOpenId = null;
    this._editorUndoStack = [];
    this._editorRedoStack = [];
  }

  _applyEditorPreview(preview) {
    const sample = studioState();
    sample.entry_id = this._state.entry_id;
    sample.presentation = {
      ...sample.presentation,
      ...this._state.presentation,
    };
    this._editorPreviewState = preview;
    if (preview === "now_playing" || preview === "paused") {
      sample.mode = "now_playing";
      sample.heading = sample.presentation.now_playing_text;
      sample.session.state = preview === "paused" ? "paused" : "playing";
    } else if (preview === "no_artwork") {
      sample.media.poster_url = null;
      sample.media.backdrop_url = null;
    } else if (preview === "stress") {
      sample.media.title = "The Impossibly Long Motion Picture Title That Must Fit";
      sample.media.subtitle = "A deliberately lengthy subtitle used to validate responsive typography";
      sample.media.summary = "This stress-test summary intentionally contains much more copy than a typical presentation. It verifies that the authored component remains inside its normalized bounds without escaping the canvas, covering neighboring controls, or making the complete design larger than the available viewport.";
    } else if (preview === "connection_warning") {
      sample.health = {
        connected: false,
        message: "Plex is temporarily unavailable. Retrying automatically.",
      };
    }
    this._state = sample;
    this._render();
  }

  async _importPresentationPackage(file) {
    if (!file) return;
    const status = this.shadowRoot.querySelector(".studio-status");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const result = await this._callLibrary("import", {
        package: window.btoa(binary),
      });
      this._openEditor(result.profile_id, result.library);
      if (status) status.textContent = "Presentation package imported as a draft.";
    } catch (error) {
      if (status) status.textContent = error?.message || "Invalid presentation package.";
    }
  }

  async _uploadEditorAsset(file) {
    if (!file || !this._editorProfileId) return;
    const status = this.shadowRoot.querySelector(".studio-status");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = `assets/user/${safeName}`;
      const result = await this._callLibrary("put_asset", {
        profile_id: this._editorProfileId,
        asset_path: path,
        asset: this._bytesToBase64(new Uint8Array(await file.arrayBuffer())),
      });
      this._presentationLibrary = result.library;
      if (status) status.textContent = `Uploaded ${result.asset_path}.`;
      this._render();
    } catch (error) {
      if (status) status.textContent = error?.message || "Unable to upload asset.";
    }
  }

  async _deleteEditorAsset(path) {
    if (!path || !this._editorProfileId) return;
    const status = this.shadowRoot.querySelector(".studio-status");
    try {
      const result = await this._callLibrary("delete_asset", {
        profile_id: this._editorProfileId,
        asset_path: path,
      });
      this._presentationLibrary = result.library;
      if (status) status.textContent = `Removed ${path}.`;
      this._render();
    } catch (error) {
      if (status) status.textContent = error?.message || "Unable to remove asset.";
    }
  }

  _bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return window.btoa(binary);
  }

  _studioPlayerChoices() {
    const userId = this._settings?.user_id || this._choices.owner_user_id || "";
    const allowed = new Set(this._choices.player_ids_by_user?.[userId] || []);
    return (this._choices.players || []).filter(({ value }) =>
      value === "" || allowed.has(value));
  }

  _normalizePlaybackSettings() {
    if (!this._settings) return;
    const allowed = new Set(this._studioPlayerChoices().map(({ value }) => value));
    if (!allowed.has(this._settings.player_id || "")) this._settings.player_id = "";
  }

  async _saveStudio() {
    const button = this.shadowRoot.querySelector('[data-studio-action="save"]');
    const status = this.shadowRoot.querySelector(".studio-status");
    if (!this._hass || !this._state?.entry_id || !button || !this._settings) return;
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      const presentation = this._state.presentation;
      await this._hass.callWS({
        type: "movie_poster/update_settings",
        entry_id: this._state.entry_id,
        profile_id: this._settings.profile_id || "default",
        source: this._settings.source,
        player_id: this._settings.player_id || "",
        user_id: this._settings.user_id || "",
        grace_seconds: Number(this._settings.grace_seconds),
        rotation_seconds: Number(this._settings.rotation_seconds),
        library_refresh_seconds: Number(this._settings.library_refresh_seconds),
        theme: normalizeTheme(presentation.theme),
        orientation: normalizeOrientation(presentation.orientation),
        layout: normalizeLayout(presentation.layout),
        frame_theme: normalizeFrame(presentation.frame_theme),
        show_title: presentation.show_title !== false,
        show_subtitle: presentation.show_subtitle !== false,
        show_year: presentation.show_year !== false,
        show_rating: presentation.show_rating !== false,
        show_runtime: presentation.show_runtime !== false,
        show_summary: presentation.show_summary !== false,
        show_progress: presentation.show_progress !== false,
        show_session: presentation.show_session !== false,
        enable_motion: presentation.enable_motion !== false,
        kiosk_mode: presentation.kiosk_mode !== false,
        accent_color: normalizeColor(presentation.accent_color, "#f6cf70"),
        background_color: normalizeColor(presentation.background_color, "#090706"),
        heading_font: normalizeFont(presentation.heading_font || "cinematic"),
        body_font: normalizeFont(presentation.body_font),
        now_playing_text: normalizeText(presentation.now_playing_text, "Now Playing"),
        coming_soon_text: normalizeText(presentation.coming_soon_text, "Coming Soon"),
        eyebrow_text: normalizeText(presentation.eyebrow_text, "Theater Presentation"),
        logo_url: String(presentation.logo_url || "").trim(),
        logo_position: normalizeLogoPosition(presentation.logo_position),
      });
      status.textContent = "Saved. Returning to integration settings…";
      window.setTimeout(() => this._returnToSettings(), 350);
    } catch (error) {
      status.textContent = error?.message || "Unable to save display settings.";
      button.disabled = false;
      button.textContent = "Save & return";
    }
  }

  async _loadStudioSettings() {
    if (!this._hass || !this._state?.entry_id) return;
    try {
      const result = await this._hass.callWS({
        type: "movie_poster/get_settings",
        entry_id: this._state.entry_id,
        profile_id: this._requestedProfileId,
      });
      this._settings = result.settings;
      this._choices = result.choices;
      this._presentationCatalog = result.presentation_catalog
        || this._presentationCatalog;
      this._normalizePlaybackSettings();
      this._profiles = result.profiles || {};
      const library = await this._callLibrary("list");
      this._presentationLibrary = library.library;
      this._presentationCatalog = library.catalog
        || this._presentationCatalog;
      this._render();
    } catch (error) {
      const status = this.shadowRoot.querySelector(".studio-status");
      if (status) status.textContent = error?.message || "Unable to load Plex settings.";
    }
  }

  async _switchProfile(profileId) {
    if (!this._hass || !this._state?.entry_id) return;
    this._requestedProfileId = profileId;
    const url = new URL(window.location.href);
    if (profileId === "default") url.searchParams.delete("profile");
    else url.searchParams.set("profile", profileId);
    window.history.replaceState(null, "", url);
    try {
      const result = await this._hass.callWS({
        type: "movie_poster/get_settings",
        entry_id: this._state.entry_id,
        profile_id: profileId,
      });
      this._settings = result.settings;
      this._choices = result.choices;
      this._presentationCatalog = result.presentation_catalog
        || this._presentationCatalog;
      this._normalizePlaybackSettings();
      this._profiles = result.profiles || {};
      this._state.presentation = { ...this._state.presentation,
        ...this._profiles[profileId]?.presentation };
      this._state.heading = this._state.presentation.coming_soon_text;
      this._renderIdentity = null;
      this._render();
    } catch (error) {
      const status = this.shadowRoot.querySelector(".studio-status");
      if (status) status.textContent = error?.message || "Unable to load profile.";
    }
  }

  async _profileAction(action) {
    const status = this.shadowRoot.querySelector(".studio-status");
    if (action === "export") {
      const profile = this._profiles[this._settings?.profile_id || "default"];
      if (!profile) return;
      const blob = new Blob([JSON.stringify(profile, null, 2)],
        { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `movie-poster-${this._settings.profile_id || "default"}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      if (status) status.textContent = "Profile exported.";
      return;
    }
    if (action === "import") {
      this.shadowRoot.querySelector("[data-profile-file]")?.click();
      return;
    }
    if (action === "create") {
      const name = window.prompt("Name this display profile");
      if (!name?.trim()) return;
      await this._manageProfile("import", { document: {
        version: 1, name: name.trim(),
        presentation: { ...this._state.presentation },
      } });
      return;
    }
    if (action === "delete" && this._settings?.profile_id !== "default"
      && window.confirm(`Delete ${this._profiles[this._settings.profile_id]?.name || "this profile"}?`)) {
      await this._manageProfile("delete", { profile_id: this._settings.profile_id });
    }
  }

  async _importProfile(file) {
    if (!file) return;
    const status = this.shadowRoot.querySelector(".studio-status");
    try {
      const document = JSON.parse(await file.text());
      await this._manageProfile("import", { document });
    } catch (error) {
      if (status) status.textContent = error?.message || "Invalid profile file.";
    }
  }

  async _manageProfile(action, fields) {
    const status = this.shadowRoot.querySelector(".studio-status");
    try {
      const result = await this._hass.callWS({
        type: "movie_poster/manage_profile", entry_id: this._state.entry_id,
        action, ...fields,
      });
      await this._switchProfile(action === "delete" ? "default" : result.profile_id);
      if (status) status.textContent = action === "delete"
        ? "Profile deleted." : "Profile saved.";
    } catch (error) {
      if (status) status.textContent = error?.message || "Unable to update profile.";
    }
  }

  _returnToSettings() {
    if (document.referrer.startsWith(`${window.location.origin}/config/integrations`)) {
      window.history.back();
      return;
    }
    window.location.assign("/config/integrations/integration/movie_poster");
  }

  _renderError(message) {
    this.shadowRoot.innerHTML = `${this._styles()}
      <main class="empty error"><div><h1>Movie Poster</h1>
      <p>${escapeHtml(message)}</p></div></main>`;
  }

  _styles() {
    return `<style>
      :host {
        --gold: #f6cf70;
        --gold-deep: #b77a24;
        --ink: #090706;
        --velvet: #310909;
        --theme-text: #fff7df;
        --theme-muted: #c9bfa8;
        --theme-surface: #32110d;
        --theme-surface-deep: #160806;
        --theme-backdrop-accent: #7a251d;
        --theme-backdrop-edge: #4a0b0e;
        --mp-light-primary: #f6cf70;
        --mp-light-secondary: #b4232f;
        --mp-accent-primary: #f6cf70;
        --mp-accent-secondary: #7a251d;
        --mp-text-heading: #fff7df;
        --mp-text-body: #e8dcc2;
        --mp-text-muted: #c9bfa8;
        --mp-surface: #32110d;
        --mp-surface-elevated: #4a1711;
        --mp-backdrop: #090706;
        --mp-border: #b77a24;
        --mp-progress-track: #3b2118;
        --mp-progress-fill: #f6cf70;
        display: block;
        min-height: 100vh;
        min-height: 100dvh;
        position: relative;
        overflow: hidden;
        background: var(--ink);
        color: #fff7df;
        font-family: "Trebuchet MS", Arial, sans-serif;
      }
      * { box-sizing: border-box; }
      .theater, .empty {
        position: relative;
        min-height: 100vh;
        min-height: 100dvh;
        overflow: hidden;
        display: grid;
        place-items: center;
        padding: clamp(16px, 2.4vw, 40px);
        background:
          radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--theme-backdrop-accent) 42%, transparent) 0%, transparent 45%),
          linear-gradient(145deg, color-mix(in srgb, var(--theme-backdrop-edge) 45%, var(--ink)), var(--ink) 50%, #000);
      }
      .font-heading-system { --heading-font: "Trebuchet MS", Arial, sans-serif; }
      .font-heading-cinematic { --heading-font: Impact, "Arial Narrow", sans-serif; }
      .font-heading-serif { --heading-font: Georgia, "Times New Roman", serif; }
      .font-heading-modern { --heading-font: Avenir, Montserrat, Arial, sans-serif; }
      .font-heading-condensed { --heading-font: "Arial Narrow", Impact, sans-serif; }
      .font-body-system { --body-font: "Trebuchet MS", Arial, sans-serif; }
      .font-body-cinematic { --body-font: Georgia, "Times New Roman", serif; }
      .font-body-serif { --body-font: Georgia, "Times New Roman", serif; }
      .font-body-modern { --body-font: Avenir, Montserrat, Arial, sans-serif; }
      .font-body-condensed { --body-font: "Arial Narrow", Arial, sans-serif; }
      .theater {
        --gold: var(--mp-accent-primary, var(--legacy-accent, #f6cf70));
        --gold-deep: var(--mp-border, #b77a24);
        --ink: var(--mp-backdrop, var(--legacy-background, #090706));
        --velvet: var(--mp-surface, #310909);
        --theme-text: var(--mp-text-heading, #fff7df);
        --theme-muted: var(--mp-text-muted, #c9bfa8);
        --theme-surface: var(--mp-surface-elevated, #32110d);
        --theme-surface-deep: var(--mp-surface, #160806);
        --theme-backdrop-accent: var(--mp-accent-secondary, #7a251d);
        --theme-backdrop-edge: var(--mp-border, #4a0b0e);
        color: var(--mp-text-body, #e8dcc2);
        font-family: var(--body-font, "Trebuchet MS", Arial, sans-serif);
      }
      .theme-art_deco {
        --gold: #e9d59b;
        --gold-deep: #7c6735;
        --ink: #08100f;
        --velvet: #12302c;
        --theme-text: #f0dfaa;
        --theme-muted: #b9ab82;
        --theme-surface: #17332e;
        --theme-surface-deep: #071412;
        --theme-backdrop-accent: #245e51;
        --theme-backdrop-edge: #102d28;
        --mp-light-primary: #d8c17c;
        --mp-light-secondary: #2d8f78;
        --mp-accent-primary: #e9d59b;
        --mp-accent-secondary: #245e51;
        --mp-text-heading: #f0dfaa;
        --mp-text-body: #ded2aa;
        --mp-text-muted: #b9ab82;
        --mp-surface: #17332e;
        --mp-surface-elevated: #21473f;
        --mp-backdrop: #08100f;
        --mp-border: #7c6735;
        --mp-progress-track: #15302a;
        --mp-progress-fill: #d8c17c;
      }
      .theme-neon {
        --gold: #29f2ff;
        --gold-deep: #b51fff;
        --ink: #05000d;
        --velvet: #260052;
        --theme-text: #f8edff;
        --theme-muted: #bcb0d0;
        --theme-surface: #260052;
        --theme-surface-deep: #090012;
        --theme-backdrop-accent: #b51fff;
        --theme-backdrop-edge: #003d5c;
        --mp-light-primary: #29f2ff;
        --mp-light-secondary: #ff3ea5;
        --mp-accent-primary: #29f2ff;
        --mp-accent-secondary: #b51fff;
        --mp-text-heading: #f8edff;
        --mp-text-body: #e8ddf2;
        --mp-text-muted: #bcb0d0;
        --mp-surface: #260052;
        --mp-surface-elevated: #3a0870;
        --mp-backdrop: #05000d;
        --mp-border: #29f2ff;
        --mp-progress-track: #25103b;
        --mp-progress-fill: #ff3ea5;
      }
      .theme-minimal {
        --gold: #f2f2f2;
        --gold-deep: #777;
        --ink: #171717;
        --velvet: #252525;
        --theme-text: #171717;
        --theme-muted: #5b5954;
        --theme-surface: #f5f3ee;
        --theme-surface-deep: #e8e5de;
        --theme-backdrop-accent: #d1cec6;
        --theme-backdrop-edge: #777;
        --mp-light-primary: #f2f2f2;
        --mp-light-secondary: #8a8a86;
        --mp-accent-primary: #171717;
        --mp-accent-secondary: #777;
        --mp-text-heading: #171717;
        --mp-text-body: #383631;
        --mp-text-muted: #5b5954;
        --mp-surface: #f5f3ee;
        --mp-surface-elevated: #fff;
        --mp-backdrop: #e8e5de;
        --mp-border: #777;
        --mp-progress-track: #d1cec6;
        --mp-progress-fill: #171717;
      }
      .theme-oled {
        --gold: #fff;
        --gold-deep: #333;
        --ink: #000;
        --velvet: #000;
        --theme-text: #fff;
        --theme-muted: #aaa;
        --theme-surface: #000;
        --theme-surface-deep: #000;
        --theme-backdrop-accent: #111;
        --theme-backdrop-edge: #050505;
        --mp-light-primary: #fff;
        --mp-light-secondary: #777;
        --mp-accent-primary: #fff;
        --mp-accent-secondary: #777;
        --mp-text-heading: #fff;
        --mp-text-body: #d6d6d6;
        --mp-text-muted: #999;
        --mp-surface: #000;
        --mp-surface-elevated: #080808;
        --mp-backdrop: #000;
        --mp-border: #292929;
        --mp-progress-track: #222;
        --mp-progress-fill: #fff;
      }
      .marquee { background: linear-gradient(var(--theme-surface), var(--theme-surface-deep)); }
      .meta, .summary, .session { color: var(--theme-muted); }
      .ambient {
        position: absolute;
        inset: -30px;
        background-image: var(--backdrop);
        background-size: cover;
        background-position: center;
        filter: blur(28px) brightness(.22) saturate(.8);
        opacity: .75;
        transform: scale(1.08);
      }
      .connection-warning {
        position: fixed;
        z-index: 5;
        top: max(12px, env(safe-area-inset-top));
        left: 50%;
        width: max-content;
        max-width: calc(100vw - 32px);
        margin: 0;
        padding: 9px 16px;
        transform: translateX(-50%);
        border: 1px solid #ffb65c88;
        border-radius: 999px;
        background: #281608ee;
        box-shadow: 0 5px 24px #0009;
        color: #ffd7a3;
        font-size: .82rem;
        text-align: center;
      }
      .connection-warning[hidden] { display: none; }
      .display-controls {
        position: fixed;
        z-index: 30;
        right: max(14px, env(safe-area-inset-right));
        bottom: max(14px, env(safe-area-inset-bottom));
        width: min(520px, calc(100vw - 28px));
        padding: 14px;
        border: 1px solid #ffffff2e;
        border-radius: 12px;
        background: #090706ed;
        box-shadow: 0 14px 45px #000c;
        color: #fff7df;
        opacity: 0;
        pointer-events: none;
        transform: translateY(14px);
        transition: opacity .2s ease, transform .2s ease;
        backdrop-filter: blur(14px);
      }
      .display-controls.visible, .display-controls:focus-within, .display-controls:hover {
        opacity: 1; pointer-events: auto; transform: translateY(0);
      }
      .display-status { display: grid; gap: 3px; margin-bottom: 11px; }
      .display-status strong { color: var(--gold); text-transform: uppercase; letter-spacing: .12em; }
      .display-status span { color: #d7cbb6; font-size: .78rem; }
      .display-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .display-actions button {
        min-height: 36px; padding: 0 12px; border: 1px solid #ffffff35;
        border-radius: 6px; background: #241915; color: inherit; cursor: pointer;
      }
      .display-actions button:hover, .display-actions button:focus-visible {
        border-color: var(--gold); outline: 3px solid var(--gold);
        outline-offset: 2px;
      }
      .display-actions button:disabled { cursor: wait; opacity: .55; }
      .display-action-status { display: block; min-height: 1em; margin-top: 8px; color: #c6b99f; }
      .studio {
        position: fixed;
        z-index: 20;
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        display: grid;
        grid-template-columns: repeat(2, minmax(105px, 1fr));
        gap: 9px 12px;
        width: min(390px, calc(100vw - 24px));
        max-height: calc(100vh - 24px);
        max-height: calc(100dvh - 24px);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
        scrollbar-gutter: stable;
        box-sizing: border-box;
        padding: 14px;
        border: 1px solid #ffffff30;
        border-radius: 12px;
        background: #090706ee;
        box-shadow: 0 12px 35px #000b;
        color: #fff7df;
        font-size: .78rem;
        backdrop-filter: blur(12px);
      }
      .studio strong, .studio h3, .studio small, .studio-actions { grid-column: 1 / -1; }
      .studio h3 { margin: 8px 0 0; color: var(--gold); font-size: 13px; text-transform: uppercase; letter-spacing: .12em; }
      .studio label {
        display: grid;
        min-width: 0;
        gap: 4px;
        text-transform: capitalize;
      }
      .studio select, .studio input, .studio button {
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
      }
      .studio select, .studio input[type="text"], .studio input[type="number"] {
        width: 100%;
        min-height: 31px;
        border: 1px solid #ffffff33;
        border-radius: 5px;
        background: #221713;
        color: inherit;
      }
      .studio input[type="text"], .studio input[type="number"] { width: 100%; padding: 0 8px; }
      .studio input[type="color"] { width: 100%; min-height: 32px; padding: 2px; }
      .studio .studio-wide { grid-column: 1 / -1; }
      .studio .studio-check { display: flex; align-items: center; gap: 6px; }
      .studio small { color: #c6b99f; }
      .studio-actions { display: flex; justify-content: flex-end; gap: 8px; }
      .studio button {
        min-height: 34px;
        padding: 0 12px;
        border: 1px solid #ffffff35;
        border-radius: 6px;
        background: #241915;
        color: inherit;
        cursor: pointer;
      }
      .studio button.primary { border-color: var(--gold); background: #8b571d; }
      .studio button:disabled { cursor: wait; opacity: .65; }
      .studio :is(button, select, input):focus-visible {
        outline: 3px solid var(--gold);
        outline-offset: 2px;
      }
      .studio-profile-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .studio-inline {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }
      .editor-draft-label {
        margin: 0;
        padding: 8px 10px;
        border-left: 3px solid var(--gold);
        background: #ffffff0a;
      }
      .editor-properties {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0;
        padding: 10px;
        border: 1px solid #ffffff24;
      }
      .editor-context-popover {
        position: fixed;
        z-index: 120;
        left: max(182px, min(
          calc(100vw - 596px),
          calc((100vw - 414px) * var(--popover-x) / 100)
        ));
        top: max(12px, min(
          calc(100dvh - 520px),
          calc(24px + (100dvh - 48px) * var(--popover-y) / 100)
        ));
        width: min(340px, calc(100vw - 438px));
        max-height: min(72dvh, 620px);
        overflow: auto;
        padding: 14px;
        border: 1px solid #f6cf7088;
        border-radius: 12px;
        background: #100d0bec;
        box-shadow: 0 18px 55px #000e;
        color: #fff7df;
        font-size: .78rem;
        backdrop-filter: blur(18px);
      }
      .editor-context-popover legend {
        max-width: calc(100% - 42px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .editor-popover-close {
        position: absolute;
        top: 7px;
        right: 7px;
        width: 32px;
        min-height: 32px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        font-size: 20px;
        line-height: 1;
      }
      .editor-advanced {
        margin: 2px 0;
        padding: 0;
        border: 0;
      }
      .editor-advanced summary {
        padding: 8px 10px;
        border: 1px solid #ffffff24;
        border-radius: 6px;
        color: #e8d5a7;
        cursor: pointer;
      }
      .editor-advanced-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding-top: 8px;
      }
      .editor-layers {
        display: grid;
        gap: 6px;
        margin: 0;
        padding: 10px;
        border: 1px solid #ffffff24;
      }
      .editor-properties legend,
      .editor-layers legend { padding-inline: 6px; color: var(--gold); }
      .editor-layer-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto auto auto;
        gap: 5px;
      }
      .editor-layer-row.structural-layer {
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        color: #ffffffa8;
      }
      .editor-layer-row > button:first-child {
        overflow: hidden;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .editor-layer-row.selected > button:first-child {
        border-color: var(--gold);
        color: var(--gold);
      }
      .editor-align-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
      }
      .editor-warnings {
        padding: 9px 11px;
        border: 1px solid #e7a94d66;
        border-radius: 7px;
        background: #4a2c1629;
        color: #ffe2ac;
      }
      .editor-warnings ul {
        margin: 5px 0 0;
        padding-left: 18px;
      }
      .editor-assets {
        display: grid;
        gap: 7px;
        margin: 0;
        padding: 10px;
        border: 1px solid #ffffff24;
      }
      .editor-assets legend { padding-inline: 6px; color: var(--gold); }
      .editor-asset-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 7px;
      }
      .editor-asset-row code {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .studio-preview {
        width: calc(100vw - 430px);
        min-height: 100vh;
        min-height: 100dvh;
        margin-right: auto;
        padding: clamp(12px, 1.5vw, 24px);
      }
      .studio-preview.orientation-landscape .marquee-frame,
      .studio-preview.orientation-auto .marquee-frame {
        width: min(calc(100vw - 462px), 126.667vh);
      }
      .studio-preview.orientation-portrait .marquee-frame {
        width: min(calc(100vw - 462px), 53.438vh);
      }
      .studio-preview h1 { font-size: clamp(1.4rem, 9cqw, 4rem); }
      .studio-preview.orientation-portrait h1 {
        font-size: clamp(1.25rem, 11cqw, 2.8rem);
      }
      .studio-preview .details h2 {
        font-size: clamp(1.35rem, 7cqw, 3rem);
      }
      .studio-preview .summary { font-size: clamp(.72rem, 2.5cqw, 1rem); }
      @media (max-width: 900px) {
        .studio-preview {
          width: 100vw;
          min-height: 54vh;
          min-height: 54dvh;
          height: 54vh;
          height: 54dvh;
          padding: 10px;
        }
        .studio {
          top: auto;
          bottom: max(8px, env(safe-area-inset-bottom));
          left: 8px;
          right: 8px;
          width: auto;
          max-height: calc(46vh - 16px);
          max-height: calc(46dvh - 16px);
          scrollbar-gutter: auto;
          padding-bottom: max(14px, calc(env(safe-area-inset-bottom) + 8px));
        }
        .studio-preview.orientation-landscape .marquee-frame,
        .studio-preview.orientation-auto .marquee-frame {
          width: min(96vw, 68vh);
        }
        .studio-preview.orientation-portrait .marquee-frame {
          width: min(96vw, 28.688vh);
        }
      }
      @media (min-width: 721px) and (max-width: 900px) and (orientation: portrait) {
        .studio-preview {
          min-height: 46dvh;
          height: 46dvh;
        }
        .studio {
          max-height: calc(54dvh - 16px);
        }
        .studio-preview.orientation-portrait .marquee-frame,
        .studio-preview.orientation-auto .marquee-frame {
          width: min(96vw, calc(25.875dvh - 12px));
        }
        .studio-preview.orientation-landscape .marquee-frame {
          width: min(96vw, calc(61.333dvh - 16px));
        }
        .studio button,
        .studio select,
        .studio input[type="text"],
        .studio input[type="number"] {
          min-height: 40px;
          font-size: 16px;
        }
      }
      @media (max-width: 720px) and (orientation: portrait) {
        .studio-preview.orientation-auto .marquee-frame {
          width: min(96vw, 28.688vh);
        }
      }
      .marquee-frame {
        position: relative;
        container-type: inline-size;
        width: min(1500px, 99vw);
        min-height: min(98vh, 1120px);
        padding: clamp(20px, 3vw, 46px);
        border: 8px solid #2b1608;
        border-radius: 28px;
        background: linear-gradient(135deg, #130b08ee, #050403f5);
        box-shadow: 0 0 0 3px var(--gold-deep), 0 28px 90px #000;
        animation: reveal .55s ease-out both;
      }
      .frame-stage { display: contents; }
      .frame-ornaments { position: absolute; inset: 0; pointer-events: none; }
      .brand-logo {
        position: absolute;
        z-index: 5;
        top: clamp(18px, 2.5vw, 34px);
        width: min(160px, 22%);
        height: 64px;
        pointer-events: none;
      }
      .brand-logo.logo-left { left: clamp(25px, 4vw, 58px); }
      .brand-logo.logo-center { left: 50%; transform: translateX(-50%); }
      .brand-logo.logo-right { right: clamp(25px, 4vw, 58px); }
      .brand-logo img { width: 100%; height: 100%; object-fit: contain; }
      .brand-row {
        position: relative;
        z-index: 5;
        display: grid;
        align-items: center;
        min-height: 64px;
        margin: 0 clamp(5px, 2cqw, 24px) clamp(6px, 1.2vh, 14px);
        gap: clamp(10px, 2.5cqw, 28px);
      }
      .brand-row.logo-left { grid-template-columns: minmax(48px, 22%) 1fr; }
      .brand-row.logo-right { grid-template-columns: 1fr minmax(48px, 22%); }
      .brand-row.logo-center {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
      }
      .brand-row .brand-logo {
        position: static;
        width: 100%;
        height: 64px;
        transform: none;
      }
      .brand-row.logo-right .brand-logo { grid-column: 2; }
      .brand-row.logo-right .brand-eyebrow { grid-column: 1; grid-row: 1; }
      .brand-row.logo-left .brand-eyebrow { text-align: left; }
      .brand-row.logo-right .brand-eyebrow { text-align: right; }
      .brand-row.logo-center .brand-logo { width: min(160px, 32%); }
      .brand-row.logo-center .brand-eyebrow { text-align: center; }
      @container (max-width: 700px) {
        .brand-logo {
          top: 10px;
          width: min(120px, 32%);
          height: 40px;
        }
        .brand-row { min-height: 40px; margin-bottom: 5px; }
        .brand-row .brand-logo { width: 100%; height: 40px; }
        .brand-row.logo-center .brand-logo { width: min(120px, 32%); }
      }
      .ornament { position: absolute; z-index: 2; top: 18%; bottom: 12%; width: 22px; }
      .ornament-left { left: 10px; }
      .ornament-right { right: 10px; }
      .frame-plaque {
        position: relative;
        z-index: 3;
        display: none;
        width: 100%;
        margin: 18px auto 0;
        padding: clamp(14px, 2vw, 24px) clamp(18px, 2.5vw, 32px);
        text-align: center;
        text-transform: uppercase;
      }
      .frame-plaque strong, .frame-plaque span { display: block; }
      .frame-plaque strong {
        font-family: var(--heading-font, Impact, sans-serif);
        font-size: clamp(1.1rem, 2.1vw, 2rem);
        letter-spacing: .1em;
        line-height: 1.05;
      }
      .frame-plaque span {
        margin-top: 7px;
        font-size: clamp(.7rem, 1vw, .95rem);
        letter-spacing: .14em;
        line-height: 1.2;
      }
      .frame-cyber_noir .details h2,
      .frame-cyber_noir .details .subtitle,
      .frame-comic_hero .details h2,
      .frame-comic_hero .details .subtitle,
      .frame-theater_classic .details h2,
      .frame-theater_classic .details .subtitle,
      .frame-indie_nature .details h2,
      .frame-indie_nature .details .subtitle,
      .frame-golden_age .details h2,
      .frame-golden_age .details .subtitle,
      .frame-steampunk .details h2,
      .frame-steampunk .details .subtitle { display: none; }

      /* Layouts stay independent from decorative frames. */
      .layout-poster .marquee-frame { width: min(940px, 99vw); }
      .layout-poster .content { display: block; padding-inline: clamp(20px, 7vw, 90px); }
      .layout-poster .poster { width: min(66vh, 100%); max-height: 82vh; margin: auto; }
      .layout-poster .details { margin-top: 22px; text-align: center; }
      .layout-poster .details h2 { font-size: clamp(1.7rem, 3vw, 3rem); }
      .layout-poster .session { display: none; }
      .layout-split .content { grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr); }
      .layout-split .details {
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: clamp(20px, 3vw, 48px);
        border-left: 1px solid color-mix(in srgb, var(--gold) 35%, transparent);
        background: #0003;
        max-height: var(--fitted-poster-height, 70vh);
        overflow: hidden;
      }
      .frame-stage > .content {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .frame-marquee.layout-split .details h2 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
      }

      /* Smoked-glass near-future display enclosure. */
      .frame-cyber_noir .marquee-frame {
        --cyber-cyan: var(--mp-light-primary, #29f2ff);
        --cyber-magenta: var(--mp-light-secondary, #ff3ea5);
        --cyber-white: var(--mp-text-heading, #f4fbff);
        --cyber-muted: var(--mp-text-muted, #a9c1ca);
        --cyber-core: color-mix(in srgb,
          var(--mp-light-primary, #29f2ff) 38%, white);
        padding: clamp(30px, 4vw, 62px);
        border: 3px solid #233841;
        border-radius: 0;
        clip-path: polygon(28px 0, calc(100% - 48px) 0, 100% 38px,
          100% calc(100% - 56px), calc(100% - 34px) 100%, 54px 100%,
          0 calc(100% - 42px), 0 30px);
        background:
          linear-gradient(90deg, transparent 0 7%,
            color-mix(in srgb, var(--cyber-cyan) 9%, transparent) 7.2% 7.45%,
            transparent 7.7% 92%,
            color-mix(in srgb, var(--cyber-magenta) 8%, transparent) 92.25% 92.5%,
            transparent 92.8%),
          repeating-linear-gradient(90deg, #ffffff05 0 1px, transparent 1px 46px),
          linear-gradient(145deg, #17262df8, #071116 18%, #020609 52%,
            #0a151af9 84%, #17262df8);
        box-shadow: inset 0 0 0 2px #05090b, inset 0 0 0 9px #111e24,
          inset 0 0 0 11px #263b44, inset 0 0 55px #000,
          0 36px 100px #000,
          0 0 26px color-mix(in srgb, var(--cyber-cyan) 14%, transparent);
      }
      .frame-cyber_noir .marquee-frame::before {
        inset: 14px;
        border: 1px solid #314851;
        border-radius: 0;
        clip-path: polygon(18px 0, calc(100% - 30px) 0, 100% 22px,
          100% calc(100% - 34px), calc(100% - 22px) 100%, 34px 100%,
          0 calc(100% - 25px), 0 18px);
        filter: drop-shadow(0 0 3px color-mix(in srgb, var(--cyber-cyan) 22%, transparent));
        animation: none;
      }
      .frame-cyber_noir .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 3;
        inset: 28px 16px 34px;
        pointer-events: none;
        background:
          linear-gradient(var(--cyber-cyan), var(--cyber-cyan)) left 18% top/2px 21% no-repeat,
          linear-gradient(var(--cyber-cyan), var(--cyber-cyan)) left 18% bottom/2px 34% no-repeat,
          linear-gradient(var(--cyber-magenta), var(--cyber-magenta)) right 12% top 31%/3px 7% no-repeat,
          linear-gradient(var(--cyber-cyan), var(--cyber-cyan)) right 12% bottom 7%/3px 18% no-repeat;
        opacity: .86;
        filter: drop-shadow(0 0 5px color-mix(in srgb, var(--cyber-cyan) 60%, transparent));
        animation: cyberRail 4.8s ease-in-out infinite;
      }
      .frame-cyber_noir .marquee {
        position: relative;
        margin: 0 clamp(6px, 1.2vw, 18px) clamp(18px, 2vw, 30px);
        padding: clamp(15px, 1.8vw, 25px) clamp(22px, 3vw, 44px)
          clamp(18px, 2vw, 29px);
        overflow: hidden;
        border: 1px solid #263b44;
        border-bottom-color: color-mix(in srgb, var(--cyber-cyan) 53%, transparent);
        clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 12px),
          calc(100% - 12px) 100%, 0 100%, 0 14px);
        background:
          linear-gradient(112deg, transparent 0 67%, #d9f8ff0a 67.2% 78%,
            transparent 78.2%),
          linear-gradient(180deg,
            color-mix(in srgb, var(--mp-surface-elevated, #14232a) 92%,
              transparent),
            color-mix(in srgb, var(--mp-surface, #03080b) 95%, transparent));
        box-shadow: inset 0 1px #d9f8ff12, inset 0 -10px 24px #0008,
          0 8px 22px #0009;
        text-align: left;
      }
      .frame-cyber_noir .marquee::after {
        content: "";
        position: absolute;
        left: clamp(22px, 3vw, 44px);
        right: clamp(22px, 3vw, 44px);
        bottom: 9px;
        height: 2px;
        background: linear-gradient(90deg, var(--cyber-cyan) 0 72%,
          transparent 72% 75%, var(--cyber-magenta) 75% 81%,
          transparent 81% 94%, var(--cyber-cyan) 94% 100%);
        box-shadow: 0 0 7px color-mix(in srgb, var(--cyber-cyan) 40%, transparent);
      }
      .theater.frame-cyber_noir .eyebrow {
        color: var(--cyber-muted);
        font-family: "Arial Narrow", Arial, sans-serif;
        font-weight: 500;
        letter-spacing: .34em;
      }
      .theater.frame-cyber_noir .eyebrow::before {
        content: "SYS // ";
        color: var(--cyber-cyan);
      }
      .theater.frame-cyber_noir h1 {
        margin-top: 8px;
        color: var(--cyber-white);
        font-family: var(--heading-font, "Arial Narrow", Arial, sans-serif);
        font-weight: 500;
        letter-spacing: var(--mp-heading-tracking, .22em);
        text-shadow: 0 0 12px color-mix(in srgb, var(--cyber-cyan) 26%, transparent);
      }
      .frame-cyber_noir .content {
        gap: clamp(18px, 3vw, 44px);
        padding-inline: clamp(22px, 4vw, 58px);
      }
      .frame-cyber_noir .poster-wrap {
        position: relative;
        padding: clamp(7px, .8vw, 12px);
        border: 1px solid #263c45;
        clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px),
          calc(100% - 12px) 100%, 0 100%, 0 12px);
        background:
          linear-gradient(135deg,
            color-mix(in srgb, var(--cyber-cyan) 13%, transparent),
            transparent 14% 86%,
            color-mix(in srgb, var(--cyber-magenta) 9%, transparent)),
          color-mix(in srgb, var(--mp-surface, #03080b) 92%, transparent);
        box-shadow: inset 0 0 24px #000, 0 16px 38px #000b;
      }
      .theater.frame-cyber_noir .poster {
        border: 1px solid color-mix(in srgb, var(--cyber-cyan) 67%, transparent);
        border-radius: 0;
        background: var(--mp-surface, #020609);
        box-shadow: 0 18px 42px #000, 0 0 0 5px #020609,
          0 0 0 6px #263c45,
          0 0 18px color-mix(in srgb, var(--cyber-cyan) 13%, transparent);
      }
      .frame-cyber_noir .frame-plaque {
        display: block;
        margin-top: clamp(12px, 1.4vw, 20px);
        padding: clamp(12px, 1.5vw, 20px);
        border: 1px solid #263c45;
        border-left: 3px solid var(--cyber-cyan);
        color: var(--cyber-white);
        clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px),
          calc(100% - 10px) 100%, 0 100%);
        background:
          linear-gradient(90deg,
            color-mix(in srgb, var(--cyber-cyan) 5%, transparent),
            transparent 45%),
          linear-gradient(
            color-mix(in srgb, var(--mp-surface-elevated, #0b151b) 88%,
              transparent),
            color-mix(in srgb, var(--mp-surface, #03080b) 92%, transparent));
        box-shadow: inset 0 1px #d9f8ff12, 0 10px 24px #0009;
        text-align: left;
      }
      .frame-cyber_noir .frame-plaque strong {
        color: var(--cyber-cyan);
        font-family: "Arial Narrow", Arial, sans-serif;
        font-weight: 500;
        letter-spacing: .18em;
      }
      .frame-cyber_noir .frame-plaque span {
        color: var(--cyber-muted);
        font-family: "Arial Narrow", Arial, sans-serif;
      }
      .frame-cyber_noir .details {
        padding: clamp(18px, 2.4vw, 36px);
        border: 1px solid #20343d;
        border-left: 2px solid color-mix(in srgb, var(--cyber-cyan) 53%, transparent);
        clip-path: polygon(0 0, 100% 0, 100% calc(100% - 14px),
          calc(100% - 14px) 100%, 0 100%);
        background:
          repeating-linear-gradient(0deg, #ffffff03 0 1px, transparent 1px 28px),
          linear-gradient(135deg,
            color-mix(in srgb, var(--mp-surface-elevated, #0a1419) 86%,
              transparent),
            color-mix(in srgb, var(--mp-surface, #020609) 92%, transparent));
        box-shadow: inset 0 1px #d9f8ff12, 0 18px 38px #0009;
      }
      .theater.frame-cyber_noir .meta {
        color: var(--cyber-cyan);
        font-family: "Arial Narrow", Arial, sans-serif;
        font-weight: 500;
        letter-spacing: .17em;
        text-transform: uppercase;
      }
      .theater.frame-cyber_noir .summary {
        color: var(--cyber-muted);
        font-family: var(--body-font, "Trebuchet MS", Arial, sans-serif);
      }
      .theater.frame-cyber_noir .session {
        padding-top: 12px;
        border-top: 1px solid #263c45;
        color: var(--cyber-muted);
        font-family: "Arial Narrow", Arial, sans-serif;
        letter-spacing: .13em;
        text-transform: uppercase;
      }
      .theater.frame-cyber_noir .progress {
        height: 4px;
        overflow: visible;
        background: repeating-linear-gradient(90deg, #29414a 0 10%,
          transparent 10% 12%);
      }
      .theater.frame-cyber_noir .progress i {
        background: repeating-linear-gradient(90deg, var(--cyber-cyan) 0 10%,
          transparent 10% 12%);
        box-shadow: 0 0 8px color-mix(in srgb, var(--cyber-cyan) 53%, transparent);
      }
      .frame-cyber_noir .ornament {
        top: 16%;
        bottom: 10%;
        width: clamp(5px, .55vw, 9px);
        border: 1px solid #263c45;
        background: repeating-linear-gradient(180deg, var(--cyber-cyan) 0 14px,
          transparent 14px 33px);
        box-shadow: 0 0 6px color-mix(in srgb, var(--cyber-cyan) 33%, transparent);
      }
      .frame-cyber_noir .ornament-left { left: clamp(18px, 2.1vw, 32px); }
      .frame-cyber_noir .ornament-right {
        right: clamp(18px, 2.1vw, 32px);
        background: repeating-linear-gradient(180deg, var(--cyber-magenta) 0 8px,
          transparent 8px 54px);
        box-shadow: 0 0 6px color-mix(in srgb, var(--cyber-magenta) 33%, transparent);
      }
      .motion-off.frame-cyber_noir .marquee-frame::after {
        animation: none;
        opacity: .78;
      }
      @keyframes cyberRail {
        0%, 100% { opacity: .64; }
        50% { opacity: .94; }
      }

      /* Photographic layered print, resin, halftone, and raised ink. */
      .frame-comic_hero .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        clip-path: none;
        background: transparent;
        box-shadow: 0 34px 90px #000c;
      }
      .frame-comic_hero .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/comic-hero-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: drop-shadow(0 20px 32px #000c);
      }
      .frame-comic_hero .marquee-frame::before {
        content: "";
        position: absolute;
        z-index: 5;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/comic-hero-frame-landscape.png")
          center / 100% 100% no-repeat;
        mix-blend-mode: screen;
        -webkit-mask:
          linear-gradient(to bottom, #000 0 17%, transparent 23%) top / 100% 50% no-repeat,
          linear-gradient(to top, #000 0 17%, transparent 23%) bottom / 100% 50% no-repeat,
          linear-gradient(to right, #000 0 12%, transparent 18%) left / 50% 100% no-repeat,
          linear-gradient(to left, #000 0 12%, transparent 18%) right / 50% 100% no-repeat;
        mask:
          linear-gradient(to bottom, #000 0 17%, transparent 23%) top / 100% 50% no-repeat,
          linear-gradient(to top, #000 0 17%, transparent 23%) bottom / 100% 50% no-repeat,
          linear-gradient(to right, #000 0 12%, transparent 18%) left / 50% 100% no-repeat,
          linear-gradient(to left, #000 0 12%, transparent 18%) right / 50% 100% no-repeat;
        opacity: .22;
        animation: comicHeroInkPulse 2.8s steps(2, end) infinite alternate;
      }
      .frame-comic_hero .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 21% 15%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-comic_hero .frame-stage > .marquee { flex: 0 0 auto; }
      .frame-comic_hero .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-comic_hero .content {
        gap: clamp(8px, 1.5cqw, 20px);
        padding: clamp(4px, .8cqw, 10px) clamp(6px, 1.2cqw, 16px)
          clamp(6px, 1cqw, 14px);
      }
      .frame-comic_hero .frame-ornaments { display: none; }
      .frame-comic_hero .marquee {
        margin: 0 clamp(5px, 1cqw, 16px) clamp(7px, 1.1cqw, 16px);
        border: 2px solid var(--mp-border, #171717);
        background: color-mix(in srgb,
          var(--mp-surface, #101423) 94%, transparent);
      }
      .frame-comic_hero h1, .frame-comic_hero .details h2 {
        font-family: var(--heading-font, Impact, sans-serif); font-style: italic;
        text-shadow:
          2px 2px 0 var(--mp-accent-secondary, #1265bd),
          4px 4px 0 var(--mp-border, #111);
      }
      .frame-comic_hero .frame-plaque { display: none; }
      .frame-comic_hero.orientation-portrait .frame-stage {
        inset: 14% 19%;
      }
      .frame-comic_hero.orientation-portrait .content {
        grid-template-rows: minmax(0, 1fr);
      }
      .frame-comic_hero.orientation-portrait .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .frame-comic_hero.orientation-portrait .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .frame-comic_hero.orientation-portrait .details { display: none; }
      .frame-comic_hero.orientation-portrait .marquee-frame::before {
        background-image:
          url("/movie_poster_static/assets/comic-hero-frame-portrait.png");
        -webkit-mask:
          linear-gradient(to bottom, #000 0 11%, transparent 17%) top / 100% 50% no-repeat,
          linear-gradient(to top, #000 0 11%, transparent 17%) bottom / 100% 50% no-repeat,
          linear-gradient(to right, #000 0 16%, transparent 22%) left / 50% 100% no-repeat,
          linear-gradient(to left, #000 0 16%, transparent 22%) right / 50% 100% no-repeat;
        mask:
          linear-gradient(to bottom, #000 0 11%, transparent 17%) top / 100% 50% no-repeat,
          linear-gradient(to top, #000 0 11%, transparent 17%) bottom / 100% 50% no-repeat,
          linear-gradient(to right, #000 0 16%, transparent 22%) left / 50% 100% no-repeat,
          linear-gradient(to left, #000 0 16%, transparent 22%) right / 50% 100% no-repeat;
      }
      .frame-comic_hero.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/comic-hero-frame-portrait.png");
      }
      .motion-off.frame-comic_hero .marquee-frame::before {
        animation: none;
        opacity: .72;
      }
      @keyframes comicHeroInkPulse {
        from { opacity: .12; filter: saturate(.9) brightness(1.05); }
        to {
          opacity: .48;
          filter: saturate(1.35) brightness(1.65)
            drop-shadow(0 0 10px var(--mp-accent-primary, #ef2f24));
        }
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-comic_hero.orientation-auto .frame-stage {
          inset: 14% 19%;
        }
        .frame-comic_hero.orientation-auto .content {
          grid-template-rows: minmax(0, 1fr);
        }
        .frame-comic_hero.orientation-auto .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .frame-comic_hero.orientation-auto .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .frame-comic_hero.orientation-auto .details { display: none; }
        .frame-comic_hero.orientation-auto .marquee-frame::before {
          background-image:
            url("/movie_poster_static/assets/comic-hero-frame-portrait.png");
          -webkit-mask:
            linear-gradient(to bottom, #000 0 11%, transparent 17%) top / 100% 50% no-repeat,
            linear-gradient(to top, #000 0 11%, transparent 17%) bottom / 100% 50% no-repeat,
            linear-gradient(to right, #000 0 16%, transparent 22%) left / 50% 100% no-repeat,
            linear-gradient(to left, #000 0 16%, transparent 22%) right / 50% 100% no-repeat;
          mask:
            linear-gradient(to bottom, #000 0 11%, transparent 17%) top / 100% 50% no-repeat,
            linear-gradient(to top, #000 0 11%, transparent 17%) bottom / 100% 50% no-repeat,
            linear-gradient(to right, #000 0 16%, transparent 22%) left / 50% 100% no-repeat,
            linear-gradient(to left, #000 0 16%, transparent 22%) right / 50% 100% no-repeat;
        }
        .frame-comic_hero.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/comic-hero-frame-portrait.png");
        }
      }

      /* Photographic walnut, aged brass, velvet, and practical lamps. */
      .frame-theater_classic .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: 0 34px 90px #000c;
      }
      .frame-theater_classic .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/theater-classic-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: drop-shadow(0 20px 32px #000c);
      }
      .frame-theater_classic .marquee-frame::before {
        content: "";
        position: absolute;
        z-index: 5;
        inset: 19.4% 14.5%;
        pointer-events: none;
        border: 1px solid color-mix(in srgb,
          var(--mp-accent-primary, #d2a85b) 72%, transparent);
        border-radius: 2px;
        box-shadow:
          inset 0 0 8px color-mix(in srgb,
            var(--mp-light-primary, #ffd78a) 44%, transparent),
          0 0 7px color-mix(in srgb,
            var(--mp-light-primary, #ffd78a) 36%, transparent);
        opacity: .8;
        animation: theaterClassicGlow 3.2s ease-in-out infinite alternate;
      }
      .frame-theater_classic .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 20% 15%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-theater_classic .frame-stage > .marquee { flex: 0 0 auto; }
      .frame-theater_classic .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-theater_classic .content {
        gap: clamp(8px, 1.6cqw, 22px);
        padding: clamp(4px, .8cqw, 10px) clamp(6px, 1.2cqw, 16px)
          clamp(6px, 1cqw, 14px);
      }
      .frame-theater_classic .frame-ornaments { display: none; }
      .frame-theater_classic .marquee {
        margin: 0 clamp(5px, 1cqw, 16px) clamp(8px, 1.2cqw, 18px);
        border: 1px solid var(--mp-border, #a77b3d);
        background: color-mix(in srgb,
          var(--mp-surface, #24150d) 92%, transparent);
      }
      .frame-theater_classic .eyebrow::before { content: "THEATRE 1 · "; }
      .frame-theater_classic .frame-plaque { display: none; }
      .frame-theater_classic.orientation-portrait .frame-stage {
        inset: 16% 20%;
      }
      .frame-theater_classic.orientation-portrait .content {
        grid-template-rows: minmax(0, 1fr) auto;
        gap: clamp(5px, 1cqw, 12px);
      }
      .frame-theater_classic.orientation-portrait .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .frame-theater_classic.orientation-portrait .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .frame-theater_classic.orientation-portrait .details {
        display: none;
      }
      .frame-theater_classic.orientation-portrait .marquee-frame::before {
        inset: 15.5% 19.5%;
      }
      .frame-theater_classic.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/theater-classic-frame-portrait.png");
      }
      .motion-off.frame-theater_classic .marquee-frame::before {
        animation: none;
        opacity: .72;
      }
      @keyframes theaterClassicGlow {
        from { opacity: .58; filter: brightness(.86); }
        to { opacity: .94; filter: brightness(1.12); }
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-theater_classic.orientation-auto .frame-stage {
          inset: 16% 20%;
        }
        .frame-theater_classic.orientation-auto .content {
          grid-template-rows: minmax(0, 1fr) auto;
          gap: clamp(5px, 1cqw, 12px);
        }
        .frame-theater_classic.orientation-auto .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .frame-theater_classic.orientation-auto .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .frame-theater_classic.orientation-auto .details {
          display: none;
        }
        .frame-theater_classic.orientation-auto .marquee-frame::before {
          inset: 15.5% 19.5%;
        }
        .frame-theater_classic.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/theater-classic-frame-portrait.png");
        }
      }

      /* Photographic reclaimed wood, archival paper, and pressed botanicals. */
      .frame-indie_nature .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: 0 34px 90px #000c;
      }
      .frame-indie_nature .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/indie-nature-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: drop-shadow(0 20px 32px #000b);
      }
      .frame-indie_nature .marquee-frame::before {
        content: "";
        position: absolute;
        z-index: 5;
        inset: 17.7% 18.5%;
        pointer-events: none;
        border: 1px solid color-mix(in srgb,
          var(--mp-accent-secondary, #8aa46b) 55%, transparent);
        box-shadow:
          inset 0 0 10px color-mix(in srgb,
            var(--mp-light-primary, #fff2c4) 48%, transparent),
          0 0 9px color-mix(in srgb,
            var(--mp-light-primary, #fff2c4) 32%, transparent);
        opacity: .78;
        animation: indieNatureDaylight 4.8s ease-in-out infinite alternate;
      }
      .frame-indie_nature .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 18% 19%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-indie_nature .frame-stage > .marquee { flex: 0 0 auto; }
      .frame-indie_nature .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-indie_nature .content {
        gap: clamp(8px, 1.5cqw, 20px);
        padding: clamp(4px, .8cqw, 10px) clamp(6px, 1.2cqw, 16px)
          clamp(6px, 1cqw, 14px);
      }
      .frame-indie_nature .frame-ornaments,
      .frame-indie_nature .frame-plaque { display: none; }
      .frame-indie_nature .marquee {
        margin: 0 clamp(5px, 1cqw, 16px) clamp(7px, 1.1cqw, 16px);
        border: 1px solid var(--mp-border, #8aa46b);
        background: color-mix(in srgb,
          var(--mp-surface, #182317) 92%, transparent);
      }
      .frame-indie_nature.orientation-portrait .frame-stage {
        inset: 12% 15%;
      }
      .frame-indie_nature.orientation-portrait .content {
        grid-template-rows: minmax(0, 1fr);
      }
      .frame-indie_nature.orientation-portrait .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .frame-indie_nature.orientation-portrait .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .frame-indie_nature.orientation-portrait .details { display: none; }
      .frame-indie_nature.orientation-portrait .marquee-frame::before {
        inset: 11.7% 14.5%;
      }
      .frame-indie_nature.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/indie-nature-frame-portrait.png");
      }
      .motion-off.frame-indie_nature .marquee-frame::before {
        animation: none;
        opacity: .7;
      }
      @keyframes indieNatureDaylight {
        from { opacity: .58; filter: brightness(.94); }
        to { opacity: .9; filter: brightness(1.08); }
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-indie_nature.orientation-auto .frame-stage {
          inset: 12% 15%;
        }
        .frame-indie_nature.orientation-auto .content {
          grid-template-rows: minmax(0, 1fr);
        }
        .frame-indie_nature.orientation-auto .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .frame-indie_nature.orientation-auto .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .frame-indie_nature.orientation-auto .details { display: none; }
        .frame-indie_nature.orientation-auto .marquee-frame::before {
          inset: 11.7% 14.5%;
        }
        .frame-indie_nature.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/indie-nature-frame-portrait.png");
        }
      }

      /* Photographic gilded movie-palace proscenium and velvet. */
      .frame-golden_age .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: 0 34px 90px #000c;
      }
      .frame-golden_age .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/golden-age-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: drop-shadow(0 20px 34px #000c);
      }
      .frame-golden_age .marquee-frame::before {
        content: "";
        position: absolute;
        z-index: 5;
        inset: 24.3% 21.5% 11.5%;
        pointer-events: none;
        border: 1px solid color-mix(in srgb,
          var(--mp-accent-primary, #f2c66b) 68%, transparent);
        box-shadow:
          inset 0 -4px 12px color-mix(in srgb,
            var(--mp-light-primary, #ffd88a) 48%, transparent),
          0 0 10px color-mix(in srgb,
            var(--mp-light-primary, #ffd88a) 34%, transparent);
        opacity: .8;
        animation: goldenAgeFootlights 2.2s ease-in-out infinite alternate;
      }
      .frame-golden_age .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 25% 22% 12%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-golden_age .frame-stage > .marquee { flex: 0 0 auto; }
      .frame-golden_age .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-golden_age .content {
        gap: clamp(8px, 1.5cqw, 20px);
        padding: clamp(4px, .8cqw, 10px) clamp(6px, 1.2cqw, 16px)
          clamp(6px, 1cqw, 14px);
      }
      .frame-golden_age .frame-ornaments,
      .frame-golden_age .frame-plaque { display: none; }
      .frame-golden_age .marquee {
        margin: 0 clamp(5px, 1cqw, 16px) clamp(7px, 1.1cqw, 16px);
        border: 1px solid var(--mp-border, #d4a24b);
        background: color-mix(in srgb,
          var(--mp-surface, #350a0d) 92%, transparent);
      }
      .frame-golden_age.orientation-portrait .frame-stage {
        inset: 18% 19% 14%;
      }
      .frame-golden_age.orientation-portrait .content {
        grid-template-rows: minmax(0, 1fr);
      }
      .frame-golden_age.orientation-portrait .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .frame-golden_age.orientation-portrait .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .frame-golden_age.orientation-portrait .details { display: none; }
      .frame-golden_age.orientation-portrait .marquee-frame::before {
        inset: 17.7% 18.5% 13.5%;
      }
      .frame-golden_age.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/golden-age-frame-portrait.png");
      }
      .motion-off.frame-golden_age .marquee-frame::before {
        animation: none;
        opacity: .72;
      }
      @keyframes goldenAgeFootlights {
        from { opacity: .58; filter: brightness(.9); }
        to { opacity: .96; filter: brightness(1.14); }
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-golden_age.orientation-auto .frame-stage {
          inset: 18% 19% 14%;
        }
        .frame-golden_age.orientation-auto .content {
          grid-template-rows: minmax(0, 1fr);
        }
        .frame-golden_age.orientation-auto .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .frame-golden_age.orientation-auto .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .frame-golden_age.orientation-auto .details { display: none; }
        .frame-golden_age.orientation-auto .marquee-frame::before {
          inset: 17.7% 18.5% 13.5%;
        }
        .frame-golden_age.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/golden-age-frame-portrait.png");
        }
      }

      /* Photographic Victorian-industrial machinery and practical lamps. */
      .frame-steampunk .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: 0 34px 90px #000c;
      }
      .frame-steampunk .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/steampunk-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: drop-shadow(0 20px 34px #000c);
      }
      .frame-steampunk .marquee-frame::before {
        content: "";
        position: absolute;
        z-index: 5;
        inset: 18.5% 10.7%;
        pointer-events: none;
        border: 1px solid var(--mp-border, #b4774f);
        box-shadow:
          inset 0 0 9px color-mix(in srgb,
            var(--mp-light-primary, #ff9b42) 42%, transparent),
          0 0 12px color-mix(in srgb,
            var(--mp-light-primary, #ff9b42) 36%, transparent);
        opacity: .78;
        animation: steampunkPressureGlow 2.6s ease-in-out infinite alternate;
      }
      .frame-steampunk .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 19% 11% 18%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-steampunk .frame-stage > .marquee { flex: 0 0 auto; }
      .frame-steampunk .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-steampunk .content {
        gap: clamp(8px, 1.5cqw, 20px);
        padding: clamp(4px, .8cqw, 10px) clamp(6px, 1.2cqw, 16px)
          clamp(6px, 1cqw, 14px);
      }
      .frame-steampunk .frame-ornaments,
      .frame-steampunk .frame-plaque { display: none; }
      .frame-steampunk .marquee {
        margin: 0 clamp(5px, 1cqw, 16px) clamp(7px, 1.1cqw, 16px);
        border: 1px solid var(--mp-border, #b4774f);
        background: color-mix(in srgb,
          var(--mp-surface, #241912) 94%, transparent);
      }
      .frame-steampunk.orientation-portrait .frame-stage {
        inset: 16% 20%;
      }
      .frame-steampunk.orientation-portrait .content {
        grid-template-rows: minmax(0, 1fr);
      }
      .frame-steampunk.orientation-portrait .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .frame-steampunk.orientation-portrait .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .frame-steampunk.orientation-portrait .details { display: none; }
      .frame-steampunk.orientation-portrait .marquee-frame::before {
        inset: 15.7% 19.5%;
      }
      .frame-steampunk.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/steampunk-frame-portrait.png");
      }
      .motion-off.frame-steampunk .marquee-frame::before {
        animation: none;
        opacity: .72;
      }
      @keyframes steampunkPressureGlow {
        from { opacity: .56; filter: brightness(.9); }
        to { opacity: .94; filter: brightness(1.12); }
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-steampunk.orientation-auto .frame-stage {
          inset: 16% 20%;
        }
        .frame-steampunk.orientation-auto .content {
          grid-template-rows: minmax(0, 1fr);
        }
        .frame-steampunk.orientation-auto .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .frame-steampunk.orientation-auto .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .frame-steampunk.orientation-auto .details { display: none; }
        .frame-steampunk.orientation-auto .marquee-frame::before {
          inset: 15.7% 19.5%;
        }
        .frame-steampunk.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/steampunk-frame-portrait.png");
        }
      }

      /* Themes are palettes only. Frames own geometry and ornamentation; layouts
         own element placement. Theme selectors must not change either. */
      .theater h1, .theater .details h2 {
        color: var(--mp-text-heading, #fff7df);
        letter-spacing: var(--mp-heading-tracking, normal);
      }
      .theater .eyebrow, .theater .subtitle {
        color: var(--mp-accent-primary, #f6cf70);
      }
      .theater :is(.meta, .summary, .session) {
        color: var(--mp-text-muted, #c9bfa8);
      }
      .theater .poster {
        border-color: var(--mp-border, #b77a24);
      }
      .theater .details {
        color: var(--mp-text-body, #e8dcc2);
        background-color: color-mix(in srgb,
          var(--mp-surface-elevated, #32110d) 72%, transparent);
      }
      .theater .progress {
        background: var(--mp-progress-track, #3b2118);
      }
      .theater .progress i {
        background: var(--mp-progress-fill, #f6cf70);
        box-shadow: 0 0 var(--mp-glow-radius, 9px)
          color-mix(in srgb,
            var(--mp-progress-fill, #f6cf70) 72%, transparent);
      }

      /* Production Cyber Noir uses rendered material overlays. Dynamic content
         remains HTML beneath the transparent center and inside edge. */
      .frame-cyber_noir .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        clip-path: none;
        background: transparent;
        box-shadow: 0 34px 90px #000c,
          0 0 38px color-mix(in srgb, var(--cyber-cyan) 12%, transparent);
      }
      .frame-cyber_noir .marquee-frame::before {
        content: "";
        position: absolute;
        z-index: 5;
        inset: 9.5% 8.5%;
        display: block;
        pointer-events: none;
        border-radius: 2cqw;
        background:
          linear-gradient(90deg, transparent 0 20%, var(--cyber-core) 48%,
            var(--cyber-cyan) 55%, transparent 82%) top left / 34% 2px repeat-x,
          linear-gradient(180deg, transparent 0 20%, var(--cyber-core) 48%,
            var(--cyber-cyan) 55%, transparent 82%) top right / 2px 34% repeat-y,
          linear-gradient(270deg, transparent 0 20%, var(--cyber-core) 48%,
            var(--cyber-cyan) 55%, transparent 82%) bottom right / 34% 2px repeat-x,
          linear-gradient(0deg, transparent 0 20%, var(--cyber-core) 48%,
            var(--cyber-cyan) 55%, transparent 82%) bottom left / 2px 34% repeat-y;
        filter: drop-shadow(0 0 3px var(--cyber-cyan))
          drop-shadow(0 0 9px color-mix(in srgb, var(--cyber-cyan) 67%, transparent))
          drop-shadow(0 0 18px color-mix(in srgb, var(--cyber-cyan) 40%, transparent));
        opacity: .7;
        animation:
          cyberChase 6.4s linear infinite,
          cyberPulse 1.8s ease-in-out infinite alternate;
      }
      .frame-cyber_noir .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        opacity: 1;
        background: url("/movie_poster_static/assets/cyber-noir-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: saturate(.2) brightness(.82) contrast(1.08)
          drop-shadow(0 20px 32px #000c);
        animation: none;
      }
      .cyber-frame-lights { display: none; }
      .frame-cyber_noir .cyber-frame-lights {
        position: absolute;
        z-index: 6;
        inset: 0;
        display: block;
        pointer-events: none;
        background: url("/movie_poster_static/assets/cyber-noir-frame-landscape.png")
          center / 100% 100% no-repeat;
        opacity: .22;
        filter: brightness(1.65) saturate(1.2)
          drop-shadow(0 0 5px var(--cyber-cyan))
          drop-shadow(0 0 15px color-mix(in srgb,
            var(--cyber-cyan) 55%, transparent));
        mix-blend-mode: screen;
        -webkit-mask:
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            72% 8% / 24% 8% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            2% 29% / 8% 24% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            98% 65% / 8% 24% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            29% 95% / 25% 8% no-repeat;
        mask:
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            72% 8% / 24% 8% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            2% 29% / 8% 24% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            98% 65% / 8% 24% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            29% 95% / 25% 8% no-repeat;
        animation: cyberRegisteredPulse 2.4s ease-in-out infinite alternate;
      }
      .frame-cyber_noir .cyber-light-group {
        display: none;
      }
      .frame-cyber_noir .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 11% 9%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-cyber_noir .frame-stage > .marquee {
        flex: 0 0 auto;
      }
      .frame-cyber_noir .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-cyber_noir.layout-poster .marquee-frame.frame-short .details {
        display: none;
      }
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .subtitle,
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .meta,
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .summary,
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .session,
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .progress {
        display: none;
      }
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .details h2 {
        margin-block: 2px 0;
      }
      .frame-cyber_noir.orientation-portrait
        .marquee-frame.frame-short .details:not(:has(.summary)) {
        display: none;
      }
      .frame-cyber_noir .frame-ornaments { display: none; }
      .frame-cyber_noir.orientation-portrait .frame-stage {
        inset: 10% 14%;
      }
      .frame-cyber_noir.orientation-portrait .marquee-frame::before {
        inset: 10% 15%;
      }
      .frame-cyber_noir.orientation-portrait .cyber-light-group-a {
        display: none;
      }
      .frame-cyber_noir.orientation-portrait .cyber-light-group-b {
        display: none;
      }
      .frame-cyber_noir.orientation-portrait .cyber-light-group-c {
        display: none;
      }
      .frame-cyber_noir.orientation-portrait .cyber-frame-lights {
        background-image:
          url("/movie_poster_static/assets/cyber-noir-frame-portrait.png");
        -webkit-mask:
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            26% 6.5% / 27% 6% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            74% 6.5% / 27% 6% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            89% 27% / 10% 25% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            89% 76% / 10% 27% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            26% 95% / 27% 6% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            74% 95% / 27% 6% no-repeat;
        mask:
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            26% 6.5% / 27% 6% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            74% 6.5% / 27% 6% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            89% 27% / 10% 25% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            89% 76% / 10% 27% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            26% 95% / 27% 6% no-repeat,
          radial-gradient(ellipse, #000 0 38%, transparent 72%)
            74% 95% / 27% 6% no-repeat;
      }
      .frame-cyber_noir.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/cyber-noir-frame-portrait.png");
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-cyber_noir.orientation-auto .frame-stage {
          inset: 10% 14%;
        }
        .frame-cyber_noir.orientation-auto .marquee-frame::before {
          inset: 10% 15%;
        }
        .frame-cyber_noir.orientation-auto .cyber-light-group-a {
          display: none;
        }
        .frame-cyber_noir.orientation-auto .cyber-light-group-b {
          display: none;
        }
        .frame-cyber_noir.orientation-auto .cyber-light-group-c {
          display: none;
        }
        .frame-cyber_noir.orientation-auto .cyber-frame-lights {
          background-image:
            url("/movie_poster_static/assets/cyber-noir-frame-portrait.png");
          -webkit-mask:
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              26% 6.5% / 27% 6% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              74% 6.5% / 27% 6% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              89% 27% / 10% 25% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              89% 76% / 10% 27% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              26% 95% / 27% 6% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              74% 95% / 27% 6% no-repeat;
          mask:
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              26% 6.5% / 27% 6% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              74% 6.5% / 27% 6% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              89% 27% / 10% 25% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              89% 76% / 10% 27% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              26% 95% / 27% 6% no-repeat,
            radial-gradient(ellipse, #000 0 38%, transparent 72%)
              74% 95% / 27% 6% no-repeat;
        }
        .frame-cyber_noir.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/cyber-noir-frame-portrait.png");
        }
      }
      .motion-off.frame-cyber_noir .marquee-frame::before {
        animation: none;
        opacity: .5;
      }
      .motion-off.frame-cyber_noir .cyber-frame-lights {
        animation: none;
        opacity: .38;
      }
      @keyframes cyberChase {
        0% {
          background-position: -34% 0, 100% -34%, 134% 100%, 0 134%;
        }
        100% {
          background-position: 134% 0, 100% 134%, -34% 100%, 0 -34%;
        }
      }
      @keyframes cyberPulse {
        from {
          opacity: .12;
          filter: brightness(.72)
            drop-shadow(0 0 2px color-mix(in srgb, var(--cyber-cyan) 40%, transparent))
            drop-shadow(0 0 5px color-mix(in srgb, var(--cyber-cyan) 20%, transparent));
        }
        to {
          opacity: .38;
          filter: brightness(1.1)
            drop-shadow(0 0 3px color-mix(in srgb, var(--cyber-cyan) 67%, transparent))
            drop-shadow(0 0 8px color-mix(in srgb, var(--cyber-cyan) 33%, transparent));
        }
      }
      @keyframes cyberRegisteredPulse {
        from { opacity: .12; filter: brightness(1.05) saturate(1.05); }
        to {
          opacity: .48;
          filter: brightness(2.05) saturate(1.35)
            drop-shadow(0 0 6px var(--cyber-cyan))
            drop-shadow(0 0 18px color-mix(in srgb,
              var(--cyber-cyan) 62%, transparent));
        }
      }
      @keyframes reveal {
        from { opacity: 0; transform: scale(.992); }
        to { opacity: 1; transform: scale(1); }
      }
      .marquee-frame::before {
        content: "";
        position: absolute;
        inset: 9px;
        pointer-events: none;
        border: 7px dotted var(--gold);
        border-radius: 17px;
        filter: drop-shadow(0 0 7px #ffc846);
        animation: bulbs 1.4s ease-in-out infinite alternate;
      }
      .frame-marquee .marquee-frame::before {
        display: none;
      }
      /* Photographic black-lacquer marquee with Theme-powered chasing bulbs. */
      .frame-marquee .marquee-frame {
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: 0 34px 90px #000c;
      }
      .frame-marquee .marquee-frame::after {
        content: "";
        position: absolute;
        z-index: 4;
        inset: 0;
        pointer-events: none;
        background: url("/movie_poster_static/assets/marquee-frame-landscape.png")
          center / 100% 100% no-repeat;
        filter: drop-shadow(0 20px 34px #000c);
      }
      .frame-marquee .frame-stage {
        position: absolute;
        z-index: 1;
        inset: 23% 15% 21%;
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .frame-marquee .frame-stage > .marquee { flex: 0 0 auto; }
      .frame-marquee .frame-stage > .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .frame-marquee:not(.layout-split)
        .marquee-frame.frame-short .content {
        grid-template-columns: minmax(0, 1fr);
      }
      .frame-marquee:not(.layout-split)
        .marquee-frame.frame-short .details {
        display: none;
      }
      .frame-marquee.layout-split
        .marquee-frame.frame-short .content {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .frame-marquee.layout-split
        .marquee-frame.frame-short .details {
        min-width: 0;
        overflow: hidden;
      }
      .frame-marquee .content {
        gap: clamp(8px, 1.5cqw, 20px);
        padding: clamp(4px, .8cqw, 10px) clamp(6px, 1.2cqw, 16px)
          clamp(6px, 1cqw, 14px);
      }
      .frame-marquee .frame-ornaments,
      .frame-marquee .frame-plaque { display: none; }
      .frame-marquee .marquee {
        margin: 0 clamp(5px, 1cqw, 16px) clamp(7px, 1.1cqw, 16px);
        border: 1px solid var(--mp-border, #b8863b);
        background: color-mix(in srgb,
          var(--mp-surface, #120d09) 94%, transparent);
        box-shadow: inset 0 0 16px color-mix(in srgb,
          var(--mp-light-primary, #ffd36a) 12%, transparent);
      }
      .frame-marquee.orientation-portrait .frame-stage {
        inset: 18% 19% 14%;
      }
      .frame-marquee.orientation-portrait .content {
        grid-template-rows: minmax(0, 1fr);
      }
      .frame-marquee.orientation-portrait .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .frame-marquee.orientation-portrait .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .frame-marquee.orientation-portrait .details { display: none; }
      .frame-marquee.orientation-portrait .marquee-frame::after {
        background-image:
          url("/movie_poster_static/assets/marquee-frame-portrait.png");
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-marquee.orientation-auto .frame-stage {
          inset: 18% 19% 14%;
        }
        .frame-marquee.orientation-auto .content {
          grid-template-rows: minmax(0, 1fr);
        }
        .frame-marquee.orientation-auto .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .frame-marquee.orientation-auto .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .frame-marquee.orientation-auto .details { display: none; }
        .frame-marquee.orientation-auto .marquee-frame::after {
          background-image:
            url("/movie_poster_static/assets/marquee-frame-portrait.png");
        }
      }
      .marquee-bulbs { display: none; }
      .frame-marquee .marquee-bulbs {
        position: absolute;
        z-index: 5;
        inset: 0;
        display: block;
        pointer-events: none;
      }
      .frame-marquee .marquee-bulbs::before {
        content: "";
        position: absolute;
        inset: 0;
        background: url("/movie_poster_static/assets/marquee-frame-landscape.png")
          center / 100% 100% no-repeat;
        opacity: .18;
        filter: brightness(1.7) saturate(1.1)
          drop-shadow(0 0 7px var(--mp-light-primary, #ffd35f));
        mix-blend-mode: screen;
        -webkit-mask:
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 15% / 82% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 85% / 82% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            8% center / 9% 72% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            92% center / 9% 72% no-repeat;
        mask:
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 15% / 82% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 85% / 82% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            8% center / 9% 72% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            92% center / 9% 72% no-repeat;
        animation: marqueeRegisteredPulse 2.2s ease-in-out infinite alternate;
      }
      .marquee-divider-bulbs { display: none; }
      .frame-marquee .marquee-divider-bulbs {
        display: none;
      }
      .marquee-bulbs i,
      .marquee-divider-bulbs i {
        display: block;
        width: clamp(7px, 2.5cqw, 30px);
        aspect-ratio: 1;
        flex: 0 0 auto;
        border-radius: 50%;
        background: radial-gradient(circle,
          #fff 0 8%,
          color-mix(in srgb,
            var(--mp-light-secondary, #fff1b8) 72%, transparent) 18%,
          color-mix(in srgb,
            var(--mp-light-primary, #ffd35f) 46%, transparent) 38%,
          transparent 72%);
        position: absolute;
        transform: translate(-50%, -50%);
        animation: bulbChase 4.8s linear infinite;
        animation-delay: var(--bulb-delay);
      }
      .frame-marquee.orientation-portrait .marquee-bulbs i {
        width: clamp(7px, 3.35cqw, 30px);
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-marquee.orientation-auto .marquee-bulbs i {
          width: clamp(7px, 3.35cqw, 30px);
        }
      }
      .marquee-divider-bulbs i {
        position: relative;
        transform: none;
      }
      .marquee-bulbs i::after,
      .marquee-divider-bulbs i::after {
        content: none;
        position: absolute;
        top: 15%; left: 19%;
        width: 28%; height: 20%;
        border-radius: 50%;
        background: #fff;
        opacity: .85;
        filter: blur(.4px);
      }
      .motion-off .marquee-bulbs i,
      .motion-off .marquee-divider-bulbs i { animation: none; opacity: .94; }
      .motion-off.frame-marquee .marquee-bulbs {
        opacity: 1;
      }
      .motion-off.frame-marquee .marquee-bulbs::before {
        animation: none;
        opacity: .32;
      }
      .frame-marquee.orientation-portrait .marquee-bulbs::before {
        background-image:
          url("/movie_poster_static/assets/marquee-frame-portrait.png");
        -webkit-mask:
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 14% / 74% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 91% / 74% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            14% center / 10% 78% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            86% center / 10% 78% no-repeat;
        mask:
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 14% / 74% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 91% / 74% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            14% center / 10% 78% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            86% center / 10% 78% no-repeat;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .frame-marquee.orientation-auto .marquee-bulbs::before {
          background-image:
            url("/movie_poster_static/assets/marquee-frame-portrait.png");
          -webkit-mask:
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 14% / 74% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 91% / 74% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              14% center / 10% 78% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              86% center / 10% 78% no-repeat;
          mask:
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 14% / 74% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 91% / 74% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              14% center / 10% 78% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              86% center / 10% 78% no-repeat;
        }
      }
      .renderer-declarative.frame-marquee .marquee-bulbs::before {
        background-size: cover;
      }
      .renderer-declarative.frame-marquee.orientation-portrait
        .marquee-bulbs::before {
        -webkit-mask:
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 14% / 88% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 91% / 88% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            7.5% center / 10% 78% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            92.5% center / 10% 78% no-repeat;
        mask:
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 14% / 88% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            center 91% / 88% 9% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            7.5% center / 10% 78% no-repeat,
          radial-gradient(ellipse, #000 0 58%, transparent 78%)
            92.5% center / 10% 78% no-repeat;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .renderer-declarative.frame-marquee.orientation-auto
          .marquee-bulbs::before {
          -webkit-mask:
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 14% / 88% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 91% / 88% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              7.5% center / 10% 78% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              92.5% center / 10% 78% no-repeat;
          mask:
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 14% / 88% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              center 91% / 88% 9% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              7.5% center / 10% 78% no-repeat,
            radial-gradient(ellipse, #000 0 58%, transparent 78%)
              92.5% center / 10% 78% no-repeat;
        }
      }
      .motion-off .marquee-frame,
      .motion-off .marquee-frame::before { animation: none; }
      .motion-off .marquee-frame::before { opacity: .8; }
      .motion-off .ambient { filter: brightness(.18) saturate(.8); }
      @keyframes bulbs { from { opacity: .48; } to { opacity: 1; } }
      @keyframes bulbChase {
        0%, 18%, 100% { opacity: .04; filter: brightness(.7); }
        4% { opacity: .35; filter: brightness(1.15); }
        8% {
          opacity: 1;
          filter: brightness(2.5)
            drop-shadow(0 0 5px var(--mp-light-secondary, #fff1b8))
            drop-shadow(0 0 13px var(--mp-light-primary, #ffd35f));
        }
        12% { opacity: .42; filter: brightness(1.25); }
      }
      @keyframes marqueeRegisteredPulse {
        from {
          opacity: .16;
          filter: brightness(1.25) saturate(1.06)
            drop-shadow(0 0 4px var(--mp-light-primary, #ffd35f));
        }
        to {
          opacity: .82;
          filter: brightness(3.1) saturate(1.38)
            drop-shadow(0 0 10px var(--mp-light-primary, #ffd35f))
            drop-shadow(0 0 24px color-mix(in srgb,
              var(--mp-light-secondary, #fff1b8) 76%, transparent));
        }
      }
      .marquee { text-align: center; padding: 14px 20px 28px; }
      .eyebrow {
        color: var(--gold);
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .28em;
        text-transform: uppercase;
      }
      h1 {
        margin: 5px 0 0;
        color: #fff1c2;
        font-family: var(--heading-font, Impact, "Arial Narrow", sans-serif);
        max-width: 100%;
        font-size: clamp(1.7rem, 6vw, 5.8rem);
        font-weight: 400;
        letter-spacing: .08em;
        line-height: .95;
        text-transform: uppercase;
        white-space: nowrap;
        text-shadow: 0 3px 0 #7b3b10, 0 0 25px #f4a42b66;
      }
      h1.heading-wrap {
        font-size: 12px !important;
        line-height: .92;
        text-wrap: balance;
        white-space: normal;
      }
      .content {
        position: relative;
        z-index: 1;
        box-sizing: border-box;
        display: grid;
        min-width: 0;
        min-height: 0;
        grid-template-columns: minmax(320px, 1fr) minmax(300px, 1fr);
        gap: clamp(22px, 3.5vw, 60px);
        align-items: center;
        padding: 8px clamp(14px, 3vw, 40px) 24px;
      }
      .poster-wrap { perspective: 1000px; }
      .poster {
        display: block;
        box-sizing: border-box;
        width: 100%;
        max-height: 84vh;
        aspect-ratio: 2 / 3;
        object-fit: contain;
        border: 3px solid #dba84e;
        border-radius: 8px;
        background: #16100d;
        box-shadow: 0 24px 55px #000, 0 0 28px #d18a2544;
      }
      .poster-missing { display: grid; place-items: center; color: #9d8e78; }
      .details {
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
        max-width: 100%;
        max-height: 100%;
        overflow: hidden;
      }
      .details h2 {
        margin: 10px 0 3px;
        color: #fff8e8;
        font-family: var(--heading-font, Georgia, serif);
        font-size: clamp(2rem, 4.6vw, 4.7rem);
        line-height: 1.02;
        overflow-wrap: anywhere;
      }
      .subtitle { color: var(--gold); font-size: 1.2rem; margin: 8px 0; }
      .meta { color: #d6c6a5; font-weight: 700; letter-spacing: .08em; }
      .summary {
        max-width: 58ch;
        color: #e1d8c7;
        font-family: Georgia, serif;
        font-size: clamp(1rem, 1.5vw, 1.25rem);
        line-height: 1.55;
      }
      .session { color: #a99b86; font-size: .86rem; }
      .progress { height: 5px; margin-top: 22px; background: #ffffff22; }
      .progress i { display: block; height: 100%; background: var(--gold); }
      .empty { text-align: center; }
      .empty p { color: #c6b99f; font-size: 1.1rem; }
      .error p { color: #ff9c8e; }
      .orientation-portrait .marquee-frame { width: 95vw; }
      .orientation-portrait .content { grid-template-columns: 1fr; gap: 22px; }
      .orientation-portrait .poster {
        width: min(78vw, 500px); margin: auto; max-height: 72vh;
      }
      .orientation-portrait .details { text-align: center; }
      .orientation-portrait h1 {
        font-size: clamp(1.4rem, 11cqw, 5.8rem);
      }
      .orientation-portrait .details h2 {
        font-size: clamp(1.4rem, 7cqw, 4rem);
      }
      .orientation-portrait .summary {
        width: var(--fitted-poster-width, min(78vw, 500px));
        max-width: 100%;
        margin-inline: auto;
        text-align: center;
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 6;
      }
      .orientation-landscape .marquee-frame {
        display: flex;
        flex-direction: column;
        width: min(95vw, 126.667vh);
        min-height: 0;
        aspect-ratio: 4 / 3;
      }
      .orientation-landscape .marquee-frame .content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .orientation-landscape .marquee-frame .details {
        align-self: stretch;
        box-sizing: border-box;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
      }
      .orientation-portrait .marquee-frame {
        width: min(95vw, 53.438vh);
        min-height: 0;
        aspect-ratio: 9 / 16;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .orientation-auto .marquee-frame { width: 95vw; }
        .orientation-auto .content { grid-template-columns: 1fr; gap: 22px; }
        .orientation-auto .poster {
          width: min(78vw, 500px); margin: auto; max-height: 72vh;
        }
        .orientation-auto .details { text-align: center; }
        .orientation-auto .summary {
          width: var(--fitted-poster-width, min(78vw, 500px));
          max-width: 100%;
          margin-inline: auto;
          text-align: center;
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 6;
        }
        .orientation-auto .marquee-frame {
          width: min(95vw, 53.438vh);
          min-height: 0;
          aspect-ratio: 9 / 16;
        }
      }
      @media (min-width: 721px) and (orientation: landscape) {
        .orientation-auto .marquee-frame {
          display: flex;
          flex-direction: column;
          width: min(95vw, 126.667vh);
          min-height: 0;
          aspect-ratio: 4 / 3;
        }
        .orientation-auto .marquee-frame .content {
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
        }
        .orientation-auto .marquee-frame .details {
          align-self: stretch;
          box-sizing: border-box;
          height: 100%;
          max-height: 100%;
          overflow: hidden;
        }
        .orientation-portrait .marquee {
          margin-bottom: clamp(8px, 1.5vh, 16px);
          padding: clamp(7px, 1.4vh, 14px) clamp(10px, 3cqw, 24px);
        }
        .orientation-portrait .eyebrow {
          font-size: clamp(.55rem, 1.8cqw, .85rem);
        }
        .orientation-portrait .content {
          gap: clamp(8px, 1.4vh, 16px);
          padding: 2px clamp(8px, 3cqw, 22px) clamp(8px, 1.5vh, 16px);
        }
        .orientation-portrait .subtitle {
          margin-block: 4px;
          font-size: clamp(.72rem, 2.8cqw, 1rem);
        }
        .orientation-portrait .meta,
        .orientation-portrait .session {
          font-size: clamp(.62rem, 2.1cqw, .82rem);
        }
        .orientation-portrait .summary {
          margin-block: 6px;
          font-size: clamp(.7rem, 2.45cqw, .9rem);
          line-height: 1.3;
          -webkit-line-clamp: 3;
        }
        .orientation-portrait .frame-plaque {
          margin-top: 8px;
          padding: 8px 12px;
        }
        .orientation-portrait .frame-plaque strong {
          font-size: clamp(.82rem, 3.5cqw, 1.2rem);
        }
        .orientation-portrait .frame-plaque span {
          font-size: clamp(.58rem, 2cqw, .78rem);
        }
      }
      @media (max-height: 800px) and (orientation: landscape) {
        .orientation-landscape .marquee-frame,
        .orientation-auto .marquee-frame {
          padding: clamp(18px, 2.5vh, 26px);
        }
        .orientation-landscape .marquee,
        .orientation-auto .marquee {
          padding: 7px 18px 14px;
        }
        .orientation-landscape h1,
        .orientation-auto h1 {
          font-size: clamp(1.5rem, 5vh, 3rem);
        }
        .orientation-landscape .content,
        .orientation-auto .content {
          gap: clamp(18px, 3vw, 42px);
          padding: 4px clamp(18px, 2.5vw, 34px) 14px;
        }
        .orientation-landscape .poster,
        .orientation-auto .poster,
        .orientation-landscape.layout-poster .poster,
        .orientation-auto.layout-poster .poster {
          width: auto;
          height: min(57vh, 520px);
          max-width: 100%;
          max-height: 57vh;
          margin-inline: auto;
        }
        .orientation-landscape .details h2,
        .orientation-auto .details h2 {
          font-size: clamp(1.55rem, 4.2vh, 2.8rem);
        }
        .orientation-landscape .summary,
        .orientation-auto .summary {
          display: -webkit-box;
          overflow: hidden;
          font-size: clamp(.82rem, 1.8vh, 1rem);
          line-height: 1.35;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 5;
        }
        .orientation-landscape .frame-plaque,
        .orientation-auto .frame-plaque {
          margin-top: 10px;
          padding: 10px 16px;
        }
        .orientation-landscape .frame-plaque strong,
        .orientation-auto .frame-plaque strong {
          font-size: clamp(.95rem, 2.4vh, 1.4rem);
        }
      }
      .marquee-frame.frame-short {
        padding: clamp(14px, 2.2vh, 24px);
      }
      .marquee-frame.frame-short .marquee {
        margin-bottom: clamp(6px, 1.2vh, 12px);
        padding: 6px clamp(10px, 3cqw, 20px) 10px;
      }
      .marquee-frame.frame-short .content {
        gap: clamp(8px, 2cqw, 24px);
        padding: 2px clamp(8px, 2.5cqw, 22px) 10px;
      }
      .marquee-frame.frame-short .details h2 {
        margin-top: 4px;
        font-size: clamp(1.15rem, 5cqw, 2.25rem);
      }
      .marquee-frame.frame-short .summary {
        margin-block: 6px;
        font-size: clamp(.7rem, 2cqw, .9rem);
        line-height: 1.3;
        -webkit-line-clamp: 3;
      }
      .marquee-frame.frame-short .frame-plaque {
        margin-top: 7px;
        padding: 7px 10px;
      }
      .marquee-frame.frame-ultra-compact {
        padding: 10px;
        border-width: 4px;
        border-radius: 14px;
      }
      .marquee-frame.frame-ultra-compact .marquee {
        margin-bottom: 3px;
        padding: 2px 5px 4px;
      }
      .marquee-frame.frame-ultra-compact .brand-logo {
        top: 4px;
        width: min(72px, 30%);
        height: 24px;
      }
      .marquee-frame.frame-ultra-compact .brand-row {
        min-height: 24px;
        margin: 0 3px 3px;
        gap: 5px;
      }
      .marquee-frame.frame-ultra-compact .brand-row .brand-logo {
        width: 100%;
        height: 24px;
      }
      .marquee-frame.frame-ultra-compact .brand-row.logo-center .brand-logo {
        width: min(72px, 30%);
      }
      .marquee-frame.frame-ultra-compact .brand-row.logo-center {
        min-height: 36px;
        gap: 1px;
      }
      .marquee-frame.frame-ultra-compact
        .brand-row.logo-center .brand-logo {
        height: 22px;
      }
      .marquee-frame.frame-ultra-compact .brand-eyebrow {
        display: block;
        font-size: .5rem;
        letter-spacing: .12em;
      }
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact .eyebrow,
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact
        .marquee-divider-bulbs,
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact .subtitle,
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact .meta,
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact .summary,
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact .session,
      .theater:not(.has-details) .marquee-frame.frame-ultra-compact .progress {
        display: none;
      }
      .marquee-frame.frame-ultra-compact h1 {
        margin: 0;
        font-size: clamp(.72rem, 7cqw, 1.2rem);
      }
      .marquee-frame.frame-ultra-compact .content {
        gap: 5px;
        padding: 0 5px 4px;
      }
      .orientation-landscape .marquee-frame.frame-ultra-compact .content {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .marquee-frame.frame-ultra-compact .details {
        min-height: 0;
        padding: 4px;
      }
      .marquee-frame.frame-ultra-compact .details h2 {
        margin: 0;
        overflow: hidden;
        font-size: clamp(.72rem, 4.5cqw, 1rem);
        line-height: 1;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .marquee-frame.frame-ultra-compact .frame-plaque {
        margin-top: 3px;
        padding: 3px 5px;
      }
      .marquee-frame.frame-ultra-compact .frame-plaque strong {
        font-size: clamp(.58rem, 3.6cqw, .82rem);
      }
      .marquee-frame.frame-ultra-compact .frame-plaque span { display: none; }
      .marquee-frame.missing-poster .content {
        display: grid;
        grid-template-columns: 1fr;
        place-items: center;
      }
      .marquee-frame.missing-poster .poster-missing {
        width: min(100%, 220px) !important;
        height: 100px !important;
        aspect-ratio: auto;
      }
      .marquee-frame.frame-ultra-compact.missing-poster .poster-missing {
        height: 48px !important;
      }
      .marquee-frame.frame-ultra-compact.missing-poster .details { display: none; }
      .orientation-portrait.layout-split .marquee-frame .summary,
      .orientation-portrait.layout-split .marquee-frame .session,
      .orientation-portrait.layout-split .marquee-frame .progress {
        display: none;
      }
      .orientation-portrait.layout-split .marquee-frame .details h2 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .frame-comic_hero.layout-poster .marquee-frame.frame-short .summary,
      .frame-comic_hero.layout-poster .marquee-frame.frame-short .meta,
      .frame-comic_hero.layout-poster .marquee-frame.frame-short .session,
      .frame-comic_hero.layout-poster .marquee-frame.frame-short .progress {
        display: none;
      }
      .frame-comic_hero.layout-poster .marquee-frame.frame-short .details {
        display: none;
      }
      .orientation-landscape.layout-poster .marquee-frame.frame-short .subtitle,
      .orientation-landscape.layout-poster .marquee-frame.frame-short .meta,
      .orientation-landscape.layout-poster .marquee-frame.frame-short .summary,
      .orientation-landscape.layout-poster .marquee-frame.frame-short .session,
      .orientation-landscape.layout-poster .marquee-frame.frame-short .progress {
        display: none;
      }
      .orientation-landscape.layout-poster .marquee-frame.frame-short .details h2 {
        margin: 3px 0 0;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }
      .orientation-landscape.layout-poster .content {
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        min-height: 0;
      }
      .orientation-landscape.layout-poster .poster-wrap {
        min-height: 0;
        height: 100%;
      }
      .orientation-landscape.layout-poster .poster {
        width: auto;
        max-width: 100%;
        height: 100%;
        max-height: 100%;
      }
      .orientation-landscape.layout-poster .details {
        height: auto;
        max-height: 24vh;
        margin-top: clamp(4px, 1vh, 10px);
        overflow: hidden;
      }
      @media (min-width: 721px) and (orientation: landscape) {
        .orientation-auto.layout-poster .content {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          min-height: 0;
        }
        .orientation-auto.layout-poster .poster-wrap {
          min-height: 0;
          height: 100%;
        }
        .orientation-auto.layout-poster .poster {
          width: auto;
          max-width: 100%;
          height: 100%;
          max-height: 100%;
        }
        .orientation-auto.layout-poster .details {
          height: auto;
          max-height: 24vh;
          margin-top: clamp(4px, 1vh, 10px);
          overflow: hidden;
        }
      }
      @media (orientation: portrait) {
        .orientation-auto.layout-split .marquee-frame .summary,
        .orientation-auto.layout-split .marquee-frame .session,
        .orientation-auto.layout-split .marquee-frame .progress {
          display: none;
        }
        .orientation-auto.layout-split .marquee-frame .details h2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .orientation-landscape .marquee-frame.frame-short .summary,
        .orientation-landscape .marquee-frame.frame-short .session,
        .orientation-landscape .marquee-frame.frame-short .progress {
          display: none;
        }
        .orientation-landscape .marquee-frame.frame-short .details h2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .orientation-landscape .marquee-frame.frame-short .details {
          max-height: var(--fitted-poster-height, 70vh);
          padding: clamp(4px, 2cqw, 12px);
          overflow: hidden;
        }
        .orientation-landscape:not(.frame-marquee) .marquee-frame.frame-short .content {
          grid-template-columns: 1fr;
        }
        .orientation-landscape:not(.frame-marquee) .marquee-frame.frame-short .details {
          display: none;
        }
      }
      @media (min-width: 1400px) and (min-height: 2400px) and (orientation: portrait) {
        .orientation-portrait .marquee-frame,
        .orientation-auto .marquee-frame {
          padding: clamp(52px, 2.8vw, 76px);
        }
        .orientation-portrait .marquee,
        .orientation-auto .marquee {
          margin-bottom: clamp(30px, 1.2vh, 48px);
          padding: clamp(24px, 1.1vh, 42px) clamp(42px, 4vw, 88px);
        }
        .orientation-portrait .eyebrow,
        .orientation-auto .eyebrow {
          font-size: clamp(1.15rem, 1.15vw, 1.65rem);
          letter-spacing: .38em;
        }
        .orientation-portrait h1,
        .orientation-auto h1 {
          font-size: clamp(4rem, 5.6vw, 7.5rem);
        }
        .orientation-portrait .content,
        .orientation-auto .content {
          gap: clamp(32px, 1.3vh, 54px);
          padding: 16px clamp(40px, 4vw, 88px) clamp(40px, 1.8vh, 68px);
        }
        .orientation-portrait .frame-plaque,
        .orientation-auto .frame-plaque {
          margin-top: clamp(24px, 1vh, 38px);
          padding: clamp(24px, 1.1vh, 42px) clamp(32px, 3vw, 68px);
        }
        .orientation-portrait .frame-plaque strong,
        .orientation-auto .frame-plaque strong {
          font-size: clamp(2rem, 2.2vw, 3rem);
        }
        .orientation-portrait .frame-plaque span,
        .orientation-auto .frame-plaque span {
          font-size: clamp(1rem, 1.05vw, 1.45rem);
        }
        .orientation-portrait .details h2,
        .orientation-auto .details h2 {
          font-size: clamp(3rem, 4vw, 5.4rem);
        }
        .orientation-portrait .subtitle,
        .orientation-auto .subtitle {
          font-size: clamp(1.4rem, 1.35vw, 2rem);
        }
        .orientation-portrait .meta,
        .orientation-portrait .session,
        .orientation-auto .meta,
        .orientation-auto .session {
          font-size: clamp(1.05rem, 1vw, 1.45rem);
        }
        .orientation-portrait .summary,
        .orientation-auto .summary {
          max-width: 100%;
          margin-inline: auto;
          font-size: clamp(1.25rem, 1.15vw, 1.65rem);
          line-height: 1.5;
          -webkit-line-clamp: 8;
        }
      }
      .marquee-frame .poster {
        width: auto !important;
        height: min(var(--fitted-poster-height, 70vh), 84vh) !important;
        max-width: 100% !important;
        max-height: var(--fitted-poster-height, 70vh) !important;
        margin-inline: auto;
      }
      @media (max-width: 720px) {
        .orientation-portrait h1, .orientation-auto h1 {
          font-size: clamp(1.25rem, 7.5vw, 2.3rem);
        }
      }
      @media (max-width: 480px) and (orientation: portrait) {
        .orientation-portrait .marquee-frame,
        .orientation-auto .marquee-frame {
          padding: 18px;
        }
        .orientation-portrait .marquee,
        .orientation-auto .marquee {
          margin-bottom: 8px;
          padding: 6px 8px 10px;
        }
        .orientation-portrait .eyebrow,
        .orientation-auto .eyebrow { font-size: .56rem; }
        .orientation-portrait .content,
        .orientation-auto .content {
          gap: 8px;
          padding: 2px 8px 10px;
        }
        .orientation-portrait .marquee-divider-bulbs,
        .orientation-auto .marquee-divider-bulbs {
          min-height: 18px;
          margin-block: 0 7px;
        }
        .orientation-portrait .details h2,
        .orientation-auto .details h2 {
          margin-top: 3px;
          font-size: 1.35rem;
        }
        .orientation-portrait .subtitle,
        .orientation-auto .subtitle {
          margin: 3px 0;
          font-size: .78rem;
        }
        .orientation-portrait .meta,
        .orientation-auto .meta { font-size: .68rem; }
        .orientation-portrait .summary,
        .orientation-auto .summary {
          margin-block: 5px;
          font-size: .72rem;
          line-height: 1.28;
          -webkit-line-clamp: 3;
        }
        .orientation-portrait .session,
        .orientation-auto .session {
          margin-block: 4px;
          font-size: .62rem;
        }
        .orientation-portrait .frame-plaque,
        .orientation-auto .frame-plaque {
          margin-top: 7px;
          padding: 7px 10px;
        }
        .orientation-portrait .frame-plaque strong,
        .orientation-auto .frame-plaque strong { font-size: .82rem; }
        .orientation-portrait .frame-plaque span,
        .orientation-auto .frame-plaque span {
          margin-top: 3px;
          font-size: .58rem;
        }
      }
      /* Declarative built-in renderer: every Frame/Theme/Layout combination
         uses the same contained canvas and semantic-token contract. */
      .renderer-reference {
        color: var(--mp-text-body, #e8dcc2);
        background:
          radial-gradient(circle at 50% 0%,
            color-mix(in srgb, var(--mp-accent-secondary, #7a251d) 42%, transparent),
            transparent 45%),
          var(--mp-backdrop, #090706);
      }
      .renderer-reference .marquee-frame {
        border-color: var(--mp-border, #b77a24);
        background: linear-gradient(145deg,
          var(--mp-surface-elevated, #4a1711),
          var(--mp-surface, #32110d) 48%,
          var(--mp-backdrop, #090706));
        box-shadow:
          0 0 0 3px var(--mp-accent-primary, #f6cf70),
          0 28px 90px #000;
      }
      .renderer-reference .marquee {
        border-color: var(--mp-border, #b77a24);
        background: linear-gradient(
          var(--mp-surface-elevated, #4a1711),
          var(--mp-surface, #32110d)
        );
      }
      .renderer-reference :is(h1, .details h2) {
        color: var(--mp-text-heading, #fff7df);
      }
      .renderer-reference :is(.subtitle, .summary) {
        color: var(--mp-text-body, #e8dcc2);
      }
      .renderer-reference :is(.meta, .session, .eyebrow) {
        color: var(--mp-text-muted, #c9bfa8);
      }
      .renderer-reference .progress {
        background: var(--mp-progress-track, #3b2118);
      }
      .renderer-reference .progress i {
        background: var(--mp-progress-fill, #f6cf70);
      }
      .renderer-reference.orientation-landscape .marquee-frame {
        width: min(1500px,
          calc(100vw - clamp(32px, 4.8vw, 80px)),
          calc((100dvh - clamp(32px, 4.8vw, 80px)) * 4 / 3));
        min-height: 0;
        aspect-ratio: 4 / 3;
      }
      .renderer-reference.orientation-portrait .marquee-frame {
        width: min(1080px,
          calc(100vw - clamp(32px, 4.8vw, 80px)),
          calc((100dvh - clamp(32px, 4.8vw, 80px)) * 9 / 16));
        min-height: 0;
        aspect-ratio: 9 / 16;
      }
      @media (orientation: landscape) {
        .renderer-reference.orientation-auto .marquee-frame {
          width: min(1500px,
            calc(100vw - clamp(32px, 4.8vw, 80px)),
            calc((100dvh - clamp(32px, 4.8vw, 80px)) * 4 / 3));
          min-height: 0;
          aspect-ratio: 4 / 3;
        }
      }
      @media (orientation: portrait) {
        .renderer-reference.orientation-auto .marquee-frame {
          width: min(1080px,
            calc(100vw - clamp(32px, 4.8vw, 80px)),
            calc((100dvh - clamp(32px, 4.8vw, 80px)) * 9 / 16));
          min-height: 0;
          aspect-ratio: 9 / 16;
        }
      }
      .studio-preview.renderer-reference.orientation-landscape .marquee-frame {
        width: min(calc(100vw - 462px), calc((100dvh - 48px) * 4 / 3));
      }
      .studio-preview.renderer-reference.orientation-portrait .marquee-frame {
        width: min(calc(100vw - 462px), calc((100dvh - 48px) * 9 / 16));
      }
      @media (min-width: 901px) and (orientation: landscape) {
        .studio-preview.renderer-reference.orientation-auto .marquee-frame {
          width: min(calc(100vw - 462px), calc((100dvh - 48px) * 4 / 3));
        }
      }
      @media (min-width: 901px) and (orientation: portrait) {
        .studio-preview.renderer-reference.orientation-auto .marquee-frame {
          width: min(calc(100vw - 462px), calc((100dvh - 48px) * 9 / 16));
          aspect-ratio: 9 / 16;
        }
      }
      @media (max-width: 900px) {
        .studio-preview.renderer-reference.orientation-landscape .marquee-frame {
          width: min(96vw, calc((54dvh - 20px) * 4 / 3));
        }
        .studio-preview.renderer-reference.orientation-portrait .marquee-frame {
          width: min(96vw, calc((54dvh - 20px) * 9 / 16));
        }
      }
      @media (max-width: 900px) and (orientation: landscape) {
        .studio-preview.renderer-reference.orientation-auto .marquee-frame {
          width: min(96vw, calc((54dvh - 20px) * 4 / 3));
          aspect-ratio: 4 / 3;
        }
      }
      @media (max-width: 900px) and (orientation: portrait) {
        .studio-preview.renderer-reference.orientation-auto .marquee-frame {
          width: min(96vw, calc((54dvh - 20px) * 9 / 16));
          aspect-ratio: 9 / 16;
        }
      }
      @media (min-width: 721px) and (max-width: 900px) and (orientation: portrait) {
        .studio-preview.renderer-reference.orientation-auto .marquee-frame,
        .studio-preview.renderer-reference.orientation-portrait .marquee-frame {
          width: min(96vw, calc(25.875dvh - 12px));
        }
        .studio-preview.renderer-reference.orientation-landscape .marquee-frame {
          width: min(96vw, calc(61.333dvh - 16px));
        }
      }
      /* Portrait designs retain enabled dynamic components instead of hiding
         the complete details region from both Studio and the live display. */
      .theater.orientation-portrait:is(.show-summary, .show-progress) .content {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        grid-template-rows: minmax(0, 1fr) auto !important;
      }
      .theater.orientation-portrait:is(.show-summary, .show-progress) .details {
        display: flex !important;
        flex-direction: column;
        grid-column: 1 !important;
        width: 100%;
        max-width: 100%;
        min-height: clamp(24px, 5cqh, 72px);
        max-height: 18cqh;
        margin-inline: auto;
        padding: 0;
        gap: clamp(3px, .55cqw, 7px);
        overflow: hidden;
      }
      .theater.orientation-portrait:is(.show-summary, .show-progress)
        .details > :not(.summary, .progress) {
        display: none;
      }
      .theater.orientation-portrait:is(.show-summary, .show-progress)
        .poster-wrap {
        grid-column: 1 !important;
      }
      .theater.orientation-portrait .details .summary {
        width: var(--fitted-poster-width, 100%);
        max-width: none;
        margin: 0 auto;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      .theater.orientation-portrait .details .progress {
        width: var(--fitted-poster-width, 100%);
        margin-inline: auto;
        margin-top: 4px;
        flex: 0 0 auto;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .theater.orientation-auto:is(.show-summary, .show-progress) .content {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-rows: minmax(0, 1fr) auto !important;
        }
        .theater.orientation-auto:is(.show-summary, .show-progress) .details {
          display: flex !important;
          flex-direction: column;
          grid-column: 1 !important;
          width: 100%;
          max-width: 100%;
          min-height: clamp(24px, 5cqh, 72px);
          max-height: 18cqh;
          margin-inline: auto;
          padding: 0;
          gap: clamp(3px, .55cqw, 7px);
          overflow: hidden;
        }
        .theater.orientation-auto:is(.show-summary, .show-progress)
          .details > :not(.summary, .progress) {
          display: none;
        }
        .theater.orientation-auto:is(.show-summary, .show-progress)
          .poster-wrap {
          grid-column: 1 !important;
        }
        .theater.orientation-auto .details .summary {
          width: var(--fitted-poster-width, 100%);
          max-width: none;
          margin-inline: auto;
        }
        .theater.orientation-auto .details .progress {
          width: var(--fitted-poster-width, 100%);
          margin-inline: auto;
        }
      }
      /* Dynamic details are layout content, never frame decoration. Every
         photographic frame must preserve the configured components. */
      .theater.has-details .details {
        display: flex !important;
        flex-direction: column;
        min-width: 0;
        max-height: 100%;
        gap: clamp(3px, .55cqw, 9px);
      }
      .theater.has-details .details
        :is(.subtitle, .meta, .summary, .session, .progress) {
        display: block !important;
      }
      .theater.has-details .frame-plaque {
        display: none !important;
      }
      .theater.has-details.frame-marquee:not(.layout-poster)
        .marquee-frame.frame-short .content {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .theater.has-details.orientation-landscape.layout-poster
        .marquee-frame.frame-short .content,
      .theater.has-details.orientation-auto.layout-poster
        .marquee-frame.frame-short .content {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
      }
      .theater.has-details .details h2 {
        display: -webkit-box !important;
        min-width: 0;
        margin: 0;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--title-max-lines, 2);
      }
      .theater.has-details .details h2.title-measuring {
        display: block !important;
        max-height: none !important;
        overflow: visible !important;
        -webkit-line-clamp: unset !important;
      }
      .theater.has-details .details h2.title-truncated {
        display: -webkit-box !important;
        overflow: hidden !important;
        text-overflow: ellipsis;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--title-max-lines, 2);
      }
      .theater.has-details.orientation-landscape:not(.layout-poster) .details {
        height: calc(100% - 24px);
        max-height: calc(100% - 24px);
        justify-content: center;
        overflow: hidden;
      }
      @media (min-width: 721px) and (orientation: landscape) {
        .theater.has-details.orientation-auto:not(.layout-poster) .details {
          height: calc(100% - 24px);
          max-height: calc(100% - 24px);
          justify-content: center;
          overflow: hidden;
        }
      }
      .theater.has-details.layout-poster .details {
        max-height: 30cqh;
        padding-block: 2px;
        gap: clamp(2px, .35cqw, 5px);
      }
      .theater.has-details.layout-poster .details h2 {
        font-size: clamp(var(--title-min-size, 12px), 2.5cqw, 28px);
        line-height: 1.02;
      }
      .theater.has-details.layout-poster .details
        :is(.subtitle, .meta, .summary, .session) {
        margin-block: 0;
        font-size: clamp(.62rem, 1.15cqw, .86rem);
        line-height: 1.15;
      }
      .theater.has-details.layout-poster .details .summary {
        display: -webkit-box !important;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }
      .theater.has-details.layout-poster .details .progress {
        height: 4px;
        margin-top: 2px;
      }
      .theater.has-details.layout-poster .marquee-frame.frame-short .details {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-content: center;
        column-gap: clamp(6px, 1cqw, 12px);
        row-gap: 2px;
      }
      .theater.has-details.layout-poster
        .marquee-frame.frame-short .details h2,
      .theater.has-details.layout-poster
        .marquee-frame.frame-short .details .progress {
        grid-column: 1 / -1;
      }
      .theater.has-details.layout-poster
        .marquee-frame.frame-short .details
        :is(.subtitle, .meta, .summary, .session) {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .theater.has-details.orientation-portrait .content {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        grid-template-rows: minmax(0, 1fr) auto !important;
      }
      .theater.has-details.orientation-portrait .poster-wrap {
        box-sizing: border-box;
        display: flex;
        grid-column: 1 !important;
        align-items: center;
        justify-content: center;
        min-height: 0;
        overflow: hidden;
      }
      .theater.has-details.orientation-portrait .poster {
        width: auto !important;
        height: calc(100% - 2px) !important;
        max-height: 100% !important;
        transform: none;
      }
      .theater.has-details.orientation-portrait .details {
        grid-column: 1 !important;
        box-sizing: border-box;
        width: var(--fitted-poster-width, 100%);
        max-width: 100%;
        max-height: 24cqh;
        margin: 2px auto 0;
        padding-block: clamp(4px, .8cqw, 10px);
        padding-inline: 0;
        text-align: center;
        overflow: hidden;
      }
      .theater.has-details.orientation-portrait .details h2,
      .theater.has-details.orientation-portrait .details .subtitle,
      .theater.has-details.orientation-portrait .details .meta,
      .theater.has-details.orientation-portrait .details .session {
        width: 100%;
        max-width: 100%;
      }
      .theater.has-details.orientation-portrait .details .subtitle,
      .theater.has-details.orientation-portrait .details .summary {
        margin-block: 0;
      }
      .theater.has-details.orientation-portrait .details .meta,
      .theater.has-details.orientation-portrait .details .session {
        margin-block: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .theater.has-details.orientation-portrait .details {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        column-gap: clamp(6px, 1cqw, 12px);
        row-gap: 2px;
      }
      .theater.has-details.orientation-portrait .details h2,
      .theater.has-details.orientation-portrait .details .progress {
        grid-column: 1 / -1;
      }
      .theater.has-details.orientation-portrait .details
        :is(.subtitle, .meta, .summary, .session) {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .theater.has-details.orientation-auto .content {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-rows: minmax(0, 1fr) auto !important;
        }
        .theater.has-details.orientation-auto .poster-wrap {
          box-sizing: border-box;
          display: flex;
          grid-column: 1 !important;
          align-items: center;
          justify-content: center;
          min-height: 0;
          overflow: hidden;
        }
        .theater.has-details.orientation-auto .poster {
          width: auto !important;
          height: calc(100% - 2px) !important;
          max-height: 100% !important;
        }
        .theater.has-details.orientation-auto .details {
          grid-column: 1 !important;
          box-sizing: border-box;
          width: calc(var(--fitted-poster-width, 100%) + 1px);
          max-width: 100%;
          max-height: 24cqh;
          margin: 0 auto;
          padding-block: clamp(4px, .8cqw, 10px);
          padding-inline: 0;
          text-align: center;
          overflow: hidden;
        }
        .theater.has-details.orientation-auto .details h2,
        .theater.has-details.orientation-auto .details .subtitle,
        .theater.has-details.orientation-auto .details .meta,
        .theater.has-details.orientation-auto .details .session {
          width: 100%;
          max-width: 100%;
        }
        .theater.has-details.orientation-auto .details .subtitle,
        .theater.has-details.orientation-auto .details .summary,
        .theater.has-details.orientation-auto .details .meta,
        .theater.has-details.orientation-auto .details .session {
          margin-block: 0;
        }
        .theater.has-details.orientation-auto .details {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          column-gap: clamp(6px, 1cqw, 12px);
          row-gap: 2px;
        }
        .theater.has-details.orientation-auto .details h2,
        .theater.has-details.orientation-auto .details .progress {
          grid-column: 1 / -1;
        }
        .theater.has-details.orientation-auto .details
          :is(.subtitle, .meta, .summary, .session) {
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }
      /* Universal safe-region contract.
         Frame artwork owns the area outside this aperture. Layouts alone own
         the placement of dynamic content inside it. Keep these values shared
         across every built-in frame so switching frames never moves or clips
         the presentation. */
      .theater {
        --safe-top: var(--mp-safe-landscape-top, 19%);
        --safe-right: var(--mp-safe-landscape-right, 15%);
        --safe-bottom: var(--mp-safe-landscape-bottom, 17%);
        --safe-left: var(--mp-safe-landscape-left, 15%);
        --layout-poster-share: 44%;
        --layout-gap: clamp(8px, 1.35cqw, 20px);
        --layout-details-pad: clamp(4px, .7cqw, 12px);
      }
      .theater.orientation-portrait {
        --safe-top: var(--mp-safe-portrait-top, 16%);
        --safe-right: var(--mp-safe-portrait-right, 19%);
        --safe-bottom: var(--mp-safe-portrait-bottom, 14%);
        --safe-left: var(--mp-safe-portrait-left, 19%);
      }
      @media (max-width: 720px), (orientation: portrait) {
        .theater.orientation-auto {
          --safe-top: var(--mp-safe-portrait-top, 16%);
          --safe-right: var(--mp-safe-portrait-right, 19%);
          --safe-bottom: var(--mp-safe-portrait-bottom, 14%);
          --safe-left: var(--mp-safe-portrait-left, 19%);
        }
      }
      .theater .frame-stage {
        position: absolute !important;
        z-index: 1;
        inset:
          var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left)
          !important;
        display: flex !important;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
      }
      .theater .frame-stage > .marquee { flex: 0 0 auto; }
      .theater .frame-stage > .content {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }
      .theater .frame-stage .content {
        display: grid !important;
        gap: var(--layout-gap) !important;
        padding: clamp(2px, .45cqw, 7px) !important;
        align-items: stretch;
      }
      .theater .frame-stage .poster-wrap {
        box-sizing: border-box;
        display: flex;
        min-width: 0;
        min-height: 0;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .theater .frame-stage .poster-wrap .poster {
        width: auto !important;
        max-width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        margin: auto;
        object-fit: contain;
        transform: none;
      }
      .theater.has-details .frame-stage .details {
        box-sizing: border-box;
        display: flex !important;
        width: 100%;
        min-width: 0;
        min-height: 0;
        height: auto;
        max-height: 100%;
        margin: 0;
        padding: var(--layout-details-pad);
        border: clamp(1px, .22cqw, 3px) solid
          var(--mp-border, var(--gold-deep));
        border-radius: clamp(4px, .8cqw, 12px);
        background:
          linear-gradient(145deg,
            color-mix(in srgb,
              var(--mp-surface-elevated, #4a1711) 86%, transparent),
            color-mix(in srgb,
              var(--mp-surface, #32110d) 90%, transparent));
        box-shadow:
          inset 0 0 clamp(8px, 1.8cqw, 24px)
            color-mix(in srgb,
              var(--mp-light-primary, #f6cf70) 10%, transparent),
          0 0 clamp(5px, var(--mp-glow-radius, 9px), 18px)
            color-mix(in srgb,
              var(--mp-light-primary, #f6cf70) 18%, transparent);
        justify-content: center;
        overflow: hidden;
      }
      .theater.has-details .frame-stage .details h2 {
        flex: 0 0 auto;
        font-size: clamp(var(--title-min-size, 12px), 3.1cqw, 42px);
        line-height: 1.02;
        text-wrap: balance;
      }
      .theater.has-details .frame-stage .details
        :is(.subtitle, .meta, .summary, .session) {
        max-width: 100%;
        margin-block: clamp(1px, .25cqw, 5px);
        font-size: clamp(.62rem, 1.2cqw, 1rem);
        line-height: 1.22;
      }
      .theater.has-details .frame-stage .details .summary {
        display: -webkit-box !important;
        overflow: hidden;
        white-space: normal;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 4;
      }
      .theater.has-details .frame-stage .details
        :is(.subtitle, .meta, .session) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .theater.has-details .frame-stage .details .progress {
        flex: 0 0 auto;
        width: 100%;
        height: clamp(3px, .45cqw, 6px);
        margin-top: clamp(2px, .4cqw, 7px);
      }
      .theater.layout-cinematic .frame-stage .content,
      .theater.layout-split .frame-stage .content {
        grid-template-columns:
          minmax(0, var(--layout-poster-share)) minmax(0, 1fr) !important;
        grid-template-rows: minmax(0, 1fr) !important;
      }
      .theater.layout-poster .frame-stage .content {
        grid-template-columns: minmax(0, 1fr) !important;
        grid-template-rows: minmax(0, 1fr) auto !important;
      }
      .theater.layout-poster.has-details .frame-stage .details {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        max-height: 27%;
        column-gap: var(--layout-gap);
        row-gap: 1px;
      }
      .theater.layout-poster.has-details.details-compact
        .frame-stage .details {
        max-height: 24%;
      }
      .theater.layout-poster.has-details.details-expanded
        .frame-stage .details {
        max-height: 40%;
      }
      .theater.layout-poster.has-details .frame-stage .details h2,
      .theater.layout-poster.has-details .frame-stage .details .progress {
        grid-column: 1 / -1;
      }
      .theater.layout-poster.has-details .frame-stage .details
        :is(.subtitle, .meta, .summary, .session) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .theater:is(.orientation-portrait) .frame-stage .content {
        grid-template-columns: minmax(0, 1fr) !important;
        grid-template-rows: minmax(0, 69%) minmax(0, 1fr) !important;
      }
      .theater:is(.orientation-portrait).details-expanded
        .frame-stage .content {
        grid-template-rows: minmax(0, 58%) minmax(0, 1fr) !important;
      }
      .theater:is(.orientation-portrait).has-details .frame-stage .details {
        display: flex !important;
        width: 100%;
        max-width: 100%;
        max-height: 100%;
        padding: clamp(5px, 1.15cqw, 14px);
        text-align: center;
      }
      .theater:is(.orientation-portrait).has-details .frame-stage .details
        :is(.subtitle, .meta, .summary, .session) {
        width: 100%;
        white-space: normal;
      }
      /* Preserve the core movie facts when Linux and macOS font metrics
         allocate slightly different heights to the portrait details stack.
         Flex shrinking previously allowed the metadata row to collapse to
         zero height on slower Linux CI runners. */
      .theater:is(.orientation-portrait).has-details .frame-stage
        .details .meta {
        flex: 0 0 auto;
        min-height: 1.15em;
      }
      .theater:is(.orientation-portrait).has-details .frame-stage
        .details .summary {
        -webkit-line-clamp: 2;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .theater.orientation-auto .frame-stage .content {
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-rows: minmax(0, 69%) minmax(0, 1fr) !important;
        }
        .theater.orientation-auto.details-expanded
          .frame-stage .content {
          grid-template-rows: minmax(0, 58%) minmax(0, 1fr) !important;
        }
        .theater.orientation-auto.has-details .frame-stage .details {
          display: flex !important;
          width: 100%;
          max-width: 100%;
          max-height: 100%;
          padding: clamp(5px, 1.15cqw, 14px);
          text-align: center;
        }
        .theater.orientation-auto.has-details .frame-stage .details
          :is(.subtitle, .meta, .summary, .session) {
          width: 100%;
          white-space: normal;
        }
        .theater.orientation-auto.has-details .frame-stage .details .meta {
          flex: 0 0 auto;
          min-height: 1.15em;
        }
        .theater.orientation-auto.has-details .frame-stage .details
          .summary {
          -webkit-line-clamp: 2;
        }
      }
      /* Frame-specific layout implementations tune proportions, never the
         aperture. These values compensate for each frame's visual weight. */
      .frame-marquee { --layout-poster-share: 45%; }
      .frame-cyber_noir { --layout-poster-share: 43%; --layout-gap: clamp(9px, 1.6cqw, 22px); }
      .frame-comic_hero { --layout-poster-share: 42%; --layout-details-pad: clamp(5px, .9cqw, 14px); }
      .frame-theater_classic { --layout-poster-share: 44%; }
      .frame-indie_nature { --layout-poster-share: 46%; --layout-gap: clamp(10px, 1.8cqw, 24px); }
      .frame-golden_age { --layout-poster-share: 42%; --layout-details-pad: clamp(6px, 1cqw, 16px); }
      .frame-steampunk { --layout-poster-share: 43%; --layout-gap: clamp(9px, 1.5cqw, 21px); }
      .visual-editor-active .marquee-frame { display: none; }
      .marquee-frame,
      .visual-editor-canvas {
        isolation: isolate;
      }
      .design-frame-layer {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .design-frame-layer img {
        display: block;
        width: 100%;
        height: 100%;
        /* Frame art may have a different source ratio than the responsive
           canvas. Cover crops the decorative outer edge without deforming
           fixtures, typography, or material textures. */
        object-fit: cover;
        object-position: center;
      }
      .renderer-authored .frame-stage {
        display: none !important;
      }
      .authored-presentation-canvas {
        position: absolute;
        inset: 0;
        z-index: 1;
        overflow: hidden;
      }
      .authored-component-surface {
        position: absolute;
        /* Component bounds are percentages of the complete presentation
           canvas. The safe opening is a guide/clip contract, not a second
           coordinate system around authored content. */
        inset: 0;
        overflow: visible;
      }
      .authored-component {
        position: absolute;
        display: block;
        min-width: 1px;
        min-height: 1px;
        overflow: hidden;
        container-type: inline-size;
      }
      :is(.authored-component, .editor-component).component-clip-safe_opening,
      :is(.authored-component, .editor-component).component-clip-canvas,
      :is(.authored-component, .editor-component).component-clip-none {
        overflow: visible;
      }
      :is(.authored-component, .editor-component).component-clip-safe_opening {
        clip-path: inset(var(--component-safe-clip));
      }
      .authored-presentation-canvas,
      .visual-editor-canvas {
        clip-path: inset(0);
      }
      .authored-component-content {
        display: grid;
        width: 100%;
        height: 100%;
        place-items: center;
        overflow: hidden;
        transform: rotate(var(--component-rotation, 0deg));
        transform-origin: center;
      }
      .authored-component.constrained-lines .authored-component-content {
        display: -webkit-box;
        align-content: center;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--editor-max-lines);
      }
      .authored-component-content img {
        width: 100%;
        height: 100%;
        object-fit: var(--component-image-fit, contain);
      }
      .authored-component.component-backdrop .authored-component-content img {
        object-fit: var(--component-image-fit, cover);
      }
      .authored-component.component-progress .authored-component-content {
        display: block;
        height: clamp(3px, 8%, 12px);
        margin-top: 46%;
        background: var(--mp-progress-track, #ffffff33);
      }
      .authored-component.component-progress .authored-component-content i {
        display: block;
        height: 100%;
        background: var(--mp-progress-fill, #f6cf70);
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-surface {
        box-sizing: border-box;
        border: 1px solid color-mix(
          in srgb,
          var(--mp-border, #b77a24) 86%,
          white 14%
        );
        border-radius: clamp(3px, .45cqw, 8px);
        box-shadow:
          inset 0 0 0 1px color-mix(
            in srgb,
            var(--mp-accent-primary, #f6cf70) 22%,
            transparent
          ),
          inset 0 0 clamp(8px, 1.8cqw, 24px) #0008,
          0 0 clamp(4px, .8cqw, 14px) color-mix(
            in srgb,
            var(--mp-light-primary, #f6cf70) 24%,
            transparent
          );
        backdrop-filter: blur(2px);
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-poster {
        box-sizing: border-box;
        padding: clamp(2px, .3cqw, 5px);
        border: 1px solid color-mix(
          in srgb,
          var(--mp-border, #b77a24) 78%,
          white 22%
        );
        border-radius: clamp(2px, .25cqw, 5px);
        background: var(--mp-surface, #32110d);
        box-shadow:
          inset 0 0 0 1px #000b,
          0 0 clamp(5px, 1cqw, 16px) #000c;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-mode_heading {
        letter-spacing: var(--mp-heading-tracking, .08em);
        text-transform: uppercase;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-title {
        letter-spacing: calc(var(--mp-heading-tracking, .08em) * .35);
        line-height: 1.02;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-subtitle {
        font-style: italic;
        line-height: 1.12;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-summary {
        line-height: 1.22;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-content_rating
        :is(.authored-component-content, .editor-component-content) {
        box-sizing: border-box;
        width: fit-content;
        height: auto;
        min-height: 68%;
        padding: 0 .3em;
        border: 1px solid currentColor;
        border-radius: 2px;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-progress
        :is(.authored-component-content, .editor-component-content) {
        height: 100%;
        margin-top: 0;
        overflow: hidden;
        border-radius: 999px;
        background: var(--mp-progress-track, #3b2118);
        box-shadow: inset 0 0 2px #000c;
      }
      .renderer-declarative.frame-marquee
        :is(.authored-component, .editor-component).component-progress
        :is(.authored-component-content, .editor-component-content) i {
        background: var(--mp-progress-fill, #f6cf70);
        box-shadow: 0 0 clamp(3px, .8cqw, 10px)
          var(--mp-light-primary, #f6cf70);
      }
      :is(.authored-presentation-canvas, .visual-editor-canvas)
        :is(.authored-component, .editor-component) {
        animation-duration: var(--authored-motion-duration, 4s);
        animation-delay: var(--authored-motion-delay, 0s);
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        animation-direction: alternate;
        will-change: auto;
      }
      :is(.authored-motion-breathe, .authored-motion-pulse,
        .authored-motion-shimmer, .authored-motion-chase)
        :is(.authored-component, .editor-component) {
        will-change: transform, opacity, filter;
      }
      .authored-motion-breathe
        :is(.authored-component, .editor-component) {
        animation-name: authoredBreathe;
      }
      .authored-motion-pulse
        :is(.authored-component, .editor-component) {
        animation-name: authoredPulse;
      }
      .authored-motion-shimmer
        :is(.authored-component, .editor-component) {
        animation-name: authoredShimmer;
      }
      .authored-motion-chase
        :is(.authored-component, .editor-component) {
        animation-name: authoredChase;
      }
      .motion-off :is(.authored-presentation-canvas, .visual-editor-canvas)
        :is(.authored-component, .editor-component) {
        animation: none !important;
      }
      @keyframes authoredBreathe {
        from { transform: scale(1); }
        to {
          transform: scale(var(--authored-motion-scale));
        }
      }
      @keyframes authoredPulse {
        from { opacity: var(--authored-motion-opacity); }
        to { opacity: 1; }
      }
      @keyframes authoredShimmer {
        from { filter: brightness(1) saturate(1); }
        to {
          filter:
            brightness(var(--authored-motion-brightness))
            saturate(var(--authored-motion-saturation));
        }
      }
      @keyframes authoredChase {
        from { transform: translateX(calc(-1 * var(--authored-motion-shift))); }
        to { transform: translateX(var(--authored-motion-shift)); }
      }
      .visual-editor-canvas {
        position: relative;
        z-index: 2;
        width: min(calc(100vw - 462px), calc((100dvh - 48px) * 9 / 16));
        max-height: calc(100dvh - 48px);
        overflow: hidden;
        border: 1px solid #ffffff38;
        outline: 1px dashed #f6cf7088;
        outline-offset: -3px;
        aspect-ratio: 9 / 16;
        background:
          linear-gradient(45deg, #151515 25%, transparent 25%) 0 0/20px 20px,
          linear-gradient(45deg, transparent 75%, #151515 75%) 0 0/20px 20px,
          linear-gradient(45deg, transparent 75%, #151515 75%) 10px -10px/20px 20px,
          linear-gradient(45deg, #151515 25%, #090909 25%) 10px -10px/20px 20px;
        box-shadow: 0 24px 70px #000c;
        touch-action: none;
        transform:
          translate(var(--editor-pan-x, 0%), var(--editor-pan-y, 0%))
          scale(var(--editor-zoom, 1));
        transform-origin: center;
      }
      .visual-editor-viewport {
        position: absolute;
        z-index: 2;
        inset: 0;
        display: grid;
        place-items: center;
        overflow: hidden;
        box-sizing: border-box;
        padding: clamp(12px, 1.5vw, 24px);
        contain: layout paint;
      }
      .editor-design-guides {
        display: none;
        position: absolute;
        z-index: 1050;
        inset: 0;
        pointer-events: none;
      }
      .visual-editor-canvas.guides-enabled .editor-design-guides {
        display: block;
      }
      .editor-guide,
      .editor-ruler {
        position: absolute;
        pointer-events: none;
      }
      .editor-guide-safe {
        inset:
          var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
        border: 1px dashed #45e6ffbb;
        box-shadow: 0 0 0 1px #0008;
      }
      .editor-guide-horizontal {
        top: 50%;
        right: 0;
        left: 0;
        border-top: 1px dashed #f6cf7088;
      }
      .editor-guide-vertical {
        top: 0;
        bottom: 0;
        left: 50%;
        border-left: 1px dashed #f6cf7088;
      }
      .editor-ruler-horizontal {
        top: 0;
        right: 0;
        left: 0;
        height: 9px;
        background:
          repeating-linear-gradient(
            90deg,
            #ffffffa8 0 1px,
            transparent 1px 5%,
            #ffffff55 5% calc(5% + 1px),
            transparent calc(5% + 1px) 10%
          );
      }
      .editor-ruler-vertical {
        top: 0;
        bottom: 0;
        left: 0;
        width: 9px;
        background:
          repeating-linear-gradient(
            180deg,
            #ffffffa8 0 1px,
            transparent 1px 5%,
            #ffffff55 5% calc(5% + 1px),
            transparent calc(5% + 1px) 10%
          );
      }
      .visual-editor-canvas.snap-enabled::before {
        content: "";
        position: absolute;
        z-index: 1000;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(to right, #f6cf7018 1px, transparent 1px),
          linear-gradient(to bottom, #f6cf7018 1px, transparent 1px);
        background-size: 10% 10%;
      }
      .visual-editor-canvas.device-preview {
        width: min(
          calc(100vw - 462px),
          calc((100dvh - 48px) * var(--editor-preview-ratio))
        ) !important;
        aspect-ratio: var(--editor-preview-aspect) !important;
      }
      .visual-editor-active.orientation-landscape .visual-editor-canvas {
        width: min(calc(100vw - 462px), calc((100dvh - 48px) * 4 / 3));
        aspect-ratio: 4 / 3;
      }
      @media (orientation: landscape) {
        .visual-editor-active.orientation-auto .visual-editor-canvas {
          width: min(calc(100vw - 462px), calc((100dvh - 48px) * 4 / 3));
          aspect-ratio: 4 / 3;
        }
      }
      .editor-component {
        position: absolute;
        display: block;
        min-width: 1px;
        min-height: 1px;
        padding: 0;
        overflow: hidden;
        border: 1px solid #ffffff55;
        border-radius: 0;
        background: #10151b38;
        color: #fff;
        cursor: move;
        font: inherit;
        text-align: center;
        touch-action: none;
      }
      .visual-editor-canvas > .design-frame-layer {
        border: 0;
      }
      .visual-editor-canvas .editor-component-surface {
        z-index: 1;
      }
      .editor-component.selected {
        border-color: #f6cf70;
        outline: 2px solid #f6cf7099;
        outline-offset: 1px;
      }
      .editor-context-toolbar {
        position: absolute;
        z-index: 1100;
        display: flex;
        gap: 4px;
        transform: translate(-100%, calc(-100% - 6px));
        padding: 4px;
        border: 1px solid #f6cf7088;
        border-radius: 8px;
        background: #100d0bef;
        box-shadow: 0 7px 22px #000c;
        color: #fff7df;
        font: 600 11px/1 system-ui, sans-serif;
        white-space: nowrap;
        backdrop-filter: blur(10px);
      }
      .editor-context-toolbar button {
        display: inline-flex;
        min-width: 30px;
        min-height: 30px;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 0 7px;
        border: 1px solid #ffffff2e;
        border-radius: 5px;
        background: #251d18;
        color: inherit;
        cursor: pointer;
        font: inherit;
      }
      .editor-context-toolbar button:hover,
      .editor-context-toolbar button:focus-visible {
        border-color: #f6cf70;
        outline: 2px solid #f6cf70;
        outline-offset: 1px;
      }
      .editor-component-content {
        display: grid;
        width: 100%;
        height: 100%;
        place-items: center;
        overflow: hidden;
        transform: rotate(var(--component-rotation, 0deg));
        transform-origin: center;
      }
      .editor-component.constrained-lines .editor-component-content {
        display: -webkit-box;
        align-content: center;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--editor-max-lines);
      }
      .editor-component.locked { cursor: not-allowed; }
      .editor-component-content img {
        width: 100%;
        height: 100%;
        object-fit: var(--component-image-fit, contain);
      }
      .editor-component-label {
        position: absolute;
        top: 2px;
        left: 2px;
        padding: 2px 4px;
        background: #000c;
        color: #fff;
        font-size: clamp(7px, 1cqw, 11px);
        line-height: 1;
        text-transform: uppercase;
      }
      .component-backdrop .editor-component-content img {
        object-fit: var(--component-image-fit, cover);
      }
      .component-progress .editor-component-content {
        display: block;
        height: 5px;
        margin-top: calc(50% - 2px);
        background: #ffffff33;
      }
      .component-progress .editor-component-content i {
        display: block;
        height: 100%;
        background: #f6cf70;
      }
      .editor-resize-handle {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 14px;
        height: 14px;
        border: 0;
        border-top: 2px solid #fff;
        border-left: 2px solid #fff;
        background: #f6cf70;
        cursor: nwse-resize;
      }
      @media (max-width: 900px) {
        .editor-context-popover {
          z-index: 140;
          left: max(8px, env(safe-area-inset-left));
          right: max(8px, env(safe-area-inset-right));
          bottom: max(8px, env(safe-area-inset-bottom));
          top: auto;
          width: auto;
          max-height: min(68dvh, 620px);
          border-radius: 16px 16px 10px 10px;
        }
        .editor-context-toolbar {
          transform: translate(-100%, calc(-100% - 4px));
        }
        .visual-editor-canvas {
          width: min(96vw, calc((54dvh - 20px) * 9 / 16));
          max-height: calc(54dvh - 20px);
        }
        .visual-editor-active.orientation-landscape .visual-editor-canvas {
          width: min(96vw, calc((54dvh - 20px) * 4 / 3));
        }
        .visual-editor-active.orientation-auto .visual-editor-canvas {
          width: min(96vw, calc((54dvh - 20px) * 9 / 16));
          aspect-ratio: 9 / 16;
        }
      }
      @media (max-width: 900px) and (orientation: landscape) {
        .visual-editor-active.orientation-auto .visual-editor-canvas {
          width: min(96vw, calc((54dvh - 20px) * 4 / 3));
          aspect-ratio: 4 / 3;
        }
      }
      /* The development renderer must never expose the legacy physical frame
         or content stage beneath its structural layers. Keeping the dormant
         nodes for now limits recovery risk; these rules make the active
         rendering paths mutually exclusive until the markup is fully split. */
      .renderer-declarative .renderer-inactive {
        display: none !important;
      }
      main.theater.renderer-declarative .marquee-frame {
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        clip-path: none !important;
      }
      main.theater.renderer-declarative .marquee-frame::before,
      main.theater.renderer-declarative .marquee-frame::after {
        content: none !important;
        display: none !important;
      }
      /* Frame-native motion scenes. Themes supply semantic colors, while each
         Frame owns unique physical elements, placement, and movement. */
      .frame-motion-scene {
        position: absolute;
        z-index: 3;
        inset: 0;
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
        contain: paint;
        opacity: calc(.25 + var(--frame-motion-intensity, 0) * .75);
      }
      .frame-motion-scene i {
        position: absolute;
        display: block;
        animation-duration: var(--frame-motion-duration, 4s);
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
        animation-delay: calc(var(--frame-light-index, 0) * -.16s);
      }
      .cyber-scan-beam {
        inset: 8% auto 8% -14%;
        width: 11%;
        background: linear-gradient(90deg, transparent,
          color-mix(in srgb, var(--mp-light-primary, #31dcff) 78%, transparent),
          transparent);
        border-inline: 1px solid var(--mp-light-primary, #31dcff);
        filter: blur(2px) drop-shadow(0 0 9px var(--mp-light-primary, #31dcff));
        animation-name: frameCyberScan;
        animation-timing-function: linear;
      }
      .cyber-powered-node {
        top: calc(9% + var(--frame-light-index) * 10%);
        width: clamp(5px, .65cqw, 10px);
        aspect-ratio: 1;
        border: 1px solid var(--mp-light-primary, #31dcff);
        transform: rotate(45deg);
        background: var(--mp-light-secondary, #ff36d1);
        box-shadow: 0 0 3px #fff, 0 0 14px var(--mp-light-secondary, #ff36d1);
        animation-name: frameCyberNode;
        animation-timing-function: steps(2, end);
      }
      .cyber-powered-node:nth-child(even) {
        left: 2.5%;
      }
      .cyber-powered-node:nth-child(odd) {
        right: 2.5%;
      }
      .comic-panel-pulse {
        width: 24%;
        height: 15%;
        background: radial-gradient(ellipse,
          color-mix(in srgb, var(--mp-light-primary, #fff36a) 62%, transparent),
          transparent 70%);
        mix-blend-mode: screen;
        filter: blur(8px);
        animation-name: frameComicPanelPulse;
        animation-timing-function: steps(3, end);
      }
      .comic-panel-pulse:nth-child(4n+1) { left: 4%; top: 3%; }
      .comic-panel-pulse:nth-child(4n+2) { right: 4%; top: 3%; }
      .comic-panel-pulse:nth-child(4n+3) { left: 5%; bottom: 3%; }
      .comic-panel-pulse:nth-child(4n) { right: 5%; bottom: 3%; }
      .comic-ink-flash {
        inset: 2%;
        border: clamp(2px, .35cqw, 5px) solid transparent;
        border-image: linear-gradient(115deg, transparent 12%,
          var(--mp-light-secondary, #ff4060) 34%, transparent 52%) 1;
        animation-name: frameComicInkFlash;
        animation-timing-function: steps(2, end);
      }
      .theater-sconce {
        top: 24%;
        width: clamp(12px, 2.2cqw, 34px);
        aspect-ratio: .72;
        border-radius: 50%;
        background: radial-gradient(ellipse, #fff 0 4%,
          var(--mp-light-primary, #ffd98c) 12% 28%, transparent 68%);
        filter: blur(1px);
        animation-name: frameSconceBreathe;
      }
      .theater-sconce:nth-child(odd) {
        left: 10.7%;
      }
      .theater-sconce:nth-child(even) {
        right: 10.7%;
      }
      .theater-sconce:nth-child(n+3) { top: 66%; }
      .curtain-shimmer {
        inset: 0;
        background: linear-gradient(108deg, transparent 15%,
          color-mix(in srgb, var(--mp-light-primary, #ffd98c) 18%, transparent) 36%,
          transparent 55%);
        mix-blend-mode: screen;
        animation-name: frameCurtainShimmer;
      }
      .leaf-shadow {
        width: 22%;
        aspect-ratio: 1.8;
        border-radius: 90% 0 90% 0;
        background: color-mix(in srgb, var(--mp-light-secondary, #315a35) 38%, transparent);
        filter: blur(5px);
        animation-name: frameDappleDrift;
        animation-direction: alternate;
      }
      .nature-motion { inset: 15% 13%; }
      .leaf-shadow:nth-child(1) { left: 2%; top: 7%; }
      .leaf-shadow:nth-child(2) { right: 3%; top: 22%; }
      .leaf-shadow:nth-child(3) { left: 13%; top: 57%; }
      .leaf-shadow:nth-child(4) { right: 9%; top: 69%; }
      .leaf-shadow:nth-child(5) { left: 38%; top: 83%; }
      .firefly {
        left: calc(10% + var(--frame-light-index) * 17%);
        top: calc(18% + (var(--frame-light-index) % 3) * 27%);
        width: clamp(3px, .35cqw, 6px);
        aspect-ratio: 1;
        border-radius: 50%;
        background: var(--mp-light-primary, #fff4a0);
        box-shadow: 0 0 12px var(--mp-light-primary, #fff4a0);
        animation-name: frameFirefly;
      }
      .golden-footlight {
        left: var(--frame-light-position);
        bottom: 10.5%;
        width: clamp(6px, .85cqw, 13px);
        aspect-ratio: .72;
        border-radius: 50% 50% 30% 30%;
        border: 1px solid var(--mp-border, #b98b3f);
        background: radial-gradient(circle at 50% 25%, #fff 0 8%,
          var(--mp-light-primary, #ffd875) 22% 50%, #6c3c12 78%);
        box-shadow: 0 0 14px var(--mp-light-primary, #ffd875);
        animation-name: frameFootlightWave;
      }
      .golden-shimmer {
        inset: 3%;
        border: 2px solid transparent;
        border-image: linear-gradient(115deg, transparent 20%,
          var(--mp-light-primary, #ffd875), transparent 60%) 1;
        animation-name: frameGoldenShimmer;
        animation-timing-function: linear;
      }
      .steam-gear {
        width: clamp(22px, 6cqw, 82px);
        aspect-ratio: 1;
        border: clamp(3px, .6cqw, 8px) dashed var(--mp-border, #9b6332);
        border-radius: 50%;
        background: radial-gradient(circle, transparent 0 27%,
          var(--mp-light-secondary, #693f25) 30% 42%, transparent 45%);
        box-shadow: inset 0 0 10px var(--mp-light-primary, #ff9d48),
          0 0 7px color-mix(in srgb, var(--mp-light-primary, #ff9d48) 40%, transparent);
        animation-name: frameGearTurn;
        animation-timing-function: linear;
      }
      .steam-gear:nth-child(3n+1) { left: 2%; top: 6%; }
      .steam-gear:nth-child(3n+2) { right: 2%; top: 18%; animation-direction: reverse; }
      .steam-gear:nth-child(3n) { right: 4%; bottom: 6%; }
      .steam-lamp {
        top: 8.3%;
        width: 8.5%;
        height: 8%;
        border-radius: 50%;
        background: radial-gradient(ellipse,
          color-mix(in srgb, #fff 70%, var(--mp-light-primary, #ff9d48)) 0 7%,
          var(--mp-light-primary, #ff9d48) 18%, transparent 66%);
        mix-blend-mode: screen;
        filter: blur(2px);
        animation-name: framePressurePulse;
      }
      .steam-lamp-left { left: 8.5%; }
      .steam-lamp-right { right: 8.5%; animation-delay: -1.1s; }
      .steam-plume {
        bottom: 3%;
        width: 11%;
        height: 28%;
        border-radius: 50%;
        background: radial-gradient(ellipse at 50% 100%,
          color-mix(in srgb, #fff 30%, transparent), transparent 70%);
        filter: blur(7px);
        animation-name: frameSteamRise;
      }
      .steam-plume-left { left: 5%; }
      .steam-plume-right { right: 5%; animation-delay: -1.2s; }
      .pressure-glow {
        right: 3%;
        top: 46%;
        width: 7%;
        aspect-ratio: 1;
        border: 2px solid var(--mp-border, #9b6332);
        border-radius: 50%;
        background: radial-gradient(circle, #fff 0 5%,
          var(--mp-light-primary, #ff6a32) 20% 52%, #38150b 75%);
        box-shadow: 0 0 18px var(--mp-light-primary, #ff6a32);
        animation-name: framePressurePulse;
      }
      @keyframes frameFootlightWave {
        0%, 100% { opacity: .45; transform: translateX(-50%) scale(.88); }
        50% { opacity: 1; transform: translateX(-50%) scale(1.12); }
      }
      @keyframes frameCyberScan {
        from { transform: translateX(0); opacity: 0; }
        12%, 82% { opacity: .9; }
        to { transform: translateX(1250%); opacity: 0; }
      }
      @keyframes frameCyberNode {
        0%, 70%, 100% { opacity: .18; filter: brightness(.7); }
        78%, 92% { opacity: 1; filter: brightness(1.6); }
      }
      @keyframes frameComicPanelPulse {
        0%, 100% { opacity: .08; transform: scale(.92); }
        45%, 65% { opacity: .58; transform: scale(1.04); }
      }
      @keyframes frameComicInkFlash {
        0%, 75%, 100% { opacity: .05; filter: brightness(.8); }
        82%, 92% { opacity: .72; filter: brightness(1.5); }
      }
      @keyframes frameSconceBreathe {
        from { opacity: .42; transform: scale(.88); }
        to { opacity: .95; transform: scale(1.12); }
      }
      @keyframes frameCurtainShimmer {
        from { opacity: .12; transform: translateX(-35%); }
        to { opacity: .5; transform: translateX(35%); }
      }
      @keyframes frameDappleDrift {
        from { opacity: .2; transform: translate(-6%, -4%) rotate(-4deg); }
        to { opacity: .7; transform: translate(8%, 5%) rotate(5deg); }
      }
      @keyframes frameFirefly {
        0%, 100% { opacity: .12; transform: translate(-8px, 5px); }
        45% { opacity: 1; transform: translate(7px, -9px); }
      }
      @keyframes frameGoldenShimmer {
        from { filter: brightness(.65); opacity: .2; }
        50% { filter: brightness(1.5); opacity: .9; }
        to { filter: brightness(.65); opacity: .2; }
      }
      @keyframes frameGearTurn { to { transform: rotate(1turn); } }
      @keyframes frameSteamRise {
        from { opacity: 0; transform: translateY(20%) scale(.7); }
        45% { opacity: .5; }
        to { opacity: 0; transform: translateY(-55%) scale(1.25); }
      }
      @keyframes framePressurePulse {
        from { filter: brightness(.65); transform: scale(.92); }
        to { filter: brightness(1.5); transform: scale(1.08); }
      }
      .theater:not(.motion-off) .content,
      .theater:not(.motion-off) .ambient {
        transition: opacity .24s ease, transform .24s ease;
      }
      .theater.media-leaving .content {
        opacity: 0;
        transform: scale(.994);
      }
      .theater.media-leaving .ambient { opacity: .35; }
      .theater.media-arriving .marquee-frame { animation: none; }
      .theater.media-arriving .content {
        animation: mediaArrive .7s cubic-bezier(.22, .75, .25, 1) both;
      }
      .theater.media-arriving .ambient { animation: ambientArrive 1s ease both; }
      @keyframes mediaArrive {
        from { opacity: 0; transform: scale(.994); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes ambientArrive { from { opacity: .35; } to { opacity: .75; } }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          scroll-behavior: auto !important;
          animation-duration: .001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .001ms !important;
        }
        .marquee-frame, .marquee-frame::before { animation: none; }
        .frame-motion-scene i,
        .marquee-bulbs i,
        .marquee-bulbs::before { animation: none !important; }
        .marquee-frame::before { opacity: .8; }
      }
      .motion-off .frame-motion-scene i { animation: none !important; }
    </style>`;
  }
}

// Home Assistant can retain older panel module URLs across integration reloads.
// A versioned primary element prevents the first historical module from
// permanently claiming the live panel. Keep the stable alias for standalone
// harnesses and third-party embeds.
if (!customElements.get("movie-poster-panel-v23")) {
  customElements.define("movie-poster-panel-v23", MoviePosterPanel);
}
if (!customElements.get("movie-poster-panel")) {
  customElements.define("movie-poster-panel", class extends MoviePosterPanel {});
}
