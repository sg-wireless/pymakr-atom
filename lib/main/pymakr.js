'use babel';

import Pyboard from '../board/pyboard';
import Sync from '../board/sync';
import Runner from '../board/runner';
import Term from '../main/terminal';
import PySerial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'
import PanelView from '../views/panel-view.js'
import Config from '../config.js'
import Snippets from '../main/snippets.js'
import AutoConnect from '../main/auto-connect.js'
import Connection from '../main/connection.js'
import SyncHelper from '../main/sync-helper.js'
import Extras from '../main/extras.js'
var EventEmitter = require('events');

var fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class Pymakr extends EventEmitter {

  constructor(serializedState,pyboard,view,settings) {
    super()
    var _this = this
    this.pyboard = pyboard
    this.settings = settings
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('Pymakr')
    this.config = Config.constants()
    this.snippets = new Snippets(view,settings)

    this.view = view
    this.terminal = this.view.terminal
    this.runner = new Runner(pyboard,this.terminal,this)
    this.auto_connect = new AutoConnect(this,this.pyboard,this.terminal,this.settings)
    this.connection_helper = new Connection(this,this.pyboard,this.terminal,this.settings)
    this.extras = new Extras(this,this.pyboard,this.terminal,this.settings)
    this.sync_helper = new SyncHelper(this,this.pyboard,this.terminal,this.settings)

    // messages from connection
    this.connection_helper.setMessageCallback(function(mssg){
      if(!_this.synchronizing){
        _this.terminal.write(mssg)
      }
    })

    this.setEventListeners()

    this.setChangeListeners()

    this.initialise(serializedState)
  }

  initialise(serializedState){
    // hide panel if it was hidden after last shutdown of atom
    var close_terminal = serializedState && 'visible' in serializedState && !serializedState.visible

    if(!this.settings.open_on_start || close_terminal){
      this.hidePanel()
    }else{
      if(this.settings.auto_connect){
        this.auto_connect.start(null,true)
      }else{
        // _this.logger.verbose("No auto connect enabled, connecting normally:")
        this.connect()
      }
    }
  }

  setChangeListeners(){

    this.pyboard.registerStatusListener(function(status){
      if(status == 3){ // RAW_REPL
        _this.terminal.enter()
      }
    })

    this.api.listenToProjectChange(function(path){
      var address = _this.settings.address
      _this.view.setProjectName(path)
      _this.settings.projectChanged()
      if(address != _this.settings.address){
        _this.logger.verbose("Project changed, address changed, therefor connecting again:")
        _this.connect()
      }
    })


    this.settings.onChange('auto_connect',function(old_value,new_value){
      var v = new_value
      _this.logger.info("auto_connect setting changed to "+v)
      if(v && _this.view.visible){
        this.auto_connect.start()
      }else{
        this.auto_connect.stop()
        _this.connect()
      }
    })
  }

  setEventListeners(){
    var _this = this

    this.settings.on('format_error',function(){
      _this.terminal.writeln("JSON format error in pymakr.conf file")
      if(_this.pyboard.connected){
        _this.terminal.writePrompt()
      }
    })

    this.view.on('term-connected',function(){
      _this.logger.info("Connected trigger from view")

      _this.first_time_start = !this.api.settingsExist()
      if(_this.first_time_start){
        _this.first_time_start = false
        _this.api.openSettings()
        _this.extras.writeGetStartedText()
      }

      if(_this.settings.open_on_start){
        _this.connect()
      }
    })

    this.view.on('connect',function(){
      this.logger.verbose("Connect emitted")
      _this.connect(null,true)
      _this.setButtonState()
    })

    this.view.on('disconnect',function(){
      this.logger.verbose("Disconnect emitted")
      _this.disconnect()
      _this.setButtonState()
    })

    this.view.on('close',function(){
      this.logger.verbose("Close emitted")
      _this.disconnect()
      _this.setButtonState()
      _this.auto_connect.stop()
    })

    this.view.on('open',function(){
      this.logger.verbose("Open emitted")
      _this.auto_connect.start(function(connected_on_addr){
        if(!connected_on_addr){
          _this.logger.verbose("No address from autoconnect, connecting normally")
          _this.connect()
        }
        _this.setButtonState()
      })
    })

    this.view.on('run',function(){
      if(!_this.synchronizing){
        _this.run()
      }
    })

    this.view.on('runselection',function(){
      if(!_this.synchronizing){
        _this.runselection()
      }
    })

    this.view.on('sync',function(){
      if(!_this.synchronizing){
        _this.upload()
      }else{
        _this.stopSync(function(){
          _this.setButtonState()
        })
      }
      _this.setButtonState()
    })

    this.view.on('upload_current_file',function(){
      if(!_this.synchronizing){
        _this.uploadFile()
      }else{
        _this.stopSync(function(){
          _this.setButtonState()
        })
      }
      _this.setButtonState()
    })

    this.view.on('sync_receive',function(){
      if(!_this.synchronizing){
        _this.download()
      }else{
        _this.stopSync(function(){
          _this.setButtonState()
        })
      }
      _this.setButtonState()
    })

    this.view.on('global_settings',function(){
      _this.api.openSettings()
    })

    this.view.on('project_settings',function(){
      _this.openProjectSettings()
    })

    this.view.on('get_version',function(){
      _this.extras.getVersion()
    })

    this.view.on('get_serial',function(){
      _this.extras.getSerial()
    })

    this.view.on('get_wifi',function(){
      _this.extras.getWifiMac()
    })
    this.view.on('help',function(){
      _this.extras.writeHelpText()
    })
    this.view.on('open_snippets',function(){
      _this.open_snippets()
    })

    this.view.on('snippets.open',function(id){
      var s = _this.snippets.get(id)
      _this.view.openSnippet(s)
    })

    this.view.on('snippets.close',function(id){
      _this.close_snippets()
    })


    this.view.on('terminal_click',function(){
      this.logger.verbose("Terminal click emitted")
      if(!_this.pyboard.connected && !_this.pyboard.connecting) {
        _this.logger.verbose("Connecting because of terminal click")
        _this.connect()
      }
    })

    this.view.on('user_input',function(input){
      var _this = this
      // this.terminal.write('\r\n')
      this.pyboard.send_user_input(input,function(err){
        if(err && err.message == 'timeout'){
          _this.logger.warning("User input timeout, disconnecting")
          _this.logger.warning(err)
          _this.disconnect()
        }
      })
    })

    this.auto_connect.on('auto_connect',function(address){
      if(!_this.pyboard.connecting){
        _this.logger.verbose("Autoconnect event, disconnecting and connecting again")
        _this.connect(address)
      }
    })
  }


  openProjectSettings(){
    var _this = this
    this.settings.openProjectSettings(function(err){
      if(err){
        _this.terminal.writeln(err.message)
        if(_this.pyboard.connected){
          _this.terminal.writePrompt()
        }
      }
    })
  }

  openGlobalSettings(){
    this.api.openSettings(function(){
      // nothing
    })
  }

  getWifiMac(){
    var _this = this
    if(!this.pyboard.connected){
      this.terminal.writeln("Please connect to your device")
      return
    }

    var command = "from network import WLAN; from binascii import hexlify; from os import uname; wlan = WLAN(); mac = hexlify(wlan.mac()).decode('ascii'); device = uname().sysname;print('WiFi AP SSID: %(device)s-wlan-%(mac)s' % {'device': device, 'mac': mac[len(mac)-4:len(mac)]})"
    _this.pyboard.send_wait_for_blocking(command+'\n\r',command,function(err){
      if(err){
        _this.logger.error("Failed to send command: "+command)
      }
    },1000)
  }

  getSerial(){
    var _this = this
    this.terminal.enter()

    PySerial.list(this.settings,function(list,manufacturers){
      _this.terminal.writeln("Found "+list.length+" serialport"+(list.length == 1 ? "" : "s"))
      for(var i=0;i<list.length;i++){
        var name = list[i]
        var text = name + " (" + manufacturers[i]+ ")"
        if(i==0){
          _this.api.writeToCipboard(name)
          text += " (copied to clipboard)"
        }

        _this.terminal.writeln(text)
      }
    })
  }

  getVersion(){
    var _this = this
    if(!this.pyboard.connected){
      this.terminal.writeln("Please connect to your device")
      return
    }
    var command = "import os; os.uname().release\r\n"
    this.pyboard.send_wait_for_blocking(command,command,function(err){
      if(err){
        _this.logger.error("Failed to send command: "+command)
      }
    })
  }

  open_snippets(){
    this.view.openOverlay(this.snippets.list())
    this.terminal.setHeight(24)
    // this.view.setSnippetsContent(this.snippets.list())
  }

  close_snippets(){
    this.terminal.resetHeight()
  }

  // refresh button display based on current status
  setButtonState(){
    this.view.setButtonState(this.runner.busy,this.synchronizing,this.synchronize_type)
  }

  connect(address,clickaction){
    var _this = this
    this.auto_connect.findAddress(function(autoconnect_address){
      if(!address){
        if(autoconnect_address){
          address = autoconnect_address
        }else{
          address = this.settings.address
        }
      }

      // only display autoconnect warning after manual click action
      if(clickaction && this.auto_connect.enabled() && !autoconnect_address){
        _this.terminal.writeln("AutoConnect: No device available")
      }

      if(!address){
        _this.terminal.writeln("Address not configured. Please go to the settings to configure a valid address or comport")
        return
      }

      // check current connection of address
      var project = _this.connection_helper.connectedInOtherWindow(address)
      if(project){
        _this.terminal.writeln("Already connected in another window (project '"+project+"')")
        return
      }

      // actually connect
      _this.connection_helper.connect(address)
    })

  }

  disconnect(){
    this.connection_helper.disconnect()
  }

  run(){
    var _this = this
    if(!this.pyboard.connected){
      this.terminal.writeln("Please connect your device")
      return
    }
    if(!this.synchronizing){

      var code = this.api.getSelected()

      // if user has selected code, run that instead of the entire file
      if(code){
        this.runselection(code)
      }else{
        this.runner.toggle(function(){
          _this.setButtonState()
        })
      }

    }
  }

  runselection(cb){
    var _this = this
    if(!this.pyboard.connected){
      this.terminal.writeln("Please connect your device")
      return
    }

    if(!this.synchronizing){
      var code = this.api.getSelectedOrLine()
      _this.runner.selection(code,function(err){
        if(err){
          _this.logger.error("Failed to send and execute codeblock")
        } else {
          if(cb) cb()
        }
      })
    }
  }

  upload(){
    this.upload_helper.upload()
  }

  uploadFile(){
    this.upload_helper.uploadCurrentFile()
  }

  download(){
    this.upload_helper.download()
  }

  stopSync(cb){
    this.upload_helper.stop()
  }

  // UI Stuff
  addPanel(){
    this.view.addPanel()
  }

  hidePanel(){
    this.view.hidePanel()
    this.logger.verbose("Hiding pannel + disconnect")
    this.disconnect()
  }

  showPanel(){
    this.view.showPanel()
    this.setButtonState()
    this.connect()
  }

  clearTerminal(){
    this.view.clearTerminal()
  }

  toggleVisibility(){
    this.view.visible ? this.hidePanel() : this.showPanel();
  }
  // VSCode only
  toggleConnect(){
    this.pyboard.connected ? this.disconnect() : this.connect();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {visible: this.view.visible, feedbackPopupSeen: this.view.feedback_popup_seen}
  }

  // Tear down any state and detach
  destroy() {
    this.logger.warning("Destroying plugin")
    this.disconnect()
    this.view.removeElement()
  }

  getElement() {
    return this.view.element;
  }

}
