'use babel';
import Config from '../config.js'
import Logger from '../helpers/logger.js'
import Utils from '../helpers/utils.js'
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
    this.initial_scan = true
    this.utils = new Utils(settings)
  }

  getAllAddressNames(){
    console.log(this.address_names)
    console.log(this.ip_address_names)
    return this.address_names.concat(this.ip_address_names)
  }

  getAllAddresses(){
    return this.addresses.concat(this.ip_addresses)
  }

  findAddresses(cb){
    this.refreshPycomBoards(function(){
      cb(addresses,address_names)
    })
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
      if(cb){
        cb(emitted_addr)
      }
      _this.autoconnect_address = address
    })
  }

  refreshIpAddresses(cb){
    var _this = this
    for(var i=0;i<this.settings.address.length;i++){
      var a = this.settings.address[i]
      if(this.ip_addresses.indexOf(a) == -1){
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
    var address_start_count = this.address_names.length
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

      if(list.length == 0 && (address_start_count > 0 || _this.initial_scan)){
        _this.emit("autoconnect.no_addresses")
      }
      if(!_this.initial_scan){
        _this.initial_scan = true
      }
      if(cb){
        cb(_this.addresses,_this.address_names)
      }
    })
  }

  addIpAddress(ip){
    this.ip_addresses.push(ip)
    this.ip_address_names.push(ip)
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
    var short_name = this.utils.shortenComport(name)
    var com_info = {name: name, manu: manu, title: title, short_name: short_name}
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
