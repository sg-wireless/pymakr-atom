'use babel';

import Logger from '../helpers/logger';
import ShellWorkers from './shell-workers';
import ApiWrapper from '../wrappers/api-wrapper';
import Utils from '../helpers/utils';
import Config from '../config';

const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');

export default class Shell {
  constructor(pyboard, cb, method, settings) {
    this.config = Config.constants();
    this.settings = settings;
    this.BIN_CHUNK_SIZE = this.settings.upload_chunk_size;
    this.EOF = '\x04'; // reset (ctrl-d)
    this.RETRIES = 2;
    this.pyboard = pyboard;
    this.api = new ApiWrapper();
    this.logger = new Logger('Shell');
    this.workers = new ShellWorkers(this, pyboard, settings);
    this.utils = new Utils(settings);
    this.lib_folder = this.api.getPackageSrcPath();
    this.package_folder = this.api.getPackagePath();
    this.working = false;
    this.interrupt_cb = null;
    this.interrupted = false;

    this.logger.silly('Try to enter raw mode');
    this.pyboard.enterRawReplNoReset(cb);
  }

  getVersion(cb) {
    const command =
      'import os,sys\r\n' +
      'v = os.uname().release' +
      'sys.stdout.write(v)\r\n';

    this.pyboard.exec_(command, (err, content) => {
      cb(content);
    });
  }

  getFreeMemory(cb) {
    const command =
      'import os,sys\r\n' +
      "m = os.getfree('/flash')" +
      'sys.stdout.write(m)\r\n';

    this.pyboard.exec_(command, (err, content) => {
      cb(content);
    });
  }

  getRootFolder(cb) {
    const command =
      'import os, errno\r\n' +
      'try:\r\n' +
      '    r = "/flash"\r\n' +
      '    _ = os.stat(r)\r\n' +
      'except OSError as e:\r\n' +
      '    if e.args[0] == errno.ENOENT:\r\n' +
      '        r = os.getcwd()\r\n' +
      'finally:\r\n' +
      '    print("\'{}\'".format(r))\r\n';

    this.pyboard.exec_(command, (err, content) => {
      cb(content);
    });
  }

  decompress(name, execute, cb) {
    if (!execute) {
      cb();
      return;
    }
    const command = `${'import uzlib\r\n' +
      'def decompress(name):\r\n' +
      "  with open(name,'r+') as d:\r\n" +
      '    c = uzlib.decompress(d.read())\r\n' +
      "  with open(name,'w') as d:\r\n" +
      '      d.write(c)\r\n' +
      '  del(c)\r\n' +
      "decompress('"}${name}')\r\n`;

    this.pyboard.exec_(
      command,
      (err, content) => {
        cb(content);
      },
      40000,
    );
  }

  compress(filePath, name, cb) {
    const nameOnly = name.substr(name.lastIndexOf('/') + 1);
    const zippedPath = filePath.replace(
      name,
      `${this.config.compressed_files_folder}/`,
    );
    const zippedFilePath = `${zippedPath + nameOnly}.gz`;

    this.utils.ensureDirectoryExistence(zippedPath);

    exec(
      `python ${this.package_folder}/scripts/compress.py "${filePath}" "${zippedFilePath}"`,
      (error, stdout) => {
        cb(error, stdout, zippedFilePath);
      },
    );
  }

