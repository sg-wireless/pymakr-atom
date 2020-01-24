'use babel';

import Shell from '../../board/shell';
import Config from '../../config';
import Logger from '../../helpers/logger';
import ApiWrapper from '../../wrappers/api-wrapper';
import ProjectStatus from './project-status';
import Utils from '../../helpers/utils';

const fs = require('fs');

export default class Sync {
  constructor(pyboard, settings, terminal) {
    this.logger = new Logger('Sync');
    this.api = new ApiWrapper();
    this.settings = settings;
    this.pyboard = pyboard;
    this.terminal = terminal;
    this.shell = null;
    this.in_raw_mode = false;
    this.total_file_size = 0;
    this.total_number_of_files = 0;
    this.number_of_changed_files = 0;
    this.method_action = 'Downloading';
    this.method_name = 'Download';

    this.utils = new Utils(settings);
    this.config = Config.constants();
    this.allowed_file_types = this.settings.get_allowed_file_types();
    this.project_path = this.api.getProjectPath();
    this.isrunning = false;
    this.is_stopping = false;
    this.fails = 0;
    this.compression_limit = 5; // minimum file size in kb that will be compressed
    this.set_paths();
    this.project_status = new ProjectStatus(
      this.shell,
      this.settings,
      this.py_folder,
    );
  }

  isReady() {
    // check if there is a project open
    this.project_path = this.api.getProjectPath();
    console.log("esoahesakesa,", this.api.getProjectPath())
    if (!this.project_path) {
      return new Error('No project open');
    }
    // check if project exists
    console.log('to folder', this.project_path);
    if (!this.exists(this.py_folder)) {
      console.log("Py folder doesn't exist");
      return new Error(
        `Unable to find folder '${this.settings.sync_folder}' in your project. Please add the correct folder in your settings`,
      );
    }

    return true;
  }

  exists(dir) {
    return fs.existsSync(dir);
  }

  progress(text, count) {
    if (count) {
      this.progress_file_count += 1;
      text = `[${this.progress_file_count}/${this.number_of_changed_files}] ${text}`;
    }
    const _this = this;
    setTimeout(() => {
      _this.terminal.writeln(text);
    }, 0);
  }

  sync_done(err) {
    this.logger.verbose('Sync done!');
    this.isrunning = false;
    let mssg = `${this.method_name} done`;
    if (err) {
      mssg = `${this.method_name} failed`;
      mssg +=
        err.message && err.message != '' ? `: ${err.message}` : '';
      if (this.in_raw_mode) {
        mssg += '. Please reboot your device manually.';
      }
    } else if (
      this.in_raw_mode &&
      this.settings.reboot_after_upload
    ) {
      mssg += ', resetting board...';
    }

    this.terminal.writeln(mssg);

    if (this.pyboard.connected && !this.in_raw_mode) {
      this.terminal.writePrompt();
    }

    if (this.oncomplete) {
      this.oncomplete();
      this.oncomplete = null;
    } else {
      this.logger.warning('Oncomplete not set!');
    }
  }

  reset_values(oncomplete, method) {
    // prepare variables
    if (method != 'receive') {
      method = 'send';
      this.method_action = 'Uploading';
      this.method_name = 'Upload';
    }
    this.method = method;
    this.oncomplete = oncomplete;
    this.total_file_size = 0;
    this.total_number_of_files = 0;
    this.number_of_changed_files = 0;
    this.progress_file_count = 0;
    this.isrunning = true;
    this.in_raw_mode = false;
    this.set_paths();
  }

  set_paths() {
    this.project_path = this.api.getProjectPath();
    console.log('current path', this.project_path);
    if (this.project_path) {
      this.project_name = this.project_path.split('/').pop();

      const dir = this.settings.sync_folder.replace(/^\/|\/$/g, ''); // remove first and last slash
      this.py_folder = `${this.project_path}/`;
      if (dir) {
        this.py_folder += `${dir}/`;
      }

      const { sync_folder } = this.settings;
      const folder_name =
        sync_folder == '' ? 'main folder' : sync_folder;
      this.folder_name = folder_name;
    }
  }

