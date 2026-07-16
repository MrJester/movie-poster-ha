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

class MoviePosterPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = null;
    this._unsubscribePromise = null;
    this._retryTimer = null;
    this._renderIdentity = null;
    this._transitionRevision = 0;
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
  }

  disconnectedCallback() {
    clearTimeout(this._retryTimer);
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
        const previous = this._state?.media;
        if (previous?.key === state.media?.key) {
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
    this._state = state;
    const identity = [
      state.mode,
      state.media?.key,
      state.presentation?.theme,
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
        </div></main>`;
      return;
    }

    const hasProgress = media.duration_ms && media.position_ms !== null;
    const progress = hasProgress
      ? Math.min(100, Math.max(0, (media.position_ms / media.duration_ms) * 100))
      : 0;
    const meta = [media.year, formatRuntime(media.duration_ms)]
      .filter(Boolean)
      .join(" · ");
    const backdropStyle = media.backdrop_url
      ? `style="--backdrop:url('${escapeHtml(media.backdrop_url)}')"`
      : "";
    const theme = normalizeTheme(state.presentation?.theme);

    this.shadowRoot.innerHTML = `${this._styles()}
      <main class="theater theme-${theme} mode-${escapeHtml(state.mode)}" ${backdropStyle}>
        <div class="ambient"></div>
        <section class="marquee-frame">
          <header class="marquee">
            <span class="eyebrow">Theater Presentation</span>
            <h1>${escapeHtml(state.heading)}</h1>
          </header>
          <div class="content">
            <div class="poster-wrap">
              ${media.poster_url
                ? `<img class="poster" src="${escapeHtml(media.poster_url)}"
                     alt="Poster for ${escapeHtml(media.title)}">`
                : '<div class="poster poster-missing">No poster available</div>'}
            </div>
            <article class="details">
              <span class="status">${escapeHtml(media.type)}</span>
              <h2>${escapeHtml(media.title)}</h2>
              ${media.subtitle ? `<p class="subtitle">${escapeHtml(media.subtitle)}</p>` : ""}
              ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
              ${media.summary ? `<p class="summary">${escapeHtml(media.summary)}</p>` : ""}
              ${state.session ? `<p class="session">${escapeHtml(state.session.user)}
                · ${escapeHtml(state.session.player)}</p>` : ""}
              ${hasProgress ? `<div class="progress" role="progressbar"
                aria-label="Playback progress" aria-valuemin="0" aria-valuemax="100"
                aria-valuenow="${Math.round(progress)}">
                <i style="width:${progress}%"></i></div>` : ""}
            </article>
          </div>
        </section>
      </main>`;
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
          radial-gradient(circle at 50% 0%, #4f160f 0%, transparent 45%),
          linear-gradient(145deg, #080605, #1b0908 50%, #050404);
      }
      .theme-art_deco {
        --gold: #e9d59b;
        --gold-deep: #7c6735;
        --ink: #08100f;
        --velvet: #12302c;
        background:
          repeating-linear-gradient(135deg, #ffffff08 0 1px, transparent 1px 42px),
          radial-gradient(circle at 50% 0%, #1b4b43, transparent 48%), #050908;
      }
      .theme-neon {
        --gold: #29f2ff;
        --gold-deep: #b51fff;
        --ink: #05000d;
        --velvet: #260052;
        background:
          radial-gradient(circle at 20% 0%, #4b0075 0, transparent 40%),
          radial-gradient(circle at 85% 100%, #003d5c 0, transparent 42%), #05000d;
      }
      .theme-minimal {
        --gold: #f2f2f2;
        --gold-deep: #777;
        --ink: #171717;
        --velvet: #252525;
        background: #171717;
      }
      .theme-oled {
        --gold: #fff;
        --gold-deep: #333;
        --ink: #000;
        --velvet: #000;
        background: #000;
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
      .marquee-frame {
        position: relative;
        width: min(1180px, 96vw);
        min-height: min(92vh, 900px);
        padding: clamp(20px, 3vw, 46px);
        border: 8px solid #2b1608;
        border-radius: 28px;
        background: linear-gradient(135deg, #130b08ee, #050403f5);
        box-shadow: 0 0 0 3px var(--gold-deep), 0 28px 90px #000;
        animation: reveal .55s ease-out both;
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
      .theme-minimal .marquee-frame::before,
      .theme-oled .marquee-frame::before { display: none; }
      .theme-minimal .marquee-frame,
      .theme-oled .marquee-frame {
        border-width: 1px;
        border-color: #ffffff2b;
        border-radius: 4px;
        box-shadow: none;
      }
      .theme-oled .ambient { opacity: .28; }
      .theme-neon .marquee-frame {
        box-shadow: 0 0 0 3px var(--gold-deep), 0 0 55px #b51fff66;
      }
      @keyframes bulbs { from { opacity: .48; } to { opacity: 1; } }
      .marquee { text-align: center; padding: 14px 20px 28px; }
      .eyebrow, .status {
        color: var(--gold);
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .28em;
        text-transform: uppercase;
      }
      h1 {
        margin: 5px 0 0;
        color: #fff1c2;
        font-family: Impact, "Arial Narrow", sans-serif;
        font-size: clamp(2.3rem, 6vw, 5.8rem);
        font-weight: 400;
        letter-spacing: .08em;
        line-height: .95;
        text-transform: uppercase;
        text-shadow: 0 3px 0 #7b3b10, 0 0 25px #f4a42b66;
      }
      .content {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(240px, .78fr) minmax(300px, 1.22fr);
        gap: clamp(25px, 5vw, 75px);
        align-items: center;
        padding: 8px clamp(14px, 3vw, 40px) 24px;
      }
      .poster-wrap { perspective: 1000px; }
      .poster {
        display: block;
        width: 100%;
        max-height: 66vh;
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
        font-family: Georgia, serif;
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
      @media (max-width: 720px), (orientation: portrait) {
        .marquee-frame { width: min(96vw, 620px); }
        .content { grid-template-columns: 1fr; gap: 22px; }
        .poster { width: min(60vw, 330px); margin: auto; max-height: 54vh; }
        .details { text-align: center; }
        .summary { display: none; }
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
