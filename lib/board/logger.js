'use babel';

LOG_LEVEL = 6
LEVELS = ['silly','verbose','info','warning','error','critical']

export default class Logger {

  constructor(classname){
    this.classname = classname
  }

  log(level,mssg){
    if(level >= LOG_LEVEL){
      console.log("[" + LEVELS[level] + "] "+this.classname+" | "+mssg)
    }
  }

  silly(mssg){
    this.log(0,mssg)
  }

  verbose(mssg){
    this.log(1,mssg)
  }

  info(mssg){
    this.log(2,mssg)
  }

  warning(mssg){
    this.log(3,mssg)
  }

  error(mssg){
    this.log(4,mssg)
  }

  critical(mssg){
    this.log(5,mssg)
  }
}
