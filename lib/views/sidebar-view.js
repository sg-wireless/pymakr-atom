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

export default class SideBar extends EventEmitter {

  constructor(panelview,settings,serializedState) {
    super()
    var _this = this
    this.panelview = panelview
    this.settings = settings
    this.visible = true
    this.api = new ApiWrapper()
    this.package_folder = this.api.getPackageSrcPath()
    this.logger = new Logger('SideBar')
  }

  build(root_element){
    var _this = this

    var html = fs.readFileSync(_this.package_folder + '/views/sidebar-view.html')
    root_element.append(html.toString())

    this.connect = $('#pymakr-action-connect')
    this.button_settings = $('#pymakr #settings')
    this.button_settings_sub = $('#pymakr #settings .subnav')
    this.settings_project_settings = $('#pymakr-project_settings')
    this.settings_global_settings = $('#pymakr-global_settings')
    this.settings_auto_connect = $('#pymakr-setting-autoconnect')
    this.settings_auto_connect_checkbox = $('#setting-autoconnect-value')

    this.button_pybytes = $('#pymakr #pybytes')

    this.bindOnClicks()
  }

  bindOnClicks(){
    var _this = this
    console.log("Binding action view clicks")

    this.connect.click(function(){
      console.log("Connecting")
      _this.panelview.emit('connect.toggle')
    })

    console.log("settings button onclick bind")
    console.log(this.button_settings)
    console.log(this.settings_global_settings)
    this.button_settings.click(function(){
      _this.panelview.emit('settings')
    })
    this.button_settings.on('blur',function(){
      _this.panelview.emit('settings_blur')
    })

    this.settings_global_settings.click(function(){
      console.log("global settings click")
      _this.panelview.emit('global_settings')
      _this.button_settings.removeClass("open")
    })

    this.settings_project_settings.click(function(){
      _this.panelview.emit('project_settings')
      _this.button_settings.removeClass("open")
    })

    this.button_pybytes.click(function(){
      var item = $('<div><div>').html("Right panel hierrrroo")
      var panel = atom.workspace.addRightPanel({item: item})
    })

  }
}