'use babel';
fs = require('fs');

export default class SettingsWrapper {
  constructor() {
    this.project_path = null
    var project_paths = atom.project.getPaths()
    if(project_paths.length > 0){
      this.project_path = project_paths[0]
    }
    this.project_config = {}
    this.config_file = this.project_path+"/pymakr.conf"
    this.refresh()
    this.refreshProjectConfig()

    var _this = this
    atom.config.observe('pymakr',function(){
      _this.refresh()
    })
    this.watchConfigFile()
  }

  watchConfigFile(){
    var _this = this
    console.log("Watching "+this.config_file)
    fs.open(this.config_file,'r',function(err,content){
      if(!err){
        fs.watch(_this.config_file,null,function(err){
          console.log("Changed config")
          _this.refreshProjectConfig()
        })
      }
    })

  }

  refresh(){
    this.address = atom.config.get('Pymakr.address')
    this.username = atom.config.get('Pymakr.username')
    this.password = atom.config.get('Pymakr.password')
    this.sync_folder = atom.config.get('Pymakr.sync_folder')
    this.sync_file_types = atom.config.get('Pymakr.sync_file_types')
    this.ctrl_c_on_connect = atom.config.get('Pymakr.ctrl_c_on_connect')
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

    }

    if(contents){
      var conf = {}
      try{
        conf = JSON.parse(contents)
        _this.project_config = conf
      }catch(SyntaxError){
        // do nothing
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
        "address": atom.config.get('Pymakr.address'),
        "username": atom.config.get('Pymakr.username'),
        "password": atom.config.get('Pymakr.password'),
        "sync_folder": atom.config.get('Pymakr.sync_folder')
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
