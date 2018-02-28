'use babel';
var fs = require('fs');
import Logger from '../helpers/logger.js'
import ApiWrapper from '../main/api-wrapper.js';
var binascii = require('binascii');

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

    var _this = this

    get_file_command =
      "import ubinascii\r\n"+
      "f = open('"+name+"', 'wb')\r\n"

    this.pyboard.exec_raw_no_reset(get_file_command,function(){
      _this._writeFileChunkRecursive(contents,64,function(){
        _this.pyboard.exec_("f.close()\r\n",cb)
      })
    })
  }

  _writeFileChunkRecursive(content,blocksize,cb){
    var _this = this
    var chunk = content.slice(0,blocksize)
    content = content.slice(blocksize,content.length)
    console.log(chunk)

    if(chunk.length == 0){
      this.pyboard.flush(cb)
    }else{

      c = binascii.hexlify(chunk)

      this.pyboard.exec_raw("f.write(ubinascii.unhexlify('"+c+"'))\r\n",function(){
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

    this.pyboard.exec_(command,function(){
      _this.pyboard.wait_for(this.EOF,function(err,content){
        console.log("Got content!")
        content = binascii.unhexlify(content)
        console.log(err)
        console.log(content)
        cb(content)
      },2000,false)

    })
  }


  removeFile(name,cb){
    command =
        "import os\r\n" +
        "os.remove('"+name+"')"

    this.single_command(command,cb)
  }


  createDir(name,cb){
    command =
        "import os\r\n" +
        "os.mkdir('"+name+"')"

    this.single_command(command,cb)
  }

  removeDir(name,cb){
    command =
        "import os\r\n" +
        "os.rmdir('"+name+"')"

    this.single_command(command,cb)
  }

  reset(cb){
    var _this = this
    command =
        "import machine\r\n" +
        "machine.reset()"

    this.single_command(command,function(){
      _this.pyboard.enter_friendly_repl_non_blocking(cb)
    })

  }

  listFiles(cb){
    var _this = this
    cb(undefined,[])
  }

  single_command(c,cb){
    command =
        c+"\r\n" +
        "import sys\r\n"
        "sys.stdout.write('OK')\r\n"

    this.pyboard.exec_raw(command,function(err,content){
      console.log("Got confirmation after command:")
      console.log(err)
      console.log(content)
      cb(err,content)
    })
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
