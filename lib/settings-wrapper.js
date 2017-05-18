'use babel';
const EventEmitter = require('events');
import ApiWrapper from './api-wrapper.js';
fs = require('fs');

export default class SettingsWrapper extends EventEmitter {
  constructor() {
    super()
    this.project_path = null
    this.project_config = {}
    this.api = new ApiWrapper()
    var project_paths = this.api.getProjectPaths()
    if(project_paths.length > 0){
      this.project_path = project_paths[0]
    }
    this.config_file = this.project_path+"/pymakr.conf"
    this.json_valid = true


    this.refresh()
    this.refreshProjectConfig()
    this.watchConfigFile()
  }

  watchConfigFile(){
    var _this = this
    fs.open(this.config_file,'r',function(err,content){
      if(!err){
        fs.watch(_this.config_file,null,function(err){
          _this.refreshProjectConfig()
        })
      }
    })

  }

  refresh(){
    this.address = this.api.config().get('Pymakr.address')
    this.username = this.api.config().get('Pymakr.username')
    this.password = this.api.config().get('Pymakr.password')
    this.sync_folder = this.api.config().get('Pymakr.sync_folder')
    this.sync_file_types = this.api.config().get('Pymakr.sync_file_types')
    this.ctrl_c_on_connect = this.api.config().get('Pymakr.ctrl_c_on_connect')
    this.timeout = 15000
    this.setProjectConfig()
  }

  refreshProjectConfig(){
    var _this = this
    this.project_config = {}
    var contents = null
    try{
      contents = fs.readFileSync(this.config_file,{encoding: 'utf-8'})
    }catch(Error){
      // file not found
      return null
    }

    if(contents){
      try{
        var conf = JSON.parse(contents)
        _this.project_config = conf
      }catch(SyntaxError){
        if(_this.json_valid){
          _this.json_valid = false
          _this.emit('format_error')
        }else{
          _this.json_valid = true
        }
      }
      _this.setProjectConfig()
    }
  }

  setProjectConfig(){
    if('address' in this.project_config){
      this.address = this.project_config.address
    }
    if('username' in this.project_config){
      this.username = this.project_config.username
    }
    if('password' in this.project_config){
      this.password = this.project_config.password
    }
    if('sync_folder' in this.project_config){
      this.sync_folder = this.project_config.sync_folder
    }
  }

  getDefaultProjectConfig(){
    return {
        "address": this.api.config.get('Pymakr.address'),
        "username": this.api.config.get('Pymakr.username'),
        "password": this.api.config.get('Pymakr.password'),
        "sync_folder": this.api.config.get('Pymakr.sync_folder')
    }
  }

  openProjectSettings(cb){
    var _this = this
    if(this.project_path){
      var config_file = this.config_file
      fs.open(config_file,'r',function(err,contents){
          if(err){
            var json_string = _this.newProjectSettingsJson()
            fs.writeFile(config_file, json_string, function(err) {
              if(err){
                cb(new Error(err))
                return
              }
              _this.watchConfigFile()
              atom.workspace.open(config_file)
            })
          }else{
            atom.workspace.open(config_file)
          }
          cb()
      })
    }else{
      cb(new Error("No project open"))
    }
  }

  newProjectSettingsJson(){
    var settings = this.getDefaultProjectConfig()
    var json_string = JSON.stringify(settings,null,4)
    return json_string
  }
}
