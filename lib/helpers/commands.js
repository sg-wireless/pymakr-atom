'use babel';

import Logger from './logger.js';
import ApiWrapper from '../wrappers/api-wrapper.js';

const pretty = require('prettysize');

export default class Commands {
  constructor(device, pyboard, terminal, settings) {
    this.device = device;
    this.pyboard = pyboard;
    this.terminal = terminal;
    this.settings = settings;
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('commands');
  }

  prepare(cb) {
    const _this = this;
    this.pyboard.stop_running_programs((err) => {
      if (err) return err;
      _this.pyboard.enter_raw_repl_no_reset((err) => {
        cb(err);
      });
    });
  }

  exit(cb) {
    const _this = this;
    _this.pyboard.enter_friendly_repl((err) => {
      cb(err);
    });
  }

  getAllBoardInfo(cb) {
    const info = {};
    const _this = this;
    this.prepare((err) => {
      if (err) return err;
      _this.getWifiApName((content) => {
        info.wifi_ap_name = content;
        _this.getMac((content) => {
          info.mac = content;
          _this.getFreeMemory((content) => {
            info.free_memory = content;
            _this.getFreeRam((content) => {
              info.free_ram = content;
              _this.getVersion((content) => {
                info.version = content;
                _this.getPartition((content) => {
                  info.partition = content;
                  _this.getFSType((content) => {
                    info.fs_type = content;
                    _this.getWifiIP((content) => {
                      info.wifi_ip = content;
                      _this.getWifiMode((content) => {
                        info['wifi_mode'] = content
                        _this.getPartition(function(content){
                          info['partition'] = content
                          _this.getBoardType(function(content){
                            info['board_type'] = content
                            _this.getLoRaMac(function(content){
                              info['lora_mac'] = content
                              _this.getLTEImei(function(content){
                                info['lte_imei'] = content
                                _this.getWifiOnBoot(function(content){
                                  info['wifi_on_boot'] = content
                                  _this.getHeartbeatOnBoot(function(content){
                                    info['heartbeat_on_boot'] = content
                                    _this.exit(function(err){
                                      cb(info)
                                    })
                                  })
                                })
                              })
                            })
                          })
                        })
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  getWifiApName(cb) {
    const command = "from network import WLAN; from binascii import hexlify; from os import uname; wlan = WLAN(); mac = hexlify(wlan.mac().ap_mac).decode('ascii'); device = uname().sysname;print('%(device)s-wlan-%(mac)s' % {'device': device, 'mac': mac[len(mac)-4:len(mac)]})";
    this.getCommand(command, cb);
  }

  getBoardType(cb) {
    const command = 'import os; print(os.uname().sysname)\r\n';
    this.getCommand(command, cb);
  }

  getMac(cb) {
    const command = "import machine; from network import WLAN; from binascii import hexlify; print(hexlify(machine.unique_id()).decode('ascii'))";
    this.getCommand(command, cb);
  }

  getLoRaMac(cb) {
    const command = "import machine; from network import LoRa; l = LoRa(); print(hexlify(l.mac()).decode('ascii'))";
    this.getCommand(command, cb);
  }

  getLTEImei(cb) {
    const command = "from network import LTE; lte = LTE(); print(lte.send_at_cmd('AT+CGSN=1'))";
    this.getCommand(command, (content) => {
      let imei = command.split('"')[1];
      if (!imei) {
        imei = 'Not available';
      }
      cb(imei);
    });
  }

  getFreeMemory(cb) {
    const total_memory = 1024 * 1024 * 4;
    const command = "import os; print(os.getfree('/flash'))";
    this.getCommand(command, (content) => {
      const available = parseInt(content) * 1000;
      const used = total_memory - available;
      content = `${pretty(used)} / ${pretty(total_memory)} used`;
      cb(content);
    });
  }

  formatFlash(cb) {
    const command = "import os; os.fsformat('/flash')";
    this.getCommand(command, (content) => {
      cb(content);
    });
  }

  reset(cb) {
    const _this = this;
    const command = 'import machine; machine.reset()';
    this.getCommand(command, (content) => {
      cb();
    }, false);
    _this.device.pyboard.setStatus(2);
    _this.device.pyboard.stopWaitingForSilent();
  }

  getFreeRam(cb) {
    const total_memory = 1024 * 1024 * 4;
    const command = 'import gc; print(gc.mem_free())';
    this.getCommand(command, (content) => {
      const available = parseInt(content);
      const used = total_memory - available;
      content = `${pretty(used)} / ${pretty(total_memory)} used`;
      cb(content);
    });
  }

  gcCollect(cb) {
    const _this = this;
    const command = 'import gc; print(gc.collect())';
    this.getCommand(command, (content) => {
      _this.getFreeRam(cb);
    });
  }

  getVersion(cb) {
    const command = 'import os; print(os.uname().release)\r\n';
    this.getCommand(command, cb);
  }

  getPartition(cb) {
    const command = 'import pycom; print(pycom.bootmgr()[0])\r\n';
    this.getCommand(command, cb);
  }

  getFSType(cb) {
    const command = 'import pycom; print(pycom.bootmgr()[1])\r\n';
    this.getCommand(command, cb);
  }


  setFSType(type, cb) {
    const command = `import pycom; print(pycom.bootmgr(fs_type=pycom.${type})[1])\r\n`;
    this.getCommand(command, cb);
  }


  getWifiIP(cb) {
    const command = 'import network; w = network.WLAN(); print(w.ifconfig()[0])\r\n';
    this.getCommand(command, cb);
  }

  getWifiMode(cb) {
    const modes = { 1: 'Station', 2: 'AccessPoint', 3: 'Station-AccessPoint' };
    const command = 'import network; w = network.WLAN(); print(w.mode())\r\n';
    this.getCommand(command, (content) => {
      content = parseInt(content);
      if (content in modes) {
        content = modes[content];
      }
      cb(content);
    });
  }

  getWifiOnBoot(cb) {
    const command = 'import pycom; print(pycom.wifi_on_boot())\r\n';
    this.getCommand(command, cb);
  }

  setWifiOnBoot(value, cb) {
    value = value.toString();
    const value_capital = value.charAt(0).toUpperCase() + value.slice(1);
    const command = `import pycom; print(pycom.wifi_on_boot(${value_capital}))\r\n`;
    this.getCommand(command, cb);
  }

  getHeartbeatOnBoot(cb) {
    const command = 'import pycom; print(pycom.heartbeat_on_boot())\r\n';
    this.getCommand(command, cb);
  }

  setHeartbeatOnBoot(value, cb) {
    value = value.toString();
    const value_capital = value.charAt(0).toUpperCase() + value.slice(1);
    const command = `import pycom; print(pycom.heartbeat_on_boot(${value_capital}))\r\n`;
    this.getCommand(command, cb);
  }

  getCommand(command, cb, wait) {
    if (!wait) {
      wait = true;
    }
    const _this = this;
    if (!this.pyboard.connected) {
      return new Error('Please connect to your device');
    }
    const after_exec = function (err, content) {
      if (err) {
        _this.logger.error(`Failed to send command: ${command}`);
        _this.logger.error(err);
      }
      if (content.indexOf('Traceback') > -1) {
        content = 'Failed to execute command';
      }
      cb(content.replace('OK', '').replace('>', '').replace('\n', '').replace('\r', '')
        .trim());
    };

    if (wait) {
      this.pyboard.exec_(command, after_exec);
    } else {
      this.pyboard.exec_raw_no_reset(command, after_exec);
    }
  }

  writeHelpText() {
    const lines = [];

    this.terminal.enter();
    this.terminal.write(this.config.help_text);

    if (this.pyboard.connected) {
      this.logger.verbose('Write prompt');
      this.terminal.writePrompt();
    }
  }


  // VSCode only
  writeGetStartedText() {
    const _this = this;
    this.terminal.enter();
    this.terminal.write(this.config.start_text);

    Pyserial.list(this.settings, function (list) {
      if (list.length > 0) {
        _this.terminal.writeln("Here are the devices you've connected to the serial port at the moment:");
        _this.getSerial();
      } else if (this.pyboard.connected) {
        this.terminal.writeln();
        this.terminal.writePrompt();
      }
    });
  }

  getSerial() {
    const _this = this;
    this.terminal.enter();

    PySerial.list(this.settings, (list, manufacturers) => {
      _this.terminal.writeln(`Found ${list.length} serialport${list.length == 1 ? '' : 's'}`);
      for (let i = 0; i < list.length; i++) {
        const name = list[i];
        let text = `${name} (${manufacturers[i]})`;
        if (i == 0) {
          _this.api.writeToCipboard(name);
          text += ' (copied to clipboard)';
        }
        _this.terminal.writeln(text);
      }
    });
  }
}