  writeFile(
    name,
    filePath,
    contents,
    compareHash,
    compress,
    callback,
    retries = 0,
  ) {
    let finalContents = contents;
    const _this = this;
    this.working = true;
    this.logger.info(`Writing file: ${name}`);
    this.logger.info(`on path: ${filePath}`);
    let compressedPath = null;

    const cb = (err, retry) => {
      setTimeout(() => {
        _this.working = false;
        callback(err, retry);
      }, 100);
    };

    const worker = (content, callbackParam) => {
      if (_this.interrupted) {
        _this.interrupt_cb();
        return;
      }
      _this.workers.writeFile(content, callbackParam);
    };

    const retry = err => {
      if (retries < _this.RETRIES) {
        cb(err, true);

        // if retrying for memory or OS issues (like hash checks gone wrong), do a safe-boot before retrying
        if (
          err &&
          (err.message.indexOf('Not enough memory') > -1 ||
            err.message.indexOf('OSError:') > -1)
        ) {
          _this.logger.info('Safe booting...');
          _this.safebootRestart(() => {
            _this.writeFile(
              name,
              filePath,
              finalContents,
              compareHash,
              compress,
              cb,
              retries + 1,
            );
          });

          // if not for memory issues, do a normal retry
        } else {
          // wait one second to give the board time to process
          setTimeout(() => {
            _this.writeFile(
              name,
              filePath,
              finalContents,
              compareHash,
              compress,
              cb,
              retries + 1,
            );
          }, 1000);
        }
      } else {
        _this.logger.verbose('No more retries:');
        cb(err);
      }
    };

    const end = err => {
      if (_this.interrupted) {
        _this.interrupt_cb();
        return;
      }
      _this.eval('f.close()\r\n', closeErr => {
        if ((err || closeErr) && retries < _this.RETRIES) {
          retry(err);
        } else if (!err && !closeErr) {
          if (compress) {
            try {
              fs.unlinkSync(compressedPath);
            } catch (e) {
              _this.logger.info(
                "Removing compressed file failed, likely because it never existed. Otherwise, it'll be removed with the py_compiles folder after upload",
              );
            }
          }

          _this.decompress(name, compress, () => {
            if (_this.interrupted) {
              _this.interrupt_cb();
              return;
            }
            if (compareHash) {
              _this.boardReady(() => {
                _this.compareHash(
                  name,
                  filePath,
                  finalContents,
                  (match, errParam) => {
                    _this.boardReady(() => {
                      if (match) {
                        cb(null);
                      } else if (errParam) {
                        _this.logger.warning(
                          `Error during file hash check: ${errParam.message}`,
                        );
                        retry(
                          new Error(
                            `Filecheck failed: ${errParam.message}`,
                          ),
                        );
                      } else {
                        _this.logger.warning(
                          "File hash check didn't match, trying again",
                        );
                        retry(new Error('Filecheck failed'));
                      }
                    });
                  },
                );
              });
            } else {
              _this.boardReady(() => {
                cb(null);
              });
            }
          });
        } else if (err) {
          cb(err);
        } else {
          cb(closeErr);
        }
      });
    };

    const start = () => {
      // contents = utf8.encode(contents)
      const getFileCommand = `${'import ubinascii\r\n' +
        "f = open('"}${name}', 'wb')\r\n`;

      _this.pyboard.execRawNoReset(getFileCommand, () => {
        _this.utils.doRecursively([finalContents, 0], worker, end);
      });
    };

    if (compress) {
      _this.compress(filePath, name, (err, output, cp) => {
        compressedPath = cp;
        finalContents = fs.readFileSync(compressedPath);
        start();
      });
    } else {
      start();
    }
  }

  readFile(name, callback) {
    const _this = this;
    _this.working = true;

    const cb = (err, contentBuffer, contentStr) => {
      setTimeout(() => {
        _this.working = false;
        callback(err, contentBuffer, contentStr);
      }, 100);
    };

    let command = 'import ubinascii,sys\r\n';
    command += `f = open('${name}', 'rb')\r\n`;

    command += 'import ubinascii\r\n';

    command +=
      // eslint-disable-next-line prefer-template
      'while True:\r\n' +
      '    c = ubinascii.b2a_base64(f.read(' +
      this.BIN_CHUNK_SIZE +
      '))\r\n' +
      '    sys.stdout.write(c)\r\n' +
      "    if not len(c) or c == b'\\n':\r\n" +
      '        break\r\n';

    this.pyboard.execRaw(
      command,
      (err, content) => {
        let finalContent = content;
        // Workaround for the "OK" return of soft reset, which is sometimes returned with the content
        if (finalContent.indexOf('OK') === 0) {
          finalContent = finalContent.slice(2, finalContent.length);
        }
        const decodeResult = _this.utils.base64decode(finalContent);
        const contentBuffer = decodeResult[1];
        const contentStr = decodeResult[0].toString();

        if (err) {
          _this.logger.silly('Error after executing read');
          _this.logger.silly(err);
        }
        cb(err, contentBuffer, contentStr);
      },
      60000,
    );
  }

  listFiles(cb) {
    const _this = this;
    const fileList = [''];

    const end = () => {
      cb(undefined, fileList);
    };

    const worker = (params, callback) => {
      if (_this.interrupted) {
        _this.interrupt_cb();
        return;
      }
      _this.workers.listFiles(params, callback);
    };

    this.utils.doRecursively(['/flash', [''], fileList], worker, end);
  }

  boardReady(cb) {
    const command = 'import sys\r\n' + "sys.stdout.write('OK')\r\n";
    this.eval(command, cb, 25000);
  }

  removeFile(name, cb) {
    const command = `${'import os\r\n' + "os.remove('"}${name}')\r\n`;

    this.eval(command, cb);
  }

  createDir(name, cb) {
    const command = `${'import os\r\n' + "os.mkdir('"}${name}')\r\n`;

    this.eval(command, cb);
  }

  removeDir(name, cb) {
    const command = `${'import os\r\n' + "os.rmdir('"}${name}')\r\n`;

    this.eval(command, cb);
  }

