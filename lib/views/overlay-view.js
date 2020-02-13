'use babel';

import { Pane } from 'atom';

import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';
import InfoView from './info-view';

$ = require('jquery');
const EventEmitter = require('events');

fs = require('fs');

export default class OverlayView extends EventEmitter {
  constructor(panelView, settings) {
    super();
    const _this = this;
    this.panelview = panelView;
    this.settings = settings;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.infoView = new InfoView(panelView, this, settings);
  }

  open(info) {
    this.infoView.setContent(info);
  }

  openSnippet(s) {
    this.infoView.open(s);
  }

  closeOverlay() {
    _this.panelview.closeOverlay();
  }

  build(rootElement) {
    const _this = this;

    const html = fs.readFileSync(`${_this.package_folder}/views/overlay-view.html`);
    rootElement.append(html.toString());

    this.wrapper = $('#pymakr-overlay-wrapper');
    this.close = $('#wrapper-close');
    this.content_wrapper = $('#pymakr-overlay-content-wrapper');
    this.infoView.build(this.content_wrapper);

    this.close.click(() => {
      _this.closeOverlay();
    });
  }
}
