'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';
import InfoView from './info-view';

$ = require('jquery');
const EventEmitter = require('events');

fs = require('fs');
const ElementResize = require('element-resize-detector');

export default class OverlayView extends EventEmitter {
  constructor(panelview, settings) {
    super();
    const _this = this;
    this.panelview = panelview;
    this.settings = settings;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.infoview = new InfoView(panelview, this, settings);
  }

  open(info) {
    this.infoview.setContent(info);
  }

  openSnippet(s) {
    this.infoview.open(s);
  }

  closeOverlay() {
    _this.panelview.closeOverlay();
  }

  build(root_element) {
    const _this = this;

    const html = fs.readFileSync(`${_this.package_folder}/views/overlay-view.html`);
    root_element.append(html.toString());

    this.wrapper = $('#pymakr-overlay-wrapper');
    this.close = $('#wrapper-close');
    this.content_wrapper = $('#pymakr-overlay-content-wrapper');
    this.infoview.build(this.content_wrapper);

    this.close.click(() => {
      _this.closeOverlay();
    });
  }
}
