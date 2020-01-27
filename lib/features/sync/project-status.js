'use babel';

import Logger from '../../helpers/logger';
import Utils from '../../helpers/utils';


const fs = require('fs');
const crypto = require('crypto');

export default class ProjectStatus {
  constructor(shell, settings, localFolder) {
    this.shell = shell;
    this.logger = new Logger('ProjectStatus');
    this.utils = new Utils(settings);
    this.local_folder = localFolder;
    this.settings = settings;
    this.allowed_file_types = this.settings.getAllowedFileTypes();
    this.content = [];
    this.board_file_hashes = {};
    this.local_file_hashes = this.getLocalFilesHashed();
    this.changed = false;
  }

  read(cb) {
    const _this = this;
    this.shell.readFile('project.pymakr', (err, contentBuffs, contentStr) => {
      if (err) {
        cb(err);
        return;
      }

      let jsonContent = [];
      if (contentStr !== '') {
        try {
          jsonContent = JSON.parse(contentStr);
          err = false;
        } catch (e) {
          _this.logger.error(e);
          err = true;
        }
      }
      _this.content = jsonContent;
      _this.processFile();
      cb(err, jsonContent);
    });
  }

  writeAll(cb) {
    this.board_file_hashes = this.local_file_hashes;
    this.write(cb);
  }

  write(cb) {
    const _this = this;
    if (this.changed) {
      this.logger.info('Writing project status file to board');
      const boardHashArray = Object.values(this.board_file_hashes);
      const projectFileContent = new Buffer(JSON.stringify(boardHashArray));
      this.shell.writeFile('project.pymakr', null, projectFileContent, true, false, (err) => {
        _this.changed = false;
        cb(err);
      }, 10); // last param prevents any retries
    } else {
      this.logger.info('No changes to file, not writing');
      cb();
    }
  }

  update(name) {
    this.changed = true;
    if (!this.local_file_hashes[name]) {
      delete this.board_file_hashes[name];
    } else {
      this.board_file_hashes[name] = this.local_file_hashes[name];
    }
  }

  remove(filename) {
    delete this.board_file_hashes[filename];
  }

  processFile() {
    for (let i = 0; i < this.content.length; i += 1) {
      const h = this.content[i];
      this.board_file_hashes[h[0]] = h;
    }
  }

  getLocalFiles(dir) {
    if (!dir) {
      return [];
    }
    return fs.readdirSync(dir);
  }

  getLocalFilesHashed(files, path) {
    if (!files) {
      try {
        files = this.getLocalFiles(this.local_folder);
      } catch (e) {
        this.logger.error("Couldn't locate file folder");
        return false;
      }
    }
    if (!path) {
      path = '';
    }
    let fileHashes = {};

    files = this.utils.ignoreFilter(files);

    for (let i = 0; i < files.length; i += 1) {
      const fileName = path + files[i];
      if (fileName.length > 0 && fileName.substring(0, 1) !== '.') {
        const filePath = this.local_folder + fileName;
        const stats = fs.lstatSync(filePath);
        let isDir = stats.isDirectory();
        if (stats.isSymbolicLink()) {
          isDir = fileName.indexOf('.') === -1;
        }
        if (isDir) {
          try {
            const filesFromFolder = this.getLocalFiles(filePath);
            if (filesFromFolder.length > 0) {
              const hash = crypto.createHash('sha256').update(fileName).digest('hex');
              fileHashes[fileName] = [fileName, 'd', hash];
              const hashesInFolder = this.getLocalFilesHashed(filesFromFolder, `${fileName}/`);
              fileHashes = Object.assign(fileHashes, hashesInFolder);
            }
          } catch (e) {
            this.logger.info(`Unable to read from dir ${filePath}`);
            console.error(e);
          }
        } else {
          this.total_file_size += stats.size;
          this.total_number_of_files += 1;
          const contents = fs.readFileSync(filePath);
          const hash = crypto.createHash('sha256').update(contents).digest('hex');
          fileHashes[fileName] = [fileName, 'f', hash, stats.size];
        }
      }
    }
    return fileHashes;
  }

  prepareFile(filePath) {
    const contents = fs.readFileSync(filePath);
    const stats = fs.lstatSync(filePath);
    const hash = crypto.createHash('sha256').update(contents).digest('hex');
    const fileName = filePath.replace(this.local_folder, '');
    const fileList = [];
    const filePathParts = fileName.split('/');
    if (filePathParts.length > 1) {
      let parts = '';
      for (let i = 0; i < filePathParts.length - 1; i += 1) {
        const part = filePathParts[i];
        if (part !== '') {
          parts += part;
          fileList.push([parts, 'd', '', '']);
          parts += '/';
        }
      }
    }
    fileList.push([fileName, 'f', hash, stats.size]);
    return fileList;
  }

  getChanges() {
    const changedFiles = [];
    const changedFolders = [];
    const deletes = [];
    const boardHashes = { ...this.board_file_hashes };
    const localHashes = { ...this.local_file_hashes };

    // all local files
    for (let name in localHashes) {
      const local_hash = this.local_file_hashes[name];
      const boardHash = boardHashes[name];

      if (boardHash) {
        // check if hash is the same
        if (local_hash[2] != boardHash[2]) {
          if (local_hash[1] == 'f') {
            changedFiles.push(local_hash);
          } else {
            changedFolders.push(local_hash);
          }
        }
        delete boardHashes[name];
      } else if (local_hash[1] == 'f') {
        changedFiles.push(local_hash);
      } else {
        changedFolders.push(local_hash);
      }
    }
    for (var name in boardHashes) {
      if (boardHashes[name][1] == 'f') {
        deletes.unshift(boardHashes[name]);
      } else {
        deletes.push(boardHashes[name]);
      }
    }
    return { delete: deletes, files: changedFiles, folders: changedFolders };
  }
}
