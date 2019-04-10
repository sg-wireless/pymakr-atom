'use babel';
import Config from '../config.js'
import Logger from '../helpers/logger.js'
import PySerial from './pyserial';
var EventEmitter = require('events');

export default class AutoConnect extends EventEmitter  {

  constructor(pymakr,terminal,settings){
    super()
    this.terminal = terminal
    this.pymakr = pymakr
    this.settings = settings
    this.logger = new Logger('ConnectionHelper')
    this.autoconnect_timer = null
    this.autoconnect_address = undefined
    this.connection_timer = null
    this.addresses = []
    this.address_names = []
    this.ip_addresses = []
    this.ip_address_names = []
  }

  findAddresses(cb){
    this.refreshPycomBoards(function(){
      cb(addresses,address_names)
    })
    // if(this.autoconnect_timer){
    //   if(this.autoconnect_address){
    //     return cb(this.autoconnect_address)
    //   }else{
    //     return this.getAddresses(cb)
    //   }
    // }else{
    //   return cb(null)
    // }
  }

  enabled(){
    return this.settings.auto_connect
  }

  start(cb,wait){
    var _this = this
    this.stop()
    if(!wait){
      this.refreshPycomBoards()
    }

    this.refreshIpAddresses()

    this.settings.onChange('address',function(){
      _this.refreshIpAddresses()
    })

    this.autoconnect_timer = setInterval(function(){
      _this.refreshPycomBoards()
    },2500)
  }


  stop(){
    if(this.autoconnect_timer){
      // this.logger.info("Stop autoconnect")
      clearInterval(this.autoconnect_timer)
      previous = this.autoconnect_address
      this.autoconnect_address = undefined
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

  // getAddresses(cb){
  //   var _this = this
  //   // _this.logger.silly("Autoconnect interval")
  //   // if(this.settings.auto_connect){
  //     // _this.logger.silly("Autoconnect enabled")
  //   this.refreshPycomBoards(function(name,manu,list){
  //     var current_address = _this.pyboard.address
  //     if(name){
  //       var text = name + " (" + manu+ ")"
  //       if(!_this.pyboard.connected){
  //         cb(name)
  //       }else{
  //         if(name != _this.pyboard.address){
  //           if(list.indexOf(current_address) > -1 || !_this.pyboard.isSerial){
  //             cb(name)
  //           }else{
  //             // _this.logger.silly("already connected to a different board, or connected over telnet")
  //             cb(null)
  //           }
  //         }else{
  //           // _this.logger.silly("already connected to the correct board")
  //           cb(name)
  //         }
  //       }
  //     }else{
  //       cb(null)
  //       // _this.logger.silly("No Pycom boards found")
  //     }
  //   })
  //   // }
  // }


  refreshIpAddresses(cb){
    var _this = this
    for(var i=0;i<this.settings.address.length;i++){
      var a = this.settings.address[i]
      if(this.ip_addresses.indexOf(a) == -1){
        this.emit('ip.added',a)
        this.addIpAddress(a)
      }
    }
    for(var j=0;j<this.ip_addresses.length;j++){
      var ip = this.ip_addresses[j]
      if(this.settings.address.indexOf(ip) == -1){
        this.removeIpAddress(ip)
        j-=1;
      }
    }
  }

  refreshPycomBoards(cb){
    var _this = this
    PySerial.listPycom(this.settings,function(list,manufacturers){
      for(var i=0;i<list.length;i++){
        var name = list[i]
        var m = manufacturers[i]
        if(_this.address_names.indexOf(name) == -1){
          _this.addToAddresses(name,m)
        }
      }
      for(var i=0;i<_this.addresses.length;i++){
        if(list.indexOf(_this.addresses[i].name) == -1){
          _this.removeAddress(_this.addresses[i].name,i)
        }
      }
      if(cb){
        cb(_this.addresses,_this.address_names)
      }
    })
  }

  addIpAddress(ip){
    this.ip_addresses.push(ip)
    this.emit('autoconnect.ip_added',ip)
  }

  removeIpAddress(ip){
    var i = this.ip_addresses.indexOf(ip)
    if(i > -1){
      this.ip_addresses.splice(i,1)
      this.emit('autoconnect.ip_removed',ip)
    }
  }

  addToAddresses(name,manu){
    var title = name + " (" + manu+ ")"
    var com_info = {name: name, manu: manu, title: title}
    this.addresses.push(com_info)
    this.address_names.push(name)
    this.emit('autoconnect.address_added',com_info,name)
  }

  removeAddress(name,i){
    this.addresses.splice(i,1)
    this.address_names.splice(i,1)
    this.emit('autoconnect.address_removed',name)
  }

}
