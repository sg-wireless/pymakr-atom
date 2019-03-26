'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper.js';
import Logger from '../helpers/logger.js'
import SnippetsView from './snippets-view.js'
import OverlayView from './overlay-view.js'
$ = require('jquery')
var EventEmitter = require('events');
const { shell } = require('electron')



fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class PanelView extends EventEmitter {

  constructor(pyboard,settings,serializedState) {
    super()
    var _this = this
    this.pyboard = pyboard
    this.settings = settings
    this.visible = true
    this.api = new ApiWrapper()
    this.package_folder = this.api.getPackageSrcPath()
    this.logger = new Logger('PanelView')
    this.overlay = new OverlayView(this,settings)
    this.feedback_popup_seen = serializedState && 'feedbackPopupSeen' in serializedState && serializedState.feedbackPopupSeen

    var html = fs.readFileSync(_this.package_folder + '/views/panel-view.html')
    this.main_el = document.createElement('div');
    this.main_el.insertAdjacentHTML('beforeend',html.toString())
  }

  build(){
    var _this = this
    // main element
    this.element = $('#pymakr')
    this.element_original = this.element[0]
    this.resizer = $('#pymakr-resizer')
    this.overlay_contents = $('#pymakr-overlay-contents')
    this.topbar = $('#pycom-top-bar')
    this.title = $('#pymakr-title')
    this.project_name_display = $('#pymakr-projects #project-name')
    this.buttons = $('#pymakr-buttons')
    this.button_more_tab = $('#pymakr-more-subnav')
    this.overlay_wrapper = $('#pymakr-overlay')
    this.terminal_element = $('#pymakr-terminal')
    this.button_more = $('#pymakr-buttons #more')
    this.button_more_sub = $('#pymakr-buttons #more .subnav')
    this.button_close = $('#pymakr-buttons #close')
    this.button_settings = $('#pymakr-buttons #settings')
    this.button_settings_sub = $('#pymakr-buttons #settings .subnav')
    this.settings_project_settings = $('#pymakr-project_settings')
    this.settings_global_settings = $('#pymakr-global_settings')
    this.settings_auto_connect = $('#pymakr-setting-autoconnect')
    this.settings_auto_connect_checkbox = $('#setting-autoconnect-value')
    this.comport_list = $('#pymakr-comports-list')
    this.address_list = $('#pymakr-address-list')
    this.device_connection_tabs = $('#pymakr-connection-tabs')

    this.quick_settings = []
    this.quick_settings_values = []
    this.comports = []

    // this.showFeedbackPopup()

    // build all buttons inside wrapper
    this.buildButtons(this.buttons)

    this.overlay.build(this.overlay_contents)

    // creates the terminal elements and bindings
    this.buildTerminal()

    // binds click actions for all elements
    this.bindOnClicks()

    this.initQuickSettings()

    // Sets project name in top bar
    this.setProjectName(this.api.getProjectPath())
    this.settings.registerProjectChangeWatcher(function(path){
      _this.setProjectName(path)
    })
  }

  openSnippet(s){
    this.overlay.openSnippet(s)
  }

  showFeedbackPopup(){
    var _this = this
    if(!this.feedback_popup_seen){
      this.feedback_question = document.createElement('div')
      this.feedback_question.classList.add('pymakr-feedback');
      this.feedback_question.innerHTML = "<h2>Hi Pymakr User!</h2> "
      this.feedback_question.innerHTML += "We are working on ideas for Pymakr 2.0 and would love your feedback! "
      this.feedback_open_form = this.feedback_question.appendChild(document.createElement('div'))
      this.feedback_open_form.innerHTML += "Click here"
      this.feedback_open_form.classList.add('feedback-link')
      this.feedback_question.appendChild(document.createTextNode(" if you have a few minutes to help out."))
      this.feedback_question_dontshowagain = this.feedback_question.appendChild(document.createElement('div'))
      this.feedback_question_dontshowagain.classList.add('dontshowagain');
      this.feedback_question_dontshowagain.innerHTML = "Don't show again"
      this.feedback_question_point = this.feedback_question.appendChild(document.createElement('div'))
      this.feedback_question_point.classList.add('square');
      this.feedback_question_close = this.feedback_question.appendChild(document.createElement('div'))
      this.feedback_question_close.classList.add('close-button');
      this.feedback_question_close.innerHTML = "x"

      this.element.append(this.feedback_question)

      this.feedback_question_close.onclick = function(){
        _this.feedback_question.classList.add("hidden")
      }

      this.feedback_open_form.onclick = function(){
        _this.feedback_popup_seen = true
        shell.openExternal('https://danielmariano.typeform.com/to/kQ26Iu')
        _this.feedback_question.classList.add("hidden")
      }

      this.feedback_question_dontshowagain.onclick = function(){
        _this.feedback_question.classList.add("hidden")
        _this.feedback_popup_seen = true
        //do something to hide this permantently?
      }
    }

  }

  buildButtons(){

  }

  buildTerminal(){
    var _this = this

    // terminal resize functionality
    var erd = ElementResize();
    erd.listenTo(this.terminal_element,function(element){
      if(_this.visible){
          _this.setPanelHeight()
      }
    })

    // create terminal
    this.terminal = new Term(null,_this.terminal_element,_this.element_original,this.pyboard,null)
    this.terminal.initResize(_this.resizer)
    this.terminal.setOnMessageListener(function(input){
      _this.emit('user_input',input)
    })
  }

  // All button actions
  bindOnClicks(){
    var _this = this
    this.button_close.click(function(){

      if(_this.visible){
        console.log("Hiding panel")
        setTimeout(function(){
          _this.hidePanel()
          _this.emit('close')
          // closed_using_button = true
        },50)
      }else{
        console.log("Showing panel")
        _this.showPanel()
        _this.emit('open')
      }
    })

    // this.button_connect.onclick = function(){
    //   _this.emit('connect')
    // }
    // this.button_disconnect.onclick = function(){
    //   _this.emit('disconnect')
    // }
    // this.button_run.onclick = function(){
    //   _this.emit('run')
    // }
    // this.button_sync.onclick = function(){
    //   _this.emit('sync')
    // }
    // this.button_sync_receive.onclick = function(){
    //   _this.emit('sync_receive')
    // }
    //
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

    $('button.has-sub').click(function(){
      if($(this).hasClass("open")){
        $(this).removeClass("open")
        // don't do anything
      }else{
        $(this).addClass("open")
      }
    })
    $('button.has-sub').on('blur',function(){
      var button = $(this)
      setTimeout(function(){
        button.removeClass("open")
      },150)
    })


    this.button_settings.click(function(){
      _this.emit('settings')
    })
    this.button_settings.on('blur',function(){
      _this.emit('settings_blur')
    })

    this.settings_global_settings.click(function(){
      console.log("global settings click")
      _this.emit('global_settings')
      _this.button_settings.removeClass("open")
    })

    this.settings_project_settings.click(function(){
      _this.emit('project_settings')
      _this.button_settings.removeClass("open")
    })
    //
    // this.option_get_version.onclick = function(){
    //   _this.emit('get_version')
    //
    // }
    // this.option_get_serial.onclick = function(){
    //   _this.emit('get_serial')
    // }
    //
    // this.option_get_snippets.onclick = function(){
    //   _this.emit('open_snippets')
    // }
    //
    // this.option_get_wifi.onclick = function(){
    //   _this.emit('get_wifi')
    // }
    //
    // this.option_get_help.onclick = function(){
    //   _this.emit('help')
    // }

    this.topbar.onclick = function(){

      _this.emit('topbar')
      if(!_this.visible){
        _this.visible = true
        // TODO: the line doesn't work yet. Clicking 'button_close' also toggles, creating unwanted behaviour
        _this.showPanel()
      }
    }


    // 'click to connect' feature on complete terminal element
    this.terminal_element.onclick = function(){
      _this.emit('terminal_click')
    }
  }

  initQuickSettings(){
    var _this = this
    var quick_settings = ['auto_connect','safe_boot_on_upload']
    for(var i=0;i<quick_settings.length;i++){
      var s = quick_settings[i]
      this.quick_settings[s] = $('#pymakr-setting-'+s)
      var s_checkbox = $('#setting-'+s+'-value')
      console.log(s_checkbox)
      s_checkbox.prop("checked",this.settings[s])
      s_checkbox.on('change',function(el,el2){
        console.log(el)
        console.log(el.target)
        _this.settings.set(el.target.name,el.target.checked)
      })
      this.quick_settings_values[s] = s_checkbox
    }

  }

  createButton(id,type,icon,text,classname,parent){
    type = 'div'

    button = $('<div></div>')

    button.html('<span class="fa fa-'+icon+'"></span> '+text);
    button.attr('id',classname+'-'+id)
    button.attr('name',id)
    if(classname && classname != ''){
      button.addClass('pymakr-'+classname);
    }
    parent.append(button);
    return button
  }


  setProjectName(project_path){
    if(project_path && project_path.indexOf('/') > -1){
      this.project_name = project_path.split('/').pop()
    }else{
      this.project_name = "No project"
    }
    this.project_name_display.html(this.project_name)
    this.setButtonState()
  }

  // refresh button display based on current status
  setButtonState(runner_busy,synchronizing,synchronize_type){

    if (!this.visible) {
      // this.button_sync.classList.add('hidden')
      // this.button_sync_receive.classList.add('hidden')
      // this.button_run.classList.add('hidden')
      // this.button_connect.classList.add('hidden')
      // this.button_disconnect.classList.add('hidden')
      // this.button_settings.classList.add('hidden')
      // this.button_more.classList.add('hidden')
      this.setTitle('not connected')
    }else if(this.pyboard.connected) {
      if(runner_busy){
        // this.button_run.innerHTML = '<span class="fa fa-times"></span> Cancel'
        // this.button_run.classList.add('cancel')
        // this.button_sync.classList = ['']
        // this.button_sync.classList.add('hidden')
        // this.button_sync_receive.classList = ['']
        // this.button_sync_receive.classList.add('hidden')
      }else{
        // this.button_run.innerHTML = '<span class="fa fa-play"></span> Run'
        // this.button_run.classList = ['']
        // this.button_sync.classList = ['']
        // this.button_sync_receive.classList = ['']
      }

      if(synchronizing){
          if(synchronize_type == 'receive'){
            // this.button_sync_receive.innerHTML = '<span class="fa fa-times"></span> Cancel'
          }else{
            // this.button_sync.innerHTML = '<span class="fa fa-times"></span> Cancel'
          }
      }else{
        // this.button_sync_receive.innerHTML = '<span class="fa fa-upload"></span> Download'
        // this.button_sync.innerHTML = '<span class="fa fa-upload"></span> Upload'
      }
      // this.button_connect.classList = ['']
      // this.button_connect.classList.add('hidden')
      // this.button_disconnect.classList = ['']
      // this.button_settings.classList = ['']
      // this.button_more.classList = ['']
      this.setTitle('connected')

    }else{
      // this.button_connect.classList = ['']
      // this.button_disconnect.classList = ['']
      // this.button_disconnect.classList.add('hidden')
      // this.button_run.classList = ['']
      // this.button_run.classList.add('hidden')
      // this.button_sync.classList = ['']
      // this.button_sync.classList.add('hidden')
      // this.button_sync_receive.classList = ['']
      // this.button_sync_receive.classList.add('hidden')
      // this.button_more.classList = ['']
      // this.button_settings.classList = ['']
      this.setTitle('not connected')
    }
  }

  setTitle(status){
	  // if(status == 'connected'){
   	//    this.title.html('<img class="pymakr-logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Connected<i class="fa fa-check fa-lg icon" id="green"></i> <span id="pymakr-project_title">'+this.project_name+"</span>")
    // }else{
   	//    this.title.html('<img class="pymakr-logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Disconnected<i class="fa fa-times fa-lg icon" id="red"></i> <span id="pymakr-project_title">'+this.project_name+'</span>')
	  // }
    this.project_name_display.html(this.project_name)
  }

  addComport(com_info){
    var _this = this
    var button = this.createButton(com_info.name,'div','',com_info.title,'comport',this.comport_list)
    console.log(button)
    button.click(function(element){
      console.log(element)
      console.log($(this))
      console.log("Connect to: "+$(this).attr('name'))
      _this.emit('connect.device',$(this).attr('name'))
    })
    this.comports[com_info.name] = button
  }

  removeComport(name){
    this.comports[name].remove()
  }

  addAddress(ip){
    var _this = this
    var button = this.createButton(ip,'div','',ip,'address',this.address_list)
    button.click(function(element){
      console.log("Connect to: "+$(this).attr('name'))
      _this.emit('connect.device',$(this).attr('name'))
    })
  }

  removeAddress(name){
    $('address-'+name).remove()
  }

  addConnection(address){
    var _this = this
    var button = this.createButton(address,'div','',address,'connection',this.device_connection_tabs)
    button.click(function(element){
      _this.emit('open.tab',$(this).attr('name'))
    })
  }

  // UI Stuff
  addPanel(){
    console.log("Adding bottom panel to html")
    this.api.addBottomPanel(
      {
        item: this.getElement(),
        visible: true,
        priority: 100
      }
    )
  }

  setPanelHeight(height){
    if(height === undefined){

      height = (this.terminal_element[0].offsetHeight + 25)
      console.log("setting height to "+height)
    }
    this.element.height(height + "px")
  }

  hidePanel(){
    this.setPanelHeight(-5)
    this.element.removeClass("open")
    this.visible = false
  }

  showPanel(){
    this.visible = true
    this.setPanelHeight() // no param wil make it auto calculate based on xterm height
    this.element.addClass("open")
  }

  openOverlay(snippets){
    this.overlay_wrapper.addClass("pymakr-open")
    this.overlay_contents.addClass("pymakr-open")
    this.overlay.open(snippets)
    $('.xterm-rows').addClass('blur-text')
  }

  closeOverlay(){
    this.overlay_wrapper.removeClass("pymakr-open")
    this.overlay_contents.removeClass("pymakr-open")
    $('.xterm-rows').removeClass('blur-text')
    this.emit('snippets.close')
  }

  // Tear down any state and detach
  removeElement() {
    this.element.remove();
  }

  getElement() {
    return this.main_el;
  }

}
