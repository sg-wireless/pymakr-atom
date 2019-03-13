'use babel';
import Config from '../config.js'
import Logger from '../helpers/logger.js'
import ApiWrapper from '../main/api-wrapper.js';

export default class Connection  {

  constructor(pymakr,pyboard,terminal,settings){
    this.pymakr = pymakr
    this.pyboard = pyboard
    this.terminal = terminal
    this.settings = settings
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('ConnectionHelper')
    this.message_callback = null
    this.connection_timer = null
  }

  setMessageCallback(cb){
    this.message_callback = cb
  }

  connectedInOtherWindow(address){
    var state = this.api.getConnectionState(address)
    var ts = new Date().getTime()
    if(state && state['project'] != this.pymakr.view.project_name && state['timestamp'] > ts-11000){
      return state['project']
    }
  }

  connect(address){
    var _this = this

    this.terminal.writeln("Connecting to "+address+"...");

    this.logger.info("Connecting...")
    this.logger.info(address)

    this.pyboard.refreshConfig(function(){

      var onconnect = function(err){
        if(err){
          _this.terminal.writeln("Connection error: "+err)
        }else{
          _this.api.setConnectionState(address,true,_this.view.project_name)
          _this.connection_timer = setInterval(function(){
            if(_this.pyboard.connected){
              _this.api.setConnectionState(address,true,_this.view.project_name)
            }else{
              clearTimeout(_this.connection_timer)
            }
          },10000)
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
          if(_this.pymakr.synchronizing){
            _this.terminal.writeln("An error occurred: "+message)
            _this.logger.warning("Synchronizing, stopping sync")
            _this.pymakr.sync_helper.stopSilent()
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
        _this.message_callback(mssg)
      }

      _this.pyboard.connect(address,onconnect,onerror, ontimeout, onmessage)

    })
  }

  disconnect(cb){
    var _this = this
    this.logger.info("Disconnecting...")
    if(this.pyboard.isConnecting()){
        this.terminal.writeln("Connection attempt canceled")
    }

    var continue_disconnect = function(){
      clearInterval(this.connection_timer)
      _this.api.setConnectionState(_this.pyboard.address,false)
      _this.pyboard.disconnect(function(){
        if(cb) cb()
      })
      _this.pymakr.synchronizing = false
      _this.setButtonState()
    }

    if(this.pymakr.synchronizing){
      this.pymakr.sync_helper.stop(function(){
        this.pymakr.synchronizing = false
        continue_disconnect()
      })
    }else{
      continue_disconnect()
    }
  }
