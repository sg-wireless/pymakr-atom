'use babel';
import Config from '../config.js'
import Logger from '../helpers/logger.js'
import ApiWrapper from '../wrappers/api-wrapper.js';
import Pyboard from '../board/pyboard.js';
import SyncHelper from '../features/sync/sync-helper.js'
import Commands from '../helpers/commands.js'
import Connection from '../connections/connection.js'
import Term from '../views/terminal.js'
import Runner from '../features/run/runner.js'
import Utils from '../helpers/utils.js';

export default class Device  {

  constructor(address,view,pymakr,settings){
    this.address = address
    this.short_address = this.shorten(address)
    this.view = view
    this.terminal = null
    this.settings = settings
    this.pymakr = pymakr
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('Device')
    this.pyboard = new Pyboard(settings)
    this.status = 'disconnected'
    this.utils = new Utils(settings)
    this.createTerminal()
    this.runner = new Runner(this.pyboard,this.terminal,this)
    this.sync_helper = new SyncHelper(this,this.pyboard,this.terminal,this.settings)
    this.commands = new Commands(this,this.pyboard,this.terminal,this.settings)
    this.synchronizing = false

    this.connection_helper = new Connection(this,this.pyboard,this.settings)
    // messages from connection
    var _this = this
    this.connection_helper.setMessageCallback(function(mssg){
      if(!_this.synchronizing){
        _this.terminal.write(mssg)
      }
    })

    this.view.on('get_version',function(){
      _this.commands.getVersion()
    })

    this.view.on('get_serial',function(){
      _this.commands.getSerial()
    })

    this.view.on('get_wifi',function(){
      _this.commands.getWifiMac()
    })
    this.view.on('help',function(){
      _this.commands.writeHelpText()
    })


    this.pyboard.registerStatusListener(function(status){
      if(status == 3){ // RAW_REPL
        _this.terminal.enter()
      }
    })

    this.connection_helper.setMessageCallback(function(mssg){
      if(!_this.synchronizing){
        _this.terminal.write(mssg)
      }
    })
  }

  userInput(input){
    var _this = this
    // this.terminal.write('\r\n')
    _this.pyboard.send_user_input(input,function(err){
      if(err && err.message == 'timeout'){
        _this.logger.warning("User input timeout, disconnecting")
        _this.logger.warning(err)
        _this.disconnect()
      }
    })
  }

  shorten(address){
    var s = address.split('-')
    return s[s.length-1]
  }

  cleanAddress(){
    return $.escapeSelector(this.address)
  }

  connected(){
    return this.status == 'connected'
  }

  createTerminal(){
    var _this = this
    this.terminal_el = this.view.addConnectionTab(this.address)
    this.terminal = new Term(null,this.terminal_el,this.pyboard,null)
    this.terminal.setOnMessageListener(function(input){
      _this.userInput(input)
    })

    // 'click to connect' feature on complete terminal element
    // this.terminal_el.onclick = function(){
    //   if(!_this.pyboard.connected && !_this.pyboard.connecting) {
    //     _this.logger.verbose("Connecting because of terminal click")
    //     _this.connect()
    //   }
    // }
  }

  resizeAllTerminals(rows,height){
    var devices = this.pymakr.devices
    for(var i=0;i<devices.length;i++){
      devices[i].terminal.setHeight(rows,height)
    }
  }

  writeln(text){
    this.terminal.writeln(text)
  }

  write(text){
    this.terminal.write(text)
  }

  setTerminalSize(rows,pixels){
    this.terminal.setRows(rows,pixels)
  }

  connect(connected,disconnected){
    var _this = this
    var project = this.connection_helper.connectedInOtherWindow(this.address)
    if(project){
      this.terminal.writeln("Already connected in another window (project '"+project+"')")
      return
    }

    if(this.pyboard.connected){
      this.disconnect()
    }

    this.connection_helper.connect(function(){
      _this.setStatus('connected')
    },function(){
      _this.setStatus('disconnected')
    })
  }

  setStatus(status){
    this.status = status
    this.view.emit('device.'+this.status,this.address,this)
  }

  disconnect(cb){
    console.log("Device disconnect")
    this.connection_helper.disconnect(cb)
    this.setStatus('disconnected')
  }

  select(){
    // show terminal tab
    this.view.selectTab(this.address,this)
  }

  close(){
    console.log("Closing terminal for device "+this.address)
    // close terminal tab
    this.disconnect()
    this.view.removeConnectionTab(this.address)

  }


  run(){
    // _this.setStatus('running')
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
          // _this.setButtonState()
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
    this.sync_helper.upload()
  }

  uploadFile(){
    this.sync_helper.uploadCurrentFile()
  }

  download(){
    this.sync_helper.download()
  }

  stopSync(cb){
    this.sync_helper.stop()
  }

  execute(c,cb,timeout){
    var _this = this
    var command =
        c+"\r\n"

    this.pyboard.exec_raw(command,function(err,content){
      if(!err){
        err = _this.utils.parse_error(content)
      }
      if(err){
        _this.logger.error(err.message)
      }
      setTimeout(function(){
          cb(err,content)
      },100)

    },timeout)
  }

}
