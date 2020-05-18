'use babel';

import PySerial from './connections/pyserial';
import ApiWrapper from './wrappers/api-wrapper';
import Logger from './helpers/logger';
import Config from './config';
import Pybytes from './pybytes';
import Snippets from './features/snippets/snippets';
import AutoConnect from './connections/auto-connect';
import Utils from './helpers/utils';

import Device from './connections/device';

const $ = require('jquery');
const EventEmitter = require('events');

export default class Pymakr extends EventEmitter {
  constructor(serializedState, view, settings, isDark) {
    super();
    const _this = this;
    this.settings = settings;
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('Pymakr');
    this.config = Config.constants();
    this.snippets = new Snippets(view, settings);
    this.utils = new Utils(settings);
    this.view = view;
    this.isDark = isDark;
    this.devices = [];
    this.deviceAddresses = [];
    this.selectedDevice = null;
    this.selectedFolder = null;
    this.terminal = this.view.terminal;
    this.pybytes = new Pybytes(this.api);
    this.autoConnect = new AutoConnect(
      this,
      this.terminal,
      this.settings,
    );

    atom.themes.onDidChangeActiveThemes(() => {
      _this.checkTheme();
      if (_this.isDark) {
        $('#pymakr').removeClass('light');
        $('.pymakr-status-bar').removeClass('light');
      } else {
        $('#pymakr').addClass('light');
        $('.pymakr-status-bar').addClass('light');
      }
    });

    // messages from connection

    this.setEventListeners();

    this.setChangeListeners();

    this.initialize(serializedState);

    $('#pymakr-help').on('click', () => {
      if (_this.selectedDevice) {
        _this.selectedDevice.commands.writeHelpText();
      }
    });
    $('#pymakr-serial-ports').on('click', () => {
      if (_this.selectedDevice) {
        _this.selectedDevice.commands.getSerial();
      }
    });
    $('#pymakr-reboot').on('click', async () => {
      if (_this.selectedDevice) {
        const { commands } = _this.selectedDevice;
        await commands.prepare();
        await commands.reset();
      }
    });
    $('#pymakr-format').on('click', async () => {
      if (_this.selectedDevice) {
        const { commands } = _this.selectedDevice;
        await commands.prepare();
        await commands.formatFlash();
      }
    });
  }

  checkTheme() {
    const isDark = theme => {
      const { keywords } = theme;
      if (keywords) {
        if (
          keywords.find(item => item.toLowerCase().includes('dark'))
        ) {
          return true;
        }
        if (
          keywords.find(item => item.toLowerCase().includes('light'))
        ) {
          return false;
        }
        return false;
      }
      return theme.name.toLowerCase().includes('dark');
    };

    const themes = atom.themes.getActiveThemes();
    let selectedTheme = null;
    themes.forEach(theme => {
      if (theme.mainActivated) selectedTheme = theme;
    });
    if (selectedTheme) this.isDark = isDark(selectedTheme);
    else {
      try {
        this.isDark = themes[themes.length - 1].name
          .toLowerCase()
          .includes('dark');
      } catch (e) {
        // nothing to do
      }
    }
  }

  writeHelpText() {
    if (this.selectedDevice) {
      this.selectedDevice.commands.writeHelpText();
    }
  }

  initialize(serializedState) {
    // hide panel if it was hidden after last shutdown of atom
    const closeTerminal =
      serializedState &&
      'visible' in serializedState &&
      !serializedState.visible;

    if (!this.settings.open_on_start || closeTerminal) {
      this.hidePanel();
    } else {
      this.autoConnect.start(null, true);
    }
  }

  setChangeListeners() {
    const _this = this;

    this.settings.onChange('auto_connect', (oldValue, newValue) => {
      const value = newValue;
      _this.logger.info(`auto_connect setting changed to ${value}`);
      if (value && _this.view.visible) {
        // _this.auto_connect.start()
      } else {
        // _this.auto_connect.stop()
        // _this.connect()
      }
    });
  }

