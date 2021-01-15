'use babel';

import ApiWrapper from './api-wrapper';
import Logger from '../helpers/logger';
import Config from '../config';
import Utils from '../helpers/utils';

const EventEmitter = require('events');
const fs = require('fs');
// const dns = require('dns');

export default class SettingsWrapper extends EventEmitter {
  constructor(cb) {
    super();
    const _this = this;
    this.config = Config.constants();
    this.project_config = {};
    this.api = new ApiWrapper(this);
    this.project_path = this.api.getProjectPath();
    this.configFile = `${this.project_path}/pymakr.conf`;
    this.json_valid = true;
    this.logger = new Logger('SettingsWrapper');
    this.project_change_callbacks = [];
    this.utils = new Utils(this);

    this.refresh(() => {
      _this.watchConfigFile();
      _this.watchProjectChange();
      _this.upload_chunk_size = _this.getUploadChunkSize();
      cb(_this);
    });
  }

  getUploadChunkSize() {
    let size = this.config.upload_batch_size;
    if (this.fast_upload) {
      size *= this.config.fast_upload_batch_multiplier;
    }
    return size;
  }

  set(key, value) {
    this.api.setConfig(key, value);
  }

  projectChanged() {
    this.getProjectPath();
    this.refreshProjectConfig();
    this.watchConfigFile();
  }

  getProjectPath() {
    this.project_path = this.api.getProjectPath();
    this.configFile = `${this.project_path}/pymakr.conf`;
    return this.project_path;
  }

  registerProjectChangeWatcher(cb) {
    this.project_change_callbacks.push(cb);
  }

  onChange(key, cb) {
    const _this = this;
    this.api.onConfigChange(key, value => {
      _this[key] = value.newValue;
      cb(value.oldValue, value.newValue);
    });
  }

  watchProjectChange() {
    const _this = this;
    this.api.onProjectsChange(() => {
      _this.refreshProjectConfig();
      for (
        let i = 0;
        i < _this.project_change_callbacks.length;
        i += 1
      ) {
        _this.project_change_callbacks[i](_this.project_path);
      }
    });
  }

  watchConfigFile() {
    this.logger.info(`Watching config file ${this.configFile}`);
    const _this = this;
    if (this.file_watcher) {
      this.file_watcher.close();
    }
    fs.open(this.configFile, 'r', (err) => {
      if (!err) {
        _this.file_watcher = fs.watch(
          _this.configFile,
          null,
          () => {
            _this.logger.info(
              'Config file changed, refreshing settings',
            );
            _this.refreshProjectConfig();
          },
        );
      } else {
        _this.logger.warning('Error opening config file ');
        _this.logger.warning(err);
      }
    });
  }

  refresh(cb) {
    this.refreshProjectConfig();
    this.refreshGlobalConfig(cb);
  }

  refreshGlobalConfig(cb) {
    this.address = this.api.config('address');
    this.username = this.api.config('username');
    this.password = this.api.config('password');
    this.sync_folder = this.api.config('sync_folder');
    this.sync_file_types = this.api.config('sync_file_types');
    this.sync_all_file_types = this.api.config('sync_all_file_types');
    this.ctrl_c_on_connect = this.api.config('ctrl_c_on_connect');
    this.open_on_start = this.api.config('open_on_start');
    this.safe_boot_on_upload = this.api.config('safe_boot_on_upload');
    this.statusbar_buttons = this.api.config('statusbar_buttons');
    this.reboot_after_upload = this.api.config('reboot_after_upload');
    this.auto_connect = this.api.config('auto_connect');
    this.py_ignore = this.api.config('py_ignore');
    this.fast_upload = this.api.config('fast_upload');
    this.autoconnect_comport_manufacturers = this.api.config(
      'autoconnect_comport_manufacturers',
    );
    this.font_size = this.api.config('font_size');

    this.timeout = 15000;
    this.setProjectConfig();

    if (
      this.statusbar_buttons === undefined ||
      this.statusbar_buttons === ''
    ) {
      this.statusbar_buttons = [
        'connect',
        'upload',
        'download',
        'run',
      ];
    }
    this.statusbar_buttons.push('global_settings');
    this.statusbar_buttons.push('project_settings');

    if (cb) cb();
  }

  getAllowedFileTypes() {
    let types = [];
    if (this.sync_file_types) {
      types = this.sync_file_types;
      if (typeof types === 'string') {
        types = types.split(',');
      }
      for (let i = 0; i < types.length; i += 1) {
        types[i] = types[i].trim();
      }
    }
    return types;
  }

