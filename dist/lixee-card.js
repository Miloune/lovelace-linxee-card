const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const getMilli = hours => hours * 60 ** 2 * 10 ** 3;
const toFloat = (value, decimals = 1) => Number.parseFloat(value).toFixed(decimals);

const lsMapHistoryKey = "lovelace-card-lixee-mapHistory";
const lsLastUpdateKey = "lovelace-card-lixee-lastUpdate";

window.customCards = window.customCards || [];
window.customCards.push({
  type: "content-card-lixee",
  name: "Carte lixee Enedis par Miloune",
  description: "Carte pour l'intégration lixee.",
  preview: true,
  documentationURL: "https://github.com/Miloune/lovelace-lixee-card",
});

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

class ContentCardLixee extends LitElement {
  static get properties() {
    return {
      _config: {},
      _hass: {},
      _data: new Map()
    };
  }

  static async getConfigElement() {
    await import("./lixee-card-editor.js");
    return document.createElement("lixee-card-editor");
  }

  /**
   * https://lit.dev/docs/components/lifecycle/#connectedcallback
   */
  connectedCallback() {
    super.connectedCallback();

    let mapAsJson = localStorage.getItem(lsMapHistoryKey);
    if (mapAsJson) {
      this._data = new Map(JSON.parse(mapAsJson));
    }

    this._updateHistoryData();
    this._updateTodayData();
    this._interval = setInterval(
      () => this._updateTodayData(),
      this._config.updateInterval * 1000,
    );
  }

  /**
   * https://lit.dev/docs/components/lifecycle/#disconnectedcallback
   */
  disconnectedCallback() {
    if (this._interval) {
      clearInterval(this._interval);
    }
    super.disconnectedCallback();
  }

  /**
   * Home Assistant will set the hass property when the state of Home Assistant changes (frequent). 
   * Whenever the state changes, the component will have to update itself to represent the latest state.
   * @param {any} hass
   */
  set hass(hass) {
    this._hass = hass;
    if (!this._data) {
      this._data = new Map()
    }
  }

  async _fetchData(entityId, start, end, skipInitialState, withAttributes) {
    let url = 'history/period';
    if (start) url += `/${start.toISOString()}`;
    url += `?filter_entity_id=${entityId}`;
    if (end) url += `&end_time=${end.toISOString()}`;
    if (skipInitialState) url += '&skip_initial_state';
    if (!withAttributes) url += '&minimal_response';
    if (withAttributes) url += '&significant_changes_only=0';
    return this._hass.callApi('GET', url);
  }

  getPriceFromData(date) {
    return toFloat(this._data.get(date.toString()) * this._config.kWhPrice, 2)
  }

  getDateDay(date) {
    date.setHours(0, 0, 0);
    return date;
  }

  getTodayDate() {
    return this.getDateDay(new Date());
  }

  getEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);
    return date;
  }


  _previousMonth() {
    var d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setFullYear(d.getFullYear() - 1);

    return d.toLocaleDateString('fr-FR', { month: "long", year: "numeric" });
  }
  _currentMonth() {
    var d = new Date();
    d.setFullYear(d.getFullYear() - 1);

    return d.toLocaleDateString('fr-FR', { month: "long", year: "numeric" });
  }
  _weekPreviousYear() {
    return "semaine";
  }
  _yesterdayPreviousYear() {
    return "hier";
  }

  _updateData(dataHistory) {
    var data = dataHistory[0].filter(item => !Number.isNaN(parseFloat(item.state)))
      .reduce((acc, state) => {
        const date = this.getDateDay(new Date(state.last_changed)).toString();

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

    Object.entries(data).forEach(([date, { minValue, maxValue, count }]) => {
      this._data.set(date, maxValue - minValue);
    });
    localStorage.setItem(lsMapHistoryKey, JSON.stringify(Array.from(this._data.entries())))
  }

  async _updateTodayData() {
    const end = this.getEndDate();
    const start = new Date(end);
    start.setMilliseconds(start.getMilliseconds() - getMilli(24));

    let newStateHistory = await this._fetchData(
      this._config.entity,
      start,
      end
    );
    this._updateData(newStateHistory)
  }

  async _updateHistoryData() {

    const end = this.getEndDate();
    const start = new Date(end);
    start.setMilliseconds(start.getMilliseconds() - getMilli(192));

    let mapAsJson = localStorage.getItem(lsMapHistoryKey);
    let lastUpdateAsString = localStorage.getItem(lsLastUpdateKey);

    // Update once a day
    if (mapAsJson && lastUpdateAsString && this.getTodayDate().getTime() < new Date(lastUpdateAsString).getTime()) {
      return;
    }

    let newStateHistory = await this._fetchData(
      this._config.entity,
      start,
      end
    );
    this._updateData(newStateHistory)
    localStorage.setItem(lsLastUpdateKey, new Date().toString());
  }

  render() {
    if (!this._config || !this._hass) {
      return html``;
    }

    const stateObj = this._hass.states[this._config.entity];
    const attributes = stateObj.attributes;

    if (!this._data) {
      return html
        `
          <ha-card>
            <div class="card">
              <div id="states">
                <div class="name">
                  <ha-icon id="icon" icon="mdi:flash" data-state="unavailable" data-domain="connection" style="color: var(--state-icon-unavailable-color)"></ha-icon>
                  <span style="margin-right:2em">Chargement des données pour ${this._config.entity}</span>
                </div>
              </div>
            </div>
          </ha-card> 
        `
    }

    return html
      `
            <ha-card id="card">
              ${this.addEventListener('click', event => { this._showDetails(this._config.entity); })}
              ${this._renderTitle()}
              <div class="card">
                <div class="main-info">
                  ${this._config.showIcon
        ? html`
                      <div class="icon-block">
                        <span class="linky-icon bigger" style="background: none, url(https://apps.lincs.enedis.fr/mes-prms/assets/images/compteurs/linky.svg) no-repeat; background-size: contain;"></span>
                      </div>`
        : html``
      }
      ${html`
            <div class="cout-block">
              <span class="cout">${toFloat(this._data.get(this.getTodayDate().toString()))}</span>
              <span class="cout-unit">${attributes.unit_of_measurement}</span>
            </div>`
      }
                  ${this._config.showPrice && this._config.kWhPrice
        ? html`
                    <div class="cout-block">
                      <span class="cout" title="Coût journalier">${this.getPriceFromData(this.getTodayDate())}</span><span class="cout-unit"> €</span>
                    </div>`
        : html``
      }
                </div>
                <div class="variations">
                  ${this._config.showMonthRatio
        ? html`
                    <span class="variations-linky">
                      <span class="ha-icon">
                        <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.monthly_evolution < 0) ? '45' : ((attributes.monthly_evolution == 0) ? "0" : "-45")}deg)">
                       </ha-icon>
                      </span>
                      <div class="tooltip">
                      ${Math.round(attributes.monthly_evolution)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this._previousMonth()}</span>
                          <span class="tooltiptext">Mois Precedent A-1 : ${attributes.last_month_last_year}<br>Mois Precedent : ${attributes.last_month}</span>
                      </div>
                    </span>`
        : html``
      }
                  ${this._config.showCurrentMonthRatio
        ? html`
                    <span class="variations-linky">
                      <span class="ha-icon">
                        <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.current_month_evolution < 0) ? '45' : ((attributes.current_month_evolution == 0) ? "0" : "-45")}deg)">
                       </ha-icon>
                      </span>
                      <div class="tooltip">
                      ${Math.round(attributes.current_month_evolution)}<span class="unit"> %</span><span class="current-month">par rapport à ${this._currentMonth()}</span>
                          <span class="tooltiptext">Mois  A-1 : ${attributes.current_month_last_year}<br>Mois  : ${attributes.current_month}</span>
                      </div>
                    </span>`
        : html``
      }
                  ${this._config.showWeekRatio
        ? html`
                    <span class="variations-linky">
                        <span class="ha-icon">
                          <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.current_week_evolution < 0) ? '45' : ((attributes.current_week_evolution == 0) ? "0" : "-45")}deg)">
                          </ha-icon>
                        </span>
                        <div class="tooltip">
                        ${Math.round(attributes.current_week_evolution)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this._weekPreviousYear()}</span>
                        <span class="tooltiptext">Semaine A-1 : ${attributes.current_week_last_year}<br>Semaine courante : ${attributes.current_week}</span>
                    </div>
                      </span>`
        : html``
      }
                  ${this._config.showYesterdayRatio
        ? html`
                    <span class="variations-linky">
                        <span class="ha-icon">
                          <ha-icon icon="mdi:arrow-right" style="display: inline-block; transform: rotate(${(attributes.yesterday_evolution < 0) ? '45' : ((attributes.yesterday_evolution == 0) ? "0" : "-45")}deg)">
                         </ha-icon>
                        </span>
                        <div class="tooltip">
                        ${Math.round(attributes.yesterday_evolution)}<span class="unit"> %</span><span class="previous-month">par rapport à ${this._yesterdayPreviousYear()}</span>
                        <span class="tooltiptext">Hier A-1 : ${attributes.yesterdayLastYear}<br>Hier : ${attributes.yesterday}</span>
                    </div>
                      </span>`
        : html``
      }                 
                </div>
                ${this._renderHistory(attributes.unit_of_measurement)}
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

  _renderTitle() {
    if (this._config.showTitle === true) {
      return html
        `
          <div class="card">
          <div class="main-title">
          <span>${this._config.titleName}</span>
          </div>
          </div>`
    }
  }

  _renderHistory(unitOfMeasurement) {
    if (this._config.showHistory === false) {
      return;
    }

    return html
      `
        <div class="week-history">
        ${Array.from(this._data.entries())
        .filter(([key, value]) => key !== this.getTodayDate().toString())
        .sort(([key1, value1], [key2, value2]) => new Date(key1).getTime() - new Date(key2).getTime())
        .slice(-7)
        .map(([date, value]) => {
          return this._renderDay(date, unitOfMeasurement)
        })}
        </div>
      `

  }

  _renderDay(date, unitOfMeasurement) {
    return html
      `
        <div class="day">
          ${this._renderWeekDay(date)}
          ${this._renderDailyValue(date, unitOfMeasurement)}
          ${this._renderDayPrice(date)}
        </div>
      `
  }

  _renderWeekDay(date) {
    return html
      `
      <span class="dayname">${new Date(date).toLocaleDateString(this._hass.language, { weekday: this._config.showDayName })}</span>
      `;
  }

  _renderNoData() {
    return html
      `
        <br><span class="cons-val" title="Donnée indisponible"><ha-icon id="icon" icon="mdi:alert-outline"></ha-icon></span>
      ` ;
  }

  _renderDailyValue(date, unitOfMeasurement) {
    // TODO check
    if (date === -1) {
      return this._renderNoData();
    }

    return html
      `
      <br><span class="cons-val">${toFloat(this._data.get(date.toString()))} ${this._config.showInTableUnit
        ? html`
          ${unitOfMeasurement}`
        : html``
      }</span>
      `;

  }

  _renderDayPrice(date) {
    if (this._config.kWhPrice) {
      return html
        `
        <br><span class="cons-val">${this.getPriceFromData(date)} €</span>
      `;
    }
  }


  /**
   * Home Assistant will call setConfig(config) when the configuration changes (rare). 
   * If you throw an exception if the configuration is invalid, Home Assistant will render an error card to notify the user.
   * @param {*} config 
   */
  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }

    if (config.kWhPrice && isNaN(config.kWhPrice)) {
      throw new Error('kWhPrice should be a number')
    }

    if (config.showDayName && config.showDayName != "long" && config.showDayName != "short" && config.showDayName != "narrow") {
      throw new Error('showDayName should be "long" or "short" or "narrow"')
    }

    const defaultConfig = {
      titleName: "",
      showHistory: true,
      showIcon: false,
      showInTableUnit: false,
      showDayName: "long",
      showPrice: true,
      showTitle: false,
      kWhPrice: undefined,
      updateInterval: 60,

      showCurrentMonthRatio: false,
      showMonthRatio: false,
      showWeekRatio: false,
      showYesterdayRatio: false,
    }

    this._config = {
      ...defaultConfig,
      ...config
    };
  }

  /**
   * https://lit.dev/docs/components/lifecycle/#shouldupdate
   * 
   * @param {*} changedProps 
   * @returns
   */
  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  // @TODO: This requires more intelligent logic
  getCardSize() {
    return 3;
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

customElements.define('content-card-lixee', ContentCardLixee);
