'use babel';

import Pyserial from '../connections/pyserial';
import Logger from './logger';
import ApiWrapper from '../wrappers/api-wrapper';
import Config from '../config';

const pretty = require('prettysize');

export default class Commands {
  constructor(device, pyboard, terminal, settings) {
    this.device = device;
    this.pyboard = pyboard;
    this.terminal = terminal;
    this.settings = settings;
    this.config = Config.constants();
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('commands');
  }

  prepare(cb) {
    const _this = this;
    this.pyboard.stopRunningPrograms(err => {
      if (err) return err;
      return _this.pyboard.enterRawReplNoReset(err2 => {
        cb(err2);
      });
    });
  }

  async prepareAsync() {
    return new Promise((resolve, reject) => {
      this.prepare(err => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  async exit(cb) {
    const _this = this;
    _this.pyboard.enterFriendlyRepl(err => {
      cb(err);
    });
  }

  async showHelp() {
    const command = 'help()';
    this.terminal.writelnAndPrompt(command);
    // this.terminal.enter();

    return true;

    // return this.getCommandAsyncretu(command);
  }

  async exitAsync() {
    return new Promise((resolve, reject) => {
      this.pyboard.enterFriendlyRepl(err => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  async getAllBoardInfo() {
    const info = {};
    const _this = this;
    try {
      await this.prepareAsync();
    } catch (e) {
      return e;
    }

    const getWifiApNamePromise = async () => {
      info.wifiApName = await _this.getWifiApName();
    };
    const getMacPromise = async () => {
      info.mac = await _this.getMac();
    };
    const getFreeMemoryPromise = async () => {
      info.freeMemory = await _this.getFreeMemory();
    };
    const getFreeRamPromise = async () => {
      info.freeRam = await _this.getFreeRam();
    };
    const getVersionPromise = async () => {
      info.version = await _this.getVersion();
    };
    const getPartitionPromise = async () => {
      info.partition = await _this.getPartition();
    };
    const getFSTypePromise = async () => {
      info.fsType = await _this.getFSType();
    };
    const getWifiIPPromise = async () => {
      info.wifiIP = await _this.getWifiIP();
    };
    const getWifiModePromise = async () => {
      info.wifiMode = await _this.getWifiMode();
    };
    const getBoardTypePromise = async () => {
      info.boardType = await _this.getBoardType();
    };
    const getLoRaMacPromise = async () => {
      info.loraMac = await _this.getLoRaMac();
    };
    const getLTEImeiPromise = async () => {
      info.lteImei = await _this.getLTEImei();
    };
    const getWifiOnBootPromise = async () => {
      info.wifiOnBoot = await _this.getWifiOnBoot();
    };
    const getHeartBeatOnBootPromise = async () => {
      info.heartBeatOnBoot = await _this.getHeartbeatOnBoot();
    };

    await Promise.all([
      await getWifiApNamePromise(),
      await getMacPromise(),
      await getFreeMemoryPromise(),
      await getFreeRamPromise(),
      await getVersionPromise(),
      await getPartitionPromise(),
      await getFSTypePromise(),
      await getWifiIPPromise(),
      await getWifiModePromise(),
      await getBoardTypePromise(),
      await getLoRaMacPromise(),
      await getLTEImeiPromise(),
      await getWifiOnBootPromise(),
      await getHeartBeatOnBootPromise(),
    ]);

    await this.exitAsync();
    this.terminal.enter();
    this.terminal.write('>>> ');
    return info;
  }

  async getWifiApName() {
    const command =
      "from network import WLAN; from binascii import hexlify; from os import uname; wlan = WLAN(); mac = hexlify(wlan.mac().ap_mac).decode('ascii'); device = uname().sysname;print('%(device)s-wlan-%(mac)s' % {'device': device, 'mac': mac[len(mac)-4:len(mac)]})";
    return this.getCommandAsync(command);
  }

  async getBoardType() {
    const command = 'import os; print(os.uname().sysname)\r\n';
    return this.getCommandAsync(command);
  }

  async getMac() {
    const command =
      "import machine; from network import WLAN; from binascii import hexlify; print(hexlify(machine.unique_id()).decode('ascii'))";
    return this.getCommandAsync(command);
  }

  async getLoRaMac() {
    const command =
      "import machine;import binascii as bs; from network import LoRa; l = LoRa(); print(bs.hexlify(l.mac()).decode('ascii'));";
    return this.getCommandAsync(command);
  }

  async getLTEImei() {
    const command =
      "from network import LTE; lte = LTE(); print(lte.send_at_cmd('AT+CGSN=1'))";
    let imei = await this.getCommandAsync(command);
    if (!imei) {
      imei = 'Not available';
    }
    return imei.split('"')[1];
  }

  async getFreeMemory() {
    const totalMemory = 1024 * 1024 * 4;
    const command = "import os; print(os.getfree('/flash'))";
    let content = await this.getCommandAsync(command);
    const available = parseInt(content) * 1000;
    const used = totalMemory - available;
    content = `${pretty(used)} / ${pretty(totalMemory)} used`;
    return content;
  }

  async formatFlash() {
    const _this = this;
    this.terminal.writeln('Formating flash storage...');
    const command = "import os; os.fsformat('/flash');";
    this.busy = true;
    this.pyboard.run(
      command,
      () => {
        _this.busy = false;
      },
      err => {
        _this.terminal.writelnAndPrompt(err);
      },
    );
  }

  async reset() {
    const _this = this;
    this.terminal.writeln('Rebooting...');
    const command = 'import machine; machine.reset()';
    this.busy = true;
    this.pyboard.run(
      command,
      () => {
        _this.busy = false;
      },
      err => {
        _this.terminal.writelnAndPrompt(err);
      },
    );
  }

  async getFreeRam() {
    const totalMemory = 1024 * 1024 * 4;
    const command = 'import gc; print(gc.mem_free())';
    let content = await this.getCommandAsync(command);
    const available = parseInt(content);
    const used = totalMemory - available;
    content = `${pretty(used)} / ${pretty(totalMemory)} used`;
    return content;
  }

  async gcCollect() {
    const _this = this;
    const command = 'import gc; print(gc.collect())';
    await this.getCommandAsync(command);
    return _this.getFreeRam();
  }

  async getVersion() {
    const command = 'import os; print(os.uname().release)\r\n';
    return this.getCommandAsync(command);
  }

  async getPartition() {
    const command = 'import pycom; print(pycom.bootmgr()[0])\r\n';
    return this.getCommandAsync(command);
  }

  async getFSType() {
    const command = 'import pycom; print(pycom.bootmgr()[1])\r\n';
    return this.getCommandAsync(command);
  }

  setFSType(type) {
    const command = `import pycom; print(pycom.bootmgr(fsType=pycom.${type})[1])\r\n`;
    return this.getCommandAsync(command);
  }

  async getWifiIP() {
    const command =
      'import network; w = network.WLAN(); print(w.ifconfig()[0])\r\n';
    return this.getCommandAsync(command);
  }

  async getWifiMode() {
    const modes = {
      1: 'Station',
      2: 'AccessPoint',
      3: 'Station-AccessPoint',
    };
    const command =
      'import network; w = network.WLAN(); print(w.mode())\r\n';
    let content = await this.getCommandAsync(command);
    content = parseInt(content);
    if (content in modes) {
      content = modes[content];
    }
    return content;
  }

  async getWifiOnBoot() {
    const command = 'import pycom; print(pycom.wifi_on_boot())\r\n';
    return this.getCommandAsync(command);
  }

  setWifiOnBoot(value) {
    const valueStr = value.toString();
    const valueCapital =
      valueStr.charAt(0).toUpperCase() + valueStr.slice(1);
    const command = `import pycom; print(pycom.wifi_on_boot(${valueCapital}))\r\n`;
    return this.getCommandAsync(command);
  }

  async getHeartbeatOnBoot() {
    const command =
      'import pycom; print(pycom.heartbeat_on_boot())\r\n';
    return this.getCommandAsync(command);
  }

  setHeartbeatOnBoot(value) {
    const valueStr = value.toString();
    const valueCapital =
      valueStr.charAt(0).toUpperCase() + valueStr.slice(1);
    const command = `import pycom; print(pycom.heart_beat_on_boot(${valueCapital}))\r\n`;
    return this.getCommandAsync(command);
  }

  getCommand(command, wait, cb) {
    let finalWait = wait;
    if (!finalWait) {
      finalWait = true;
    }
    const _this = this;
    if (!this.pyboard.connected) {
      return new Error('Please connect to your device');
    }
    const afterExec = (err, content) => {
      let finalContent = content;
      if (err) {
        _this.logger.error(`Failed to send command: ${command}`);
        _this.logger.error(err);
      }
      if (finalContent.indexOf('Traceback') > -1) {
        finalContent = 'Failed to execute command';
      }
      cb(
        finalContent
          .replace('OK', '')
          .replace('>', '')
          .replace('\n', '')
          .replace('\r', '')
          .trim(),
      );
    };

    if (finalWait) {
      this.pyboard.exec_(command, afterExec);
    } else {
      this.pyboard.execRawNoReset(command, afterExec);
    }
    return true;
  }

  async getCommandAsync(command) {
    return new Promise((resolve, reject) => {
      const _this = this;
      if (!this.pyboard.connected) {
        return new Error('Please connect to your device');
      }

      return this.pyboard.exec_(command, (err, content) => {
        let finalContent = content;
        if (err) {
          _this.logger.error(`Failed to send command: ${command}`);
          _this.logger.error(err);
          return reject(err);
        }
        if (finalContent.indexOf('Traceback') > -1) {
          finalContent = 'Failed to execute command';
        }
        finalContent = finalContent
          .replace('OK', '')
          .replace('>', '')
          .replace('\n', '')
          .replace('\r', '')
          .trim();
        return resolve(finalContent);
      });
    });
  }

  writeHelpText() {
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

    Pyserial.list(this.settings, list => {
      if (list.length > 0) {
        _this.terminal.writeln(
          "Here are the devices you've connected to the serial port at the moment:",
        );
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

    Pyserial.list(this.settings, (list, manufacturers) => {
      _this.terminal.writeln(
        `Found ${list.length} serialport${
          list.length === 1 ? '' : 's'
        }`,
      );
      for (let i = 0; i < list.length; i += 1) {
        const name = list[i];
        let text = `${name} (${manufacturers[i]})`;
        if (i === 0) {
          _this.api.writeToCipboard(name);
          text += ' (copied to clipboard)';
        }
        _this.terminal.writeln(text);
      }
    });
  }
}
