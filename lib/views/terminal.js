'use babel';

// let Terminal = require('xterm')
import Terminal from '../../node_modules/xterm/lib/xterm';
import Logger from '../helpers/logger';
import Config from '../config';
import ApiWrapper from '../wrappers/api-wrapper';

export default class Term {
  constructor(cb, element, pyboard, settings) {
    this.shellprompt = '>>> ';
    this.element = element; // get original dom element from jquery element
    this.element_original = element[0]; // get original dom element from jquery element
    this.pyboard = pyboard;
    this.logger = new Logger('Term');
    this.api = new ApiWrapper();
    this.onMessage = function () {};
    this.term_rows = Config.constants().term_rows;
    this.lastWrite = '';
    this.lastRows = this.term_rows.default;

    // dragging
    this.startY = null;
    const _this = this;
    this.xterm = new Terminal({
      cursorBlink: true,
      rows: this.term_rows.default,
      cols: 120,
      scrollback: 5000,
    });

    this.xterm.on('key', (key, e) => {
      _this.termKeyPress(key, e);
    });

    // for copy-paste with cmd key
    this.element.on('keydown', (e) => {
      if (_this.isActionKey(e)) {
        _this.termKeyPress('', e);
      }
    });

    console.log(this.element_original);

    this.xterm.open(this.element_original, true);
  }

  setRows(pixels, rows) {
    this.xterm.resize(120, rows);
    this.element.height(`${pixels}px`);
  }

  getHeight() {
    return parseInt(this.element.height(), 10);
  }

  setHeight(height, rows) {
    const fontSize =  atom.config.get('pymakr.font_size');
    const fontSizeInt = parseInt(fontSize);
    this.last_height = this.element_original.style.height;

    this.element_original.style.height = `${height}px`;
    // this.wrapper_element.style.height = style_height + "px"
    console.log('Setting terminal height');
    console.log(rows);
    console.log(200);
    this.xterm.resize(120, rows);
  }

  resetHeight() {
    this.element_original.style.height = `${this.last_height}px`;
    // this.wrapper_element.style.height = 42 + this.last_height + "px"
    this.xterm.resize(120, this.lastRows);
  }


  setOnMessageListener(cb) {
    this.onMessage = cb;
  }

  isActionKey(e) {
    return (e.keyCode == 67 || e.keyCode == 86 || e.keyCode == 82) && (e.ctrlKey || e.metaKey);
  }

  termKeyPress(key, e) {
    const term = this.xterm;
    if (this.isActionKey(e)) {
      if (e.keyCode == 67) { // ctrl-c
        this.copy();
      }
      if (e.keyCode == 82) { // ctrl-r
        this.clear();
      }
    }
    if (this.pyboard.connected) {
      if (e.keyCode == 86 && this.isActionKey(e)) { // ctrl-v
        this.paste(e);
      }
      this.logger.silly(e.keyCode);
      this.userInput(key);
    }
  }

  writeln(mssg) {
    this.xterm.writeln(mssg);
    this.lastWrite += mssg;
    if (this.lastWrite.length > 20) {
      this.lastWrite = this.lastWrite.substring(1);
    }
  }

  write(mssg) {
    this.xterm.write(mssg);
    this.lastWrite += mssg;
    if (this.lastWrite.length > 20) {
      this.lastWrite = this.lastWrite.substring(1);
    }
  }

  writeln_and_prompt(mssg) {
    this.writeln(`${mssg}\r\n`);
    this.writePrompt();
  }

  writePrompt() {
    this.write(this.shellprompt);
  }

  enter() {
    this.write('\r\n');
  }

  clear() {
    this.xterm.clear();
    this.lastWrite = '';
  }

  userInput(input) {
    this.onMessage(input);
  }

  paste() {
    const content = this.api.clipboard().replace(/\n/g, '\r');
    this.userInput(content);
  }

  copy(ev) {
    const selection = this.xterm.getSelection().toString();
    if (selection.length > 0) {
      this.logger.silly(`Copied content to clipboard of length ${selection.length}`);
      this.api.writeClipboard(selection);
    }
  }
}
