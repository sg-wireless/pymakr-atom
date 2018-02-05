'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'

var EventEmitter = require('events');

fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class PanelView extends EventEmitter {

  constructor(pyboard,settings) {
    super()
    var _this = this
    this.pyboard = pyboard
    this.settings = settings
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
    this.buttons = buttons

    console.log(this.settings.statusbar_buttons)

    this.button_more = document.createElement('button');
    this.button_more.innerHTML = '<span class="fa down fa-chevron-down"></span><span class="fa up fa-chevron-up"></span> More';

    this.button_more_sub = this.button_more.appendChild(document.createElement('div'))
    this.button_more_sub.classList.add('subnav');

    this.button_close = buttons.appendChild(document.createElement('button'));
    this.button_close.innerHTML = '<span class="fa fa-chevron-down"></span>';

    this.button_settings = buttons.appendChild(document.createElement('button'));
    this.button_settings.innerHTML = '<span class="fa fa-cog"></span> Settings';
    this.button_settings_sub = this.button_settings.appendChild(document.createElement('div'))
    this.button_settings_sub.classList.add('subnav');

    this.option_global_settings = this.createButton('global_settings','div','','Global settings','',this.button_settings_sub)
    this.option_project_settings = this.createButton('project_settings','div','','Project settings','',this.button_settings_sub)

    this.button_connect = this.createButton('connect','button','exchange','Connect','')
    this.button_disconnect = this.createButton('connect','button','times','Disconnect','')

    this.button_run = this.createButton('run','button','','Run','hidden')
    this.button_sync_receive = this.createButton('download','button','download','Download','hidden')

    this.button_sync = this.createButton('upload','button','upload','Upload','hidden')



    this.option_get_serial = this.createButton('','div','','Get serial ports','')
    this.option_get_version = this.createButton('','div','','Get firmware version','')
    this.option_get_wifi = this.createButton('','div','','Get WiFi AP SSID','')
    this.option_get_help = this.createButton('','div','','Help','')

    buttons.appendChild(this.button_more)

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
        _this.showPanel()
        _this.emit('open')
      }
    }
    this.button_connect.onclick = function(){
      _this.emit('connect')
    }
    this.button_disconnect.onclick = function(){
      _this.emit('disconnect')
    }
    this.button_run.onclick = function(){
      _this.emit('run')
    }
    this.button_sync.onclick = function(){
      _this.emit('sync')
    }
    this.button_sync_receive.onclick = function(){
      _this.emit('sync_receive')
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

    _this.setProjectName(_this.api.getProjectPath())

    // create terminal
    this.terminal = new Term(null,this.terminal_el,this.pyboard,null)
    this.terminal.initResize(_this.element,_this.resizer)
    this.terminal.setOnMessageListener(function(input){
      _this.emit('user_input',input)
    })
  }

  createButton(id,type,icon,text,classname,parent){
    type = 'div'
    if(!parent){
      parent = this.button_more_sub
      if(id && this.settings.statusbar_buttons.indexOf(id) > -1){
        console.log("Adding "+id+" to normal buttons")
        parent = this.buttons
        type = 'button'
      }else{
        console.log("Adding "+id+" to more buttons")
      }
    }

    button = parent.appendChild(document.createElement(type));
    button.innerHTML = '<span id="'+id+'" class="fa fa-'+icon+'"></span> '+text;
    if(classname && classname != ''){
      button.classList.add(classname);
    }
    return button
  }


  setProjectName(project_path){
    if(project_path && project_path.indexOf('/') > -1){
      this.project_name = project_path.split('/').pop()
    }else{
      this.project_name = "No project"
    }
    this.setButtonState(this.running)
  }

  // refresh button display based on current status
  setButtonState(runner_busy){
    if (!this.visible) {
      this.button_sync.classList.add('hidden')
      this.button_sync_receive.classList.add('hidden')
      this.button_run.classList.add('hidden')
      this.button_connect.classList.add('hidden')
      this.button_disconnect.classList.add('hidden')
      this.button_settings.classList.add('hidden')
      this.button_more.classList.add('hidden')
      this.setTitle('not connected')
    }else if(this.pyboard.connected) {
      if(runner_busy){
        this.button_run.innerHTML = 'Cancel'
        this.button_run.classList.add('cancel')
        this.button_sync.classList = ['']
        this.button_sync.classList.add('hidden')
        this.button_sync_receive.classList = ['']
        this.button_sync_receive.classList.add('hidden')
      }else{
        this.button_run.innerHTML = '<span class="fa fa-play"></span> Run'
        this.button_run.classList = ['']
        this.button_sync.classList = ['']
        this.button_sync_receive.classList = ['']
      }
      this.button_connect.classList.add('hidden')
      this.button_disconnect.classList.remove('hidden')
      this.button_settings.classList = ['']
      this.button_more.classList = ['']
      this.setTitle('connected')

    }else{
      this.button_connect.classList.remove('hidden')
      this.button_disconnect.classList.add('hidden')
      this.button_run.classList.add('hidden')
      this.button_sync.classList.add('hidden')
      this.button_sync_receive.classList.add('hidden')
      this.button_more.classList = ['']
      this.button_settings.classList = ['']
      this.setTitle('not connected')
    }
  }

  setTitle(status){
	  if(status == 'connected'){
   	   this.title.innerHTML = '<img class="logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Connected<i class="fa fa-check fa-lg icon" id="green"></i> <span id="project_title">'+this.project_name+"</span>"
      }
	  else{
   	   this.title.innerHTML = '<img class="logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Disconnected<i class="fa fa-times fa-lg icon" id="red"></i> <span id="project_title">'+this.project_name+'</span>'
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
    this.button_close.innerHTML = '<span class="fa fa-chevron-up"></span>'
    this.element.classList.remove("open")
    this.visible = false
  }

  showPanel(){
    this.terminal.clear()
    this.setPanelHeight() // no param wil make it auto calculate based on xterm height
    this.button_close.innerHTML = '<span class="fa fa-chevron-down"></span>'
    this.element.classList.add("open")
    this.visible = true
  }

  clearTerminal(){
    this.terminal.clear()
  }

  // Tear down any state and detach
  removeElement() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
