'use babel';

import Pyboard from './board/pyboard';
import Sync from './features/sync/sync';
import Runner from './features/run/runner';
import Term from './views/terminal';
import PySerial from './connections/pyserial';
import ApiWrapper from './wrappers/api-wrapper';
import Logger from './helpers/logger';
import PanelView from './views/panel-view';
import Config from './config';
import Snippets from './features/snippets/snippets';
import AutoConnect from './connections/auto-connect';
import Utils from './helpers/utils';
const $ = require('jquery');
import SyncHelper from './features/sync/sync-helper';

import Device from './connections/device';

const EventEmitter = require('events');

const fs = require('fs');
const ElementResize = require('element-resize-detector');

export default class Pymakr extends EventEmitter {
  constructor(serializedState, view, settings) {
    super();
    const _this = this;
    this.settings = settings;
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('Pymakr');
    this.config = Config.constants();
    this.snippets = new Snippets(view, settings);
    this.utils = new Utils(settings);

    this.view = view;
    this.devices = [];
    this.device_addresses = [];
    this.selected_device = null;
    this.terminal = this.view.terminal;
    this.auto_connect = new AutoConnect(
      this,
      this.terminal,
      this.settings,
    );

    // messages from connection

    this.setEventListeners();

    this.setChangeListeners();

    this.initialise(serializedState);
  }

  initialise(serializedState) {
    // hide panel if it was hidden after last shutdown of atom
    const close_terminal =
      serializedState &&
      'visible' in serializedState &&
      !serializedState.visible;

    if (!this.settings.open_on_start || close_terminal) {
      this.hidePanel();
    } else {
      this.auto_connect.start(null, true);
    }
  }

