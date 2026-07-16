class MoviePosterPanel extends HTMLElement {
  set hass(value) {
    this._hass = value;
    this.render();
  }

  set panel(value) {
    this._panel = value;
    this.render();
  }

  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-height: 100vh; background: #090705; color: #f5d77a; }
        main { min-height: 100vh; display: grid; place-items: center; font-family: sans-serif; }
        section { text-align: center; border: 2px solid currentColor; padding: 3rem; }
        h1 { letter-spacing: .12em; text-transform: uppercase; }
      </style>
      <main><section><h1>Movie Poster</h1><p>Frontend renderer scaffold</p></section></main>`;
  }
}

customElements.define("movie-poster-panel", MoviePosterPanel);
