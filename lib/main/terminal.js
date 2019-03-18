'use babel';

// let Terminal = require('xterm')
import Terminal from '../../node_modules/xterm/lib/xterm.js'
import Logger from '../helpers/logger.js'
import Config from '../config.js'
import ApiWrapper from './api-wrapper.js';

export default class Term {

  constructor(cb,element,wrapper_element,pyboard,settings) {
    this.shellprompt = '>>> ';
    this.element = element // get original dom element from jquery element
    this.element_original = element[0] // get original dom element from jquery element
    this.wrapper_element = wrapper_element
    this.pyboard = pyboard
    this.element = element
    this.logger = new Logger('Term')
    this.api = new ApiWrapper()
    this.onMessage = function(){}
    this.term_rows = Config.constants().term_rows
    this.lastWrite = ""
    this.lastRows = this.term_rows.default

    //dragging
    this.startY = null
    var _this = this
    this.xterm = new Terminal({
      cursorBlink: true,
      rows:this.term_rows.default,
      cols:120,
      scrollback: 5000
    });

    this.xterm.on('key',function(key,e){
      _this.termKeyPress(key,e)
    })

    // for copy-paste with cmd key
    this.element.on("keydown",function(e) {
      if (_this.isActionKey(e)) {
        _this.termKeyPress("",e)
      }
    })

    console.log(this.element_original)

    this.xterm.open(this.element_original,true);
  }

  initResize(resizer){
    var _this = this
    var startY = 0
    var lastY = 0
    var startHeight = 0
    var startRows = this.term_rows.default
    var startTermHeight = 0
    var lineHeight = 0
    var currentRows = startRows
    console.log(document)

    function onMouseDown(e){
      startY = e.clientY
      console.log(document)
      startHeight = parseInt(document.defaultView.getComputedStyle(_this.wrapper_element).height, 10)
      startTermHeight = parseInt(document.defaultView.getComputedStyle(_this.element).height, 10)
      if(lineHeight == 0){
        lineHeight = startTermHeight / startRows
      }
      document.documentElement.addEventListener('mousemove',onMouseMove,false)
      document.documentElement.addEventListener('mouseup',stopDrag,false)

    }
    function onMouseMove(e){
      var new_height = (startHeight + startY - e.clientY)
      var new_term_height = (startTermHeight + startY - e.clientY)
      var newRows = Math.floor(new_term_height / lineHeight)
      if(newRows != currentRows && newRows <= _this.term_rows.max && newRows >= _this.term_rows.min){
        currentRows = newRows

         // when decreasing terminal size, this correction is needed to prevent terminal being slightly too high
        var correction = Math.round((new_term_height%lineHeight))

        _this.wrapper_element.style.height = new_height - correction + "px"
        _this.element.style.height = new_term_height - correction + "px"
        this.lastRows = newRows
        _this.xterm.resize(120,newRows)
      }
      lastY = e.clientY
    }

    function stopDrag(){
      document.documentElement.removeEventListener('mousemove',onMouseMove,false)
      document.documentElement.removeEventListener('mouseup',stopDrag,false)
    }

    resizer.on('mousedown',onMouseDown,false)
  }

  setHeight(rows){
    var height = 17 * rows
    var style_height = 42 + height
    this.last_height = this.element.style.height

    this.element.style.height = height + "px"
    this.wrapper_element.style.height = style_height + "px"
    this.xterm.resize(120,rows)
  }

  resetHeight(){
    this.element.style.height = this.last_height + "px"
    this.wrapper_element.style.height = 42 + this.last_height + "px"
    this.xterm.resize(120,this.lastRows)
  }

  setOnMessageListener(cb){
    this.onMessage = cb
  }

  isActionKey(e){
    return (e.keyCode == 67 || e.keyCode == 86 || e.keyCode == 82) && (e.ctrlKey || e.metaKey)
  }

  termKeyPress(key,e){
    var term = this.xterm
    if (this.isActionKey(e)) {
      if(e.keyCode == 67) { // ctrl-c
        this.copy()
      }
      if(e.keyCode == 82) { // ctrl-r
        this.clear()
      }
    }
    if (this.pyboard.connected) {
      if(e.keyCode == 86 && this.isActionKey(e)){ //ctrl-v
        this.paste(e)
      }
      this.logger.silly(e.keyCode)
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
    var content = this.api.clipboard().replace(/\n/g,'\r')
    this.userInput(content)
  }

  copy(ev){
    var selection = this.xterm.getSelection().toString()
    if(selection.length > 0) {
      this.logger.silly("Copied content to clipboard of length "+selection.length)
      this.api.writeClipboard(selection)
    }
  }
}
