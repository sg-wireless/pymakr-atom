'use babel';
var fs = require('fs');
import Logger from '../helpers/logger.js'
import ApiWrapper from '../main/api-wrapper.js';
var binascii = require('binascii');
var utf8 = require('utf8');

var EventEmitter = require('events');
const ee = new EventEmitter();

export default class ShellWorkers {
  BIN_CHUNK_SIZE = 512

  constructor(shell,pyboard,settings){
    this.shell = shell
    console.log(this.shell)
    this.pyboard = pyboard
    this.settings = settings
  }

  write_file(content,callback){
    var _this = this
    var blocksize = _this.BIN_CHUNK_SIZE
    var chunk = content.slice(0,blocksize)
    content = content.slice(blocksize,content.length)
    if(chunk.length == 0){
      callback()
    }else{
      c = binascii.hexlify(chunk)
      _this.pyboard.exec_raw("f.write(ubinascii.unhexlify('"+c+"'))\r\n",function(err,data){
        if(err){
          _this.logger.error("Failed to write chunk:")
          console.log(err)
          callback(err)
          return
        }
        callback(null,content,true)
      })
    }
  }

  list_files(params,callback){
    var _this = this
    var [root,names,file_list] = params
    console.log("List_files. current file list:")
    console.log(file_list)

    if(names.length == 0){
      console.log("Done! end list:")
      console.log(file_list)
      callback(null,file_list,true)
    }else{
      var current_file = names[0]
      var current_file_root = root + "/" + current_file
      names = names.splice(1)
      var is_dir = current_file.indexOf('.') == -1
      if(is_dir){
        c = "import ubinascii,sys\r\n"
        c += "list = ubinascii.hexlify(str(os.listdir('"+current_file_root + "')))\r\n"
        c += "sys.stdout.write(list)\r\n"
        console.log(this.shell)
        _this.shell.eval(c,function(err,content){
            console.log(content)
            data = binascii.unhexlify(content)
            data = data.slice(1,-2)
            // try{
              list = eval(data)


              console.log("Got content from folder "+current_file_root)
              console.log(list)
              for(var i=0;i<list.length;i++){
                var item = list[i]
                names.push(_this.get_file_with_path(current_file_root,item))
              }
              callback(null,[root,names,file_list])

              // new_file_list = []
              // _this.list_files([current_file_root,list,new_file_list],function(err,r,complete){
              //   console.log("Done processing files in folder "+current_file_root)
              //   console.log(r)
              //   file_list.concat(r[2])
              //   console.log("file_list")
              //   // _this.listFilesRecursively(root,names,file_list,cb)
              //   callback(null,[current_file_root,names,file_list])
              // })
            // }catch(e){
            //   console.log("Evaluation of content went wrong")
            //   console.log(e)
            //   callback(e,[root,names,file_list])
            // }
        })
      }else{
        // root_cleaned = root.replace('/flash/','')
        //
        // if(root_cleaned != ""){
        //    root_cleaned += "/"
        // }
        // file_path = root_cleaned + current_file
        // if(file_path[0] == "/"){
        //   file_path = file_path.substring(1)
        // }
        file_list.push(_this.get_file_with_path(root,current_file))
        console.log("Pushed "+file_path+" to list:")
        console.log(file_list)
        callback(null,[root,names,file_list])

      }
    }
  }

  get_file_with_path(root,file){
    root_cleaned = root.replace('/flash/','')

    if(root_cleaned != ""){
       root_cleaned += "/"
    }
    file_path = root_cleaned + file
    if(file_path[0] == "/"){
      file_path = file_path.substring(1)
    }
    return file_path
  }
}
