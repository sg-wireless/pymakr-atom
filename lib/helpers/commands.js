'use babel';
import Logger from './logger.js'
import ApiWrapper from '../wrappers/api-wrapper.js';

export default class Commands  {

  constructor(device,pyboard,terminal,settings){
    this.device = device
    this.pyboard = pyboard
    this.terminal = terminal
    this.settings = settings
    this.api = new ApiWrapper(settings)
    this.logger = new Logger('commands')
  }

  getAllBoardInfo(cb){
    var info = {}
    var _this = this
    this.pyboard.stop_running_programs(function(err){
      if(err) return err
      _this.pyboard.enter_raw_repl_no_reset(function(err){
        // TODO: set to raw repl, return to friendly repl after completion
        if(err) return err
        _this.getWifiApName(function(content){
          info['wifi_ap_name'] = content
          _this.getMac(function(content){
            info['mac'] = content
            _this.getFreeMemory(function(content){
              info['free_memory'] = content
              _this.getFreeRam(function(content){
                info['free_ram'] = content
                _this.getVersion(function(content){
                  info['version'] = content
                  _this.getPartition(function(content){
                    info['partition'] = content
                    _this.getFSType(function(content){
                      info['fs_type'] = content
                      _this.getWifiIP(function(content){
                        info['wifi_ip'] = content
                        _this.getWifiMode(function(content){
                          info['wifi_mode'] = content
                          _this.getPartition(function(content){
                            info['partition'] = content
                            _this.getBoardType(function(content){
                              info['board_type'] = content
                              _this.getWifiOnBoot(function(content){
                                info['wifi_on_boot'] = content
                                _this.getHeartbeatOnBoot(function(content){
                                  info['heartbeat_on_boot'] = content
                                  _this.pyboard.enter_friendly_repl(function(err){
                                    cb(info)
                                  })
                                })
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  }

  getWifiApName(cb){
    var command = "from network import WLAN; from binascii import hexlify; from os import uname; wlan = WLAN(); mac = hexlify(wlan.mac().ap_mac).decode('ascii'); device = uname().sysname;print('%(device)s-wlan-%(mac)s' % {'device': device, 'mac': mac[len(mac)-4:len(mac)]})"
    this.getCommand(command,cb)
  }

  getBoardType(cb){
    var command = "import os; print(os.uname().sysname)\r\n"
    this.getCommand(command,cb)
  }

  getMac(cb){
    var command = "import machine; from network import WLAN; from binascii import hexlify; print(hexlify(machine.unique_id()).decode('ascii'))"
    this.getCommand(command,cb)
  }

  getFreeMemory(cb){
    var command = "import os; print(os.getfree('/flash'))"
    this.getCommand(command,function(content){
      content = content + "kb"
      cb(content)
    })
  }

  getFreeRam(cb){
    var command = "import gc; print(gc.mem_free())"
    this.getCommand(command,function(content){
      content = content + "b"
      cb(content)
    })
  }

  getVersion(cb){
    var command = "import os; print(os.uname().release)\r\n"
    this.getCommand(command,cb)
  }

  getPartition(cb){
    var command = "import pycom; print(pycom.bootmgr()[0])\r\n"
    this.getCommand(command,cb)
  }

  getFSType(cb){
    var command = "import pycom; print(pycom.bootmgr()[1])\r\n"
    this.getCommand(command,cb)
  }

  getWifiIP(cb){
    var command = "import network; w = network.WLAN(); print(w.ifconfig()[0])\r\n"
    this.getCommand(command,cb)
  }

  getWifiMode(cb){
    var modes = {"1":"Station","2":"AccessPoint", "3":"Station-AccessPoint"}
    var command = "import network; w = network.WLAN(); print(w.mode())\r\n"
    this.getCommand(command,function(content){
      content = parseInt(content)
      if(content in modes){
        content = modes[content]
      }
      cb(content)
    })
  }

  getWifiOnBoot(cb){
    var command = "import pycom; print(pycom.wifi_on_boot())\r\n"
    this.getCommand(command,cb)
  }

  getHeartbeatOnBoot(cb){
    var command = "import pycom; print(pycom.heartbeat_on_boot())\r\n"
    this.getCommand(command,cb)
  }

  getCommand(command,cb){
    var _this = this
    if(!this.pyboard.connected){
      return new Error("Please connect to your device")
    }
    this.pyboard.exec_(command,function(err,content){
      if(err){
        _this.logger.error("Failed to send command: "+command)
      }
      cb(content.replace('OK','').replace('>','').replace('\n','').replace('\r','').trim())
    })
  }

  writeHelpText(){
    var lines = []

    this.terminal.enter()
    this.terminal.write(this.config.help_text)

    if(this.pyboard.connected){
      this.logger.verbose("Write prompt")
      this.terminal.writePrompt()
    }
  }


  // VSCode only
  writeGetStartedText(){
    var _this = this
    this.terminal.enter()
    this.terminal.write(this.config.start_text)

    Pyserial.list(this.settings,function(list){
      if(list.length > 0){
        _this.terminal.writeln("Here are the devices you've connected to the serial port at the moment:")
        _this.getSerial()
      }else if(this.pyboard.connected){
        this.terminal.writeln()
        this.terminal.writePrompt()
      }
    })
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



}
