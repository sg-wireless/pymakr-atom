'use babel';

import Logger from '../../helpers/logger';
import ApiWrapper from '../../wrappers/api-wrapper';
import Sync from './sync';

export default class SyncHelper {
  constructor(pymakr, pyboard, terminal, settings) {
    this.pymakr = pymakr;
    this.pyboard = pyboard;
    this.terminal = terminal;
    this.settings = settings;
    this.synchronizing = false;
    this.synchronize_type = '';
    this.api = new ApiWrapper(settings);
    this.logger = new Logger('SyncHelper');
    this.sync_worker = null;
  }

  uploadCurrentFile() {
    const _this = this;
    this.api.getOpenFile((contents, path) => {
      if (!path) {
        _this.api.warning('No file open to upload');
      } else {
        _this.logger.info(path);
        _this.sync('send', path);
      }
    });
  }

  upload(path) {
    this.projectPath = path;
    this.sync('send');
  }

  download() {
    this.sync('receive');
  }

  sync(type, files) {
    this.logger.info('Sync');
    this.logger.info(type);

    const _this = this;
    if (!this.pyboard.connected) {
      this.terminal.writeln('Please connect your device');
      return;
    }
    if (!this.synchronizing) {
      this.sync_worker = new Sync(this.pyboard, this.settings, this.terminal);
      this.synchronizing = true;
      this.synchronize_type = type;
      const cb =  () => {
        _this.synchronizing = false;
        _this.logger.info('Synchronizing disabled, now setting buttons');
        if (_this.pyboard.type !== 'serial') {
          _this.terminal.writeln('Waiting for reboot...');
          setTimeout(() => {
            _this.connect();
          }, 4000);
        }
      };
      if (type === 'receive') {
        this.sync_worker.startReceive(cb);
      } else {
        this.sync_worker.start(cb, files);
      }
    }
  }

  stop(cb) {
    const _this = this;
    if (this.synchronizing) {
      this.sync_worker.stop(() => {
        _this.synchronizing = false;
        cb();
      });
      const type = this.synchronize_type === 'receive' ? 'download' : 'upload';
      this.terminal.writeln(`Stopping ${type}....`);
    }
  }

  stopSilent() {
    this.sync_helper.stopSilent();
  }
}
