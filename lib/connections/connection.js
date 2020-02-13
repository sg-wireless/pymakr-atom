'use babel';

import Logger from '../helpers/logger';
import ApiWrapper from '../wrappers/api-wrapper';

export default class Connection {
  constructor(device, pyboard, settings) {
    this.pyboard = pyboard;
    this.terminal = device.terminal;
    this.settings = settings;
    this.device = device;
    this.view = this.device.view;
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('ConnectionHelper');
    this.message_callback = null;
    this.connection_timer = null;
  }

  setMessageCallback(cb) {
    this.message_callback = cb;
  }

  connectedInOtherWindow(address) {
    const state = this.api.getConnectionState(address);
    const ts = new Date().getTime();
    if (
      state &&
      state.project !== this.view.project_name &&
      state.timestamp > ts - 11000
    ) {
      return state.project;
    }
    return null;
  }

  connect(cb, onDisconnect) {
    const _this = this;

    const { address } = this.device;

    this.terminal.writeln(`Connecting to ${this.device.address}...`);

    this.logger.info('Connecting...');
    this.logger.info(address);

    this.pyboard.refreshConfig(() => {
      const onconnect = err => {
        if (err) {
          _this.device.writeln(`Connection error: ${err}`);
        } else {
          _this.api.setConnectionState(
            address,
            true,
            _this.view.project_name,
          );
          cb(true);
        }
      };

      const onerror = err => {
        let message = _this.pyboard.getErrorMessage(err.message);
        if (message === '') {
          message = err.message ? err.message : 'Unknown error';
        }

        if (_this.pyboard.connected) {
          _this.logger.warning(`An error occurred: ${message}`);
          if (_this.device.synchronizing) {
            this.terminal.writeln(`An error occurred: ${message}`);
            _this.logger.warning('Synchronizing, stopping sync');
            _this.device.sync_helper.stopSilent();
          }
        } else {
          _this.terminal.writeln(`> Failed to connect (${message}).`);
        }
        if (onDisconnect) {
          onDisconnect();
        }
      };

      const ontimeout = () => {
        _this.terminal.writeln('> Connection timed out.');
        if (onDisconnect) {
          onDisconnect();
        }
      };

      const onmessage = mssg => {
        _this.message_callback(mssg);
      };

      _this.pyboard.connect(
        address,
        onconnect,
        onerror,
        ontimeout,
        onmessage,
      );
    });
  }

  disconnect(cb) {
    const _this = this;
    this.logger.info('Disconnecting...');
    if (this.pyboard.isConnecting()) {
      this.terminal.writeln('Connection attempt canceled');
    }

    const continueDisconnect = () => {
      clearInterval(this.connection_timer);
      _this.api.setConnectionState(_this.pyboard.address, false);
      _this.pyboard.disconnect(() => {
        if (cb) cb();
      });
      _this.device.synchronizing = false;
    };

    if (this.device.synchronizing) {
      this.device.sync_helper.stop(() => {
        this.device.synchronizing = false;
        continueDisconnect();
      });
    } else {
      continueDisconnect();
    }
  }
}
