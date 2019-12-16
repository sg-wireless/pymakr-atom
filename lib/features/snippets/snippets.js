'use babel';

import ApiWrapper from '../../wrappers/api-wrapper';
import Utils from '../../helpers/utils';
import ConfigSnippets from '../../../snippets/index';

const fs = require('fs');
const slugify = require('slugify');

export default class Snippets {
  constructor(view, settings) {
    this.view = view;
    this.api = new ApiWrapper();
    this.utils = new Utils(settings);
    this.arraylist = ConfigSnippets.defaults().files;
    this.hashlist = {};
    this.custom_snippets_index = {};
    this.package_path = this.api.getPackagePath();
    this.project_path = this.api.getProjectPath();
    this.snippets_path = `${this.package_path}/snippets/`;
    this.custom_snippets_path = `${this.api.getIDEPath()}/pymakr_snippets/`;
    this.custom_snippets_index_path = `${this.custom_snippets_path}index.json`;

    this.__prepareCustomSnippetsPath();

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

    this.view.on('snippet.add_new', (snippet) => {
      _this.create_new(snippet);
    });
  }

  __prepareCustomSnippetsPath() {
    this.utils.ensureDirectoryExistence(this.custom_snippets_path);
    this.utils.ensureFileDirectoryExistence(this.custom_snippets_index_path);
    try {
      const snippets_index_content = fs.readFileSync(this.custom_snippets_index_path);
      this.custom_snippets_index = JSON.parse(snippets_index_content);
    } catch (e) {
      // no problem, index didn't exist yet, just initialse an empty one
      this.custom_snippets_index = [];
    }
  }

  __addToCustomSnippetsIndex(snippet) {
    this.custom_snippets_index.push(snippet);
    fs.writeFile(this.custom_snippets_index_path, JSON.stringify(this.custom_snippets_index));
  }

  list() {
    // fixed snippets
    for (var i in this.arraylist) {
      var item = this.arraylist[i];
      this.addToList(item, this.snippets_path);
    }

    // custom snippets
    for (var i in this.custom_snippets_index) {
      var item = this.custom_snippets_index[i];
      this.addToList(item, this.custom_snippets_path);
    }

    return this.hashlist;
  }

  addToList(item, path) {
    item.filename = `${item.id}.py`;
    item.filepath = path + item.filename;
    item.code = fs.readFileSync(item.filepath);
    this.hashlist[item.id] = item;
    return item;
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

  create_new(snippet) {
    const id = slugify(snippet.name.toLowerCase());
    snippet.id = id;
    snippet.custom = true;
    const filepath = `${this.custom_snippets_path + id}.py`;
    fs.writeFile(filepath, snippet.code);
    this.api.info(`Created new snippet ${id}.py `);

    this.__addToCustomSnippetsIndex(snippet);
    this.addToList(snippet, this.custom_snippets_path);
    this.view.emit('snippets.created_new', snippet);

    return fs.existsSync(filepath);
  }
}
