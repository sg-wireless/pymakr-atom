'use babel';
var fs = require('fs');
import Logger from '../helpers/logger.js'
import ApiWrapper from '../main/api-wrapper.js';
var binascii = require('binascii');
var utf8 = require('utf8');

var EventEmitter = require('events');
const ee = new EventEmitter();

export default class Monitor {
  BIN_CHUNK_SIZE = 64
  EOF = '\x04' // reset (ctrl-d)

  constructor(pyboard,cb,method){
    this.logger = new Logger('Monitor')
    this.pyboard = pyboard
    this.disconnecting = false
    this.callbacks = null
    this.test_read_count = 0
    this.api = new ApiWrapper()
    var lib_folder = this.api.getPackageSrcPath()

    var data = fs.readFileSync(lib_folder + 'python/minified/monitor.py','utf8')
    this.logger.silly("Try to enter raw mode")
    var _this = this
    this.pyboard.enter_raw_repl_no_reset(cb)
  }

  send_exit(cb){
    this.pyboard.send_cmd('\x00\xFF',function(err){
      setTimeout(function(err){
        cb(err)
      },400)
    },2000)

  }

  stopped(cb){
    if(this.pyboard.connection.type != 'serial'){
      this.pyboard.disconnect_silent()
    }
  }

  exit(cb){
    var _this = this
    this.disconnecting = true

    this.reset(function(err){
        _this.stopped()
        if(cb){
          cb(err)
        }
    })
  }

  requestAck(cb){
    cb()
  }

  getVersion(cb){
    command =
        "import os\r\n" +
        "v = os.uname().release" +
        "sys.stdout.write(v)\r\n"

    this.pyboard.exec_(command,function(err,content){
      console.log("Got version:")
      console.log(err)
      console.log(content)
      cb(content)
    })
  }



  getFreeMemory(cb){
    command =
        "import os\r\n" +
        "m = os.getfree('/flash')" +
        "sys.stdout.write(m)\r\n"

    this.pyboard.exec_(command,function(err,content){
      console.log("Got free memory!")
      console.log(err)
      console.log(content)
      cb(content)
    })
  }


  writeFile(name,contents,cb){
    contents = utf8.encode(contents)
    var _this = this

    get_file_command =
      "import ubinascii\r\n"+
      "f = open('"+name+"', 'wb')\r\n"

    this.pyboard.exec_raw_no_reset(get_file_command,function(){
      _this._writeFileChunkRecursive(contents,64,function(){
        _this.single_command("f.close()\r\n",cb)
      })
    })
  }

  _writeFileChunkRecursive(content,blocksize,cb){
    var _this = this
    var chunk = content.slice(0,blocksize)
    content = content.slice(blocksize,content.length)
    console.log(chunk)

    if(chunk.length == 0){
      console.log("Out of chunks")
      cb()
    }else{

      c = binascii.hexlify(chunk)
      console.log("Executing raw chunk")
      this.pyboard.exec_raw("f.write(ubinascii.unhexlify('"+c+"'))\r\n",function(err,data){
        if(err){
          _this.logger.error("Failed to write chunk:")
          console.log(err)
        }
        console.log("Continuing the next chunk")
        _this._writeFileChunkRecursive(content,blocksize,cb)
      })
    }
  }

  readFile(name,cb){
    var _this = this

    command = "import ubinascii,sys\r\n"
    command += "f = open('"+name+"', 'rb')\r\n"

    command += "import ubinascii\r\n"

    command +=
        "while True:\r\n" +
        "    c = ubinascii.hexlify(f.read("+this.BIN_CHUNK_SIZE+"))\r\n" +
        "    if not len(c):\r\n" +
        "        break\r\n" +
        "    sys.stdout.write(c)\r\n"

    this.pyboard.exec_(command,function(err,content){
      _this.pyboard.soft_reset(function(err_soft_reset,data){
        console.log("Got content!")
        content = binascii.unhexlify(content)
        content = content.slice(1,-2)
        _this.logger.silly(err)
        _this.logger.silly(content)
        cb(err,content)
      },2000,false)

    })
  }


  removeFile(name,cb){
    var _this = this
    command =
        "import os\r\n" +
        "os.remove('"+name+"')\r\n"

    this.single_command(command,cb)
  }

  createDir(name,cb){
    command =
        "import os\r\n" +
        "os.mkdir('"+name+"')\r\n"

    this.single_command(command,cb)
  }

  removeDir(name,cb){
    command =
        "import os\r\n" +
        "os.rmdir('"+name+"')\r\n"

    this.single_command(command,cb)
  }

  reset(cb){
    var _this = this
    command =
        "import machine\r\n" +
        "machine.reset()\r\n"

    this.pyboard.exec_raw_no_reset(command,function(err){
      // don't wait for soft reset to be done, because device will be resetting
      _this.pyboard.soft_reset_no_follow(cb)
    })
  }

  listFiles(cb){
    var _this = this
    cb(undefined,[])
  }

  single_command(c,cb){
    var _this = this
    command =
        c+"\r\n"

    this.pyboard.exec_raw(command,function(err,content){
      console.log("Got confirmation after command:")
      if(!err){
        err = _this.parse_error(content)
      }
      if(err){
        console.log(err.message)
      }
      console.log(content)
      cb(err,content)
    })
  }

  parse_error(content){
    err_index = content.indexOf("OSError:")
    if(err_index > -1){
      return Error(content.slice(err_index,content.length-2))
    }else{
      return null
    }
  }


   _was_file_not_existing(exception){
     /*
     Helper function used to check for ENOENT (file doesn't exist),
     ENODEV (device doesn't exist, but handled in the same way) or
     EINVAL errors in an exception. Treat them all the same for the
     time being. TODO: improve and nuance.

     :param  exception:      exception to examine
     :return:                True if non-existing
     */
     error_list = ['ENOENT', 'ENODEV', 'EINVAL', 'OSError:']
     stre = exception.message
     for(var i=0;i<error_list.length;i++){
       if(stre.indexOf(error_list[i]) > -1){
         return true
       }
     }
     return false

   }


  int_16(int){
    var b = new Buffer(2)
    b.writeUInt16BE(int)
    b = this.escape_buffer(b)
    return b
  }

  int_32(int){
    var b = new Buffer(4)
    b.writeUInt32BE(int)
    b = this.escape_buffer(b)
    return b
  }

  escape_buffer(b){
    var i = b.indexOf(27)
    if(i>-1){
      separator = new Buffer(1)
      separator.writeUInt8(27)
      b = Buffer.concat([b.slice(0,i),separator,b.slice(i,b.length)])
    }
    return b
  }
}