  check_file_size(cb) {
    const _this = this;
    this.shell.getFreeMemory(size => {
      if (
        _this.method == 'send' &&
        size * 1000 < _this.total_file_size
      ) {
        const mssg = `Not enough space left on device (${size}kb) to fit ${_this.total_number_of_files.toString()} files of (${parseInt(
          _this.total_file_size / 1000,
        ).toString()}kb)`;
        cb(size, Error(mssg));
      } else {
        cb(size, null);
      }
    });
  }

  start(oncomplete, files) {
    const _this = this;
    this.settings.refresh(() => {
      _this.__start_sync(oncomplete, 'send', files);
    });
  }

  start_receive(oncomplete) {
    const _this = this;
    this.settings.refresh(() => {
      _this.__start_sync(oncomplete, 'receive');
    });
  }

  __start_sync(oncomplete, method, files) {
    this.logger.info(`Start sync method ${method}`);
    const _this = this;
    this.fails = 0;
    this.method = method;

    const cb = function(err) {
      _this.sync_done(err);
    };

    try {
      this.reset_values(oncomplete, method);
    } catch (e) {
      _this.logger.error(e);
      this.sync_done(e);
      return;
    }

    // check if project is ready to sync
    const ready = this.isReady();
    if (ready instanceof Error) {
      this.sync_done(ready);
      return;
    }

    // make sure next messages will be written on a new line
    this.terminal.enter();
    if (files) {
      // TODO: make compatible with future usecase where files contains more than one file
      const filename = files.split('/').pop();
      this.terminal.write(
        `${this.method_action} current file (${filename})...\r\n`,
      );
    } else {
      this.terminal.write(
        `${this.method_action} project (${this.folder_name})...\r\n`,
      );
    }

    _this.__safe_boot(err => {
      if (err) {
        _this.logger.error('Safeboot failed');
        _this.logger.error(err);
        _this.progress(
          `Safe boot failed, ${_this.method_action.toLowerCase()} anyway.`,
        );
      } else {
        _this.logger.info('Safeboot succesful');
      }

      _this.logger.silly('Start shell');
      _this.start_shell(err => {
        _this.in_raw_mode = true;

        _this.project_status = new ProjectStatus(
          _this.shell,
          _this.settings,
          _this.py_folder,
        );
        _this.logger.silly('Entered raw mode');

        if (!_this.isrunning) {
          _this.stoppedByUser(cb);
          return;
        }
        if (err) {
          _this.logger.error(err);
          _this.throwError(cb, err);
          _this.exit();
        } else if (_this.method == 'receive') {
          _this.__receive(cb, err);
        } else {
          _this.send(cb, err, files);
        }
      });
    });
  }

