'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper.js';
import Logger from '../helpers/logger.js'
import SnippetsView from './snippets-view.js'
import OverlayView from './overlay-view.js'
import Config from '../config.js'
$ = require('jquery')
var EventEmitter = require('events');
const { shell } = require('electron')

fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class ActionView extends EventEmitter {

  constructor(panelview,settings,serializedState) {
    super()
    var _this = this
    this.panelview = panelview
    this.settings = settings
    this.visible = true
    this.api = new ApiWrapper()
    this.package_folder = this.api.getPackageSrcPath()
    this.logger = new Logger('PanelView')
  }

  build(root_element){
    var _this = this

    var html = fs.readFileSync(_this.package_folder + '/views/action-view.html')
    root_element.append(html.toString())

    this.connect = $('#pymakr-action-connect')
    this.connect_sub = $('pymakr-action-connect .sub')
    this.run = $('#pymakr-action-run')
    this.run_sub = $('pymakr-action-run .sub')
    this.upload = $('#pymakr-action-upload')
    this.upload_sub = $('pymakr-action-upload .sub')
    this.download = $('#pymakr-action-download')
    this.download_sub = $('pymakr-action-download .sub')
    console.log(this.connect)


    this.bindOnClicks()
  }

  bindOnClicks(){
    var _this = this
    console.log("Binding action view clicks")

    this.connect.click(function(){
      console.log("Connecting")
      _this.panelview.emit('connect.toggle')
    })
    // this.button_disconnect.onclick = function(){
    //   _this.emit('disconnect')
    // }
    this.run.click(function(){
      console.log("Running")
      _this.panelview.emit('run')
    })
    this.upload.click(function(){
      console.log("Uploading")
      _this.panelview.emit('sync')
    })
    this.download.click(function(){
      _this.panelview.emit('sync_receive')
    })

    // this.button_more.onblur = function(){
    //   _this.emit('more_blur')
    //   _this.button_more.classList.remove("open")
    // }


    // this.button_more.onclick = function(){
    //   _this.emit('more')
    //   if(_this.button_more.classList.contains("open")){
    //     _this.button_more.classList.remove("open")
    //   }else{
    //     _this.button_more.classList.add("open")
    //   }
    // }
  }
}
