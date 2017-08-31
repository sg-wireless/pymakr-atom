'use babel';
const EventEmitter = require('events');
fs = require('fs');

export default class ApiWrapper {
  constructor(settings) {

  }

  config(key){
    return atom.config.get("Pymakr."+key)
  }

  openSettings(){
    atom.workspace.open("atom://config/packages/Pymakr")
  }

  // only for consistency with VSC
  settingsExist(cb){
    return true
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
    if(editor){
      if(editor.isEmpty()){
        onerror("File is empty")
      }else{
        cb(editor.getText(),editor.getPath())
      }
    }else{
      onerror("No file open to run")
    }
  }
}
