'use babel';

import Logger from '../helpers/logger';

const binascii = require('binascii');

export default class ShellWorkers {
  constructor(shell, pyboard, settings) {
    this.shell = shell;
    this.settings = settings;
    this.BIN_CHUNK_SIZE = this.settings.upload_chunk_size;
    this.pyboard = pyboard;
    this.logger = new Logger('ShellWorkers');
  }

  writeFile(value, callback) {
    const _this = this;
    const blockSize = _this.BIN_CHUNK_SIZE;
    const content = value[0];
    const counter = value[1];
    let errMsg = '';

    if (counter * blockSize >= content.length) {
      callback(null, content, true);
    } else {
      const start = counter * blockSize;
      const end = Math.min((counter + 1) * blockSize, content.length);
      const chunk = content.base64Slice(start, end);
      // c = binascii.b2a_base64(chunk)

      _this.pyboard.execRaw(
        `f.write(ubinascii.a2b_base64('${chunk}'))\r\n`,
        (err, data) => {
          let newErr = err;
          if (
            data.includes('Traceback: ') ||
            data.includes('Error: ')
          ) {
            errMsg = data.slice(data.indexOf('Error: ') + 7, -3);
            newErr = new Error(`Failed to write file: ${errMsg}`);
          }
          if (newErr) {
            _this.logger.error('Failed to write chunk:');
            _this.logger.error(newErr);
            callback(newErr, null);
            return;
          }
          callback(null, [content, counter + 1]);
        },
      );
    }
  }

  listFiles(params, callback) {
    const _this = this;
    let [root, names, fileList] = params;
    if (names.length === 0) {
      callback(null, fileList, true);
    } else {
      const currentFile = names[0];
      const currentFileRoot = `${root}/${currentFile}`;
      names = names.splice(1);
      const isDir = currentFile.indexOf('.') === -1;
      if (isDir) {
        let c = 'import ubinascii,sys\r\n';
        c += `list = ubinascii.hexlify(str(os.listdir('${currentFileRoot}')))\r\n`;
        c += 'sys.stdout.write(list)\r\n';
        _this.shell.eval(c, (err, content) => {
          if (content) {
            let data = binascii.unhexlify(content);
            data = data.slice(1, -2);
            try {
              const list = eval(data);
              for (let i = 0; i < list.length; i += 1) {
                const item = list[i];
                names.push(
                  _this.getFileWithPath(currentFileRoot, item),
                );
              }
              callback(null, [root, names, fileList]);
            } catch (e) {
              _this.logger.error('Evaluation of content went wrong');
              _this.logger.error(e);
              callback(e, [root, names, fileList]);
            }
          } else {
            callback(new Error('Failed to write file'), [
              root,
              names,
              fileList,
            ]);
          }
        });
      } else {
        let filePath = currentFileRoot;
        if (filePath[0] === '/') {
          filePath = filePath.substring(1);
        }

        filePath = filePath.replace('/flash/', '');
        filePath = filePath.replace('flash/', '');

        fileList.push(filePath);
        callback(null, [root, names, fileList]);
      }
    }
  }

  getFileWithPath(root, file) {
    let rootCleaned = root.replace('/flash/', '');
    rootCleaned = rootCleaned.replace('flash/', '');

    if (rootCleaned !== '') {
      rootCleaned += '/';
    }
    let filePath = rootCleaned + file;
    if (filePath[0] === '/') {
      filePath = filePath.substring(1);
    }
    return filePath;
  }
}
