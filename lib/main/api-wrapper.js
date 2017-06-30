'use babel';
const EventEmitter = require('events');
fs = require('fs');

export default class ApiWrapper {
  constructor() {

  }

  config(key){
    return atom.config.get("Pymakr."+key)
  }

  openSettings(){
    atom.workspace.open("atom://config/packages/Pymakr")
  }

  writeToCipboard(text){
    atom.clipboard.write(text)
  }

  addBottomPanel(options){
    atom.workspace.addBottomPanel(options)
  }

  getPackagePath(){
    return atom.packages.resolvePackagePath('Pymakr')
  }

  getPackageSrcPath(){
    return this.getPackagePath() + "/lib/"
  }

  clipboard(){
    return atom.clipboard.read()
  }

  writeClipboard(text){
    atom.clipboard.write(text)
  }

  getProjectPaths(){
    return atom.project.getPaths()
  }

  getProjectPath(){
    var project_paths = this.getProjectPaths()
    if(project_paths.length > 0){
      return project_paths[0]
    }
    return null
  }

  getOpenFile(cb,onerror){
    editor = atom.workspace.getActivePaneItem()
    if(editor && editor.buffer){
        buffer = editor.buffer
        if(buffer && buffer.file){
          var text = buffer.cachedText
          if(!(text && text.length > 0)){
            text = buffer.file.cachedContents
          }
          console.log(buffer)
          cb(text,buffer.file.path)
        }else{
          onerror("No file open to run")
        }
    }else{
      onerror("No file open to run")
    }
  }
}