  __receive(cb, err) {
    const _this = this;

    _this.progress('Reading files from board');

    if (err) {
      this.progress(
        'Failed to read files from board, canceling file download',
      );
      this.throwError(cb, err);
      return;
    }

    this.shell.listFiles((err, fileList) => {
      if (err) {
        _this.progress(
          'Failed to read files from board, canceling file download',
        );
        _this.throwError(cb, err);
        return;
      }
      _this.files = _this._getFilesRecursive('');
      const new_files = [];
      const existing_files = [];
      fileList = _this.utils.ignoreFilter(fileList);
      for (let i = 0; i < fileList.length; i += 1) {
        const file = fileList[i];
        if (_this.files.indexOf(file) > -1) {
          existing_files.push(file);
        } else {
          new_files.push(file);
        }
      }
      fileList = existing_files.concat(new_files);

      let mssg = 'No files found on the board to download';

      if (new_files.length > 0) {
        mssg = `Found ${new_files.length} new ${_this.utils.plural(
          'file',
          fileList.length,
        )}`;
      }

      if (existing_files.length > 0) {
        if (new_files.length == 0) {
          mssg = 'Found ';
        } else {
          mssg += ' and ';
        }
        mssg += `${
          existing_files.length
        } existing ${_this.utils.plural('file', fileList.length)}`;
      }
      // _this.progress(mssg)

      const time = Date.now();

      const checkTimeout = function() {
        if (Date.now() - time > 29000) {
          _this.throwError(
            cb,
            new Error('Choice timeout (30 seconds) occurred.'),
          );
          return false;
        }
        return true;
      };

      const cancel = function() {
        if (checkTimeout()) {
          _this.progress('Canceled');
          _this.complete(cb);
        }
      };

      const override = function() {
        if (checkTimeout()) {
          _this.progress(
            `Downloading ${fileList.length} ${_this.utils.plural(
              'file',
              fileList.length,
            )}...`,
          );
          _this.progress_file_count = 0;
          _this.number_of_changed_files = fileList.length;
          _this.receiveFiles(0, fileList, () => {
            _this.logger.info('All items received');
            _this.progress('All items overritten');
            _this.complete(cb);
          });
        }
      };

      const only_new = function() {
        if (checkTimeout()) {
          _this.progress(`Downloading ${new_files.length} files...`);
          _this.progress_file_count = 0;
          _this.number_of_changed_files = new_files.length;
          _this.receiveFiles(0, new_files, () => {
            _this.logger.info('All items received');
            _this.progress('All items overritten');
            _this.complete(cb);
          });
        }
      };
      const options = {
        Cancel: cancel,
        Yes: override,
      };
      if (new_files.length > 0) {
        options['Only new files'] = only_new;
      }
      setTimeout(() => {
        if (fileList.length == 0) {
          _this.complete(cb);
          return true;
        }

        mssg = `${mssg}. Do you want to download these files into your project (${_this.project_name} - ${_this.folder_name}), overwriting existing files?`;
        _this.progress(mssg);
        _this.progress(
          '(Use the confirmation box at the top of the screen)',
        );
        _this.api.confirm('Downloading files', mssg, options);
      }, 100);
    });
  }

  __safe_boot(cb) {
    const _this = this;
    _this.pyboard.stopRunningProgramsDouble(() => {
      if (!_this.settings.safe_boot_on_upload) {
        _this.progress('Not safe booting, disabled in settings');
        cb();
        return false;
      }

      if (!_this.pyboard.isSerial) {
        cb();
        return false;
      }

      _this.logger.info('Safe booting...');
      _this.progress(
        'Safe booting device... (see settings for more info)',
      );
      _this.pyboard.safeBoot(cb, 4000);
    }, 500);
  }

  receiveFiles(i, list, cb) {
    const _this = this;
    if (i >= list.length) {
      cb();
      return;
    }
    const filename = list[i];
    _this.progress(`Reading ${filename}`, true);
    _this.shell.readFile(
      filename,
      (err, content_buffer, content_st) => {
        if (err) {
          _this.progress(`Failed to download ${filename}`);
          _this.logger.error(err);
          _this.receiveFiles(i + 1, list, cb);
        } else {
          const f = _this.py_folder + filename;
          _this.utils.ensureFileDirectoryExistence(f);
          try {
            const stream = fs.createWriteStream(f);
            stream.once('open', fd => {
              for (let j = 0; j < content_buffer.length; j++) {
                stream.write(content_buffer[j]);
              }
              stream.end();
              _this.receiveFiles(i + 1, list, cb);
            });
          } catch (e) {
            _this.logger.error(`Failed to open and write ${f}`);
            _this.logger.error(e);
            _this.progress(
              `Failed to write to local file ${filename}`,
            );
            _this.receiveFiles(i + 1, list, cb);
          }
        }
      },
    );
  }

  send(cb, err, files) {
    const _this = this;

    this.progress('Reading file status');
    this.logger.info('Reading pymakr file');

    _this.project_status.read((err, content) => {
      if (!_this.isrunning) {
        _this.stoppedByUser(cb);
        return;
      }

      // if files given, only upload those files
      if (files) {
        if (!Array.isArray(files)) {
          files = _this.project_status.prepare_file(files);
          _this.progress('Uploading single file');
        } else {
          _this.progress(`Uploading ${files.length} files`);
        }
        _this.number_of_changed_files = files.length;
        _this.writeFiles(cb, files);

        // otherwise, write changes based on project status file
      } else {
        if (err) {
          _this.progress(
            'Failed to read project status, uploading all files',
          );
        }
        _this.writeChanges(cb);
      }
    });
  }

