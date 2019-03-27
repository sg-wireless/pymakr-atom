'use babel';

import Pyboard from './board/pyboard';
import Sync from './features/sync/sync';
import Runner from './features/run/runner';
import Term from './views/terminal';
import PySerial from './connections/pyserial';
import ApiWrapper from './wrappers/api-wrapper.js';
import Logger from './helpers/logger.js'
import PanelView from './views/panel-view.js'
import Config from './config.js'
import Snippets from './features/snippets/snippets.js'
import AutoConnect from './connections/auto-connect.js'
import Utils from './helpers/utils.js'

import SyncHelper from './features/sync/sync-helper.js'

import Device from './connections/device.js'
var EventEmitter = require('events');

var fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class Pymakr extends EventEmitter {

  constructor(serializedState,view,settings) {
    super()
    var _this = this
    this.settings = settings
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('Pymakr')
    this.config = Config.constants()
    this.snippets = new Snippets(view,settings)
    this.utils = new Utils(settings)

    this.view = view
    this.devices = []
    this.device_addresses = []
    this.selected_device = null
    this.terminal = this.view.terminal

    this.auto_connect = new AutoConnect(this,this.terminal,this.settings)


    // messages from connection

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
      this.auto_connect.start(null,true)
    }

    for(var i=0;i<this.settings.address.length;i++){
      var a = this.settings.address[i]
      this.view.addAddress(a)
    }
  }

  setChangeListeners(){
    var _this = this

    //
    // this.api.listenToProjectChange(function(path){
    //   var address = _this.settings.address
    //   _this.view.setProjectName(path)
    //   _this.settings.projectChanged()
    //   if(address != _this.settings.address){
    //     _this.logger.verbose("Project changed, address changed, therefor connecting again:")
    //     _this.connect()
    //   }
    // })

    this.settings.onChange('auto_connect',function(old_value,new_value){
      var v = new_value
      _this.logger.info("auto_connect setting changed to "+v)
      if(v && _this.view.visible){
        // _this.auto_connect.start()
      }else{
        // _this.auto_connect.stop()
        // _this.connect()
      }
    })
  }

  setEventListeners(){
    var _this = this

    this.settings.on('format_error',function(){
      // _this.terminal.writeln("JSON format error in pymakr.conf file") //TODO change to toast / error popup?
      // if(_this.pyboard.connected){
      //   _this.terminal.writePrompt()
      // }
    })

    this.view.on('term-connected',function(){
      _this.logger.info("Connected trigger from view")

      _this.first_time_start = !this.api.settingsExist()
      if(_this.first_time_start){
        _this.first_time_start = false
        _this.api.openSettings()
        // _this.commands.writeGetStartedText()
      }

      // if(_this.settings.open_on_start){
      //   _this.connect()
      // }
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


    this.auto_connect.on('autoconnect.address_added',function(com_info,name){
      _this.view.addComport(com_info)
      if(_this.auto_connect.enabled()){
        // if(!_this.pyboard.connecting){
        //   _this.logger.verbose("Autoconnect event, disconnecting and connecting again")
        _this.selectDevice(name) //TODO
        // }
      }
    })

    this.view.on('connect.device',function(device){
      _this.connect(device)
    })

    this.view.on('open.tab',function(address){

      _this.selectDevice(address) //TODO
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
    // this.terminal.setHeight(24)
    // this.view.setSnippetsContent(this.snippets.list())
  }

  close_snippets(){
    // this.terminal.resetHeight()
  }

  // refresh button display based on current status
  setButtonState(){
    // this.view.setButtonState(this.runner.busy,this.synchronizing,this.synchronize_type)
  }

  findDevice(address){
    var i = this.device_addresses.indexOf(address)
    if(i > -1){
      return this.devices[i]
    }else{
      return null
    }
  }

  createDeviceIfNotExists(address){
    var device = this.findDevice(address)
    if(!device){
      device = new Device(address,this.view,this.settings)
      this.devices.push(device)
      this.device_addresses.push(address)
    }
    return device
  }

  selectDevice(device){
    if(this.utils.isString(device)){
      device = this.findDevice(device)
    }
    if(device){
      this.selected_device = device
      device.select()
    }else{
      this.logger.warning("tried to select non existent device")
    }
  }

  connect(address,clickaction){
    var _this = this
    if(!address){
      return;
    }
    var d = this.createDeviceIfNotExists(address)
    this.selectDevice(d)
    d.connect()

  }

  disconnect(){
    if(this.selected_device){
      this.selected_device.disconnect()
    }
  }

  run(){
    if(this.selected_device){
      this.selected_device.run()
    }
  }

  runselection(cb){
    if(this.selected_device){
      this.selected_device.runselection()
    }
  }

  upload(){
    if(this.selected_device){
      this.selected_device.upload()
    }
  }

  uploadFile(){
    if(this.selected_device){
      this.selected_device.uploadCurrentFile()
    }
  }

  download(){
    if(this.selected_device){
      this.selected_device.download()
    }
  }

  stopSync(cb){
    if(this.selected_device){
      this.selected_device.stopSync()
    }
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
    if(this.selected_device){
      this.selected_device.terminal.clear()
    }

  }

  toggleVisibility(){
    this.view.visible ? this.hidePanel() : this.showPanel();
  }

  // VSCode only
  toggleConnect(){
    if(this.selected_device){
      this.selected_device.connected() ? this.disconnect() : this.connect();
    }
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
