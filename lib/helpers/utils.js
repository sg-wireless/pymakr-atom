'use babel';
import Config from '../config.js'

// Import this class and create a new logger object in the constructor, providing
// the class name. Use the logger anywhere in the code
// this.logger = new Logger('Pyboard')
// this.logger.warning("Syncing to outdated firmware")
// Result in the console will be:
// [warning] Pyboard | Syncing to outdated firmware

export default class Utils {

  // runs a worker recursively untill a task is Done
  // worker should take 2 params: value and a continuation callback
    // continuation callback takes 2 params: error and the processed value
  // calls 'end' whenever the processed_value comes back empty/null or when an error is thrown
  doRecursively(value,worker,end){
    var _this = this
    worker(value,function(err,value_processed,done){

        if(err){
          end(err)
        }else if(done){
          end(value_processed)
        }else{
          console.log("Recursive call worker again")
          console.log(value_processed)
          _this.doRecursively(value_processed,worker,end)

        }
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
    return b
  }

  int_32(int){
    var b = new Buffer(4)
    b.writeUInt32BE(int)
    return b
  }
}
