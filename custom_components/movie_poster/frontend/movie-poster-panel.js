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

const normalizeTheme = (value) => THEMES.has(value) ? value : "classic";
const ORIENTATIONS = new Set(["auto", "landscape", "portrait"]);
const normalizeOrientation = (value) => ORIENTATIONS.has(value) ? value : "auto";
const LAYOUTS = new Set(["cinematic", "poster", "split"]);
const normalizeLayout = (value) => LAYOUTS.has(value) ? value : "cinematic";
const FRAMES = new Set([
  "marquee", "cyber_noir", "comic_hero", "theater_classic",
  "indie_nature", "golden_age", "steampunk",
]);
const normalizeFrame = (value) => FRAMES.has(value) ? value : "marquee";
const FONTS = new Set(["system", "cinematic", "serif", "modern", "condensed"]);
const normalizeFont = (value) => FONTS.has(value) ? value : "system";
const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value ?? "")
  ? value : fallback;
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
    theme: "classic", orientation: "auto", show_summary: true,
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
    this._studio = new URLSearchParams(window.location.search).get("studio") === "1";
    this._studioLoaded = false;
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
  }

  disconnectedCallback() {
    this._setKiosk(false);
    clearTimeout(this._retryTimer);
    clearTimeout(this._reloadTimer);
    clearTimeout(this._controlsTimer);
    this._bulbObserver?.disconnect();
    this._bulbObserver = null;
    document.removeEventListener("visibilitychange", this._resumeHandler);
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
            entry_id: state.entry_id,
            heading: presentation.coming_soon_text,
            presentation,
          };
          this._studioLoaded = true;
          this._render();
          return;
        }
        const previous = this._state?.media;
        if (previous && state.media && previous.key === state.media.key) {
          state.media.poster_url = previous.poster_url;
          state.media.backdrop_url = previous.backdrop_url;
        }
        this._applyState(state);
      },
      { type: "movie_poster/subscribe" },
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
    const previousRevision = this._state?.presentation_revision;
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
    this._renderIdentity = identity;
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
    const meta = [media.year, formatRuntime(media.duration_ms)]
      .filter(Boolean)
      .join(" · ");
    const theme = normalizeTheme(state.presentation?.theme);
    const presentation = state.presentation ?? {};
    const motionClass = presentation.enable_motion === false ? " motion-off" : "";
    const orientation = normalizeOrientation(presentation.orientation);
    const layout = normalizeLayout(presentation.layout);
    const frame = normalizeFrame(presentation.frame_theme);
    const headingFont = normalizeFont(presentation.heading_font || "cinematic");
    const bodyFont = normalizeFont(presentation.body_font);
    const accentColor = normalizeColor(presentation.accent_color, "#f6cf70");
    const backgroundColor = normalizeColor(presentation.background_color, "#090706");
    const logoUrl = String(presentation.logo_url || "").trim();
    const logoPosition = normalizeLogoPosition(presentation.logo_position);
    const backdrop = media.backdrop_url
      ? `url('${escapeHtml(media.backdrop_url)}')` : "none";
    const presentationStyle = `style="--backdrop:${backdrop};--gold:${accentColor};--ink:${backgroundColor}"`;

    this.shadowRoot.innerHTML = `${this._styles()}${this._studioControls()}
      <main class="theater theme-${theme} mode-${escapeHtml(state.mode)}${motionClass} orientation-${orientation} layout-${layout} frame-${frame} font-heading-${headingFont} font-body-${bodyFont}"
        ${presentationStyle}>
        <div class="ambient"></div>
        ${this._displayControls()}
        <p class="connection-warning" role="status"
          ${state.health?.connected === false ? "" : "hidden"}>
          ${escapeHtml(state.health?.message)}</p>
        <section class="marquee-frame${logoUrl ? ` has-logo logo-at-${logoPosition}` : ""}">
          <div class="marquee-bulbs" aria-hidden="true">
          </div>
          ${logoUrl ? `<div class="brand-logo logo-${logoPosition}">
            <img src="${escapeHtml(logoUrl)}" alt="Theater logo">
          </div>` : ""}
          <div class="frame-ornaments" aria-hidden="true">
            <i class="ornament ornament-left"></i><i class="ornament ornament-right"></i>
          </div>
          <header class="marquee">
            <span class="eyebrow">${escapeHtml(presentation.eyebrow_text || "Theater Presentation")}</span>
            <h1>${escapeHtml(state.heading)}</h1>
          </header>
          <div class="content">
            <div class="poster-wrap">
              ${media.poster_url
                ? `<img class="poster" src="${escapeHtml(media.poster_url)}"
                     alt="Poster for ${escapeHtml(media.title)}">`
                : '<div class="poster poster-missing">No poster available</div>'}
              <footer class="frame-plaque">
                <strong>${escapeHtml(media.title)}</strong>
                <span>${escapeHtml(media.subtitle || state.heading)}</span>
              </footer>
            </div>
            <article class="details">
              <h2>${escapeHtml(media.title)}</h2>
              ${media.subtitle ? `<p class="subtitle">${escapeHtml(media.subtitle)}</p>` : ""}
              ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
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
        </section>
      </main>`;
    this._bindStudioControls();
    this._bindDisplayControls();
    this._bindMarqueeBulbs();
  }

  _bindMarqueeBulbs() {
    this._bulbObserver?.disconnect();
    const frame = this.shadowRoot.querySelector(".frame-marquee .marquee-frame");
    if (!frame) return;
    const layout = () => this._layoutMarqueeBulbs(frame);
    layout();
    this._bulbObserver = new ResizeObserver(layout);
    this._bulbObserver.observe(frame);
  }

  _layoutMarqueeBulbs(frame) {
    const container = frame.querySelector(".marquee-bulbs");
    if (!container) return;
    const inset = 4;
    const width = Math.max(0, frame.clientWidth - inset * 2);
    const height = Math.max(0, frame.clientHeight - inset * 2);
    const horizontalCount = Math.max(3, Math.round(width / 42) + 1);
    const verticalCount = Math.max(3, Math.round(height / 42));
    const points = [
      ...Array.from({ length: horizontalCount }, (_, index) => ({
        x: (index + .5) * width / horizontalCount, y: 0,
      })),
      ...Array.from({ length: verticalCount }, (_, index) => ({
        x: width, y: (index + .5) * height / verticalCount,
      })),
      ...Array.from({ length: horizontalCount }, (_, index) => ({
        x: width - (index + .5) * width / horizontalCount, y: height,
      })),
      ...Array.from({ length: verticalCount }, (_, index) => ({
        x: 0, y: height - (index + .5) * height / verticalCount,
      })),
    ];
    const count = points.length;
    if (Number(container.dataset.count) !== count) {
      container.replaceChildren(...Array.from({ length: count }, () =>
        document.createElement("i")));
      container.dataset.count = String(count);
    }
    [...container.children].forEach((bulb, index) => {
      const { x, y } = points[index];
      bulb.style.left = `${x + inset}px`;
      bulb.style.top = `${y + inset}px`;
      bulb.style.setProperty("--bulb-delay", `${-index * 4.8 / count}s`);
    });
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

  _studioControls() {
    if (!this._studio) return "";
    const presentation = this._state?.presentation ?? {};
    return `<aside class="studio" aria-label="Display Studio controls">
      <strong>Display Studio</strong>
      <label>Theme<select data-studio="theme">
        ${["classic", "art_deco", "neon", "minimal", "oled"].map((value) =>
          `<option value="${value}" ${presentation.theme === value ? "selected" : ""}>${value.replace("_", " ")}</option>`
        ).join("")}
      </select></label>
      <label>Layout<select data-studio="layout">
        ${["cinematic", "poster", "split"].map((value) =>
          `<option value="${value}" ${presentation.layout === value ? "selected" : ""}>${value}</option>`
        ).join("")}
      </select></label>
      <label>Frame<select data-studio="frame_theme">
        ${["marquee", "cyber_noir", "comic_hero", "theater_classic",
          "indie_nature", "golden_age", "steampunk"].map((value) =>
          `<option value="${value}" ${presentation.frame_theme === value ? "selected" : ""}>${value.replace("_", " ")}</option>`
        ).join("")}
      </select></label>
      <label>Orientation<select data-studio="orientation">
        ${["auto", "landscape", "portrait"].map((value) =>
          `<option value="${value}" ${presentation.orientation === value ? "selected" : ""}>${value}</option>`
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
      ${[["show_summary", "Summary"], ["show_progress", "Progress"],
        ["show_session", "Session"], ["enable_motion", "Motion"]].map(([field, label]) =>
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
        this._renderIdentity = null;
        this._render();
      });
    });
    this.shadowRoot.querySelector('[data-studio-action="back"]')
      ?.addEventListener("click", () => this._returnToSettings());
    this.shadowRoot.querySelector('[data-studio-action="save"]')
      ?.addEventListener("click", () => this._saveStudio());
  }

  async _saveStudio() {
    const button = this.shadowRoot.querySelector('[data-studio-action="save"]');
    const status = this.shadowRoot.querySelector(".studio-status");
    if (!this._hass || !this._state?.entry_id || !button) return;
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      const presentation = this._state.presentation;
      await this._hass.callWS({
        type: "movie_poster/update_presentation",
        entry_id: this._state.entry_id,
        theme: normalizeTheme(presentation.theme),
        orientation: normalizeOrientation(presentation.orientation),
        layout: normalizeLayout(presentation.layout),
        frame_theme: normalizeFrame(presentation.frame_theme),
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
        display: block;
        min-height: 100vh;
        background: var(--ink);
        color: #fff7df;
        font-family: "Trebuchet MS", Arial, sans-serif;
      }
      * { box-sizing: border-box; }
      .theater, .empty {
        position: relative;
        min-height: 100vh;
        overflow: hidden;
        display: grid;
        place-items: center;
        padding: clamp(16px, 2.4vw, 40px);
        background:
          radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--gold) 28%, transparent) 0%, transparent 45%),
          linear-gradient(145deg, color-mix(in srgb, var(--ink) 75%, #000), var(--ink) 50%, #000);
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
      .theater { font-family: var(--body-font, "Trebuchet MS", Arial, sans-serif); }
      .theme-art_deco {
        --gold: #e9d59b;
        --gold-deep: #7c6735;
        --ink: #08100f;
        --velvet: #12302c;
        background:
          repeating-linear-gradient(135deg, #ffffff08 0 1px, transparent 1px 42px),
          radial-gradient(circle at 50% 0%, #1b4b43, transparent 48%), var(--ink);
      }
      .theme-neon {
        --gold: #29f2ff;
        --gold-deep: #b51fff;
        --ink: #05000d;
        --velvet: #260052;
        background:
          radial-gradient(circle at 20% 0%, #4b0075 0, transparent 40%),
          radial-gradient(circle at 85% 100%, #003d5c 0, transparent 42%), var(--ink);
      }
      .theme-minimal {
        --gold: #f2f2f2;
        --gold-deep: #777;
        --ink: #171717;
        --velvet: #252525;
        background: var(--ink);
      }
      .theme-oled {
        --gold: #fff;
        --gold-deep: #333;
        --ink: #000;
        --velvet: #000;
        background: var(--ink);
      }
      .theme-classic {
        background:
          linear-gradient(90deg, #180405 0, #4a0b0e 8%, transparent 19% 81%,
            #4a0b0e 92%, #180405 100%),
          radial-gradient(ellipse at 50% -10%, #7a251d88, transparent 52%),
          linear-gradient(#170706, #030202 72%);
      }
      .theme-classic .marquee {
        background: linear-gradient(#32110de8, #160806e8);
        border-block: 1px solid #b77a2466;
      }
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
        border-color: var(--gold); outline: none;
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
        padding: 14px;
        border: 1px solid #ffffff30;
        border-radius: 12px;
        background: #090706ee;
        box-shadow: 0 12px 35px #000b;
        color: #fff7df;
        font-size: .78rem;
        backdrop-filter: blur(12px);
      }
      .studio strong, .studio small, .studio-actions { grid-column: 1 / -1; }
      .studio label { display: grid; gap: 4px; text-transform: capitalize; }
      .studio select, .studio input[type="text"] {
        min-height: 31px;
        border: 1px solid #ffffff33;
        border-radius: 5px;
        background: #221713;
        color: inherit;
      }
      .studio input[type="text"] { width: 100%; padding: 0 8px; }
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
      .marquee-frame {
        position: relative;
        width: min(1500px, 99vw);
        min-height: min(98vh, 1120px);
        padding: clamp(20px, 3vw, 46px);
        border: 8px solid #2b1608;
        border-radius: 28px;
        background: linear-gradient(135deg, #130b08ee, #050403f5);
        box-shadow: 0 0 0 3px var(--gold-deep), 0 28px 90px #000;
        animation: reveal .55s ease-out both;
      }
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
      .marquee-frame.logo-at-center .marquee { padding-top: 68px; }
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
      .layout-poster .details { margin-top: 18px; text-align: center; }
      .layout-poster .details h2 { font-size: clamp(1.7rem, 3vw, 3rem); }
      .layout-poster .summary, .layout-poster .session { display: none; }
      .layout-split .content { grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr); }
      .layout-split .details {
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: clamp(20px, 3vw, 48px);
        border-left: 1px solid color-mix(in srgb, var(--gold) 35%, transparent);
        background: #0003;
      }

      /* Illuminated glass frame with a cyan title plinth. */
      .frame-cyber_noir .marquee-frame {
        border: 2px solid #bcefff88;
        border-radius: 2px;
        background: linear-gradient(145deg, #101820f5, #020507fa);
        box-shadow: inset 0 0 0 10px #071016, inset 0 0 0 12px #55ddff55,
          0 0 28px #41dfff88, 0 28px 90px #000;
      }
      .frame-cyber_noir .marquee-frame::before {
        inset: 8px; border: 1px solid #6ee9ff; border-radius: 0;
        filter: drop-shadow(0 0 8px #35dfff); animation: cyberPulse 2s ease-in-out infinite;
      }
      .frame-cyber_noir .frame-plaque {
        display: block; border: 1px solid #8beeff; background: #73e5ff1f;
        color: #bff7ff; box-shadow: inset 0 0 16px #42dbff45, 0 0 20px #42dbff55;
      }
      .frame-cyber_noir .ornament { background: linear-gradient(#55e5ff, transparent, #55e5ff); width: 2px; }
      @keyframes cyberPulse { 50% { opacity: .52; filter: drop-shadow(0 0 3px #35dfff); } }

      /* Layered comic-book energy frame. */
      .frame-comic_hero .marquee-frame {
        padding: clamp(34px, 4.5vw, 68px);
        border: 14px solid #ef2f24;
        border-radius: 4px;
        background:
          linear-gradient(135deg, #f7ba20 0 9%, transparent 9% 91%, #1768c4 91%),
          linear-gradient(45deg, #1768c4 0 8%, transparent 8% 92%, #f7ba20 92%),
          radial-gradient(circle, #ffffff18 0 3px, transparent 4px) 0 0/20px 20px,
          linear-gradient(135deg, #101423, #070914);
        box-shadow: inset 18px 0 0 #1768c4, inset -18px 0 0 #f7ba20,
          0 30px 80px #000;
        filter: drop-shadow(18px -14px 0 #f7ba20)
          drop-shadow(-18px 16px 0 #1768c4);
        clip-path: polygon(4% 0, 96% 3%, 100% 94%, 94% 100%, 3% 97%, 0 7%);
      }
      .frame-comic_hero .marquee-frame::before {
        inset: 14px; border: 7px solid #fff; border-radius: 0; filter: none;
        clip-path: polygon(3% 0, 100% 4%, 97% 100%, 0 95%);
      }
      .frame-comic_hero .content {
        padding-inline: clamp(34px, 5vw, 82px);
      }
      .frame-comic_hero .ornament {
        top: 21%; bottom: 16%; width: clamp(30px, 3vw, 52px);
        background: repeating-linear-gradient(135deg, #f7ba20 0 18px,
          #ef2f24 18px 36px, #1768c4 36px 54px);
        clip-path: polygon(50% 0, 100% 12%, 65% 26%, 100% 42%, 58% 58%,
          100% 76%, 48% 100%, 0 88%, 35% 68%, 0 50%, 38% 32%, 0 15%);
      }
      .frame-comic_hero .ornament-left { left: 18px; }
      .frame-comic_hero .ornament-right { right: 18px; transform: scaleX(-1); }
      .frame-comic_hero h1, .frame-comic_hero .details h2 {
        font-family: var(--heading-font, Impact, sans-serif); font-style: italic;
        text-shadow: 3px 3px 0 #1265bd, 6px 6px 0 #111;
      }
      .frame-comic_hero .frame-plaque { display: block; color: #fff; background: #d9271f; transform: skew(-5deg); }

      /* Restrained lobby signage in walnut and brass. */
      .frame-theater_classic .marquee-frame {
        border: 14px ridge #6d4527; border-radius: 3px;
        background: linear-gradient(90deg, #2d160b, #53301c 8%, #120b08 18% 82%, #53301c 92%, #2d160b);
        box-shadow: inset 0 0 0 3px #d2a85b, 0 26px 70px #000;
      }
      .frame-theater_classic .marquee-frame::before { inset: 10px; border: 2px solid #c89d52; border-radius: 0; filter: none; animation: none; }
      .frame-theater_classic .marquee { border: 2px solid #a77b3d; background: #24150de8; }
      .frame-theater_classic .eyebrow::before { content: "THEATRE 1 · "; }
      .frame-theater_classic .frame-plaque { display: block; color: #f3d89b; border: 1px solid #a77b3d; background: #21130d; }

      /* Bamboo, warm wood, glass, and subtle foliage. */
      .frame-indie_nature .marquee-frame {
        border: 16px solid transparent; border-image: repeating-linear-gradient(90deg, #c79c55 0 18px, #6d4d23 18px 22px) 16;
        border-radius: 0; background: linear-gradient(135deg, #182317f2, #090d08f7);
        box-shadow: inset 0 0 35px #79a75f33, 0 28px 80px #000;
      }
      .frame-indie_nature .marquee-frame::before { inset: 7px; border: 1px solid #b8d18d88; border-radius: 0; filter: none; animation: none; }
      .frame-indie_nature .ornament { width: 34px; opacity: .7; background: radial-gradient(ellipse at 20% 20%, #81a85d 0 20%, transparent 22%) 0 0/25px 40px; }
      .frame-indie_nature .frame-plaque { display: block; color: #dcecc3; border: 1px solid #8aa46b; background: #415236cc; }

      /* Golden-age proscenium with columns and velvet. */
      .frame-golden_age .marquee-frame {
        border: 13px ridge #8c4b24; border-radius: 24px 24px 3px 3px;
        background: linear-gradient(90deg, #350a0d, #6f1720 10%, #1a0809 22% 78%, #6f1720 90%, #350a0d);
        box-shadow: inset 0 0 0 4px #d9a64f, inset 0 0 40px #7f1018, 0 30px 90px #000;
      }
      .frame-golden_age .marquee-frame::before { inset: 10px; border: 3px double #f2c66b; border-radius: 14px 14px 0 0; filter: drop-shadow(0 0 4px #d49b3a); }
      .frame-golden_age .ornament { width: 26px; border: 3px ridge #d5a64e; background: repeating-linear-gradient(90deg, #8c551d 0 3px, #e0b85d 4px 7px); }
      .frame-golden_age .frame-plaque { display: block; color: #3b170c; border: 4px ridge #d4a24b; border-radius: 50%; background: #e4c77d; }

      /* Riveted copper, pipes, gauges, and warm bulbs. */
      .frame-steampunk .marquee-frame {
        border: 13px solid #443126; border-radius: 5px;
        background: repeating-linear-gradient(90deg, #ffffff08 0 1px, transparent 1px 34px),
          linear-gradient(135deg, #3b2b22, #120e0b 45%, #302018);
        box-shadow: inset 0 0 0 4px #a75e35, inset 0 0 35px #000, 0 28px 80px #000;
      }
      .frame-steampunk .marquee-frame::before {
        inset: 8px; border: 6px dotted #b4774f; border-radius: 0; filter: drop-shadow(0 0 5px #ff9b42);
      }
      .frame-steampunk .ornament { width: 18px; border: 5px solid #895739; border-block-width: 10px; border-radius: 12px; background: #241912; }
      .frame-steampunk .ornament-left::before, .frame-steampunk .ornament-right::before {
        content: ""; position: absolute; top: -68px; left: -22px; width: 52px; height: 52px;
        border: 6px ridge #9a6542; border-radius: 50%; background: radial-gradient(circle, #ddd 0 8%, #8b735f 10% 48%, #2c211a 50%);
      }
      .frame-steampunk .frame-plaque { display: block; color: #2a160d; border: 5px ridge #a5613a; background: linear-gradient(#c98255, #8a4d31); }

      /* Theme identities remain visible regardless of the selected frame. */
      .theme-art_deco {
        background:
          conic-gradient(from 225deg at 50% 0%, transparent 0 8deg,
            #d7bd7330 8deg 10deg, transparent 10deg 20deg,
            #d7bd7328 20deg 22deg, transparent 22deg 32deg),
          repeating-linear-gradient(135deg, #ffffff07 0 1px, transparent 1px 44px),
          radial-gradient(ellipse at 50% 0%, #245e51, #071412 62%, #020807);
      }
      .theme-art_deco .marquee-frame {
        border-radius: 0;
        box-shadow: inset 0 0 0 2px #e2cb8b,
          inset 0 0 0 9px #07100f, inset 0 0 0 11px #8e7b47,
          0 28px 90px #000;
      }
      .theme-art_deco .marquee {
        margin: 8px clamp(4px, 2vw, 24px) 24px;
        padding: 18px clamp(28px, 5vw, 72px) 23px;
        border: 1px solid #d8c17c;
        border-inline-width: 5px;
        background: linear-gradient(90deg, transparent, #17332ee8 20% 80%, transparent);
        clip-path: polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%);
      }
      .theme-art_deco h1 {
        color: #f0dfaa;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(1.15rem, 4.8vw, 4.2rem);
        letter-spacing: .1em;
        line-height: 1;
        text-shadow: 0 2px 0 #57461f, 0 0 20px #d9bd6555;
      }
      .theme-art_deco .eyebrow { color: #cbb36f; letter-spacing: .42em; }
      .theme-art_deco .poster { border-radius: 0; border-color: #d8c17c; }

      .theme-minimal {
        --gold: #171717;
        color: #171717;
        background: #e8e5de;
      }
      .theme-minimal .ambient, .theme-minimal .frame-ornaments { display: none; }
      .theme-minimal .marquee-frame {
        border: 1px solid #222;
        border-radius: 0;
        background: #f5f3ee;
        box-shadow: 12px 12px 0 #bcb8ae;
      }
      .theme-minimal .marquee {
        padding: 10px 0 20px;
        border-bottom: 2px solid #191919;
        text-align: left;
      }
      .theme-minimal h1, .theme-minimal .details h2 {
        color: #111;
        font-family: Avenir, Montserrat, Arial, sans-serif;
        font-weight: 700;
        letter-spacing: -.025em;
        text-shadow: none;
      }
      .theme-minimal h1 { text-transform: none; }
      .theme-minimal .eyebrow, .theme-minimal .meta,
      .theme-minimal .session { color: #5b5954; }
      .theme-minimal .subtitle { color: #24231f; }
      .theme-minimal .summary { color: #383631; font-family: inherit; }
      .theme-minimal .poster {
        border: 1px solid #222; border-radius: 0; box-shadow: 7px 7px 0 #c5c1b8;
      }
      .theme-minimal .progress { background: #0002; }
      .theme-minimal .progress i { background: #171717; }

      .theme-oled {
        --gold: #fff;
        background: #000;
      }
      .theme-oled .ambient, .theme-oled .frame-ornaments,
      .theme-oled .eyebrow { display: none; }
      .theme-oled .marquee-frame {
        border: 0;
        border-radius: 0;
        background: #000;
        box-shadow: none;
      }
      .theme-oled .marquee { padding-block: 5px 22px; }
      .theme-oled h1 {
        color: #fff; letter-spacing: .12em; text-shadow: none;
      }
      .theme-oled .poster {
        border: 1px solid #292929; border-radius: 2px;
        box-shadow: 0 0 0 1px #000, 0 28px 80px #000;
      }
      .theme-oled .details h2 { color: #fff; }
      .theme-oled .subtitle { color: #fff; }
      .theme-oled .meta, .theme-oled .summary { color: #aaa; }
      .theme-oled .session { color: #666; }
      .theme-oled .progress { height: 2px; background: #222; }
      .theme-oled .progress i { background: #fff; box-shadow: 0 0 8px #fff; }
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
      .marquee-bulbs { display: none; }
      .frame-marquee .marquee-bulbs {
        position: absolute;
        z-index: 4;
        inset: 0;
        display: block;
        pointer-events: none;
      }
      .marquee-bulbs i {
        display: block;
        width: clamp(10px, 1.05vw, 16px);
        aspect-ratio: 1;
        flex: 0 0 auto;
        border: 2px solid #4b290d;
        border-radius: 50%;
        background: radial-gradient(circle at 38% 32%,
          #fff 0 9%, #fff7c9 12% 25%, #ffd35f 30% 48%,
          #bc6f16 54% 68%, #60320d 74% 100%);
        box-shadow: inset -2px -2px 3px #3b1b08aa,
          inset 2px 2px 2px #fff8c9aa, 0 0 4px #ffd35f,
          0 0 10px #e88a1d99;
        position: absolute;
        transform: translate(-50%, -50%);
        animation: bulbChase 4.8s linear infinite;
        animation-delay: var(--bulb-delay);
      }
      .marquee-bulbs i::after {
        content: "";
        position: absolute;
        top: 15%; left: 19%;
        width: 28%; height: 20%;
        border-radius: 50%;
        background: #fff;
        opacity: .85;
        filter: blur(.4px);
      }
      .motion-off .marquee-bulbs i { animation: none; opacity: .94; }
      .theme-minimal .marquee-bulbs, .theme-oled .marquee-bulbs {
        display: none;
      }
      .theme-minimal .marquee-frame::before,
      .theme-oled .marquee-frame::before { display: none; }
      .theme-neon .marquee-frame {
        box-shadow: 0 0 0 3px var(--gold-deep), 0 0 55px #b51fff66;
      }
      .motion-off .marquee-frame,
      .motion-off .marquee-frame::before { animation: none; }
      .motion-off .marquee-frame::before { opacity: .8; }
      .motion-off .ambient { filter: brightness(.18) saturate(.8); }
      @keyframes bulbs { from { opacity: .48; } to { opacity: 1; } }
      @keyframes bulbChase {
        0%, 18%, 100% { opacity: .48; filter: brightness(.68); }
        4% { opacity: .72; filter: brightness(.9); }
        8% { opacity: 1; filter: brightness(1.35); }
        12% { opacity: .78; filter: brightness(1); }
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
      .content {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(320px, 1fr) minmax(300px, 1fr);
        gap: clamp(22px, 3.5vw, 60px);
        align-items: center;
        padding: 8px clamp(14px, 3vw, 40px) 24px;
      }
      .poster-wrap { perspective: 1000px; }
      .poster {
        display: block;
        width: 100%;
        max-height: 84vh;
        aspect-ratio: 2 / 3;
        object-fit: cover;
        border: 3px solid #dba84e;
        border-radius: 8px;
        background: #16100d;
        box-shadow: 0 24px 55px #000, 0 0 28px #d18a2544;
      }
      .poster-missing { display: grid; place-items: center; color: #9d8e78; }
      .details h2 {
        margin: 10px 0 3px;
        color: #fff8e8;
        font-family: var(--heading-font, Georgia, serif);
        font-size: clamp(2rem, 4.6vw, 4.7rem);
        line-height: 1.02;
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
      .orientation-portrait .marquee-frame { width: min(99vw, 720px); }
      .orientation-portrait .content { grid-template-columns: 1fr; gap: 22px; }
      .orientation-portrait .poster {
        width: min(78vw, 500px); margin: auto; max-height: 72vh;
      }
      .orientation-portrait .details { text-align: center; }
      .orientation-portrait .summary { display: none; }
      .orientation-landscape .marquee-frame {
        width: min(88vw, 117.333vh, 1500px);
        min-height: 0;
        aspect-ratio: 4 / 3;
      }
      .orientation-portrait .marquee-frame {
        width: min(88vw, 58.667vh, 720px);
        min-height: 0;
        aspect-ratio: 2 / 3;
      }
      @media (max-width: 720px), (orientation: portrait) {
        .orientation-auto .marquee-frame { width: min(99vw, 720px); }
        .orientation-auto .content { grid-template-columns: 1fr; gap: 22px; }
        .orientation-auto .poster {
          width: min(78vw, 500px); margin: auto; max-height: 72vh;
        }
        .orientation-auto .details { text-align: center; }
        .orientation-auto .summary { display: none; }
        .orientation-auto .marquee-frame {
          width: min(88vw, 58.667vh, 720px);
          min-height: 0;
          aspect-ratio: 2 / 3;
        }
      }
      @media (min-width: 721px) and (orientation: landscape) {
        .orientation-auto .marquee-frame {
          width: min(88vw, 117.333vh, 1500px);
          min-height: 0;
          aspect-ratio: 4 / 3;
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
      @media (max-width: 720px) {
        .orientation-portrait h1, .orientation-auto h1 {
          font-size: clamp(1.25rem, 7.5vw, 2.3rem);
        }
        .theme-art_deco.orientation-portrait h1,
        .theme-art_deco.orientation-auto h1 {
          font-size: clamp(1.05rem, 5.8vw, 1.9rem);
          letter-spacing: .06em;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .marquee-frame, .marquee-frame::before { animation: none; }
        .marquee-frame::before { opacity: .8; }
      }
    </style>`;
  }
}

if (!customElements.get("movie-poster-panel")) {
  customElements.define("movie-poster-panel", MoviePosterPanel);
}
