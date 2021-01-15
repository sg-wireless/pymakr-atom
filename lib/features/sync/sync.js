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
    this.allowed_file_types = this.settings.getAllowedFileTypes();
    this.project_path = this.api.getProjectPath();
    this.isRunning = false;
    this.is_stopping = false;
    this.fails = 0;
    this.compression_limit = 5; // minimum file size in kb that will be compressed
    this.setPaths();
    this.projectStatus = new ProjectStatus(
      this.shell,
      this.settings,
      this.py_folder,
    );
  }

  isReady() {
    // check if there is a project open
    this.project_path = this.api.getProjectPath();
    if (!this.project_path) {
      return new Error('No project open');
    }
    // check if project exists
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
    let finalText = text;
    if (count) {
      this.progress_file_count += 1;
      finalText = `[${this.progress_file_count}/${this.number_of_changed_files}] ${finalText}`;
    }
    const _this = this;
    setTimeout(() => {
      _this.terminal.writeln(finalText);
    }, 0);
  }

  syncDone(err) {
    this.logger.verbose('Sync done!');
    this.isRunning = false;
    let msg = `${this.method_name} done`;
    if (err) {
      msg = `${this.method_name} failed`;
      msg +=
        err.message && err.message !== '' ? `: ${err.message}` : '';
      if (this.in_raw_mode) {
        msg += '. Please reboot your device manually.';
      }
    } else if (
      this.in_raw_mode &&
      this.settings.reboot_after_upload
    ) {
      msg += ', resetting board...';
    }

    this.terminal.writeln(msg);

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

  resetValues(oncomplete, method) {
    let finalMethod = method;
    // prepare variables
    if (finalMethod !== 'receive') {
      finalMethod = 'send';
      this.method_action = 'Uploading';
      this.method_name = 'Upload';
    }
    this.method = finalMethod;
    this.oncomplete = oncomplete;
    this.total_file_size = 0;
    this.total_number_of_files = 0;
    this.number_of_changed_files = 0;
    this.progress_file_count = 0;
    this.isRunning = true;
    this.in_raw_mode = false;
    this.setPaths();
  }

  setPaths() {
    this.project_path = this.api.getProjectPath();
    if (this.project_path) {
      this.project_name = this.project_path.split('/').pop();

      const dir = this.settings.sync_folder.replace(/^\/|\/$/g, ''); // remove first and last slash
      this.py_folder = `${this.project_path}/`;
      if (dir) {
        this.py_folder += `${dir}/`;
      }

      const { sync_folder: syncFolder } = this.settings;
      const folderName =
        syncFolder === '' ? 'main folder' : syncFolder;
      this.folder_name = folderName;
    }
  }

  checkFileSize(cb) {
    const _this = this;
    this.shell.getFreeMemory(size => {
      if (
        _this.method === 'send' &&
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
      _this.startSync(oncomplete, 'send', files);
    });
  }

  startReceive(oncomplete) {
    const _this = this;
    this.settings.refresh(() => {
      _this.startSync(oncomplete, 'receive');
    });
  }

  startSync(oncomplete, method, files) {
    this.logger.info(`Start sync method ${method}`);
    const _this = this;
    this.fails = 0;
    this.method = method;

    const cb = err => {
      _this.syncDone(err);
    };

    try {
      this.resetValues(oncomplete, method);
    } catch (e) {
      _this.logger.error(e);
      this.syncDone(e);
      return;
    }

    // check if project is ready to sync
    const ready = this.isReady();
    if (ready instanceof Error) {
      this.syncDone(ready);
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

    _this.safeBoot(err => {
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
      _this.startShell(err2 => {
        _this.in_raw_mode = true;

        _this.projectStatus = new ProjectStatus(
          _this.shell,
          _this.settings,
          _this.py_folder,
        );
        _this.logger.silly('Entered raw mode');

        if (!_this.isRunning) {
          _this.stoppedByUser(cb);
          return;
        }
        if (err2) {
          _this.logger.error(err2);
          _this.throwError(cb, err2);
          _this.exit();
        } else if (_this.method === 'receive') {
          _this.receive(cb, err2);
        } else {
          _this.send(cb, err2, files);
        }
      });
    });
  }

  receive(cb, err) {
    const _this = this;

    _this.progress('Reading files from board');

    if (err) {
      this.progress(
        'Failed to read files from board, canceling file download',
      );
      this.throwError(cb, err);
      return;
    }

    this.shell.listFiles((err2, fileList) => {
      let finalFileList = fileList;
      if (err2) {
        _this.progress(
          'Failed to read files from board, canceling file download',
        );
        _this.throwError(cb, err2);
        return;
      }
      _this.files = _this._getFilesRecursive('');
      const newFiles = [];
      const existingFiles = [];
      finalFileList = _this.utils.ignoreFilter(finalFileList);
      for (let i = 0; i < finalFileList.length; i += 1) {
        const file = finalFileList[i];
        if (_this.files.indexOf(file) > -1) {
          existingFiles.push(file);
        } else {
          newFiles.push(file);
        }
      }
      finalFileList = existingFiles.concat(newFiles);

      let mssg = 'No files found on the board to download';

      if (newFiles.length > 0) {
        mssg = `Found ${newFiles.length} new ${_this.utils.plural(
          'file',
          finalFileList.length,
        )}`;
      }

      if (existingFiles.length > 0) {
        if (newFiles.length === 0) {
          mssg = 'Found ';
        } else {
          mssg += ' and ';
        }
        mssg += `${
          existingFiles.length
        } existing ${_this.utils.plural(
          'file',
          finalFileList.length,
        )}`;
      }
      // _this.progress(mssg)

      const time = Date.now();

      const checkTimeout = () => {
        if (Date.now() - time > 29000) {
          _this.throwError(
            cb,
            new Error('Choice timeout (30 seconds) occurred.'),
          );
          return false;
        }
        return true;
      };

      const cancel = () => {
        if (checkTimeout()) {
          _this.progress('Canceled');
          _this.complete(cb);
        }
      };

      const override = () => {
        if (checkTimeout()) {
          _this.progress(
            `Downloading ${finalFileList.length} ${_this.utils.plural(
              'file',
              finalFileList.length,
            )}...`,
          );
          _this.progress_file_count = 0;
          _this.number_of_changed_files = finalFileList.length;
          _this.receiveFiles(0, finalFileList, () => {
            _this.logger.info('All items received');
            _this.progress('All items overritten');
            _this.complete(cb);
          });
        }
      };

      const onlyNew = () => {
        if (checkTimeout()) {
          _this.progress(`Downloading ${newFiles.length} files...`);
          _this.progress_file_count = 0;
          _this.number_of_changed_files = newFiles.length;
          _this.receiveFiles(0, newFiles, () => {
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
      if (newFiles.length > 0) {
        options['Only new files'] = onlyNew;
      }
      setTimeout(() => {
        if (finalFileList.length === 0) {
          _this.complete(cb);
          return true;
        }

        mssg = `${mssg}. Do you want to download these files into your project (${_this.project_name} - ${_this.folder_name}), overwriting existing files?`;
        _this.progress(mssg);
        _this.progress(
          '(Use the confirmation box at the top of the screen)',
        );
        _this.api.confirm('Downloading files', mssg, options)
        return true;
      }, 100);
    });
  }

  safeBoot(cb) {
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
      return true;
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
    _this.shell.readFile(filename, (err, contentBuffer) => {
      if (err) {
        _this.progress(`Failed to download ${filename}`);
        _this.logger.error(err);
        _this.receiveFiles(i + 1, list, cb);
      } else {
        const f = _this.py_folder + filename;
        _this.utils.ensureFileDirectoryExistence(f);
        try {
          const stream = fs.createWriteStream(f);

          stream.once('open', () => {
            for (let j = 0; j < contentBuffer.length; j += 1) {
              stream.write(contentBuffer[j]);
            }
            stream.end();
            _this.receiveFiles(i + 1, list, cb);
          });
        } catch (e) {
          _this.logger.error(`Failed to open and write ${f}`);
          _this.logger.error(e);
          _this.progress(`Failed to write to local file ${filename}`);
          _this.receiveFiles(i + 1, list, cb);
        }
      }
    });
  }

  send(cb, err, files) {
    const _this = this;
    let finalFiles = files;
    this.progress('Reading file status');
    this.logger.info('Reading pymakr file');

    _this.projectStatus.read(err2 => {
      if (!_this.isRunning) {
        _this.stoppedByUser(cb);
        return;
      }

      // if files given, only upload those files
      if (finalFiles) {
        if (!Array.isArray(finalFiles)) {
          finalFiles = _this.projectStatus.prepareFile(finalFiles);
          _this.progress('Uploading single file');
        } else {
          _this.progress(`Uploading ${finalFiles.length} files`);
        }
        _this.number_of_changed_files = finalFiles.length;
        _this.writeFiles(cb, finalFiles);

        // otherwise, write changes based on project status file
      } else {
        if (err2) {
          _this.progress(
            'Failed to read project status, uploading all files',
          );
        }
        _this.writeChanges(cb);
      }
    });
  }

  writeChanges(cb) {
    const _this = this;

    const changes = _this.projectStatus.getChanges();

    const deletes = changes.delete;
    const changedFiles = changes.files;
    const changedFolders = changes.folders;
    const changedFilesFolders = changedFolders.concat(changedFiles);

    _this.number_of_changed_files = changedFiles.length;
    _this.max_failures = Math.min(
      Math.ceil(changedFiles.length / 2),
      5,
    );

    if (deletes.length > 0) {
      _this.progress(
        `Deleting ${deletes.length.toString()} files/folders`,
      );
    }

    if (
      deletes.length === 0 &&
      changedFiles.length === 0 &&
      changedFolders.length === 0
    ) {
      _this.progress('No files to upload');
      _this.complete(cb);
    } else {
      _this.logger.info('Removing files');
      _this.removeFilesRecursive(deletes, () => {
        if (!_this.isRunning) {
          _this.stoppedByUser(cb);
          return;
        }
        if (deletes.length > 0) {
          _this.logger.info('Updating project-status file');
        }
        _this.projectStatus.write(() => {
          _this.writeFiles(cb, changedFilesFolders);
        });
      });
    }
  }

  writeFiles(cb, filesAndFolders) {
    const _this = this;
    _this.logger.info('Writing changed folders');
    _this.writeFilesRecursive(filesAndFolders, err => {
      if (!_this.isRunning) {
        _this.stoppedByUser(cb);
        return;
      }

      if (err) {
        _this.throwError(cb, err);
        return;
      }

      setTimeout(() => {
        _this.logger.info('Writing project file');
        _this.projectStatus.write(err2 => {
          if (!_this.isRunning) {
            _this.stoppedByUser(cb);
            return;
          }
          if (err2) {
            _this.throwError(cb, err2);
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
    this.isRunning = false;
  }

  stop(cb) {
    const _this = this;
    this.stopSilent();

    if (!this.shell) {
      _this.isRunning = false;
      cb();
      return;
    }
    this.shell.stopWorking(() => {
      _this.isRunning = false;
      _this.projectStatus.write(() => {
        _this.complete(() => {
          _this.pyboard.stopWaitingForSilent();
          cb();
        });
      });
    });
  }

  stoppedByUser() {
    this.logger.warning('Sync canceled');
    if (!this.is_stopping) {
      this.is_stopping = true;
    }
  }

  throwError(cb, err) {
    const _this = this;
    const mssg = err || new Error('');

    this.logger.warning('Error thrown during sync procedure');

    if (!cb) {
      this.syncDone(mssg);
    } else {
      cb(mssg);
    }

    _this.pyboard.stopWaitingForSilent();
    this.exit(() => {
      _this.pyboard.enterFriendlyReplNonBlocking(() => {
        // do nothing, this might work or not based on what went wrong when synchronizing.
      });
    });
  }

  complete(cb) {
    const _this = this;
    const lcb = () => {
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
    let finalDepth = depth;
    if (!finalDepth) {
      finalDepth = 0;
    }
    if (files.length === 0) {
      cb();
    } else {
      const file = files[0];
      const filename = file[0];
      const type = file[1];
      if (type === 'd') {
        _this.progress(`Removing dir ${filename}`);
        _this.shell.removeDir(filename, err => {
          if (err) {
            _this.progress(`Failed to remove dir ${filename}`);
          }
          _this.projectStatus.update(filename);

          if (!_this.isRunning) {
            _this.stoppedByUser(cb);
            return;
          }

          files.splice(0, 1);
          _this.removeFilesRecursive(files, cb, finalDepth + 1);
        });
      } else {
        _this.progress(`Removing file ${filename}`);
        _this.shell.removeFile(filename, err => {
          if (err) {
            _this.progress(`Failed to remove file ${filename}`);
          }
          _this.projectStatus.update(filename);

          if (!_this.isRunning) {
            _this.stoppedByUser(cb);
            return;
          }

          files.splice(0, 1);
          _this.removeFilesRecursive(files, cb, finalDepth + 1);
        });
      }
    }
  }

  writeFilesRecursive(files, cb, depth) {
    const _this = this;
    let finalDepth = depth;
    if (!finalDepth) {
      finalDepth = 0;
    }

    const writeContinue = (files2, cb2, depth2) => {
      if (files2.length === 0) {
        cb2();
      } else {
        const file = files2[0];
        const filename = file[0];
        const type = file[1];
        const size = file[3] ? Math.round(file[3] / 1000) : 0;
        const checkHash = size < _this.config.hash_check_max_size;
        if (type === 'f') {
          try {
            const filePath = _this.py_folder + filename;
            const contents = fs.readFileSync(filePath);

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
            const startTime = new Date().getTime();
            _this.shell.writeFile(
              filename,
              filePath,
              contents,
              checkHash,
              compress,
              (err, retry) => {
                if (retry) {
                  _this.progress(
                    'Failed to write file, trying again...',
                  );
                  // shell.writeFile automatically starts a re-try and executes the callback again
                  // no other actions needed
                } else {
                  const endTime = new Date().getTime();
                  const duration = (endTime - startTime) / 1000;
                  _this.logger.info(
                    `Completed in ${duration} seconds`,
                  );
                  if (!checkHash) {
                    _this.progress(
                      'Hashcheck not performed, file is > 500kb',
                    );
                  }
                  if (err) {
                    _this.fails += 1;
                    if (_this.fails > _this.max_failures) {
                      cb2(err);
                      return;
                    }
                    _this.progress(err.message);
                  } else {
                    _this.projectStatus.update(filename);
                  }

                  if (!_this.isRunning) {
                    _this.stoppedByUser(cb2);
                    return;
                  }
                  files2.splice(0, 1);
                  _this.writeFilesRecursive(files2, cb2, depth2 + 1);
                }
              },
            );
          } catch (e) {
            _this.progress('Failed to write file');
            _this.logger.error(e);
            _this.writeFilesRecursive(files2, cb2, depth2 + 1);
          }
        } else {
          _this.progress(`Creating dir ${filename}`);
          _this.shell.createDir(filename, () => {
            _this.projectStatus.update(filename);
            files2.splice(0, 1);
            _this.writeFilesRecursive(files2, cb2, depth2 + 1);
          });
        }
      }
    };

    if (finalDepth > 0 && finalDepth % 8 === 0) {
      this.logger.info('Updating project-status file');
      this.projectStatus.write(() => {
        writeContinue(files, cb, finalDepth);
      });
    } else {
      writeContinue(files, cb, finalDepth);
    }
  }

  startShell(cb) {
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
      const filePath = this.py_folder + filename;
      const stats = fs.lstatSync(filePath);
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
