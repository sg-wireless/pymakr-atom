'use babel';
const EventEmitter = require('events');
fs = require('fs');

export default class ApiWrapper {
  constructor() {

  }

  config(){
    return atom.config
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
    return  this.getPackagePath() + "/lib/"
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
        if(buffer){
          cb(buffer.file)
        }else{
          onerror("No file open to run")
        }
    }else{
      onerror("No file open to run")
    }
  }
}