  writeChanges(cb, files) {
    const _this = this;

    const changes = _this.project_status.get_changes();

    const deletes = changes.delete;
    const changed_files = changes.files;
    const changed_folders = changes.folders;
    const changed_files_folders = changed_folders.concat(
      changed_files,
    );

    _this.number_of_changed_files = changed_files.length;
    _this.max_failures = Math.min(
      Math.ceil(changed_files.length / 2),
      5,
    );

    if (deletes.length > 0) {
      _this.progress(
        `Deleting ${deletes.length.toString()} files/folders`,
      );
    }

    if (
      deletes.length == 0 &&
      changed_files.length == 0 &&
      changed_folders.length == 0
    ) {
      _this.progress('No files to upload');
      _this.complete(cb);
    } else {
      _this.logger.info('Removing files');
      _this.removeFilesRecursive(deletes, () => {
        if (!_this.isrunning) {
          _this.stoppedByUser(cb);
          return;
        }
        if (deletes.length > 0) {
          _this.logger.info('Updating project-status file');
        }
        _this.project_status.write(() => {
          _this.writeFiles(cb, changed_files_folders);
        });
      });
    }
  }

  writeFiles(cb, files_and_folders) {
    const _this = this;
    _this.logger.info('Writing changed folders');
    _this.writeFilesRecursive(files_and_folders, err => {
      if (!_this.isrunning) {
        _this.stoppedByUser(cb);
        return;
      }

      if (err) {
        _this.throwError(cb, err);
        return;
      }

      setTimeout(() => {
        _this.logger.info('Writing project file');
        _this.project_status.write(err => {
          if (!_this.isrunning) {
            _this.stoppedByUser(cb);
            return;
          }
          if (err) {
            _this.throwError(cb, err);
            return;
          }
          _this.logger.info('Exiting...');
          _this.complete(cb);
        });
      }, 300);
    });
  }

  stopSilent() {
    this.logger.info('Stopping sync');
    this.isrunning = false;
  }

  stop(cb) {
    const _this = this;
    this.stopSilent();

    if (!this.shell) {
      _this.isrunning = false;
      cb();
      return;
    }
    this.shell.stopWorking(() => {
      _this.isrunning = false;
      _this.project_status.write(err => {
        _this.complete(() => {
          _this.pyboard.stopWaitingForSilent();
          cb();
        });
      });
    });
  }

  stoppedByUser(cb) {
    const _this = this;
    this.logger.warning('Sync canceled');
    if (!this.is_stopping) {
      this.is_stopping = true;
    }
  }

  throwError(cb, err) {
    var _this = this;
    const mssg = err || new Error('');

    this.logger.warning('Error thrown during sync procedure');

    if (!cb) {
      this.sync_done(mssg);
    } else {
      cb(mssg);
    }

    _this.pyboard.stopWaitingForSilent();

    var _this = this;
    this.exit(() => {
      _this.pyboard.enterFriendlyRepl_non_blocking(() => {
        // do nothing, this might work or not based on what went wrong when synchronizing.
      });
    });
  }

  complete(cb) {
    const _this = this;
    const lcb = function() {
      _this.exit(() => {
        if (_this.oncomplete) {
          _this.oncomplete();
          _this.logger.warning(
            'Oncomplete executed, setting to null',
          );
          _this.oncomplete = null;
        }
        if (cb) {
          cb();
        }
      });
    };
    try {
      _this.utils.rmdir(
        `${this.project_path}/${_this.config.compressed_files_folder}`,
        () => {
          lcb();
        },
      );
    } catch (e) {
      _this.logger.info(
        "Removing py_compressed folder failed, likely it didn't exist",
      );
      _this.logger.info(e);
      lcb();
    }
  }

