'use babel';

// let Terminal = require('xterm')
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import Logger from '../helpers/logger';
import Config from '../config';
import ApiWrapper from '../wrappers/api-wrapper';

export default class Term {
  constructor(cb, element, pyboard) {
    this.shellprompt = '>>> ';
    this.element = element; // get original dom element from jquery element
    this.element_original = element[0]; // get original dom element from jquery element
    this.pyboard = pyboard;
    this.logger = new Logger('Term');
    this.api = new ApiWrapper();
    this.onMessage = function() {};
    this.term_rows = Config.constants().term_rows;
    this.lastWrite = '';
    const fontSize = atom.config.get('pymakr.font_size');
    this.fontSize = parseInt(fontSize);
    this.lastRows = this.term_rows.default;
    this.startY = null;
    const _this = this;
    this.fit = new FitAddon();
    this.xterm = new Terminal({
      cursorBlink: true,
      fontSize: fontSize || 14,
      rows: this.term_rows.default,
      cols: 120,
      rendererType: 'dom',
      scrollback: 5000,
    });
    this.xterm.loadAddon(this.fit);
    // for copy-paste with cmd key
    this.element.on('keydown', e => {
      if (_this.isActionKey(e)) {
        _this.termKeyPress('', e);
      }
    });
    this.xterm.onKey(e => {
      _this.termKeyPress(e.key, e.domEvent);
    });
    this.xterm.open(this.element_original);
    this.fit.fit();

    atom.config.observe('pymakr.font_size', newValue => {
      const MINIMUM_FONT_SIZE = 10;
      const MAXIMUM_FONT_SIZE = 50;
      const DEFAULT_FONT_SIZE = 14;
      try {
        let newFontSize = newValue || DEFAULT_FONT_SIZE;
        if (newValue > MAXIMUM_FONT_SIZE)
          newFontSize = MAXIMUM_FONT_SIZE;
        else if (newValue < MINIMUM_FONT_SIZE)
          newFontSize = MINIMUM_FONT_SIZE;
        _this.fontSize = parseInt(newFontSize);
        _this.xterm.setOption('fontSize', _this.fontSize);
        _this.fit.fit();
      } catch (e) {
        atom.notifications.addError('Invalid font size.');
        atom.config.set(`pymakr.font_size`, DEFAULT_FONT_SIZE);
      }
    });
  }

  setRows(pixels, rows) {
    this.xterm.resize(120, rows);
    this.element.height(`${pixels}px`);
  }

  getHeight() {
    return parseInt(this.element.height(), 10);
  }

  setHeight(height, rows) {
    this.last_height = this.element_original.style.height;
    this.element_original.style.height = `${height}px`;
    const fontMeasurement = $('.font-size-measurement');
    fontMeasurement.css('font-size', `${this.fontSize}px`);
    const terminalWidth = $('#pymakr').innerWidth();
    const sidebarWidth = $('#pymakr-left-panel').width();
    const availableWidth = terminalWidth - sidebarWidth;
    const newColumns = Math.floor(
      availableWidth / fontMeasurement.width() - 5,
    );
    this.xterm.resize(newColumns, rows);
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
    return (
      (e.keyCode == 67 || e.keyCode == 86 || e.keyCode == 82) &&
      (e.ctrlKey || e.metaKey)
    );
  }

  termKeyPress(key, e) {
    if (this.isActionKey(e)) {
      if (e.keyCode === 67) {
        // ctrl-c
        this.copy();
      }
      if (e.keyCode === 82) {
        // ctrl-r
        this.clear();
      }
    }
    if (this.pyboard.connected) {
      if (e.keyCode === 86 && this.isActionKey(e)) {
        // ctrl-v
        this.paste(e);
      }
      this.logger.silly(e.keyCode);
      this.userInput(key);
    }
  }

  writeln(msg) {
    this.xterm.writeln(msg);
    this.lastWrite += msg;
    if (this.lastWrite.length > 20) {
      this.lastWrite = this.lastWrite.substring(1);
    }
  }

  write(msg) {
    this.xterm.write(msg);
    this.lastWrite += msg;
    if (this.lastWrite.length > 20) {
      this.lastWrite = this.lastWrite.substring(1);
    }
  }

  writelnAndPrompt(msg) {
    this.writeln(`${msg}\r\n`);
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

  copy() {
    const selection = this.xterm.getSelection().toString();
    if (selection.length > 0) {
      this.logger.silly(
        `Copied content to clipboard of length ${selection.length}`,
      );
      this.api.writeClipboard(selection);
    }
  }
}
