'use babel';

import ApiWrapper from '../main/api-wrapper.js';
import ConfigSnippets from '../config-snippets.js';
var fs = require('fs');

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

    this.view.on('snippet.create_file',function(id){
      _this.create_file(id)
    })

    this.view.on('snippet.insert',function(id){
      _this.insert(id)
    })

  }

  list(){
    for(var i in this.arraylist){
      var item = this.arraylist[i]
      console.log(item)
      if(!item.code){
        item.filename = item.id + ".py"
        item.filepath = this.snippets_path + item.filename
        console.log(item.filepath)
        item.code = fs.readFileSync(item.filepath)
      }
      this.hashlist[item.id] = item
    }
    return this.arraylist
  }

  get(id){
    return this.hashlist[id]
  }

  copy(id){
    this.api.writeToCipboard(this.hashlist[id].code)
    return true
  }

  create_file(id){
    var item = this.hashlist[id]
    var filename = this.snippets_path + id + ".py"
    var i = 0
    while(fs.existsSync(filename)){
      filename = this.snippets_path + id + "["+i+"].py"
      i+=1
    }
    fs.writeFile(filename,item.code)
    atom.workspace.open(filename)
    return fs.existsSync(filename)
  }

  insert(id){
    return this.api.insertInOpenFile(this.hashlist[id].code)
  }
}