  removeFilesRecursive(files, cb, depth) {
    const _this = this;
    if (!depth) {
      depth = 0;
    }
    if (files.length == 0) {
      cb();
    } else {
      const file = files[0];
      const filename = file[0];
      const type = file[1];
      if (type == 'd') {
        _this.progress(`Removing dir ${filename}`);
        _this.shell.removeDir(filename, err => {
          if (err) {
            _this.progress(`Failed to remove dir ${filename}`);
          }
          _this.project_status.update(filename);

          if (!_this.isrunning) {
            _this.stoppedByUser(cb);
            return;
          }

          files.splice(0, 1);
          _this.removeFilesRecursive(files, cb, depth + 1);
        });
      } else {
        _this.progress(`Removing file ${filename}`);
        _this.shell.removeFile(filename, err => {
          if (err) {
            _this.progress(`Failed to remove file ${filename}`);
          }
          _this.project_status.update(filename);

          if (!_this.isrunning) {
            _this.stoppedByUser(cb);
            return;
          }

          files.splice(0, 1);
          _this.removeFilesRecursive(files, cb, depth + 1);
        });
      }
    }
  }

  writeFilesRecursive(files, cb, depth) {
    const _this = this;
    if (!depth) {
      depth = 0;
    }

    const writeContinue = (files, cb, depth) => {
      if (files.length === 0) {
        cb();
      } else {
        const file = files[0];
        const filename = file[0];
        const type = file[1];
        const size = file[3] ? Math.round(file[3] / 1000) : 0;
        const check_hash = size < _this.config.hash_check_max_size;
        if (type == 'f') {
          try {
            const file_path = _this.py_folder + filename;
            const contents = fs.readFileSync(file_path);

            let message = `Writing file ${filename} (${size}kb)`;
            let compress = false;
            if (
              _this.settings.fast_upload &&
              size >= _this.compression_limit
            ) {
              compress = true;
              message += ' with compression';
            }

            _this.progress(message, true);
            const start_time = new Date().getTime();
            _this.shell.writeFile(
              filename,
              file_path,
              contents,
              check_hash,
              compress,
              (err, retry) => {
                if (retry) {
                  _this.progress(
                    'Failed to write file, trying again...',
                  );
                  // shell.writeFile automatically starts a re-try and executes the callback again
                  // no other actions needed
                } else {
                  const end_time = new Date().getTime();
                  const duration = (end_time - start_time) / 1000;
                  _this.logger.info(
                    `Completed in ${duration} seconds`,
                  );
                  if (!check_hash) {
                    _this.progress(
                      'Hashcheck not performed, file is > 500kb',
                    );
                  }
                  if (err) {
                    _this.fails += 1;
                    if (_this.fails > _this.max_failures) {
                      cb(err);
                      return;
                    }
                    _this.progress(err.message);
                  } else {
                    _this.project_status.update(filename);
                  }

                  if (!_this.isrunning) {
                    _this.stoppedByUser(cb);
                    return;
                  }
                  files.splice(0, 1);
                  _this.writeFilesRecursive(files, cb, depth + 1);
                }
              },
            );
          } catch (e) {
            _this.progress('Failed to write file');
            _this.logger.error(e);
            _this.writeFilesRecursive(files, cb, depth + 1);
          }
        } else {
          _this.progress(`Creating dir ${filename}`);
          _this.shell.createDir(filename, err => {
            _this.project_status.update(filename);
            files.splice(0, 1);
            _this.writeFilesRecursive(files, cb, depth + 1);
          });
        }
      }
    };

    if (depth > 0 && depth % 8 == 0) {
      this.logger.info('Updating project-status file');
      this.project_status.write(err => {
        writeContinue(files, cb, depth);
      });
    } else {
      writeContinue(files, cb, depth);
    }
  }

  start_shell(cb) {
    this.shell = new Shell(
      this.pyboard,
      cb,
      this.method,
      this.settings,
    );
  }

  _getFiles(dir) {
    return fs.readdirSync(dir);
  }

  _getFilesRecursive(dir) {
    const files = fs.readdirSync(this.py_folder + dir);
    let list = [];
    for (let i = 0; i < files.length; i += 1) {
      const filename = dir + files[i];
      const file_path = this.py_folder + filename;
      const stats = fs.lstatSync(file_path);
      if (!stats.isDirectory()) {
        list.push(filename);
      } else {
        list = list.concat(this._getFilesRecursive(`${filename}/`));
      }
    }
    return list;
  }

  exit(cb) {
    this.shell.exit(err => {
      cb(err);
    });
  }
}
