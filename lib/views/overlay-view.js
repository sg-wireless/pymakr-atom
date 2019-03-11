'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from '../main/terminal';
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
    this.api = new ApiWrapper()
    this.package_folder = this.api.getPackageSrcPath()
    this.snippetsview = new SnippetsView(panelview,this,settings)
  }

  open(snippets){
    this.snippetsview.setContent(snippets)
  }

  openSnippet(s){
    this.snippetsview.open(s)
  }

  build(root_element){
    var _this = this

    var html = fs.readFileSync(_this.package_folder + '/views/overlay-view.html')
    root_element.append(html.toString())

    this.wrapper = $('#pymakr-overlay-wrapper')
    this.close = $('#wrapper-close')
    this.nav = $('#pymakr-overlay-nav')
    this.navitem_snippets = $('#pymakr-overlay-nav .snippets')
    this.navitem_config = $('#pymakr-overlay-nav .config')
    this.navitem_pybytes = $('#pymakr-overlay-nav .pybytes')
    this.content_wrapper = $('#pymakr-overlay-content-wrapper')
    this.content_config = $('#wrapper-config')
    this.content_pybytes = $('#wrapper-pybytes')
    this.content_snippets = $('#wrapper-snippets')

    this.snippetsview.build(this.content_snippets)

    this.close.onclick = function(){
      _this.panelview.closeOverlay()
    }

  }
}
