'use babel';

import Config from '../config';

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
    this.allowed_file_types = this.settings.get_allowed_file_types();
  }

  // runs a worker recursively untill a task is Done
  // worker should take 2 params: value and a continuation callback
  // continuation callback takes 2 params: error and the processed value
  // calls 'end' whenever the processed_value comes back empty/null or when an error is thrown
  doRecursively(value, worker, end) {
    const _this = this;
    worker(value, (err, value_processed, done) => {
      if (err) {
        end(err);
      } else if (done) {
        end(null, value_processed);
      } else {
        setTimeout(() => {
          _this.doRecursively(value_processed, worker, end);
        }, 20);
      }
    });
  }

  base64decode(b64str) {
    let content = '';
    const buffer_list = [];
    const b64str_arr = b64str.split('=');

    for (let i = 0; i < b64str_arr.length; i += 1) {
      let chunk = b64str_arr[i];
      if (chunk.length > 0) {
        // Add == to only the last chunk
        // Ignore last 2 items, becuase the original string contains '==' + some extra chars
        if (i == b64str_arr.length - 3) {
          chunk += '==';
        } else {
          chunk += '=';
        }
        const bc = Buffer.from(chunk, 'base64');
        buffer_list.push(bc);
        content += bc.toString();
      }
    }
    return [content, buffer_list];
  }

  plural(text, number) {
    return text + (number == 1 ? '' : 's');
  }

  parse_error(content) {
    err_index = content.indexOf('OSError:');
    if (err_index > -1) {
      return Error(content.slice(err_index, content.length - 2));
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
    // console.log(dirname)
    // this.ensureDirectoryExistence(dirname)
    fs.mkdirSync(dirname);
    return false;
  }

  setIgnoreFilter() {
    const ignore_list = this.settings.py_ignore;
    const py_comp_folder = this.settings.config
      .compressed_files_folder;
    if (ignore_list.indexOf(py_comp_folder) == -1) {
      ignore_list.push(py_comp_folder);
    }
    return ignore_list;
  }

  ignore_filter(fileList) {
    const _this = this;
    const ignore_list = this.setIgnoreFilter();
    const new_list = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList[i];
      const filename = file.split('/').pop();
      if (
        file &&
        file != '' &&
        file.length > 0 &&
        file.substring(0, 1) != '.'
      ) {
        if (
          file.indexOf('.') == -1 ||
          this.settings.sync_all_file_types ||
          this.allowed_file_types.indexOf(file.split('.').pop()) > -1
        ) {
          if (
            this.settings.py_ignore.indexOf(file) == -1 &&
            this.settings.py_ignore.indexOf(filename) == -1
          ) {
            new_list.push(file);
          }
        }
      }
    }
    return new_list;
  }

  rmdir(path, cb) {
    rimraf(path, () => {
      cb();
    });
  }

  calculate_int_version(version) {
    const known_types = ['a', 'b', 'rc', 'r'];
    if (!version) {
      return 0;
    }
    const version_parts = version.split('.');
    const dots = version_parts.length - 1;
    if (dots == 2) {
      version_parts.push('0');
    }

    for (var i = 0; i < known_types.length; i += 1) {
      const t = known_types[i];
      if (version_parts[3] && version_parts[3].indexOf(t) > -1) {
        version_parts[3] = version_parts[3].replace(t, '');
      }
    }

    let version_string = '';

    for (var i = 0; i < version_parts.length; i += 1) {
      const val = version_parts[i];
      if (parseInt(val) < 10) {
        version_parts[i] = `0${val}`;
      }
      version_string += version_parts[i];
    }
    return parseInt(version_string);
  }

  _was_file_not_existing(exception) {
    error_list = ['ENOENT', 'ENODEV', 'EINVAL', 'OSError:'];
    stre = exception.message;
    for (let i = 0; i < error_list.length; i += 1) {
      if (stre.indexOf(error_list[i]) > -1) {
        return true;
      }
    }
    return false;
  }

  shortenComport(address) {
    const s = address.split('-');
    return s[s.length - 1];
  }

  int_16(int) {
    const b = new Buffer(2);
    b.writeUInt16BE(int);
    return b;
  }

  int_32(int) {
    const b = new Buffer(4);
    b.writeUInt32BE(int);
    return b;
  }

  isIP(address) {
    r = RegExp(
      '^http[s]?://((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])',
    );
    return r.test(address);
  }

  isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
  }
}
