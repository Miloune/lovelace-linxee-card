const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const getMilli = hours => hours * 60 ** 2 * 10 ** 3;

window.customCards = window.customCards || [];
window.customCards.push({
  type: "content-card-linxee",
  name: "Carte linxee Enedis par Miloune",
  description: "Carte pour l'intégration linxee.",
  preview: true,
  documentationURL: "https://github.com/Miloune/lovelace-linxee-card",
});
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

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("config")) {
    return true;
  }

  const oldHass = changedProps.get("hass");
  if (oldHass) {
    return (
      oldHass.states[element.config.entity] !==
      element.hass.states[element.config.entity]
    );
  }

  return true;
}

class ContentCardLinxee extends LitElement {
  static get properties() {
    return {
      config: {},
      _hass: {}
    };
  }

  static async getConfigElement() {
    await import("./content-card-linxee-editor.js");
    return document.createElement("content-card-linxee-editor");
  }

  set hass(hass) {
    this._hass = hass;
    // this.updateData();
  }

  async fetchRecent(entityId, start, end, skipInitialState, withAttributes) {
    let url = 'history/period';
    if (start) url += `/${start.toISOString()}`;
    url += `?filter_entity_id=${entityId}`;
    if (end) url += `&end_time=${end.toISOString()}`;
    if (skipInitialState) url += '&skip_initial_state';
    if (!withAttributes) url += '&minimal_response';
    if (withAttributes) url += '&significant_changes_only=0';
    return this._hass.callApi('GET', url);
  }


  getTodayDate() {
    const date = new Date();
    date.setHours(0, 0, 0);
    return date;
  }

  getEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);
    return date;
  }

  async updateData() {

    const end = this.getEndDate();
    const start = new Date(end);
    start.setMilliseconds(start.getMilliseconds() - getMilli(192));

    let newStateHistory = await this.fetchRecent(
      this.config.entity,
      start,
      end
    );
    newStateHistory = newStateHistory[0].filter(item => !Number.isNaN(parseFloat(item.state)));


    console.log(newStateHistory);

    const data = newStateHistory.reduce((acc, state) => {
      const date = new Date(state.last_changed).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = {
          minValue: state.state,
          maxValue: state.state,
          count: 1
        };
      } else {
        acc[date].count++;
        acc[date].minValue = Math.min(acc[date].minValue, state.state);
        acc[date].maxValue = Math.max(acc[date].maxValue, state.state);
      }
      return acc;
    }, {});


    const result = new Map();
    Object.entries(data).forEach(([date, { minValue, maxValue, count }]) => {
      result.set(date, maxValue - minValue);
    });
    this.data = result;
    console.log(this.data);
  }

  render() {
    if (!this.config || !this._hass) {
      return html``;
    }

    this.updateData();

    const stateObj = this._hass.states[this.config.entity];
    const attributes = stateObj.attributes;

    if (!this.data) {
      return html
        `
          <ha-card>
            <div class="card">
              <div id="states">
                <div class="name">
                  <ha-icon id="icon" icon="mdi:flash" data-state="unavailable" data-domain="connection" style="color: var(--state-icon-unavailable-color)"></ha-icon>
                  <span style="margin-right:2em">Chargement des données pour ${this.config.entity}</span>
                </div>
              </div>
            </div>
          </ha-card> 
        `
    }

    return html
      `
            <ha-card id="card">
              ${this.addEventListener('click', event => { this._showDetails(this.config.entity); })}
              ${this.renderTitle()}
              <div class="card">
                <div class="main-info">
                  ${this.config.showIcon
        ? html`
                      <div class="icon-block">
                        <span class="linky-icon bigger" style="background: none, url(https://apps.lincs.enedis.fr/mes-prms/assets/images/compteurs/linky.svg) no-repeat; background-size: contain;"></span>
                      </div>`
        : html``
      }
                  ${this.config.showPeakOffPeak
        ? html`
                      <div class="hp-hc-block">
                        <span class="conso-hc">${this.toFloat(this.data.get())}</span><span class="conso-unit-hc"> ${attributes.unit_of_measurement} <span class="more-unit">(en HC)</span></span><br />
                        <span class="conso-hp">${this.toFloat(attributes.yesterday_HP)}</span><span class="conso-unit-hp"> ${attributes.unit_of_measurement} <span class="more-unit">(en HP)</span></span>
                      </div>`
        : html`
                      <div class="cout-block">
                        <span class="cout">${this.toFloat(this.data.get(this.getTodayDate().toLocaleDateString()))}</span>
                        <span class="cout-unit">${attributes.unit_of_measurement}</span>
                      </div>`
      }
                  ${this.config.showPrice
        ? html`
                    <div class="cout-block">
                      <span class="cout" title="Coût journalier">${this.toFloat(attributes.daily_cost, 2)}</span><span class="cout-unit"> €</span>
                    </div>`
        : html``
      }
                </div>
                <div class="variations">
                  ${this.config.showMonthRatio
        ? html`
                    <span class="variations-linky">
                      <span class="ha-icon">
                        <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.monthly_evolution < 0) ? '45' : ((attributes.monthly_evolution == 0) ? "0" : "-45")}deg)">
                       </ha-icon>
                      </span>
                      <div class="tooltip">
                      ${Math.round(attributes.monthly_evolution)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this.previousMonth()}</span>
                          <span class="tooltiptext">Mois Precedent A-1 : ${attributes.last_month_last_year}<br>Mois Precedent : ${attributes.last_month}</span>
                      </div>
                    </span>`
        : html``
      }
                  ${this.config.showCurrentMonthRatio
        ? html`
                    <span class="variations-linky">
                      <span class="ha-icon">
                        <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.current_month_evolution < 0) ? '45' : ((attributes.current_month_evolution == 0) ? "0" : "-45")}deg)">
                       </ha-icon>
                      </span>
                      <div class="tooltip">
                      ${Math.round(attributes.current_month_evolution)}<span class="unit"> %</span><span class="current-month">par rapport à ${this.currentMonth()}</span>
                          <span class="tooltiptext">Mois  A-1 : ${attributes.current_month_last_year}<br>Mois  : ${attributes.current_month}</span>
                      </div>
                    </span>`
        : html``
      }
                  ${this.config.showWeekRatio
        ? html`
                    <span class="variations-linky">
                        <span class="ha-icon">
                          <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.current_week_evolution < 0) ? '45' : ((attributes.current_week_evolution == 0) ? "0" : "-45")}deg)">
                          </ha-icon>
                        </span>
                        <div class="tooltip">
                        ${Math.round(attributes.current_week_evolution)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this.weekPreviousYear()}</span>
                        <span class="tooltiptext">Semaine A-1 : ${attributes.current_week_last_year}<br>Semaine courante : ${attributes.current_week}</span>
                    </div>
                      </span>`
        : html``
      }
                  ${this.config.showYesterdayRatio
        ? html`
                    <span class="variations-linky">
                        <span class="ha-icon">
                          <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.yesterday_evolution < 0) ? '45' : ((attributes.yesterday_evolution == 0) ? "0" : "-45")}deg)">
                         </ha-icon>
                        </span>
                        <div class="tooltip">
                        ${Math.round(attributes.yesterday_evolution)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this.yesterdayPreviousYear()}</span>
                        <span class="tooltiptext">Hier A-1 : ${attributes.yesterdayLastYear}<br>Hier : ${attributes.yesterday}</span>
                    </div>
                      </span>`
        : html``
      }
                  ${this.config.showPeakOffPeak
        ? html`
                      <span class="variations-linky">
                        <span class="ha-icon">
                          <ha-icon icon="mdi:flash"></ha-icon>
                        </span>
                        ${Math.round(attributes.peak_offpeak_percent)}<span class="unit"> % HP</span>
                      </span>`
        : html``
      }
                  
                </div>
                ${this.renderHistory(attributes.unit_of_measurement)}
              </div>
            </ha-card>`

  }

  _showDetails(myEntity) {
    const event = new Event('hass-more-info', {
      bubbles: true,
      cancelable: false,
      composed: true
    });
    event.detail = {
      entityId: myEntity
    };
    this.dispatchEvent(event);
    return event;
  }

  renderTitle() {
    if (this.config.showTitle === true) {
      return html
        `
          <div class="card">
          <div class="main-title">
          <span>${this.config.titleName}</span>
          </div>
          </div>`
    }
  }

  renderHistory(unitOfMeasurement) {
    if (this.config.showHistory === false) {
      return;
    }

    return html
      `
        <div class="week-history">
        ${Array.from(this.data.entries()).slice(0, -1).map(([day, value]) => this.renderDay(day, unitOfMeasurement))}
        </div>
      `

  }

  renderDay(date, unitOfMeasurement) {
    console.log(`render day ${date}`)
    return html
      `
        <div class="day">
          ${this.renderWeekDay(date)}
          ${this.renderDailyValue(date, unitOfMeasurement)}
          ${this.renderDayPrice(date)}
        </div>
      `
  }

  renderWeekDay(date) {
    // TODO probably improve me
    let dateParts = date.split("/");
    let day = parseInt(dateParts[0]);
    let month = parseInt(dateParts[1]) - 1;
    let year = parseInt(dateParts[2]);
    return html
      `
      <span class="dayname">${new Date(year, month, day).toLocaleDateString(this._hass.language, { weekday: this.config.showDayName })}</span>
      `;
  }

  renderNoData() {
    return html
      `
        <br><span class="cons-val" title="Donnée indisponible"><ha-icon id="icon" icon="mdi:alert-outline"></ha-icon></span>
      ` ;
  }

  renderDailyValue(date, unitOfMeasurement) {
    if (date === -1) {
      return this.renderNoData();
    }

    return html
      `
      <br><span class="cons-val">${this.toFloat(this.data.get(date))} ${unitOfMeasurement}</span>
      `;

  }

  renderDayPrice(date) {
    if (this.config.kWhPrice) {
      return html
        `
        <br><span class="cons-val">${this.toFloat(this.data.get(date) * this.config.kWhPrice, 2)} €</span>
      `;
    }
  }


  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }

    if (config.kWhPrice && isNaN(config.kWhPrice)) {
      throw new Error('kWhPrice should be a number')
    }

    const defaultConfig = {
      showHistory: true,
      showPeakOffPeak: true,
      showIcon: false,
      showInTableUnit: false,
      showDayPrice: false,
      showDayPriceHCHP: false,
      showDayHCHP: false,
      showDayName: "long",
      showError: true,
      showPrice: true,
      showTitle: false,
      showCurrentMonthRatio: true,
      showMonthRatio: true,
      showWeekRatio: false,
      showYesterdayRatio: false,
      showTitreLigne: false,
      titleName: "",
      nbJoursAffichage: 7,
      kWhPrice: undefined,
    }

    this.config = {
      ...defaultConfig,
      ...config
    };
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  // @TODO: This requires more intelligent logic
  getCardSize() {
    return 3;
  }

  toFloat(value, decimals = 1) {
    return Number.parseFloat(value).toFixed(decimals);
  }

  previousMonth() {
    var d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setFullYear(d.getFullYear() - 1);

    return d.toLocaleDateString('fr-FR', { month: "long", year: "numeric" });
  }
  currentMonth() {
    var d = new Date();
    d.setFullYear(d.getFullYear() - 1);

    return d.toLocaleDateString('fr-FR', { month: "long", year: "numeric" });
  }
  weekPreviousYear() {
    return "semaine";
  }
  yesterdayPreviousYear() {
    return "hier";
  }


  static get styles() {
    return css`
      .card {
        margin: auto;
        padding: 1.5em 1em 1em 1em;
        position: relative;
        cursor: pointer;
      }

      .main-title {
        margin: auto;
        text-align: center;
        font-weight: 200;
        font-size: 2em;
        justify-content: space-between;
      }
      .main-info {
        display: flex;
        overflow: hidden;
        align-items: center;
        justify-content: space-between;
        height: 75px;
      }
    
      .ha-icon {
        margin-right: 5px;
        color: var(--paper-item-icon-color);
      }
      
      .cout-block {
      }
  
      .cout {
        font-weight: 300;
        font-size: 3.5em;
      }
    
      .cout-unit {
        font-weight: 300;
        font-size: 1.2em;
        display: inline-block;
      }
    
      .conso-hp, .conso-hc {
        font-weight: 200;
        font-size: 2em;
      }
    
      .conso-unit-hc, .conso-unit-hp {
        font-weight: 100;
        font-size: 1em;
      }
      
      .more-unit {
        font-style: italic;
        font-size: 0.8em;
      }
    
      .variations {
        display: flex;
        justify-content: space-between;
        overflow: hidden;
      }

      .variations-linky {
        display: inline-block;
        font-weight: 300;
        margin: 1em;
        overflow: hidden;
      }
    
      .unit {
        font-size: .8em;
      }
    
      .week-history {
        display: flex;
        overflow: hidden;
      }
    
      .day {
        flex: auto;
        text-align: center;
        border-right: .1em solid var(--divider-color);
        line-height: 2;
        box-sizing: border-box;
      }
    
      .dayname {
        font-weight: bold;
        text-transform: capitalize;
      }
  
      .week-history .day:last-child {
        border-right: none;
      }
    
      .cons-val {
        //font-weight: bold;
      }
      
      .previous-month {
        font-size: 0.8em;
        font-style: italic;
        margin-left: 5px;
      }
      .current-month {
        font-size: 0.8em;
        font-style: italic;
        margin-left: 5px;
      }
      .icon-block {
      }
      .linky-icon.bigger {
        width: 6em;
        height: 5em;
        display: inline-block;
      }
      .error {
        font-size: 0.8em;
        font-style: bold;
        margin-left: 5px;
      }
      .tooltip .tooltiptext {
        visibility: hidden;
        background: var( --ha-card-background, var(--card-background-color, white) );
        box-shadow: 2px 2px 6px -4px #999;
        cursor: default;
        font-size: 14px;    
        opacity: 1;
        pointer-events: none;
        position: absolute;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 12;
        transition: 0.15s ease all;
        padding: 5px;
        border: 1px solid #cecece;
        border-radius: 3px;
      }
      .tooltip .tooltiptext::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #555 transparent transparent transparent;
      }
      .tooltip:hover .tooltiptext {
        visibility: visible;
        opacity: 1;
      }
      `;
  }
}

customElements.define('content-card-linxee', ContentCardLinxee);
