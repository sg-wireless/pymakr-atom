'use babel';

let Terminal = require('xterm')
import Logger from './logger.js'

export default class Term {

    constructor(element,pyboard) {
      this.term_buffer = ""
      this.shellprompt = '>>> ';
      this.element = element
      this.pyboard = pyboard
      this.element = element
      this.logger = new Logger('Term')
      this.onMessage = function(){}
      this.lastWrite = ""
      var _this = this
      this.xterm = new Terminal({
        cursorBlink: true,
        rows:11,
        cols:120
      });

      this.xterm.on('key',function(key,ev){
        _this.termKeyPress(key,ev)
      })

      // for copy-paste with cmd key
      this.element.addEventListener("keydown",function(e) {
        if ((e.keyCode == 67 || e.keyCode == 86) && e.metaKey) {
          _this.termKeyPress("",e)
        }
      })

      this.xterm.open(element);
    }

    setOnMessageListener(cb){
      this.onMessage = cb
    }

    termKeyPress(key,ev){
      var term = this.xterm
      if (this.pyboard.connected) {
        if(ev.keyCode == 67) { // ctrl-c
          this.copy()
        }else if(ev.keyCode == 86){ //ctrl-v
          this.paste(ev)
        }
        this.logger.info(ev.keyCode)
        this.userInput(key)
      }
    }

    writeln(mssg){
      this.xterm.writeln(mssg)
      this.lastWrite += mssg
      if(this.lastWrite.length > 20){
        this.lastWrite = this.lastWrite.substring(1)
      }
    }

    write(mssg){
      this.xterm.write(mssg)
      this.lastWrite += mssg
      if(this.lastWrite.length > 20){
        this.lastWrite = this.lastWrite.substring(1)
      }
    }

    writeln_and_prompt(mssg){
      this.writeln(mssg+"\r\n")
      this.writePrompt()
    }

    writePrompt(){
      this.write(this.shellprompt)
    }

    enter(){
      this.write('\r\n')
    }

    clear(){
      this.xterm.clear()
      this.lastWrite = ""
    }

    userInput(input){
      this.onMessage(input)
    }

    paste(){
      var content = atom.clipboard.read().replace(/\n/g,'\r')
      this.userInput(content)
    }

    copy(ev){
      var selection = window.getSelection().toString()
      if(selection.length > 0) {
        this.logger.silly("Copied content to clipboard of length "+selection.length)
        atom.clipboard.write(selection)
     }
    }

}
