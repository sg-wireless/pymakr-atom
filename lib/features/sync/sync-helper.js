'use babel';
import Logger from '../../helpers/logger.js'
import ApiWrapper from '../../wrappers/api-wrapper.js';
import Sync from './sync.js'

export default class SyncHelper  {

  constructor(pymakr,pyboard,terminal,settings){
    this.pymakr = pymakr
    this.pyboard = pyboard
    this.terminal = terminal
    this.settings = settings
    this.synchronizing = false
    this.synchronize_type = ""
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('SyncHelper')
    this.sync_worker = null
  }

  uploadCurrentFile(){
    var _this = this
    this.api.getOpenFile(function(contents,path){
      if(!path){
        _this.api.warning("No file open to upload")
      }else{
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
      this.sync_worker = new Sync(this.pyboard,this.settings,this.terminal)
      this.synchronizing = true
      this.synchronize_type = type
      this.pymakr.setButtonState()
      var cb = function(err){
        _this.synchronizing = false
        _this.logger.info("Synchronizing disabled, now setting buttons")
        _this.pymakr.setButtonState()
        if(_this.pyboard.type != 'serial'){
          _this.terminal.writeln("Waiting for reboot...")
          setTimeout(function(){
              _this.connect()
          },4000)
        }
      }
      if(type == 'receive'){
        this.sync_worker.start_receive(cb)
      }else{
        this.sync_worker.start(cb,files)
      }
    }
  }

  stop(cb){
    var _this = this
    if(this.synchronizing){
      this.sync_worker.stop(function(){
        _this.synchronizing = false
        cb()
      })
      var type = this.synchronize_type == 'receive' ? 'download' : 'upload'
      this.terminal.writeln("Stopping "+type+"....")
    }
  }

  stopSilent(){
    this.sync_helper.stopSilent()
  }
}