  reset(cb) {
    const _this = this;
    const command = 'import machine\r\n' + 'machine.reset()\r\n';

    this.pyboard.execRawNoReset(command, () => {
      // don't wait for soft reset to be done, because device will be resetting
      _this.pyboard.softResetNoFollow(cb);
    });
  }

  safebootRestart(cb) {
    const _this = this;
    this.pyboard.safeBoot(() => {
      _this.pyboard.enterRawReplNoReset(cb);
    }, 4000);
  }

  // eslint-disable-next-line camelcase
  get_version(cb) {
    const _this = this;
    const command = 'import os; os.uname().release\r\n';

    this.eval(command, (err, content) => {
      const version = content
        .replace(command, '')
        .replace(/>>>/g, '')
        .replace(/'/g, '')
        .replace(/\r\n/g, '')
        .trim();
      const versionInt = _this.utils.calculateIntVersion(version);
      if (versionInt === 0 || isNaN(versionInt)) {
        err = new Error('Error retrieving version number');
      } else {
        err = undefined;
      }
      cb(err, versionInt, version);
    });
  }

  compareHash(filename, filePath, contentBuffer, cb) {
    const _this = this;

    const compare = localHash => {
      _this.getHash(filename, (err, remoteHash) => {
        _this.logger.silly('Comparing local hash to remote hash');
        _this.logger.silly(`local: ${localHash}`);
        _this.logger.silly(`remote: ${remoteHash}`);
        cb(localHash === remoteHash, err);
      });
    };
    // the file you want to get the hash
    if (filePath) {
      const fd = fs.createReadStream(filePath);
      const hash = crypto.createHash('sha256');
      hash.setEncoding('hex');

      fd.on('end', () => {
        hash.end();
        const localHash = hash.read();
        compare(localHash);
      });
      fd.pipe(hash);
    } else {
      const localHash = crypto
        .createHash('sha256')
        .update(contentBuffer.toString())
        .digest('hex');
      compare(localHash);
    }
  }

  getHash(filename, cb) {
    const _this = this;

    const command =
      `${'import uhashlib,ubinascii,sys\r\n' +
        'hash = uhashlib.sha256()\r\n' +
        "with open('"}${filename}', 'rb') as f:\r\n` +
      '  while True:\r\n' +
      `    c = f.read(${this.BIN_CHUNK_SIZE})\r\n` +
      '    if not c:\r\n' +
      '       break\r\n' +
      '    hash.update(c)\r\n' +
      'sys.stdout.write(ubinascii.hexlify(hash.digest()))\r\n';

    this.eval(
      command,
      (err, content) => {
        content = content.slice(2, -3).replace('>', '');
        if (err) {
          _this.logger.silly('Error after reading hash:');
          _this.logger.silly(err);
        }
        _this.logger.silly('Returned content from hash:');
        _this.logger.silly(content);
        cb(err, content);
      },
      40000,
    );
  }

  // evaluates command through REPL and returns the resulting feedback
  eval(c, cb, timeout) {
    const _this = this;
    const command = `${c}\r\n`;

    this.pyboard.execRaw(
      command,
      (err, content) => {
        if (!err) {
          err = _this.utils.parseError(content);
        }
        if (err) {
          _this.logger.error(err.message);
        }
        setTimeout(() => {
          cb(err, content);
        }, 100);
      },
      timeout,
    );
  }

  exit(cb) {
    const _this = this;
    this.stopWorking(() => {
      _this.cleanClose(cb);
    });
  }

  stopWorking(cb) {
    const _this = this;
    if (this.working) {
      _this.logger.info(
        'Exiting shell while still working, doing interrupt',
      );
      let cbDone = false;
      this.interrupt_cb = function() {
        cbDone = true;
        _this.working = false;
        _this.interrupted = false;
        _this.interrupt_cb = null;
        _this.logger.info('Interrupt done, closing');
        cb();
      };
      this.interrupted = true;
      setTimeout(() => {
        if (!cbDone) {
          _this.logger.info('Interrupt timed out, continuing anyway');
          cb();
        }
      }, 1000);
    } else {
      _this.logger.info('Not working, continuing closing');
      cb();
    }
  }

  cleanClose(cb) {
    const _this = this;
    _this.logger.info('Closing shell cleanly');

    const finish = err => {
      _this.logger.info('Closed successfully');
      if (_this.pyboard.connection.type !== 'serial') {
        _this.pyboard.disconnectSilent();
      }
      if (cb) {
        _this.logger.info('Callbacking outa here');
        cb(err);
      } else {
        _this.logger.info('No callback?!? Ok, whatevs');
      }
    };

    if (this.settings.reboot_after_upload) {
      _this.logger.info('Rebooting after upload');
      this.reset(finish);
    } else {
      this.pyboard.enterFriendlyRepl(err => {
        _this.pyboard.send('\r\n');
        finish(err);
      });
    }
  }
}
