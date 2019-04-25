'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper.js';
import Logger from '../helpers/logger.js'
import InfoView from './info-view.js'
$ = require('jquery')
var EventEmitter = require('events');

fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class OverlayView extends EventEmitter {

  constructor(panelview,settings) {
    super()
    var _this = this
    this.panelview = panelview
    this.settings = settings
    this.api = new ApiWrapper()
    this.package_folder = this.api.getPackageSrcPath()
    this.infoview = new InfoView(panelview,this,settings)
  }

  open(info){
    this.infoview.setContent(info)
  }

  openSnippet(s){
    this.infoview.open(s)
  }

  closeOverlay(){
    _this.panelview.closeOverlay()
  }

  build(root_element){
    var _this = this

    var html = fs.readFileSync(_this.package_folder + '/views/overlay-view.html')
    root_element.append(html.toString())

    this.wrapper = $('#pymakr-overlay-wrapper')
    this.close = $('#wrapper-close')
    this.content_wrapper = $('#pymakr-overlay-content-wrapper')

    console.log(this.content_wrapper)

    this.infoview.build(this.content_wrapper)

    this.close.click(function(){
      _this.closeOverlay()
    })

  }
}