  setEventListeners() {
    const _this = this;

    this.settings.on('format_error', () => {
      // _this.terminal.writeln("JSON format error in pymakr.conf file") //TODO change to toast / error popup?
      // if(_this.pyboard.connected){
      //   _this.terminal.writePrompt()
      // }
    });

    this.view.on('term-connected', function() {
      _this.logger.info('Connected trigger from view');

      _this.firstTimeStart = !this.api.settingsExist();
      if (_this.firstTimeStart) {
        _this.firstTimeStart = false;
        _this.api.openSettings();
      }
    });

    this.view.on('connect.toggle', () => {
      _this.logger.verbose('Connect emitted');
      if (_this.selectedDevice) {
        if (_this.selectedDevice.connected()) {
          _this.logger.verbose('Disconnecting...');
          _this.disconnect();
        } else {
          _this.logger.verbose('Connecting...');
          _this.connect();
        }
        _this.setButtonState();
      }
    });

    this.view.on('disconnect', () => {
      _this.logger.verbose('Disconnect emitted');
      _this.disconnect();
      _this.setButtonState();
    });

    this.view.on('close', () => {
      _this.logger.verbose('Close emitted');
      _this.disconnect();
      _this.setButtonState();
      _this.autoConnect.stop();
    });

    this.view.on('open', () => {
      _this.logger.verbose('Open emitted');
      _this.autoConnect.start(connected_on_addr => {
        if (!connected_on_addr) {
          _this.logger.verbose(
            'No address from autoconnect, connecting normally',
          );
          _this.connect();
        }
        _this.setButtonState();
      });
    });

    this.view.on('run', () => {
      if (!_this.synchronizing) {
        _this.run();
      }
    });

    this.view.on('pybytes.open', () => {
      console.log('open pybytes');
    });
    this.view.on('pybytes.toggle', () => {
      this.pybytes.togglePanel();
    });

    this.view.on('runselection', () => {
      if (!_this.synchronizing) {
        _this.runselection();
      }
    });

    this.view.on('sync', () => {
      if (!_this.synchronizing) {
        _this.upload();
      } else {
        _this.stopSync(() => {
          _this.setButtonState();
        });
      }
      _this.setButtonState();
    });

    this.view.on('upload_current_file', () => {
      if (!_this.synchronizing) {
        _this.uploadFile();
      } else {
        _this.stopSync(() => {
          _this.setButtonState();
        });
      }
      _this.setButtonState();
    });

    this.view.on('sync_receive', () => {
      if (!_this.synchronizing) {
        _this.download();
      } else {
        _this.stopSync(() => {
          _this.setButtonState();
        });
      }
      _this.setButtonState();
    });

    this.view.on('global_settings', () => {
      _this.api.openSettings();
    });

    this.view.on('project_settings', () => {
      _this.openProjectSettings();
    });

    this.view.on('openInfo', async () => {
      await _this.openInfo();
    });

    this.view.on('snippets.open', id => {
      const s = _this.snippets.get(id);
      _this.view.openSnippet(s);
    });

    this.view.on('snippets.close', () => {
      _this.close_Snippets();
    });

    this.autoConnect.on(
      'autoconnect.address_added',
      (comInfo, name) => {
        _this.view.addComport(comInfo);
        if (_this.autoConnect.enabled()) {
          _this.connect(name);
        }
      },
    );

    this.autoConnect.on(
      'autoconnect.address_removed',
      (comInfo, name) => {
        _this.view.removeComport(comInfo);
        if (_this.selectedDevice)
          if (_this.selectedDevice.address === name) {
            _this.disconnect();
          }
      },
    );

    this.autoConnect.on('autoconnect.no_addresses', () => {
      _this.view.removeComports();
    });

    this.autoConnect.on('autoconnect.ip_added', ip => {
      _this.view.addAddress(ip);
    });

    this.autoConnect.on('autoconnect.ip_removed', ip => {
      _this.view.removeAddress(ip);
    });

    this.view.on('connect.device', device => {
      _this.connect(device);
    });
    this.view.on('project.selected', project => {
      _this.api.setSelectedProjectByName(
        project,
        _this.selectedDevice ? _this.selectedDevice.address : '',
      );
    });

    this.view.on('connect.all', () => {
      _this.openAll();
    });

    this.view.on('close.all', () => {
      _this.closeAll();
    });

    this.view.on('open.tab', address => {
      _this.selectDevice(address);
    });

    this.view.on('close.tab', address => {
      _this.removeDevice(address);
    });
  }

