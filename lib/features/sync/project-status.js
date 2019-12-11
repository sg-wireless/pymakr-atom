'use babel';

import Logger from '../../helpers/logger';
import Utils from '../../helpers/utils';


const fs = require('fs');
const crypto = require('crypto');

export default class ProjectStatus {
  constructor(shell, settings, local_folder) {
    this.shell = shell;
    this.logger = new Logger('ProjectStatus');
    this.utils = new Utils(settings);
    this.local_folder = local_folder;
    this.settings = settings;
    this.allowed_file_types = this.settings.get_allowed_file_types();
    this.content = [];
    this.board_file_hashes = {};
    this.local_file_hashes = this.__get_local_files_hashed();
    this.changed = false;
  }

  read(cb) {
    const _this = this;
    this.shell.readFile('project.pymakr', (err, content_buffs, content_str) => {
      if (err) {
        cb(err);
        return;
      }

      let json_content = [];
      if (content_str != '') {
        try {
          json_content = JSON.parse(content_str);
          err = false;
        } catch (e) {
          _this.logger.error(e);
          err = true;
        }
      }
      _this.content = json_content;
      _this.__process_file();
      cb(err, json_content);
    });
  }

  write_all(cb) {
    this.board_file_hashes = this.local_file_hashes;
    this.write(cb);
  }

  write(cb) {
    const _this = this;
    if (this.changed) {
      this.logger.info('Writing project status file to board');
      const board_hash_array = Object.values(this.board_file_hashes);
      const project_file_content = new Buffer(JSON.stringify(board_hash_array));
      this.shell.writeFile('project.pymakr', null, project_file_content, true, false, (err) => {
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

  __process_file() {
    for (let i = 0; i < this.content.length; i += 1) {
      const h = this.content[i];
      this.board_file_hashes[h[0]] = h;
    }
  }

  __get_local_files(dir) {
    if (!dir) {
      return [];
    }
    return fs.readdirSync(dir);
  }

  __get_local_files_hashed(files, path) {
    if (!files) {
      try {
        files = this.__get_local_files(this.local_folder);
      } catch (e) {
        this.logger.error("Couldn't locate file folder");
        return false;
      }
    }
    if (!path) {
      path = '';
    }
    let file_hashes = {};

    files = this.utils.ignore_filter(files);

    for (let i = 0; i < files.length; i += 1) {
      const filename = path + files[i];
      if (filename.length > 0 && filename.substring(0, 1) != '.') {
        const file_path = this.local_folder + filename;
        const stats = fs.lstatSync(file_path);
        let is_dir = stats.isDirectory();
        if (stats.isSymbolicLink()) {
          is_dir = filename.indexOf('.') == -1;
        }
        if (is_dir) {
          try {
            const files_from_folder = this.__get_local_files(file_path);
            if (files_from_folder.length > 0) {
              var hash = crypto.createHash('sha256').update(filename).digest('hex');
              file_hashes[filename] = [filename, 'd', hash];
              const hashes_in_folder = this.__get_local_files_hashed(files_from_folder, `${filename}/`);
              file_hashes = Object.assign(file_hashes, hashes_in_folder);
            }
          } catch (e) {
            this.logger.info(`Unable to read from dir ${file_path}`);
            console.log(e);
          }
        } else {
          this.total_file_size += stats.size;
          this.total_number_of_files += 1;
          const contents = fs.readFileSync(file_path);
          var hash = crypto.createHash('sha256').update(contents).digest('hex');
          file_hashes[filename] = [filename, 'f', hash, stats.size];
        }
      }
    }
    return file_hashes;
  }

  prepare_file(file_path) {
    const contents = fs.readFileSync(file_path);
    const stats = fs.lstatSync(file_path);
    const hash = crypto.createHash('sha256').update(contents).digest('hex');
    const file_name = file_path.replace(this.local_folder, '');
    const file_list = [];
    const file_path_parts = file_name.split('/');
    if (file_path_parts.length > 1) {
      let parts = '';
      for (let i = 0; i < file_path_parts.length - 1; i += 1) {
        const part = file_path_parts[i];
        if (part != '') {
          parts += part;
          file_list.push([parts, 'd', '', '']);
          parts += '/';
        }
      }
    }
    file_list.push([file_name, 'f', hash, stats.size]);
    return file_list;
  }

  get_changes() {
    const changed_files = [];
    const changed_folders = [];
    const deletes = [];
    const board_hashes = { ...this.board_file_hashes };
    const local_hashes = { ...this.local_file_hashes };

    // all local files
    for (var name in local_hashes) {
      const local_hash = this.local_file_hashes[name];
      const board_hash = board_hashes[name];

      if (board_hash) {
        // check if hash is the same
        if (local_hash[2] != board_hash[2]) {
          if (local_hash[1] == 'f') {
            changed_files.push(local_hash);
          } else {
            changed_folders.push(local_hash);
          }
        }
        delete board_hashes[name];
      } else if (local_hash[1] == 'f') {
        changed_files.push(local_hash);
      } else {
        changed_folders.push(local_hash);
      }
    }
    for (var name in board_hashes) {
      if (board_hashes[name][1] == 'f') {
        deletes.unshift(board_hashes[name]);
      } else {
        deletes.push(board_hashes[name]);
      }
    }
    return { delete: deletes, files: changed_files, folders: changed_folders };
  }
}
