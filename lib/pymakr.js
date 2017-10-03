'use babel';

import Pyboard from './board/pyboard';
import Sync from './board/sync';
import Runner from './board/runner';
import Term from './main/terminal';
import Pyserial from './connections/pyserial';
import ApiWrapper from './main/api-wrapper.js';
import Logger from './helpers/logger.js'
import PanelView from './main/panel-view.js'
import Config from './config.js'

var fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class Pymakr {

  constructor(serializedState,pyboard,view,settings) {
    var _this = this
    this.pyboard = pyboard
    this.synchronizing = false
    this.settings = settings
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('PymakrView')
    this.config = Config.constants()
    this.view = view

    this.terminal = this.view.terminal
    this.runner = new Runner(pyboard,this.terminal,this)

    this.settings.on('format_error',function(){
      _this.terminal.writeln("JSON format error in pymakr.conf file")
      if(_this.pyboard.connected){
        _this.terminal.writePrompt()
      }
    })

    this.view.on('connect',function(){
      _this.connect()
    })
    this.view.on('close',function(){
      _this.disconnect()
      _this.setButtonState()
    })
    this.view.on('open',function(){
      _this.connect()
      _this.setButtonState()
    })

    this.view.on('run',function(){
      if(!_this.synchronizing){
        _this.run()
      }
    })

    this.view.on('sync',function(){
      if(!_this.synchronizing){
        _this.sync()
      }
    })

    this.view.on('sync_receive',function(){
      if(!_this.synchronizing){
        _this.sync('receive')
      }
    })

    this.view.on('global_settings',function(){
      _this.api.openSettings()
    })

    this.view.on('project_settings',function(){
      _this.openProjectSettings()
    })

    this.view.on('get_version',function(){
      _this.getVersion()
    })

    this.view.on('get_serial',function(){
      _this.getSerial()
    })

    this.view.on('get_wifi',function(){
      _this.getWifiMac()
    })
    this.view.on('help',function(){
      _this.writeHelpText()
    })

    this.view.on('terminal_click',function(){
      if(!_this.pyboard.connected && !_this.pyboard.connecting) {
        _this.connect()
      }
    })

    this.view.on('user_input',function(input){
      var _this = this
      // this.terminal.write('\r\n')
      this.pyboard.send_user_input(input,function(err){
        if(err && err.message == 'timeout'){
          _this.disconnect()
        }
      })
    })

    this.pyboard.registerStatusListener(function(status){
      if(status == 3){
        _this.terminal.enter()
      }
    })

    // hide panel if it was hidden after last shutdown of atom
    var close_terminal = serializedState && 'visible' in serializedState && !serializedState.visible

    if(!this.settings.open_on_start || close_terminal){
      this.hidePanel()
    }else if(serializedState && 'visible' in serializedState) {
      this.connect()
    }
  }

  openProjectSettings(){
    var _this = this
    this.settings.openProjectSettings(function(err){
      if(err){
        console.log(err)
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

    Pyserial.list(function(list){
      _this.terminal.writeln("Found "+list.length+" serialport"+(list.length == 1 ? "" : "s"))
      for(var i=0;i<list.length;i++){
        var text = list[i]
        if(i==0){
          _this.api.writeToCipboard(text)
          text += " (copied to clipboard)"
        }
        _this.terminal.writeln(text)
      }
      if(_this.pyboard.connected){
        _this.terminal.writePrompt()
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

  // refresh button display based on current status
  setButtonState(){
    this.view.setButtonState(this.runner.busy)
  }

  setTitle(status){
	 this.view.setTitle()
  }

  connect(){
    var _this = this
    console.log(this.pyboard)

    // stop config observer from triggering again
    clearTimeout(this.observeTimeout)
    if(this.pyboard.connected || this.pyboard.connecting){
      this.disconnect(function(){
        _this.continueConnect()
      })
    }else{
      this.continueConnect()
    }
  }

  continueConnect(){
    var _this = this
    console.log(this.pyboard)
    this.pyboard.refreshConfig()
    var address = this.pyboard.params.host
    if(address == "" || address == null){
      this.terminal.writeln("Address not configured. Please go to the settings to configure a valid address or comport");
    }else{
      this.terminal.writeln("Connecting on "+address+"...");

      var onconnect = function(err){
        if(err){
          _this.terminal.writeln("Connection error: "+err)
        }
        _this.setButtonState()
      }

      var onerror = function(err){
        var message = _this.pyboard.getErrorMessage(err.message)
        if(message == ""){
          message = err.message ? err.message : "Unknown error"
        }
        if(_this.pyboard.connected){
          _this.logger.warning("An error occurred: "+message)
          if(_this.synchronizing){
            _this.terminal.writeln("An error occurred: "+message)
            _this.logger.warning("Synchronizing, stopping sync")
            _this.syncObj.stop()
          }
        }else{
          _this.terminal.writeln("> Failed to connect ("+message+"). Click here to try again.")
          _this.setButtonState()
        }
      }

      var ontimeout = function(err){
        _this.terminal.writeln("> Connection timed out. Click here to try again.")
        _this.setButtonState()
      }

      var onmessage = function(mssg){
        if(!_this.synchronizing){
          _this.terminal.write(mssg)
        }
      }

      _this.pyboard.connect(onconnect,onerror, ontimeout, onmessage)
    }
  }

  disconnect(cb){
    if(this.pyboard.isConnecting()){
        this.terminal.writeln("Canceled")
    }else{
      this.terminal.writeln("Disconnected. Click here to reconnect.")
    }
    this.pyboard.disconnect(function(){
      if(cb) cb()
    })
    this.synchronizing = false
    this.runner.stop()
    this.setButtonState()

  }

  run(){
    var _this = this
    if(!this.pyboard.connected){
      this.terminal.writeln("Please connect your device")
      return
    }
    if(!this.synchronizing){
      this.runner.toggle(function(){
        _this.setButtonState()
      })
    }
  }

  sync(type){
    this.logger.info("Sync")
    this.logger.info(type)
    var _this = this
    if(!this.pyboard.connected){
      this.terminal.writeln("Please connect your device")
      return
    }
    if(!this.synchronizing){
      this.syncObj = new Sync(this.pyboard,this.settings,this.terminal)
      this.synchronizing = true
      var cb = function(err){

        _this.synchronizing = false
        _this.setButtonState()
        if(_this.pyboard.type != 'serial'){
          setTimeout(function(){
              _this.connect()
          },2000)
        }
      }
      if(type == 'receive'){
        this.syncObj.start_receive(cb)
      }else{
        this.syncObj.start(cb)
      }
    }
  }


  writeHelpText(){
    var lines = []

    this.terminal.enter()
    this.terminal.write(this.config.help_text)

    if(this.pyboard.connected){
      console.log("Write prompt")
      this.terminal.writePrompt()
    }
  }

  // UI Stuff
  addPanel(){
    this.view.addPanel()
  }

  hidePanel(){
    this.view.hidePanel()
    this.disconnect()
  }

  showPanel(){
    this.view.showPanel()
    this.setButtonState()
    this.connect()
  }

  toggleVisibility(){
    this.view.visible ? this.hidePanel() : this.showPanel();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {visible: this.view.visible}
  }

  // Tear down any state and detach
  destroy() {
    this.disconnect()
    this.view.removeElement()
  }

  getElement() {
    return this.view.element;
  }

}
