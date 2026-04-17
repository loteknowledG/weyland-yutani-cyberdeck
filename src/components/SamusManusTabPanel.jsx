import { useEffect } from "react";

function defineSamusManusTabs() {
  if (customElements.get("ascii-tab-button")) return;

  class AsciiTabButton extends HTMLElement {
    static get observedAttributes() {
      return ["active"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.pressed = false;
      this.release = this.release.bind(this);
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      this.render();
    }

    get active() {
      return this.hasAttribute("active");
    }

    get iconMarkup() {
      return this.innerHTML.trim();
    }

    press() {
      this.pressed = true;
      this.render();
      window.addEventListener("mouseup", this.release, { once: true });
    }

    release() {
      if (!this.pressed) return;
      this.pressed = false;
      this.dispatchEvent(
        new CustomEvent("tab-press", {
          bubbles: true,
          composed: true,
        }),
      );
      this.render();
    }

    cancel() {
      if (!this.pressed) return;
      this.pressed = false;
      this.render();
    }

    render() {
      const active = this.active;
      const down = this.pressed || active;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
            width: 180px;
            height: 170px;
            position: relative;
            flex: none;
          }

          .wrap {
            position: relative;
            width: 100%;
            height: 100%;
            cursor: pointer;
            user-select: none;
          }

          .face {
            position: absolute;
            left: ${down ? "34px" : "22px"};
            top: ${down ? "18px" : "6px"};
            width: 94px;
            height: 94px;
            box-sizing: border-box;
            border: 4px solid currentColor;
            display: flex;
            align-items: center;
            justify-content: center;
            transition:
              transform 0.08s ease,
              color 0.12s ease,
              text-shadow 0.12s ease,
              box-shadow 0.12s ease,
              left 0.08s ease,
              top 0.08s ease;
            background: rgba(0,0,0,0.18);
          }

          .shadow-base {
            position: absolute;
            left: 34px;
            top: 116px;
            width: 108px;
            height: 52px;
            background-image: radial-gradient(currentColor 1.1px, transparent 1.1px);
            background-size: 6px 6px;
            opacity: ${down ? "0" : "0.95"};
            transition: opacity 0.08s ease;
            pointer-events: none;
          }

          .shadow-side {
            position: absolute;
            left: 142px;
            top: 40px;
            width: 28px;
            height: 66px;
            background-image: radial-gradient(currentColor 1.1px, transparent 1.1px);
            background-size: 6px 6px;
            opacity: ${down ? "0" : "0.95"};
            transition: opacity 0.08s ease;
            pointer-events: none;
          }

          .state-on {
            color: var(--tab-on);
            text-shadow: 0 0 10px rgba(57, 255, 20, 0.22);
            box-shadow: 0 0 18px rgba(57, 255, 20, 0.08) inset;
          }

          .state-off {
            color: var(--tab-off);
            text-shadow: 0 0 10px rgba(28, 255, 115, 0.16);
            box-shadow: 0 0 14px rgba(28, 255, 115, 0.06) inset;
          }

          .wrap:hover .face {
            transform: translateY(-1px);
          }

          .wrap.down:hover .face {
            transform: none;
          }

          .icon {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
          }

          .icon svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
            display: block;
          }
        </style>

        <div class="wrap ${down ? "down" : ""}" id="btn" role="tab" tabindex="0" aria-selected="${String(active)}">
          <div class="shadow-side ${active ? "state-on" : "state-off"}"></div>
          <div class="shadow-base ${active ? "state-on" : "state-off"}"></div>
          <div class="face ${active ? "state-on" : "state-off"}">
            <div class="icon">${this.iconMarkup}</div>
          </div>
        </div>
      `;

      const el = this.shadowRoot.getElementById("btn");
      el.addEventListener("mousedown", (event) => {
        event.preventDefault();
        this.press();
      });
      el.addEventListener("mouseup", this.release);
      el.addEventListener("mouseleave", () => this.cancel());
      el.addEventListener(
        "touchstart",
        (event) => {
          event.preventDefault();
          this.press();
        },
        { passive: false },
      );
      el.addEventListener("touchend", this.release);
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.press();
          this.release();
        }
      });
    }
  }

  customElements.define("ascii-tab-button", AsciiTabButton);

  class AsciiTabBar extends HTMLElement {
    static get observedAttributes() {
      return ["active-index"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.icons = [
        `
          <svg fill="currentColor" fill-rule="evenodd" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path clip-rule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"></path>
          </svg>
        `,
        `
          <svg fill="currentColor" fill-rule="evenodd" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 6H8v12h8V6zm4 16H4V2h16v20z"></path>
          </svg>
        `,
        `
          <svg fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M30.865 3.448l-6.583-3.167c-0.766-0.37-1.677-0.214-2.276 0.385l-12.609 11.505-5.495-4.167c-0.51-0.391-1.229-0.359-1.703 0.073l-1.76 1.604c-0.583 0.526-0.583 1.443-0.005 1.969l4.766 4.349-4.766 4.349c-0.578 0.526-0.578 1.443 0.005 1.969l1.76 1.604c0.479 0.432 1.193 0.464 1.703 0.073l5.495-4.172 12.615 11.51c0.594 0.599 1.505 0.755 2.271 0.385l6.589-3.172c0.693-0.333 1.13-1.031 1.13-1.802v-21.495c0-0.766-0.443-1.469-1.135-1.802zM24.005 23.266l-9.573-7.266 9.573-7.266z"/>
          </svg>
        `,
      ];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      this.render();
    }

    get activeIndex() {
      const value = parseInt(this.getAttribute("active-index") || "0", 10);
      return Number.isNaN(value) ? 0 : Math.max(0, Math.min(2, value));
    }

    set activeIndex(value) {
      this.setAttribute("active-index", String(value));
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
          }

          .tab-scale-wrap {
            display: inline-block;
            transform: scale(0.37);
            transform-origin: top left;
          }

          .row {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 14px;
            white-space: nowrap;
          }
        </style>

        <div class="tab-scale-wrap">
          <div class="row" role="tablist" aria-label="mode tabs">
            ${this.icons
              .map(
                (icon, index) => `
                  <ascii-tab-button ${index === this.activeIndex ? "active" : ""} data-index="${index}">
                    ${icon}
                  </ascii-tab-button>
                `,
              )
              .join("")}
          </div>
        </div>
      `;

      this.shadowRoot
        .querySelectorAll("ascii-tab-button")
        .forEach((tab, index) => {
          tab.addEventListener("tab-press", () => {
            if (this.activeIndex !== index) {
              this.activeIndex = index;
              this.dispatchEvent(
                new CustomEvent("tab-change", {
                  bubbles: true,
                  composed: true,
                  detail: { index },
                }),
              );
            }
          });
        });
    }
  }

  customElements.define("ascii-tab-bar", AsciiTabBar);
}

export default function SamusManusTabPanel() {
  useEffect(() => {
    defineSamusManusTabs();
  }, []);

  return (
    <div style={{ width: "100%", minHeight: "260px" }}>
      <ascii-tab-bar active-index="0" />
    </div>
  );
}
