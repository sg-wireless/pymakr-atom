'use babel';

import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';

$ = require('jquery');
const EventEmitter = require('events');

fs = require('fs');

export default class SideBar extends EventEmitter {
  constructor(panelView, settings) {
    super();
    this.panelView = panelView;
    this.settings = settings;
    this.visible = true;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.logger = new Logger('SideBar');
  }

  build(rootElement) {
    const _this = this;

    const html = fs.readFileSync(
      `${_this.package_folder}/views/sidebar-view.html`,
    );
    rootElement.append(html.toString());

    this.connect = $('#pymakr-action-connect');
    this.button_settings = $('#pymakr #settings');
    this.button_settings_sub = $('#pymakr #settings .subnav');
    this.settings_project_settings = $('#pymakr-project_settings');
    this.settings_global_settings = $('#pymakr-global_settings');
    this.settings_auto_connect = $('#pymakr-setting-autoconnect');
    this.settings_auto_connect_checkbox = $(
      '#setting-autoconnect-value',
    );

    $('#pybytes-logo').load(
      `${this.api.getPackagePath()}/styles/assets/pycom-icon.svg`,
    );
    this.buttonPybytes = $('#pybytes');
    const pybytesLabel = $('<span style="margin-bottom: 4px">Pybytes</span>');
    this.buttonPybytes.addClass('badge-new');
    this.buttonPybytes.append(pybytesLabel);

    this.bindOnClicks();
  }

  bindOnClicks() {
    const _this = this;
    this.button_settings.click(() => {
      _this.panelView.emit('settings');
    });
    this.button_settings.on('blur', () => {
      _this.panelView.emit('settings_blur');
    });

    this.settings_global_settings.click(() => {
      _this.panelView.emit('global_settings');
      _this.button_settings.removeClass('open');
    });

    this.settings_project_settings.click(() => {
      _this.panelView.emit('project_settings');
      _this.button_settings.removeClass('open');
    });

    this.buttonPybytes.click(() => {
      this.buttonPybytes.removeClass('badge-new');
      _this.panelView.emit('pybytes.toggle');
    });
  }
}
