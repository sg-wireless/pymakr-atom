'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'
import SnippetsView from './snippets-view.js'
import OverlayView from './overlay-view.js'
$ = require('jquery')
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
    this.overlay = new OverlayView(this,settings)

    // main element
    this.element = document.createElement('div');
    this.element.classList.add('pymakr');
    this.element.classList.add('pymakr-open');

    // resize grip
    this.resizer = document.createElement('div');
    this.resizer.classList.add('pymakr-resizer');
    this.element.appendChild(this.resizer)

    // overlay contents
    this.overlay_contents = document.createElement('div');
    this.overlay_contents.classList.add('pymakr-overlay-contents');
    this.element.appendChild(this.overlay_contents)



    // top bar
    var topbar = document.createElement('div');
    topbar.classList.add('pycom-top-bar');
    this.topbar = topbar
    this.title = topbar.appendChild(document.createElement('div'));
    this.title.classList.add('pymakr-title');
    this.title.innerHTML = 'Starting...';

    // button wrapper
    var buttons_wrapper = topbar.appendChild(document.createElement('div'));
    buttons_wrapper.classList.add('pymakr-buttons')
    this.buttons = buttons_wrapper

    // build all buttons inside wrapper
    this.buildButtons(buttons_wrapper)


    this.button_more_tab = this.button_more.appendChild(document.createElement('div'))
    this.button_more_sub.classList.add('pymakr-subnav');

    // overlay
    this.overlay_wrapper = document.createElement('div');
    this.overlay_wrapper.classList.add('pymakr-overlay');
    this.element.appendChild(this.overlay_wrapper)


    // append topbar to main element
    this.element.appendChild(topbar);

    this.overlay.build()

    // creates the terminal elements and bindings
    this.buildTerminal()

    // binds click actions for all elements
    this.bindOnClicks()

    // Sets project name in top bar
    _this.setProjectName(_this.api.getProjectPath())
    this.settings.registerProjectChangeWatcher(function(path){
      _this.setProjectName(path)
    })

  }

  openSnippet(s){
    this.overlay.openSnippet(s)
  }

  buildButtons(buttons_wrapper){


    this.button_more = document.createElement('button');
    this.button_more.innerHTML = '<span class="fa down fa-chevron-down"></span><span class="fa up fa-chevron-up"></span> More';

    this.button_more_sub = this.button_more.appendChild(document.createElement('div'))
    this.button_more_sub.classList.add('pymakr-subnav');

    this.button_close = buttons_wrapper.appendChild(document.createElement('button'));
    this.button_close.innerHTML = '<span class="fa fa-chevron-down"></span>';

    this.button_settings = buttons_wrapper.appendChild(document.createElement('button'));
    this.button_settings.innerHTML = '<span class="fa fa-cog"></span> Settings';
    this.button_settings_sub = this.button_settings.appendChild(document.createElement('div'))
    this.button_settings_sub.classList.add('pymakr-subnav');

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
    // this.option_get_snippets = this.createButton('','div','','Snippets','') inactive for 1.5 version (see snippets branch for latest working version)

    buttons_wrapper.appendChild(this.button_more)
  }

  buildTerminal(){
    var _this = this
    // terminal UI elements
    this.terminal_el = document.createElement('div');
    this.terminal_el.id = "pymakr-terminal"
    this.element.appendChild(this.terminal_el);

    // terminal resize functionality
    var erd = ElementResize();
    erd.listenTo(this.terminal_el,function(element){
      if(_this.visible){
          _this.setPanelHeight()
      }
    })

    // create terminal
    this.terminal = new Term(null,this.terminal_el,this.pyboard,null)
    this.terminal.initResize(_this.element,_this.resizer)
    this.terminal.setOnMessageListener(function(input){
      _this.emit('user_input',input)
    })

  }

  // All button actions
  bindOnClicks(){
    var _this = this
    this.button_close.onclick = function(){
      if(_this.visible){

        setTimeout(function(){
          _this.hidePanel()
          _this.emit('close')
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

    // this.option_get_snippets.onclick = function(){
    //   _this.emit('open_snippets')
    // }

    this.option_get_wifi.onclick = function(){
      _this.emit('get_wifi')
    }

    this.option_get_help.onclick = function(){
      _this.emit('help')
    }

    this.topbar.onclick = function(){

      _this.emit('topbar')
      if(!_this.visible){
        _this.visible = true
        // TODO: the line doesn't work yet. Clicking 'button_close' also toggles, creating unwanted behaviour
        _this.showPanel()
      }
    }


    // 'click to connect' feature on complete terminal element
    this.terminal_el.onclick = function(){
      _this.emit('terminal_click')
    }

  }

  createButton(id,type,icon,text,classname,parent){
    type = 'div'
    if(!parent){
      parent = this.button_more_sub
      if(id && this.settings.statusbar_buttons.indexOf(id) > -1){
        parent = this.buttons
        type = 'button'
      }
    }

    button = parent.appendChild(document.createElement(type));
    button.innerHTML = '<span id="pymakr-'+id+'" class="fa fa-'+icon+'"></span> '+text;
    if(classname && classname != ''){
      button.classList.add('pymakr-'+classname);
    }
    return button
  }


  setProjectName(project_path){
    if(project_path && project_path.indexOf('/') > -1){
      this.project_name = project_path.split('/').pop()
    }else{
      this.project_name = "No project"
    }
    this.setButtonState()
  }

  // refresh button display based on current status
  setButtonState(runner_busy,synchronizing,synchronize_type){
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
        this.button_run.innerHTML = '<span class="fa fa-times"></span> Cancel'
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

      if(synchronizing){
          if(synchronize_type == 'receive'){
            this.button_sync_receive.innerHTML = '<span class="fa fa-times"></span> Cancel'
          }else{
            this.button_sync.innerHTML = '<span class="fa fa-times"></span> Cancel'
          }
      }else{
        this.button_sync_receive.innerHTML = '<span class="fa fa-upload"></span> Download'
        this.button_sync.innerHTML = '<span class="fa fa-upload"></span> Upload'
      }
      this.button_connect.classList = ['']
      this.button_connect.classList.add('hidden')
      this.button_disconnect.classList = ['']
      this.button_settings.classList = ['']
      this.button_more.classList = ['']
      this.setTitle('connected')

    }else{
      this.button_connect.classList = ['']
      this.button_disconnect.classList = ['']
      this.button_disconnect.classList.add('hidden')
      this.button_run.classList = ['']
      this.button_run.classList.add('hidden')
      this.button_sync.classList = ['']
      this.button_sync.classList.add('hidden')
      this.button_sync_receive.classList = ['']
      this.button_sync_receive.classList.add('hidden')
      this.button_more.classList = ['']
      this.button_settings.classList = ['']
      this.setTitle('not connected')
    }
  }

  setTitle(status){
	  if(status == 'connected'){
   	   this.title.innerHTML = '<img class="pymakr-logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Connected<i class="fa fa-check fa-lg icon" id="green"></i> <span id="pymakr-project_title">'+this.project_name+"</span>"
    }else{
   	   this.title.innerHTML = '<img class="pymakr-logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Disconnected<i class="fa fa-times fa-lg icon" id="red"></i> <span id="pymakr-project_title">'+this.project_name+'</span>'
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
    this.visible = true
    this.terminal.clear()
    this.setPanelHeight() // no param wil make it auto calculate based on xterm height
    this.button_close.innerHTML = '<span class="fa fa-chevron-down"></span>'
    this.element.classList.add("open")
  }

  openOverlay(snippets){
    this.overlay_wrapper.classList.add("pymakr-open")
    this.overlay_contents.classList.add("pymakr-open")
    this.overlay.open(snippets)
    $('.xterm-rows').addClass('blur-text')
  }

  closeOverlay(){
    this.overlay_wrapper.classList.remove("pymakr-open")
    this.overlay_contents.classList.remove("pymakr-open")
    $('.xterm-rows').removeClass('blur-text')
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
