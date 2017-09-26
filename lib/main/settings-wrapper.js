'use babel';
const EventEmitter = require('events');
import ApiWrapper from './api-wrapper.js';
import Logger from '../helpers/logger.js'
var fs = require('fs');

export default class SettingsWrapper extends EventEmitter {
  constructor() {
    super()
    this.project_config = {}
    this.api = new ApiWrapper()
    this.project_path = this.api.getProjectPath()
    this.config_file = this.project_path+"/pymakr.conf"
    this.json_valid = true
    this.logger = new Logger('SettingsWrapper')

    this.refresh()
    this.refreshProjectConfig()
    this.watchConfigFile()
  }

  getProjectPath(){
    this.project_path = this.api.getProjectPath()
    this.config_file = this.project_path+"/pymakr.conf"
    return this.project_path
  }

  watchConfigFile(){
    this.logger.info("Watching config file "+this.config_file)
    var _this = this
    fs.open(this.config_file,'r',function(err,content){
      if(!err){
        fs.watch(_this.config_file,null,function(err){
          _this.logger.info("Config file changed, refreshing settings")
          _this.refreshProjectConfig()
        })
      }else{
        _this.logger.warning("Error opening config file ")
        _this.logger.warning(err)
      }
    })

  }

  refresh(){
    this.address = this.api.config('address')
    this.username = this.api.config('username')
    this.password = this.api.config('password')
    this.sync_folder = this.api.config('sync_folder')
    this.sync_file_types = this.api.config('sync_file_types')
    this.ctrl_c_on_connect = this.api.config('ctrl_c_on_connect')
    this.open_on_start = this.api.config('open_on_start')
    this.timeout = 15000
    this.setProjectConfig()
  }

  refreshProjectConfig(){
    this.logger.info("Refreshing project config")
    var _this = this
    this.project_config = {}
    var contents = null
    try{
      contents = fs.readFileSync(this.config_file,{encoding: 'utf-8'})
      this.logger.silly("Found contents")
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
    if('open_on_start' in this.project_config){
      this.open_on_start = this.project_config.open_on_start
    }
  }

  getDefaultProjectConfig(){
    var config = {
        "address": this.api.config('address'),
        "username": this.api.config('username'),
        "password": this.api.config('password'),
        "sync_folder": this.api.config('sync_folder'),
        "open_on_start": this.api.config('open_on_start')
    }
    if(global){
      config.sync_file_types = this.api.config('sync_file_types')
      config.ctrl_c_on_connect = this.api.config('ctrl_c_on_connect')
    }
    return config
  }

  openProjectSettings(cb){
    var _this = this
    if(this.getProjectPath()){
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
