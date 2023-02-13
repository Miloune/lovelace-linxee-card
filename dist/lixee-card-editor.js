const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

if (
  !customElements.get("ha-switch") &&
  customElements.get("paper-toggle-button")
) {
  customElements.define("ha-switch", customElements.get("paper-toggle-button"));
}

const LitElement = customElements.get("hui-masonry-view") ? Object.getPrototypeOf(customElements.get("hui-masonry-view")) : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const HELPERS = window.loadCardHelpers();

export class contentCardLixeeEditor extends LitElement {
  setConfig(config) {
    this._config = { ...config };
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  get _entity() {
    return this._config.entity || "";
  }

  get _name() {
    return this._config.name || "";
  }

  get _showIcon() {
    return this._config.showIcon !== false;
  }

  get _showHistory() {
    return this._config.showHistory !== false;
  }

  get _showInTableUnit() {
    return this._config.showInTableUnit !== false;
  }

  get _showDayPrice() {
    return this._config.showDayPrice !== false;
  }

  get _showPrice() {
    return this._config.showPrice !== false;
  }

  get _showTitle() {
    return this._config.showTitle !== false;
  }

  get _title() {
    return this._config.showTitle !== false;
  }

  get _current() {
    return this._config.current !== false;
  }

  get _details() {
    return this._config.details !== false;
  }

  get _showDayName() {
    return this._config.showDayName;
  }

  get _titleName() {
    return this._config.titleName || "";
  }

  get _kWhPrice() {
    return this._config.kWhPrice || "";
  }

  get _updateInterval() {
    return this._config.updateInterval || 60;
  }

  firstUpdated() {
    HELPERS.then(help => {
      if (help.importMoreInfoControl) {
        help.importMoreInfoControl("fan");
      }
    })
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div>
          <paper-input
            label="Titre"
            .value="${this._titleName}"
            .configValue="${"titleName"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          ${this.renderLinkyPicker("Entity", this._entity, "entity")}
          <!-- Switches -->
          <ul class="switches">
            ${this.renderSwitchOption("Show icon", this._showIcon, "showIcon")}
            ${this.renderSwitchOption("Show titre", this._showTitle, "showTitle")}
            ${this.renderSwitchOption("Show history", this._showHistory, "showHistory")}
            ${this.renderSwitchOption("Show unité", this._showInTableUnit, "showInTableUnit")}
            ${this.renderSwitchOption("Show prix", this._showPrice, "showPrice")}
          </ul>
          <!-- -->
          <paper-input
            label="Prix du kWh"
            type="number"
            min="0"
            step="0.001"
            value=${this._kWhPrice}
            .configValue="${"kWhPrice"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <br>
          <paper-input
            label="Interval de mise à jour (secondes)"
            type="number"
            min="60"
            step="10"
            value=${this._updateInterval}
            .configValue="${"updateInterval"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <br>
          <paper-input
            label="Mode d'affichage du jour de la semaine (valeur possible : long, short, narrow)"
            .value="${this._showDayName}"
            .configValue="${"showDayName"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
      </div>
    `;
  }

  renderLinkyPicker(label, entity, configAttr) {
    return this.renderPicker(label, entity, configAttr, "sensor.myenedis");
  }

  renderPicker(label, entity, configAttr, domain) {
    return html`
              <ha-entity-picker
                label="${label}"
                .hass="${this.hass}"
                .value="${entity}"
                .configValue="${configAttr}"
                .includeDomains="${domain}"
                @change="${this._valueChanged}"
                allow-custom-entity
              ></ha-entity-picker>
            `
  }
  renderSwitchOption(label, state, configAttr) {
    return html`
      <li class="switch">
              <ha-switch
                .checked=${state}
                .configValue="${configAttr}"
                @change="${this._valueChanged}">
                </ha-switch><span>${label}</span>
            </div>
          </li>
    `
  }
  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles() {
    return css`
      .switches {
        margin: 8px 0;
        display: flex;
        flex-flow: row wrap;
        list-style: none;
        padding: 0;
      }
      .switch {
        display: flex;
        align-items: center;
        width: 50%;
        height: 40px;
      }
      .switches span {
        padding: 0 16px;
      }
    `;
  }
}

customElements.define("lixee-card-editor", contentCardLixeeEditor);
