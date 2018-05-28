'use babel';
var fs = require('fs');
var crypto = require('crypto');
import Logger from '../helpers/logger.js'
import ShellWorkers from './shell-workers.js'
import ApiWrapper from '../main/api-wrapper.js';
import Utils from '../helpers/utils.js';
var binascii = require('binascii');
var utf8 = require('utf8');

var EventEmitter = require('events');
const ee = new EventEmitter();

export default class ProjectStatus {

  constructor(shell,settings,local_folder){
    this.shell = shell
    this.logger = new Logger('ProjectStatus')
    this.local_folder = local_folder
    this.settings = settings
    this.allowed_file_types = this.settings.get_allowed_file_types()
    this.content = []
    this.board_file_hashes = {}
    this.local_file_hashes = this.__get_local_files_hashed()
  }

  read(cb){
    var _this = this
    this.shell.readFile('project.pymakr',function(err,content){
      if(err){
        cb(err)
        return
      }

      var json_content = []
      if(content != ""){
        try{
          json_content = JSON.parse(content)
          err = false
        } catch(e){
          _this.logger.error(e)
          err = true
        }
      }
      _this.content = json_content
      _this.__process_file()
      cb(err,json_content)
    })
  }

  write_all(cb){
    this.board_file_hashes = this.local_file_hashes
    this.write(cb)
  }

  write(cb){
    var board_hash_array = Object.values(this.board_file_hashes)
    var project_file_content = JSON.stringify(board_hash_array)
    this.shell.writeFile('project.pymakr',project_file_content,cb)
  }

  update(filename){
    this.board_file_hashes[name] = this.local_file_hashes[name]
  }

  remove(filename){
    delete this.board_file_hashes[name]
  }

  __process_file(){
    for(var i=0;i<this.content.length;i++){
      var h = this.content[i]
      this.board_file_hashes[h[0]] = h
    }
  }

  __get_local_files(dir){
    return fs.readdirSync(dir)
  }

  __get_local_files_hashed(files,path){
    if(!files){
      files = this.__get_local_files(this.local_folder)
    }
    if(!path){
      path = ""
    }
    var file_hashes = {}

    for(var i=0;i<files.length;i++){
      var filename = path + files[i]
      if(filename.length > 0 && filename.substring(0,1) != "." && files[i].substring(0,1) != "." && files[i].length > 0){
        var file_path = this.local_folder + filename
        var stats = fs.lstatSync(file_path)
        if(stats.isDirectory()){
          var files_from_folder = this.__get_local_files(file_path)
          if(files_from_folder.length > 0){
            var hash = crypto.createHash('sha256').update(filename).digest('hex')
            file_hashes[filename] = [filename,"d",hash]
            var hashes_in_folder = this.__get_local_files_hashed(files_from_folder,filename+"/")
            file_hashes = Object.assign(file_hashes,hashes_in_folder)
          }else{
            console.log("No files in folder "+file_path)
          }
        }else if(this.allowed_file_types.indexOf(filename.split('.').pop()) > -1){
          this.total_file_size += stats.size
          this.total_number_of_files += 1
          var contents = fs.readFileSync(file_path,'utf8')
          var hash = crypto.createHash('sha256').update(contents).digest('hex')
          file_hashes[filename] = [filename,"f",hash]
        }
      }
    }
    console.log(file_hashes)
    return file_hashes
  }

  get_changes(){
    var changed_files = []
    var changed_folders = []
    var deletes = []
    var board_hashes = this.board_file_hashes
    var local_hashes = this.local_file_hashes

    console.log(board_hashes)
    console.log(local_hashes)

    // all local files
    for(var name in local_hashes){
      var local_hash = this.local_file_hashes[name]
      var board_hash = board_hashes[name]
      console.log(board_hash)
      console.log(local_hash)

      if(board_hash){
        // check is hash is the same
        console.log(local_hash[2],board_hash[2])
        if (local_hash[2] != board_hash[2]){

          if(local_hash[1] == "f"){
            changed_files.push(local_hash)
          }else{
            changed_folders.push(local_hash)
          }
        }else{
          console.log("Same..")
        }
        delete board_hashes[name]

      }else{
        if(local_hash[1] == "f"){
          changed_files.push(local_hash)
        }else{
          changed_folders.push(local_hash)
        }
      }
    }
    for(var name in board_hashes){
      if(board_hashes[name][1] == 'f'){
        deletes.push(board_hashes[name])
      }else{
        deletes.unshift(board_hashes[name])
      }

    }
    return {'delete': deletes, 'files': changed_files,'folders': changed_folders}
  }


}
