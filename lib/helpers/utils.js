'use babel';

const path = require('path');
const rimraf = require('rimraf');
const slugify = require('slugify');

// Import this class and create a new logger object in the constructor, providing
// the class name. Use the logger anywhere in the code
// this.logger = new Logger('Pyboard')
// this.logger.warning("Syncing to outdated firmware")
// Result in the console will be:
// [warning] Pyboard | Syncing to outdated firmware

export default class Utils {
  constructor(settings) {
    this.settings = settings;

    // TODO: grab from a .pyignore file or setting
    this.allowed_file_types = this.settings.getAllowedFileTypes();
  }

  // runs a worker recursively untill a task is Done
  // worker should take 2 params: value and a continuation callback
  // continuation callback takes 2 params: error and the processed value
  // calls 'end' whenever the processed_value comes back empty/null or when an error is thrown
  doRecursively(value, worker, end) {
    const _this = this;
    worker(value, (err, processedValue, done) => {
      if (err) {
        end(err);
      } else if (done) {
        end(null, processedValue);
      } else {
        setTimeout(() => {
          _this.doRecursively(processedValue, worker, end);
        }, 20);
      }
    });
  }

  base64decode(b64str) {
    let content = '';
    const bufferList = [];
    const b64strArr = b64str.split('=');

    for (let i = 0; i < b64strArr.length; i += 1) {
      let chunk = b64strArr[i];
      if (chunk.length > 0) {
        // Add == to only the last chunk
        // Ignore last 2 items, becuase the original string contains '==' + some extra chars
        if (i === b64strArr.length - 3) {
          chunk += '==';
        } else {
          chunk += '=';
        }
        const bc = Buffer.from(chunk, 'base64');
        bufferList.push(bc);
        content += bc.toString();
      }
    }
    return [content, bufferList];
  }

  plural(text, number) {
    return text + (number === 1 ? '' : 's');
  }

  parseError(content) {
    const errIndex = content.indexOf('OSError:');
    if (errIndex > -1) {
      return Error(content.slice(errIndex, content.length - 2));
    }
    return null;
  }

  slug(text) {
    return slugify(text);
  }

  ensureFileDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    return this.ensureDirectoryExistence(dirname);
  }

  ensureDirectoryExistence(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    }
    fs.mkdirSync(dirname);
    return false;
  }

  setIgnoreFilter() {
    const ignoreList = this.settings.py_ignore;
    const pyCompFolder = this.settings.config.compressed_files_folder;
    if (ignoreList.indexOf(pyCompFolder) === -1) {
      ignoreList.push(pyCompFolder);
    }
    return ignoreList;
  }

  ignoreFilter(fileList) {
    const newList = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList[i];
      const filename = file.split('/').pop();
      if (
        file &&
        file !== '' &&
        file.length > 0 &&
        file.substring(0, 1) !== '.'
      ) {
        if (
          file.indexOf('.') === -1 ||
          this.settings.sync_all_file_types ||
          this.allowed_file_types.indexOf(file.split('.').pop()) > -1
        ) {
          if (
            this.settings.py_ignore.indexOf(file) === -1 &&
            this.settings.py_ignore.indexOf(filename) === -1
          ) {
            newList.push(file);
          }
        }
      }
    }
    return newList;
  }

  rmdir(pathDir, cb) {
    rimraf(pathDir, () => {
      cb();
    });
  }

  calculateIntVersion(version) {
    const knownTypes = ['a', 'b', 'rc', 'r'];
    if (!version) {
      return 0;
    }
    const versionParts = version.split('.');
    const dots = versionParts.length - 1;
    if (dots === 2) {
      versionParts.push('0');
    }

    for (let i = 0; i < knownTypes.length; i += 1) {
      const t = knownTypes[i];
      if (versionParts[3] && versionParts[3].indexOf(t) > -1) {
        versionParts[3] = versionParts[3].replace(t, '');
      }
    }

    let versionString = '';

    for (let i = 0; i < versionParts.length; i += 1) {
      const val = versionParts[i];
      if (parseInt(val, 10) < 10) {
        versionParts[i] = `0${val}`;
      }
      versionString += versionParts[i];
    }
    return parseInt(versionString, 10);
  }

  fileWasNotExisting(exception) {
    const errorList = ['ENOENT', 'ENODEV', 'EINVAL', 'OSError:'];
    const stre = exception.message;
    for (let i = 0; i < errorList.length; i += 1) {
      if (stre.indexOf(errorList[i]) > -1) {
        return true;
      }
    }
    return false;
  }

  shortenComport(address) {
    const s = address.split('-');
    return s[s.length - 1];
  }

  int16(int) {
    const b = new Buffer(2);
    b.writeUInt16BE(int);
    return b;
  }

  int32(int) {
    const b = new Buffer(4);
    b.writeUInt32BE(int);
    return b;
  }

  isIP(address) {
    const r = RegExp(
      '^http[s]?://((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])',
    );
    return r.test(address);
  }

  isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
  }
}
