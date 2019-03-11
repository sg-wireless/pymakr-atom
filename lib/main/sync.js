'use babel';
import Logger from '../helpers/logger.js'
import ApiWrapper from '../main/api-wrapper.js';
var EventEmitter = require('events');

export default class SyncHelper extends EventEmitter  {

  constructor(pymakr,pyboard,terminal,settings){
    this.pymakr = pymakr
    this.pyboard = pyboard
    this.terminal = terminal
    this.settings = settings
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('SyncHelper')
  }

  uploadCurrentFile(){
    var _this = this
    this.api.getOpenFile(function(contents,path){
      if(!path){
        _this.api.warning("No file open to upload")
      }else{
        console.log("Uploading single file")
        _this.logger.info(path)

        _this.sync('send',path)
      }
    })
  }

  upload(){
    this.sync('send')
  }

  download(){
    this.sync('receive')
  }

  sync(type,files){
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
      this.synchronize_type = type
      this.setButtonState()
      var cb = function(err){
        _this.synchronizing = false
        _this.logger.info("Synchronizing disabled, now setting buttons")
        _this.setButtonState()
        if(_this.pyboard.type != 'serial'){
          _this.terminal.writeln("Waiting for reboot...")
          setTimeout(function(){
              _this.connect()
          },4000)
        }
      }
      if(type == 'receive'){
        this.syncObj.start_receive(cb)
      }else{
        this.syncObj.start(cb,files)
      }
    }
  }

  stopSync(cb){
    var _this = this
    if(this.synchronizing){
      this.syncObj.stop(function(){
        _this.synchronizing = false
        cb()
      })
      var type = this.synchronize_type == 'receive' ? 'download' : 'upload'
      this.terminal.writeln("Stopping "+type+"....")
    }
  }
}
