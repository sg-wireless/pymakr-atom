'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'

var EventEmitter = require('events');
const ee = new EventEmitter();

fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class PanelView extends EventEmitter {

  constructor(pyboard,pymakr) {
    super()
    var _this = this
    this.pyboard = pyboard
    this.pymakr = pymakr
    this.visible = true
    this.api = new ApiWrapper()
    this.logger = new Logger('PanelView')

    // main element
    this.element = document.createElement('div');
    this.element.classList.add('pymakr');
    this.element.classList.add('open');

    this.resizer = document.createElement('div');
    this.resizer.classList.add('resizer');
    this.element.appendChild(this.resizer)

    // top bar with buttons
    var topbar = document.createElement('div');
    topbar.classList.add('pycom-top-bar');
    this.title = topbar.appendChild(document.createElement('div'));
    this.title.classList.add('title');
    this.title.innerHTML = 'Starting...';

    var buttons = topbar.appendChild(document.createElement('div'));
    buttons.classList.add('buttons')
    this.button_close = buttons.appendChild(document.createElement('button'));
    this.button_close.innerHTML = '<span class="fa fa-chevron-down"></span> Close';
    this.button_settings = buttons.appendChild(document.createElement('button'));
    this.button_settings.innerHTML = '<span class="fa fa-cog"></span> Settings';
    this.button_settings_sub = this.button_settings.appendChild(document.createElement('div'))
    this.button_settings_sub.classList.add('subnav');
    this.option_project_settings = this.button_settings_sub.appendChild(document.createElement('div'))
    this.option_project_settings.innerHTML = 'Project settings';
    this.option_global_settings = this.button_settings_sub.appendChild(document.createElement('div'))
    this.option_global_settings.innerHTML = 'Global settings';

    this.button_run = buttons.appendChild(document.createElement('button'));
    this.button_run.innerHTML = 'Run';
    this.button_run.classList.add('hidden');
    this.button_sync = buttons.appendChild(document.createElement('button'));
    this.button_sync.innerHTML = '<span class="fa fa-upload"></span> Sync';
    this.button_sync.classList.add('hidden');
    this.button_connect = buttons.appendChild(document.createElement('button'));
    this.button_connect.innerHTML = '<span class="fa fa-exchange"></span> Connect';
    this.button_more = buttons.appendChild(document.createElement('button'));
    this.button_more.innerHTML = '<span class="fa down fa-chevron-down"></span><span class="fa up fa-chevron-up"></span> More';

    this.button_more_sub = this.button_more.appendChild(document.createElement('div'))
    this.button_more_sub.classList.add('subnav');
    this.option_get_serial = this.button_more_sub.appendChild(document.createElement('div'))
    this.option_get_serial.innerHTML = 'Get serial ports';
    this.option_get_version = this.button_more_sub.appendChild(document.createElement('div'))
    this.option_get_version.innerHTML = 'Get firmware version';
    this.option_get_wifi = this.button_more_sub.appendChild(document.createElement('div'))
    this.option_get_wifi.innerHTML = 'Get WiFi AP SSID';
    this.option_get_help = this.button_more_sub.appendChild(document.createElement('div'))
    this.option_get_help.innerHTML = 'Help';


    this.element.appendChild(topbar);

    // All button actions
    // var closed_using_button = false
    this.button_close.onclick = function(){
      if(_this.visible){
        _this.emit('close')
        setTimeout(function(){
          _this.hidePanel()
          // closed_using_button = true
        },50)
      }else{
        _this.emit('open')
      }
      _this.setButtonState()
    }
    this.button_connect.onclick = function(){
      _this.emit('connect')
    }
    this.button_run.onclick = function(){
      _this.emit('run')
    }
    this.button_sync.onclick = function(){
      _this.emit('sync')
    }
    this.button_more.onblur = function(){
      _this.emit('more_blur')
      _this.button_more.classList.remove("open")
    }
    this.button_settings.onblur = function(){
      _this.emit('settings_blur')
      setTimeout(function(){
        _this.button_settings.classList.remove("open")
      },50)
    }

    this.button_more.onclick = function(){
      _this.emit('more')
      if(_this.button_more.classList.contains("open")){
        _this.button_more.classList.remove("open")
      }else{
        _this.button_more.classList.add("open")
      }
    }
    this.button_settings.onclick = function(){
      _this.emit('settings')
      if(_this.button_settings.classList.contains("open")){
        _this.button_settings.classList.remove("open")
      }else{
        _this.button_settings.classList.add("open")
      }
    }

    this.option_global_settings.onclick = function(){
      _this.emit('global_settings')
    }

    this.option_project_settings.onclick = function(){
      _this.emit('project_settings')
    }

    this.option_get_version.onclick = function(){
      _this.emit('get_version')

    }
    this.option_get_serial.onclick = function(){
      _this.emit('get_serial')
    }

    this.option_get_wifi.onclick = function(){
      _this.emit('get_wifi')
    }


    this.option_get_help.onclick = function(){
      _this.emit('help')
    }


    topbar.onclick = function(){
      _this.emit('topbar')
      if(!_this.visible){
        // TODO: the line doesn't work yet. Clicking 'button_close' also toggles, creating unwanted behaviour
        _this.showPanel()
      }
    }

    // terminal UI elements
    this.terminal_el = document.createElement('div');
    this.terminal_el.id = "terminal"
    this.element.appendChild(this.terminal_el);

    // 'click to connect' feature on complete terminal element
    this.terminal_el.onclick = function(){
      _this.emit('terminal_click')
    }

    // terminal resize functionality
    var erd = ElementResize();
    erd.listenTo(this.terminal_el,function(element){
      if(_this.visible){
          _this.setPanelHeight()
      }
    })

    // create terminal
    this.terminal = new Term(this.terminal_el,this.pyboard)
    this.terminal.initResize(_this.element,_this.resizer)
    this.terminal.setOnMessageListener(function(input){
      _this.emit('user_input',input)
    })

  }

  // refresh button display based on current status
  setButtonState(){
    if (!this.visible) {
      this.button_sync.classList.add('hidden')
      this.button_run.classList.add('hidden')
      this.button_connect.classList.add('hidden')
      this.button_settings.classList.add('hidden')
      this.button_more.classList.add('hidden')
      this.setTitle('not connected')
    }else if(this.pyboard.connected) {
      if(this.pymakr.runner.busy){
        this.button_run.innerHTML = 'Cancel'
        this.button_run.classList.add('cancel')
        this.button_sync.classList = ['']
        this.button_sync.classList.add('hidden')
      }else{
        this.button_run.innerHTML = '<span class="fa fa-play"></span> Run'
        this.button_run.classList = ['']
        this.button_sync.classList = ['']
      }
      this.button_connect.innerHTML = '<span class="fa fa-refresh"></span> Reconnect'
      this.button_settings.classList = ['']
      this.button_more.classList = ['']
      this.setTitle('connected')

    }else{
      this.button_connect.classList = ['']
      this.button_connect.innerHTML = '<span class="fa fa-exchange"></span> Connect'
      this.button_run.classList.add('hidden')
      this.button_sync.classList.add('hidden')
      this.button_more.classList = ['']
      this.button_settings.classList = ['']
      this.setTitle('not connected')
    }
  }

  setTitle(status){
	  if(status === 'connected'){
   	   this.title.innerHTML = '<img class="logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Connected<i class="fa fa-check fa-lg icon" id="green"></i>'
      }
	  else{
   	   this.title.innerHTML = '<img class="logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Disconnected<i class="fa fa-times fa-lg icon" id="red"></i>'
	  }
  }

  // UI Stuff
  addPanel(){
    this.api.addBottomPanel(
      {
        item: this.getElement(),
        visible: true,
        priority: 100
      }
    )
  }

  setPanelHeight(height){
    if(!height){
      height = (this.terminal_el.offsetHeight + 25)
    }
    this.element.style.height = height + "px"

  }

  hidePanel(){
    this.setPanelHeight(25) // 25px displays only the top bar
    this.button_close.innerHTML = '<span class="fa fa-chevron-up"></span> Open'
    this.element.classList.remove("open")
    this.visible = false
  }

  showPanel(){
    this.terminal.clear()
    this.setPanelHeight() // no param wil make it auto calculate based on xterm height
    this.button_close.innerHTML = '<span class="fa fa-chevron-down"></span> Close'
    this.element.classList.add("open")
    this.visible = true
    this.setButtonState()
  }

  toggleVisibility(){
    this.visible ? this.hidePanel() : this.showPanel();
  }

  // Tear down any state and detach
  removeElement() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
