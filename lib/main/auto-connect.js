'use babel';
import Config from '../config.js'
import Logger from '../helpers/logger.js'
var EventEmitter = require('events');

export default class AutoConnect extends EventEmitter  {

  constructor(pymakr,pyboard,terminal,settings){
    super()
    this.pyboard = pyboard
    this.terminal = terminal
    this.settings = settings
    this.logger = new Logger('ConnectionHelper')
    this.autoconnect_timer = null
    this.autoconnect_address = undefined
    this.connection_timer = null
  }

  findAddress(cb){
    if(this.autoconnect_timer){
      if(this.autoconnect_address){
        return cb(this.autoconnect_address)
      }else{
        return this.getAddress(cb)
      }
    }else{
      return cb(null)
    }
  }

  enabled(){
    return this.settings.auto_connect
  }

  start(cb,wait){
    if(this.view.visible){
      var _this = this
      // this.logger.info("Starting autoconnect interval...")
      this.stop()
      this.terminal.writeln("AutoConnect enabled, ignoring 'address' setting (see Global Settings)")
      this.terminal.writeln("Searching for PyCom boards on serial...")
      if(!wait){
        this.setAddress(cb)
      }
      this.autoconnect_timer = setInterval(function(){
        _this.setAddress()
      },2500)
    }else{
      cb(null)
    }
  }

  stop(){
    var previous = this.pyboard.address
    if(this.autoconnect_timer){
      // this.logger.info("Stop autoconnect")
      clearInterval(this.autoconnect_timer)
      previous = this.autoconnect_address
      this.autoconnect_address = undefined
    }
    if(previous != this.settings.address && (this.pyboard.connected || this.pyboard.connecting)){
      this.logger.info("Disconnecting from previous autoconnect address")
      this.pymakr.disconnect()
    }
  }

  setAddress(cb){
    var _this = this
    var emitted_addr = null
    var failed = false
    this.getAddress(function(address){
      _this.logger.silly("Found address: "+address)
      if(_this.autoconnect_address === undefined && !address){ // undefined means first time use
        _this.terminal.writeln("No PyCom boards found on USB")
        failed = true
        // emitted_addr = _this.settings.address
      }else if(address && address != _this.autoconnect_address){
        _this.logger.silly("Found a PyCom board on USB: "+address)
        emitted_addr = address
        _this.emit('auto_connect',address)
      }else if(_this.autoconnect_address && !address){
        _this.autoconnect_address = null
        _this.disconnect()
        _this.terminal.writeln("Previous board is not available anymore")
        _this.logger.silly("Previous board is not available anymore")
        failed = true
      }else if(!address){
        _this.logger.silly("No address found")
      }else{
        _this.logger.silly("Ignoring address "+address+" for now")
      }

      // if(failed){
      //   _this.terminal.writeln("Trying configured address "+_this.settings.address)
      //   _this.emit('auto_connect',_this.settings.address)
      //   emitted_addr = _this.settings.address
      // }
      if(cb){
        cb(emitted_addr)
      }
      _this.autoconnect_address = address
    })
  }

  getAddress(cb){
    var _this = this
    // _this.logger.silly("Autoconnect interval")
    if(this.settings.auto_connect){
      // _this.logger.silly("Autoconnect enabled")
      this.getPycomBoard(function(name,manu,list){
        var current_address = _this.pyboard.address
        if(name){
          var text = name + " (" + manu+ ")"
          if(!_this.pyboard.connected){
            cb(name)
          }else{
            if(name != _this.pyboard.address){
              if(list.indexOf(current_address) > -1 || !_this.pyboard.isSerial){
                cb(name)
              }else{
                // _this.logger.silly("already connected to a different board, or connected over telnet")
                cb(null)
              }
            }else{
              // _this.logger.silly("already connected to the correct board")
              cb(name)
            }
          }
        }else{
          cb(null)
          // _this.logger.silly("No Pycom boards found")
        }
      })
    }
  }
}
