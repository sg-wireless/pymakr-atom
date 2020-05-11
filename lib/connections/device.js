'use babel';

import Logger from '../helpers/logger';
import ApiWrapper from '../wrappers/api-wrapper';
import Pyboard from '../board/pyboard';
import SyncHelper from '../features/sync/sync-helper';
import Commands from '../helpers/commands';
import Connection from './connection';
import Term from '../views/terminal';
import Runner from '../features/run/runner';
import Utils from '../helpers/utils';

export default class Device {
  constructor(address, view, pymakr, settings) {
    this.address = address;
    this.short_address = this.shorten(address);
    this.view = view;
    this.terminal = null;
    this.settings = settings;
    this.pymakr = pymakr;
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('Device');
    this.pyboard = new Pyboard(settings);
    this.status = 'disconnected';
    this.utils = new Utils(settings);
    this.createTerminal();
    this.runner = new Runner(this.pyboard, this.terminal, this);
    this.sync_helper = new SyncHelper(
      this,
      this.pyboard,
      this.terminal,
      this.settings,
    );
    this.commands = new Commands(
      this,
      this.pyboard,
      this.terminal,
      this.settings,
    );
    this.synchronizing = false;

    this.connection_helper = new Connection(
      this,
      this.pyboard,
      this.settings,
    );
    // messages from connection
    const _this = this;
    this.connection_helper.setMessageCallback(mssg => {
      if (!_this.synchronizing) {
        _this.terminal.write(mssg);
      }
    });

    this.view.on('get_version', () => {
      _this.commands.getVersion();
    });

    this.view.on('get_serial', () => {
      _this.commands.getSerial();
    });

    this.view.on('get_wifi', () => {
      _this.commands.getWifiMac();
    });
    this.view.on('help', () => {
      _this.commands.writeHelpText();
    });

    this.pyboard.registerStatusListener(status => {
      if (status == 3) {
        // RAW_REPL
        _this.terminal.enter();
      }
    });

    this.connection_helper.setMessageCallback(mssg => {
      if (!_this.synchronizing) {
        _this.terminal.write(mssg);
      }
    });
  }

  userInput(input) {
    const _this = this;
    _this.pyboard.sendUserInput(input, err => {
      if (err && err.message === 'timeout') {
        _this.logger.warning('User input timeout, disconnecting');
        _this.logger.warning(err);
        _this.disconnect();
      }
    });
  }

  shorten(address) {
    const s = address.split('-');
    return s[s.length - 1];
  }

  cleanAddress() {
    return $.escapeSelector(this.address);
  }

  connected() {
    return this.status === 'connected';
  }

  createTerminal() {
    const _this = this;
    this.terminal_el = this.view.addConnectionTab(this.address);
    this.terminal = new Term(
      null,
      this.terminal_el,
      this.pyboard,
      this.pymakr.isDark,
    );
    this.terminal.setOnMessageListener(input => {
      _this.userInput(input);
    });

    // 'click to connect' feature on complete terminal element
    this.terminal_el.onclick = function() {
      if (!_this.pyboard.connected && !_this.pyboard.connecting) {
        _this.logger.verbose('Connecting because of terminal click');
        _this.connect();
      }
    };
  }

  resizeAllTerminals(height, rows) {
    const { devices } = this.pymakr;
    for (let i = 0; i < devices.length; i += 1) {
      devices[i].terminal.setHeight(height, rows);
    }
  }

  writeln(text) {
    this.terminal.writeln(text);
  }

  write(text) {
    this.terminal.write(text);
  }

  setTerminalSize(rows, pixels) {
    this.terminal.setRows(rows, pixels);
  }

  connect() {
    const _this = this;
    const project = this.connection_helper.connectedInOtherWindow(
      this.address,
    );
    if (project) {
      this.terminal.writeln(
        `Already connected in another window (project '${project}')`,
      );
      return;
    }

    if (this.pyboard.connected) {
      this.disconnect();
    }

    this.connection_helper.connect(
      () => {
        _this.setStatus('connected');
        _this.terminal.xterm.focus();
      },
      () => {
        _this.setStatus('disconnected');
      },
    );
  }

  setStatus(status) {
    this.status = status;
    this.view.emit(`device.${this.status}`, this.address, this);
  }

  disconnect(cb) {
    this.connection_helper.disconnect(cb);
    this.setStatus('disconnected');
  }

  select() {
    // show terminal tab
    this.view.selectTab(this.address, this);
    this.view.action_view.update(this.connected(), false);
    this.terminal.xterm.focus();
  }

  close() {
    // close terminal tab
    this.terminal.xterm.dispose();
    this.disconnect();
    this.view.removeConnectionTab(this.address);
  }

  run() {
    if (!this.pyboard.connected) {
      this.terminal.writeln('Please connect your device');
      return;
    }
    if (!this.synchronizing) {
      const code = this.api.getSelected();
      // if user has selected code, run that instead of the entire file
      if (code) {
        this.runselection(code);
      } else {
        this.runner.toggle(() => {});
      }
    }
  }

  runselection(cb) {
    const _this = this;
    if (!this.pyboard.connected) {
      this.terminal.writeln('Please connect your device');
      return;
    }
    if (!this.synchronizing) {
      const code = this.api.getSelectedOrLine();
      _this.runner.selection(code, err => {
        if (err) {
          _this.logger.error('Failed to send and execute codeblock');
        } else if (cb) {
          try {
            cb();
          } catch (e) {
            // do nothing
          }
        }
      });
    }
  }

  upload() {
    this.sync_helper.upload();
  }

  uploadFile() {
    this.sync_helper.uploadCurrentFile();
  }

  download() {
    this.sync_helper.download();
  }

  stopSync() {
    this.sync_helper.stop();
  }

  execute(c, cb, timeout) {
    const _this = this;
    const command = `${c}\r\n`;
    this.pyboard.execRaw(
      command,
      (err, content) => {
        let finalErr = err;
        if (!finalErr) {
          // eslint-disable-next-line no-param-reassign
          finalErr = _this.utils.parseError(content);
        }
        if (finalErr) {
          _this.logger.error(finalErr.message);
        }
        setTimeout(() => {
          cb(finalErr, content);
        }, 100);
      },
      timeout,
    );
  }
}