  refreshProjectConfig() {
    // this.logger.info('Refreshing project config');
    const _this = this;
    this.project_config = {};
    this.project_path = this.api.getProjectPath();
    this.configFile = `${this.project_path}/pymakr.conf`;
    let contents = null;
    try {
      contents = fs.readFileSync(this.configFile, {
        encoding: 'utf-8',
      });
      this.logger.silly('Found contents');
    } catch (Error) {
      // file not found
      return null;
    }

    if (contents) {
      try {
        const conf = JSON.parse(contents);
        _this.project_config = conf;
      } catch (SyntaxError) {
        if (_this.json_valid) {
          _this.json_valid = false;
          _this.emit('format_error');
        } else {
          _this.json_valid = true;
        }
      }
      _this.setProjectConfig();
    }
    return true;
  }

  setProjectConfig() {
    if ('address' in this.project_config) {
      this.address = this.project_config.address;
    }
    if ('username' in this.project_config) {
      this.username = this.project_config.username;
    }
    if ('password' in this.project_config) {
      this.password = this.project_config.password;
    }
    if ('sync_folder' in this.project_config) {
      this.sync_folder = this.project_config.sync_folder;
    }
    if ('sync_file_types' in this.project_config) {
      this.sync_file_types = this.project_config.sync_file_types;
    }
    if ('sync_all_file_types' in this.project_config) {
      this.sync_all_file_types = this.project_config.sync_all_file_types;
    }
    if ('ctrl_c_on_connect' in this.project_config) {
      this.ctrl_c_on_connect = this.project_config.ctrl_c_on_connect;
    }
    if ('open_on_start' in this.project_config) {
      this.open_on_start = this.project_config.open_on_start;
    }
    if ('safe_boot_on_upload' in this.project_config) {
      this.safe_boot_on_upload = this.project_config.safe_boot_on_upload;
    }
    if ('statusbar_buttons' in this.project_config) {
      this.statusbar_buttons = this.project_config.statusbar_buttons;
    }
    if ('reboot_after_upload' in this.project_config) {
      this.reboot_after_upload = this.project_config.reboot_after_upload;
    }
    if ('py_ignore' in this.project_config) {
      this.py_ignore = this.project_config.py_ignore;
    }
    if ('fast_upload' in this.project_config) {
      this.fast_upload = this.project_config.fast_upload;
    }
    if ('font_size' in this.project_config) {
      this.font_size = this.project_config.font_size;
    }
  }

  getDefaultProjectConfig() {
    const config = {
      address: this.api.config('address'),
      username: this.api.config('username'),
      password: this.api.config('password'),
      sync_folder: this.api.config('sync_folder'),
      sync_file_types: this.api.config('sync_file_types'),
      sync_all_file_types: this.api.config('sync_all_file_types'),
      open_on_start: this.api.config('open_on_start'),
      safe_boot_on_upload: this.api.config('safe_boot_on_upload'),
      statusbar_buttons: this.api.config('statusbar_buttons'),
      py_ignore: this.api.config('py_ignore'),
      fast_upload: this.api.config('fast_upload'),
      font_size: this.api.config('font_size'),
    };
    return config;
  }

  openProjectSettings(cb) {
    const _this = this;
    if (this.getProjectPath()) {
      const { configFile } = this;
      fs.open(configFile, 'r', (err ) => {
        if (err) {
          const yes = () => {
            _this.createProjectConfig(configFile, err2 => {
              if (!err2) {
                atom.workspace.open(configFile);
              }
              cb(err2);
            });
          };
          const no = () => {
            cb(new Error('Canceled'));
          };

          const options = {
            Cancel: no,
            Yes: yes,
          };
          _this.api.confirm(
            'Create new Project file?',
            "This project doesn't have a project config file. Do you want to create one, overwriting the global settings for this project?",
            options
          )
        } else {
          atom.workspace.open(configFile);
        }
        cb();
      });
    } else {
      cb(new Error('No project open'));
    }
  }

  createProjectConfig(configFile, cb) {
    const _this = this;
    const jsonString = this.newProjectSettingsJson();
    fs.writeFile(configFile, jsonString, err => {
      if (err) {
        cb(new Error(err));
        return;
      }
      _this.watchConfigFile();
      cb();
    });
  }

  newProjectSettingsJson() {
    const settings = this.getDefaultProjectConfig();
    const jsonString = JSON.stringify(settings, null, 4);
    return jsonString;
  }
}
