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

class MoviePosterPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = null;
    this._unsubscribePromise = null;
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
        this._state = state;
        this._render();
      },
      { type: "movie_poster/subscribe" },
    ).catch((error) => {
      this._unsubscribePromise = null;
      this._renderError(error?.message || "Unable to connect to Movie Poster");
      throw error;
    });
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
        <p>Select a Plex movie library or collection in the integration options.</p>
        </div></main>`;
      return;
    }

    const progress = media.duration_ms && media.position_ms
      ? Math.min(100, (media.position_ms / media.duration_ms) * 100)
      : 0;
    const meta = [media.year, formatRuntime(media.duration_ms)]
      .filter(Boolean)
      .join(" · ");
    const backdropStyle = media.backdrop_url
      ? `style="--backdrop:url('${escapeHtml(media.backdrop_url)}')"`
      : "";

    this.shadowRoot.innerHTML = `${this._styles()}
      <main class="theater mode-${escapeHtml(state.mode)}" ${backdropStyle}>
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
              ${progress ? `<div class="progress" aria-label="Playback progress">
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
        .marquee-frame::before { animation: none; opacity: .8; }
      }
    </style>`;
  }
}

if (!customElements.get("movie-poster-panel")) {
  customElements.define("movie-poster-panel", MoviePosterPanel);
}
