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

  getPackageSrcPath(){
    return atom.packages.resolvePackagePath('Pymakr') + "/lib/"
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
