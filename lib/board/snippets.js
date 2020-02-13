'use babel';

import ApiWrapper from '../main/api-wrapper';
import ConfigSnippets from '../config-snippets';

const fs = require('fs');

export default class Snippets {
  constructor(view) {
    this.view = view;
    this.api = new ApiWrapper();
    this.arraylist = ConfigSnippets.defaults().files;
    this.hashlist = {};
    this.package_path = this.api.getPackageSrcPath();
    this.project_path = this.api.getProjectPath();
    this.snippets_path = `${this.package_path}snippets/`;
    this.list();

    const _this = this;
    this.view.on('snippet.copy', (id) => {
      _this.copy(id);
    });

    this.view.on('snippet.create_file', (id, content) => {
      _this.create_file(id, content);
    });

    this.view.on('snippet.insert', (id, content) => {
      _this.insert(id, content);
    });
  }

  list() {
    for (const i in this.arraylist) {
      const item = this.arraylist[i];
      if (!item.code) {
        item.filename = `${item.id}.py`;
        item.filepath = this.snippets_path + item.filename;
        item.code = fs.readFileSync(item.filepath);
      }
      this.hashlist[item.id] = item;
    }
    return this.arraylist;
  }

  get(id) {
    return this.hashlist[id];
  }

  copy(id) {
    this.api.writeToCipboard(this.hashlist[id].code);
    return true;
  }

  create_file(id, content) {
    const item = this.hashlist[id];
    let filename = `${id}.py`;
    let filepath = `${this.project_path}/${filename}`;
    let i = 1;
    if (!content) {
      content = item.code;
    }
    while (fs.existsSync(filepath)) {
      filename = `${id}[${i}].py`;
      filepath = `${this.project_path}/${filename}`;

      i += 1;
    }
    fs.writeFile(filepath, content);
    atom.workspace.open(filepath);
    this.api.info(`Created snippet file ${filename} inside your project`);
    return fs.existsSync(filepath);
  }

  insert(id, content) {
    if (!content) {
      content = this.hashlist[id].code;
    }
    return this.api.insertInOpenFile(content);
  }
}