  openProjectSettings() {
    const _this = this;
    this.settings.openProjectSettings(err => {
      if (err) {
        _this.logger.error(err.message);
        if (_this.terminal) _this.terminal.writeln(err.message);
        else atom.notifications.addError(err.message);
      } else if (_this.pyboard && _this.pyboard.connected) {
        _this.terminal.writePrompt();
      }
    });
  }

  openGlobalSettings() {
    this.api.openSettings(() => {
      // nothing
    });
  }

  getWifiMac() {
    const _this = this;
    if (!this.pyboard.connected) {
      this.terminal.writeln('Please connect to your device');
      return;
    }

    const command =
      "from network import WLAN; from binascii import hexlify; from os import uname; wlan = WLAN(); mac = hexlify(wlan.mac()).decode('ascii'); device = uname().sysname;print('WiFi AP SSID: %(device)s-wlan-%(mac)s' % {'device': device, 'mac': mac[len(mac)-4:len(mac)]})";
    _this.pyboard.sendWaitForBlocking(
      `${command}\n\r`,
      command,
      err => {
        if (err) {
          _this.logger.error(`Failed to send command: ${command}`);
        }
      },
      1000,
    );
  }

  getSerial() {
    const _this = this;
    this.terminal.enter();

    PySerial.list(this.settings, (list, manufacturers) => {
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

  getVersion() {
    const _this = this;
    if (!this.pyboard.connected) {
      this.terminal.writeln('Please connect to your device');
      return;
    }
    const command = 'import os; os.uname().release\r\n';
    this.pyboard.sendWaitForBlocking(command, command, err => {
      if (err) {
        _this.logger.error(`Failed to send command: ${command}`);
      }
    });
  }

  async openInfo() {
    const _this = this;
    if (this.selectedDevice) {
      const info = await this.selectedDevice.commands.getAllBoardInfo();
      _this.view.openInfoOverlay(info);
    }

    // this.terminal.setHeight(24)
    // this.view.setSnippetsContent(this.snippets.list())
  }

  close_Snippets() {
    // this.terminal.resetHeight()
  }

  // refresh button display based on current status
  setButtonState() {
    // this.view.setButtonState(this.runner.busy,this.synchronizing,this.synchronize_type)
  }

  findDevice(address) {
    let i = this.deviceAddresses.indexOf(address);
    if (i > -1) {
      return this.devices[i];
    }
    // PyyJTAG bug fix
    this.deviceAddresses.forEach((device, key)=> {if (device.includes(address)) i = key });
    if (i > -1) {
      return this.devices[i];
    }
    return null
  }

  createDeviceIfNotExists(address) {
    let device = this.findDevice(address);
    if (!device) {
      device = new Device(address, this.view, this, this.settings);
      this.devices.push(device);
      this.deviceAddresses.push(address);
    }
    return device;
  }

  selectDevice(device) {
    let finalDevice = device;
    if (this.utils.isString(device)) {
      finalDevice = this.createDeviceIfNotExists(device);
    }
    this.selectedDevice = finalDevice;
    this.view.selectedDevice = finalDevice;
    const selectedFolder = this.api.getConnectionState(
      finalDevice.address,
    );
    if (selectedFolder) {
      this.api.setSelectedProjectByName(selectedFolder.project);
    } else {
      this.api.selectFirstProject();
    }
    finalDevice.select();
    this.view.initTerminalHeight();
    $('#pymakr-info-close').click();
    
  }

  removeDevice(device, noNewSelect) {
    let finalDevice = device;
    if (this.utils.isString(finalDevice)) {
      finalDevice = this.findDevice(finalDevice);
    }

    if (finalDevice) {
      const index = this.deviceAddresses.indexOf(finalDevice.address);
      this.devices.splice(index, 1);
      this.deviceAddresses.splice(index, 1);
      finalDevice.close();

      if (!noNewSelect && this.devices.length > 0) {
        this.selectDevice(this.devices[this.devices.length - 1]);
      } else {
        this.selectedDevice = null;
      }
    } else {
      this.logger.warning('tried to remove non existent device');
    }
  }

  closeAll() {
    while (this.devices.length > 0) {
      const device = this.devices[0];
      this.removeDevice(device, true);
    }
    this.devices = [];
    this.deviceAddresses = [];
    this.selectedDevice = null;
  }

  openAll() {
    const addresses = document.getElementsByClassName(
      'pymakr-comport',
    );
    const addressArray = $.makeArray(addresses);
    const loopWithDelay = index => {
      let finalIndex = index || 0;
      if (finalIndex < addressArray.length) {
        setTimeout(() => {
          addressArray[finalIndex].click();
          finalIndex += 1;
          loopWithDelay(finalIndex);
        }, 50);
      }
    };
    loopWithDelay();
  }

  connect(address) {
    const _this = this;
    let finalAddress = address;
    if (!finalAddress && this.selectedDevice) {
      finalAddress = this.selectedDevice.address;
    }
    if (!finalAddress) {
      return;
    }
    const device = this.createDeviceIfNotExists(finalAddress);
    device.connect(
      () => {
        _this.view.setDeviceStatus(device.finalAddress, 'connected');
        _this.view.initTerminalHeight();
      },
      () => {
        _this.view.setDeviceStatus(
          device.finalAddress,
          'disconnected',
        );
      },
    );
    this.selectDevice(device);
  }

  disconnect() {
    if (this.selectedDevice) {
      this.selectedDevice.disconnect();
    }
  }

  run() {
    if (this.selectedDevice) {
      this.selectedDevice.run();
    }
  }

  runselection() {
    if (this.selectedDevice) {
      this.selectedDevice.runselection();
    }
  }

  upload() {
    if (this.selectedDevice) {
      this.selectedDevice.upload(this.selectedFolder);
    }
  }

  uploadFile() {
    if (this.selectedDevice) {
      this.selectedDevice.uploadFile();
    }
  }

  download() {
    if (this.selectedDevice) {
      this.selectedDevice.download();
    }
  }

  stopSync(cb) {
    if (this.selectedDevice) {
      this.selectedDevice.stopSync();
    }
  }

  addPanel() {
    this.view.addPanel();
  }

  hidePanel() {
    this.view.hidePanel();
    this.logger.verbose('Hiding pannel + disconnect');
    this.disconnect();
  }

  showPanel() {
    this.view.showPanel();
    this.setButtonState();
    this.view.initTerminalHeight();
    this.connect();
  }

  clearTerminal() {
    if (this.selectedDevice) {
      this.selectedDevice.terminal.clear();
    }
  }

  toggleVisibility() {
    if (this.view.visible) this.hidePanel();
    else {
      this.showPanel();
      this.autoConnect.start(null, true);
    }
  }

  toggleConnect() {
    if (this.selectedDevice) {
      if (this.selectedDevice.connected()) this.disconnect();
      else this.connect();
    }
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      visible: this.view.visible,
      feedbackPopupSeen: this.view.feedback_popup_seen,
    };
  }

  // Tear down any state and detach
  destroy() {
    this.logger.warning('Destroying plugin');
    this.disconnect();
    this.view.removeElement();
  }

  getElement() {
    return this.view.element;
  }
}