  setChangeListeners() {
    const _this = this;

    this.settings.onChange('auto_connect', (old_value, new_value) => {
      const v = new_value;
      _this.logger.info(`auto_connect setting changed to ${v}`);
      if (v && _this.view.visible) {
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

      _this.first_time_start = !this.api.settingsExist();
      if (_this.first_time_start) {
        _this.first_time_start = false;
        _this.api.openSettings();
      }
    });

    this.view.on('connect.toggle', () => {
      _this.logger.verbose('Connect emitted');
      if (_this.selected_device) {
        if (_this.selected_device.connected()) {
          _this.logger.verbose('Disconnecting...');
          _this.disconnect();
        } else {
          _this.logger.verbose('Connecting...');
          _this.connect();
        }
        _this.setButtonState();
      }
    });

    this.view.on('disconnect', function() {
      this.logger.verbose('Disconnect emitted');
      _this.disconnect();
      _this.setButtonState();
    });

    this.view.on('close', function() {
      this.logger.verbose('Close emitted');
      _this.disconnect();
      _this.setButtonState();
      _this.auto_connect.stop();
    });

    this.view.on('open', function() {
      this.logger.verbose('Open emitted');
      _this.auto_connect.start(connected_on_addr => {
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
      const html = fs.readFileSync(
        `${this.api.getPackageSrcPath()}/views/pybytes-panel.html`,
      );
      const item = $('<div></div>').html(html.toString());
      if (atom.workspace.getRightPanels().length === 0) {
        const panel = atom.workspace.addRightPanel({ item });
        _this.pybytesPanel = panel;
      } else {
        _this.pybytesPanel.destroy();
      }
      // if (atom.workspace.getRightPanels().length === 0) {
      //   const pybytesPanel = _this.pybytesPanel;
      //   console.log("pybytes", pybytesPanel);
      //   atom.workspace.addRightPanel({
      //     pybytesPanel
      //   });
      // } else {
      //   const panels = atom.workspace.getRightPanels();
      //   panels.forEach(panel => {
      //     panel.destroy();
      //   });
      // }
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

    this.view.on('snippets.close', id => {
      _this.close_snippets();
    });

    this.auto_connect.on(
      'autoconnect.address_added',
      (com_info, name) => {
        _this.view.addComport(com_info);
        if (_this.auto_connect.enabled()) {
          _this.connect(name);
        }
      },
    );

    this.auto_connect.on(
      'autoconnect.address_removed',
      (com_info, name) => {
        _this.view.removeComport(com_info);
        if (_this.selected_device.address == name) {
          _this.disconnect();
        }
      },
    );

    this.auto_connect.on(
      'autoconnect.no_addresses',
      (com_info, name) => {
        _this.view.removeComports();
      },
    );

    this.auto_connect.on('autoconnect.ip_added', ip => {
      _this.view.addAddress(ip);
    });

    this.auto_connect.on('autoconnect.ip_removed', ip => {
      _this.view.removeAddress(ip);
    });

    this.view.on('connect.device', device => {
      _this.connect(device);
    });

    this.view.on('connect.all', device => {
      _this.openAll();
    });

    this.view.on('close.all', device => {
      _this.closeAll();
    });

    this.view.on('open.tab', address => {
      _this.selectDevice(address); // TODO
    });

    this.view.on('close.tab', address => {
      _this.removeDevice(address); // TODO
    });
  }

  openProjectSettings() {
    const _this = this;
    this.settings.openProjectSettings(err => {
      if (err) {
        _this.logger.error(err.message);
      } else if (_this.pyboard.connected) {
        // _this.terminal.writePrompt()
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
    _this.pyboard.send_wait_for_blocking(
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
          list.length == 1 ? '' : 's'
        }`,
      );
      for (let i = 0; i < list.length; i += 1) {
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

  getVersion() {
    const _this = this;
    if (!this.pyboard.connected) {
      this.terminal.writeln('Please connect to your device');
      return;
    }
    const command = 'import os; os.uname().release\r\n';
    this.pyboard.send_wait_for_blocking(command, command, err => {
      if (err) {
        _this.logger.error(`Failed to send command: ${command}`);
      }
    });
  }

  async openInfo() {
    const _this = this;
      console.log('check 0');
    if (this.selected_device) {
      console.log('check 1');
      const info = await this.selected_device.commands.getAllBoardInfo();
      console.log('check 2');
      _this.view.openInfoOverlay(info);
    }

    // this.terminal.setHeight(24)
    // this.view.setSnippetsContent(this.snippets.list())
  }

  close_snippets() {
    // this.terminal.resetHeight()
  }

  // refresh button display based on current status
  setButtonState() {
    // this.view.setButtonState(this.runner.busy,this.synchronizing,this.synchronize_type)
  }

  findDevice(address) {
    const i = this.device_addresses.indexOf(address);
    if (i > -1) {
      return this.devices[i];
    }
    return null;
  }

  createDeviceIfNotExists(address) {
    let device = this.findDevice(address);
    if (!device) {
      device = new Device(address, this.view, this, this.settings);
      this.devices.push(device);
      this.device_addresses.push(address);
    }
    return device;
  }

  selectDevice(device) {
    if (this.utils.isString(device)) {
      device = this.createDeviceIfNotExists(device);
    }
    this.selected_device = device;
    this.view.selected_device = device;
    device.select();
  }

  removeDevice(device, no_new_select) {
    if (this.utils.isString(device)) {
      device = this.findDevice(device);
    }

    if (device) {
      const i = this.device_addresses.indexOf(device.address);
      console.log(i);
      this.devices.splice(i, 1);
      this.device_addresses.splice(i, 1);
      device.close();

      if (!no_new_select && this.devices.length > 0) {
        this.selectDevice(this.devices[this.devices.length - 1]);
      } else {
        this.selected_device = null;
      }
    } else {
      this.logger.warning('tried to remove non existent device');
    }
  }

  closeAll() {
    while (this.devices.length > 0) {
      const d = this.devices[0];
      console.log(`Close device ${d.address}`);
      this.removeDevice(d, true); // second param to prevent it selecting another device
    }
    this.devices = [];
    this.device_addresses = [];
    this.selected_device = null;
  }

  openAll() {
    const _this = this;
    this.auto_connect.getAllAddressNames().forEach(device => {
      console.log(device);
      _this.connect(device);
    });
  }

  connect(address, clickaction) {
    const _this = this;
    if (!address && this.selected_device) {
      address = this.selected_device.address;
    }
    if (!address) {
      return;
    }
    const d = this.createDeviceIfNotExists(address);
    d.connect(
      () => {
        _this.view.setDeviceStatus(d.address, true);
      },
      () => {
        _this.view.setDeviceStatus(d.address, false);
      },
    );
    this.selectDevice(d);
  }

  disconnect() {
    if (this.selected_device) {
      this.selected_device.disconnect();
    }
  }

  run() {
    if (this.selected_device) {
      this.selected_device.run();
    }
  }

  runselection(cb) {
    if (this.selected_device) {
      this.selected_device.runselection();
    }
  }

  upload() {
    if (this.selected_device) {
      this.selected_device.upload();
    }
  }

  uploadFile() {
    if (this.selected_device) {
      this.selected_device.uploadCurrentFile();
    }
  }

  download() {
    if (this.selected_device) {
      this.selected_device.download();
    }
  }

  stopSync(cb) {
    if (this.selected_device) {
      this.selected_device.stopSync();
    }
  }

  // UI Stuff
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
    this.connect();
  }

  clearTerminal() {
    if (this.selected_device) {
      this.selected_device.terminal.clear();
    }
  }

  toggleVisibility() {
    this.view.visible ? this.hidePanel() : this.showPanel();
  }

  // VSCode only
  toggleConnect() {
    if (this.selected_device) {
      this.selected_device.connected()
        ? this.disconnect()
        : this.connect();
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
