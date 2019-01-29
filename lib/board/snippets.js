'use babel';

import ApiWrapper from '../main/api-wrapper.js';
import Utils from '../helpers/utils.js';
import ConfigSnippets from '../config-snippets.js';
var fs = require('fs');
var slugify = require('slugify')

export default class Snippets {
  constructor(view) {
    this.view = view
    this.api = new ApiWrapper()
    this.arraylist = ConfigSnippets.defaults().files
    this.hashlist = {}
    this.package_path = this.api.getPackageSrcPath()
    this.project_path = this.api.getProjectPath()
    this.snippets_path = this.package_path + "snippets/"
    this.list()

    var _this = this
    this.view.on('snippet.copy',function(id){
      _this.copy(id)
    })

    this.view.on('snippet.create_file',function(id,content){
      _this.create_file(id,content)
    })

    this.view.on('snippet.insert',function(id,content){
      _this.insert(id,content)
    })

    this.view.on('snippet.add_new',function(snippet){
      _this.create_new(snippet)
    })
  }

  list(){
    for(var i in this.arraylist){
      var item = this.arraylist[i]
      this.addToList(item)
    }
    return this.arraylist
  }

  addToList(item){
    if(!item.code){
      item.filename = item.id + ".py"
      item.filepath = this.snippets_path + item.filename
      item.code = fs.readFileSync(item.filepath)
    }
    this.hashlist[item.id] = item
    return item
  }

  get(id){
    return this.hashlist[id]
  }

  copy(id){
    this.api.writeToCipboard(this.hashlist[id].code)
    return true
  }

  create_file(id,content){
    var item = this.hashlist[id]
    var filename = id + ".py"
    var filepath = this.project_path + "/" + filename
    var i = 1
    if(!content){
      content = item.code
    }
    while(fs.existsSync(filepath)){
      filename = id + "["+i+"].py"
      filepath = this.project_path + "/" + filename
      i+=1
    }
    fs.writeFile(filepath,content)
    atom.workspace.open(filepath)
    this.api.info("Created snippet file "+filename+" inside your project")
    return fs.existsSync(filepath)
  }

  insert(id,content){
    if(!content){
      content = this.hashlist[id].code
    }
    return this.api.insertInOpenFile(content)
  }

  create_new(snippet){
    var id = slugify(snippet.name.toLowerCase())
    snippet.id = id
    var filepath = this.snippets_path + id + ".py"
    fs.writeFile(filepath,snippet.code)
    this.api.info("Created new snippet "+id+".py ")

    snippet.code = null
    var snippet = this.addToList(snippet)
    this.view.emit("snippets.created_new",snippet)
    return fs.existsSync(filepath)
  }
}
