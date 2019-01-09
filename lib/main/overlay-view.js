'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'
import SnippetsView from './snippets-view.js'
$ = require('jquery')
var EventEmitter = require('events');

fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class PanelView extends EventEmitter {

  constructor(panelview,settings) {
    super()
    var _this = this
    this.panelview = panelview
    this.settings = settings
    this.snippetsview = new SnippetsView(panelview,this,settings)
  }

  open(snippets){
    this.snippetsview.setContent(snippets)
  }

  openSnippet(s){
    this.snippetsview.open(s)
  }

  build(){
    var _this = this
    this.wrapper = this.panelview.overlay_contents.appendChild(document.createElement('div'));
    this.wrapper.classList.add('pymakr-overlay-wrapper');

    this.close = this.wrapper.appendChild(document.createElement('div'));
    this.close.classList.add('wrapper-close');
    this.close.innerHTML = 'x'

    this.nav = this.wrapper.appendChild(document.createElement('div'));
    this.nav.classList.add('pymakr-overlay-nav');

    this.navitem_snippets = this.nav.appendChild(document.createElement('div'));
    this.navitem_snippets.classList.add('snippets');
    this.navitem_snippets.innerHTML = 'Snippets';

    this.navitem_config = this.nav.appendChild(document.createElement('div'));
    this.navitem_config.classList.add('config');
    this.navitem_config.innerHTML = 'Configuration';

    this.navitem_pybytes = this.nav.appendChild(document.createElement('div'));
    this.navitem_pybytes.classList.add('pybytes');
    this.navitem_pybytes.innerHTML = 'Pybytes';

    this.content_wrapper = this.wrapper.appendChild(document.createElement('div'));
    this.content_wrapper.classList = ['pymakr-overlay-content-wrapper'];

    this.content_config = this.content_wrapper.appendChild(document.createElement('div'));
    this.content_config.classList = ['config hidden'];
    this.content_config.innerHTML = '<span>Configuration options here</span>';

    this.content_config = this.content_wrapper.appendChild(document.createElement('div'));
    this.content_config.classList = ['pybytes hidden'];
    this.content_config.innerHTML = '<span>Pybytes contents</span>';


    this.snippetsview.build()

    this.close.onclick = function(){
      _this.panelview.closeOverlay()
    }

  }
}
