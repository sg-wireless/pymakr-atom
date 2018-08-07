'use babel';
const EventEmitter = require('events');
fs = require('fs');
$ = require('jquery')

export default class ApiWrapper {
  constructor(settings) {
    this.project_path = this.getProjectPath()
  }

  config(key){
    return atom.config.get("pymakr."+key)
  }

  openSettings(){
    atom.workspace.open("atom://config/packages/pymakr")
  }

  getConnectionState(com){
    var state = atom.config.get('pymakr.connection_state')
    if(!state) return state
    return state[com]
  }

  setConnectionState(com,state,project_name){
    var timestamp = new Date().getTime()

    var state_object = atom.config.get('pymakr.connection_state')
    if(!state_object){
      state_object = {}
    }
    if(state){
      state_object[com] = {timestamp: timestamp, project: project_name}
    }else if(state_object[com]){
      delete state_object[com]
    }

    atom.config.set('pymakr.connection_state',state_object)
  }

  onConfigChange(key,cb){
    atom.config.onDidChange("pymakr."+key,cb)
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
    return atom.packages.resolvePackagePath('pymakr')
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

  onProjectsChange(cb){
    atom.project.onDidChangePaths(cb)
  }

  listenToProjectChange(cb){
    var _this = this
    $('.tree-view').bind('DOMSubtreeModified', function(e) {
      var path = _this.getProjectPath()
      if(path != _this.project_path){
        _this.project_path = path
        cb(path)
      }
    });
  }

  confirm(title,text,options){
    atom.confirm(
      {
        message: title,
        detailedMessage: text,
        buttons: options
      }
    )
  }

  getProjectPath(){
    var project_paths = this.getProjectPaths()
    var selected_tree = $('.tree-view .selected')[0]
    var project
    if(selected_tree && typeof selected_tree.getPath !== "undefined"){
      var path = selected_tree.getPath()
      for(var i=0;i< project_paths.length;i++){
        if(path == project_paths[i]){
          return path
        }
      }
    }

    if(project_paths.length > 0){
      return project_paths[0]
    }
    return null
  }

  getOpenFile(cb,onerror){
    editor = atom.workspace.getActivePaneItem()
    if(editor && (editor.constructor.name == 'TextEditor' || editor.constructor.name == 'TextBuffer')){
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
