'use babel';

import ApiWrapper from '../../wrappers/api-wrapper';

export default class Runner {
  constructor(pyboard, terminal, pymakr) {
    this.pyboard = pyboard;
    this.terminal = terminal;
    this.pymakr = pymakr;
    this.api = new ApiWrapper();
    this.busy = false;
  }

  toggle(cb) {
    if (this.busy) {
      this.stop(cb);
    } else {
      this.start(cb);
    }
  }

  start(cb) {
    const _this = this;
    this._getCurrentFile((file, filename) => {
      _this.terminal.writeln(`Running ${filename}`);
      _this.busy = true;
      // _this.pymakr.view.setButtonState()
      _this.pyboard.run(file, () => {
        _this.busy = false;
        if (cb) cb();
      });
    }, (err) => {
      _this.terminal.writelnAndPrompt(err);
    });
  }

  selection(codeblock, cb) {
    const _this = this;
    codeblock = this.__trimcodeblock(codeblock);
    _this.terminal.writeln('Running selected lines');
    _this.busy = true;
    _this.pyboard.run(codeblock, () => {
      _this.busy = false;
      if (cb) cb();
    }, (err) => {
      _this.terminal.writelnAndPrompt(err);
    });
  }

  stop(cb) {
    const _this = this;
    if (this.busy) {
      this.pyboard.stopRunningProgramsNofollow(() => {
        _this.pyboard.flush(() => {
          _this.pyboard.enterFriendlyRepl(() => {
          });
          _this.busy = false;
          if (cb) cb();
        });
      });
    }
  }

  _getCurrentFile(cb, onerror) {
    this.api.getOpenFile((file, name) => {
      if (!file) {
        onerror('No file open to run');
        return;
      }

      let filename = 'untitled file';
      if (name) {
        filename = name.split('/').pop(-1);
        const filetype = filename.split('.').pop(-1);
        if (filetype.toLowerCase() !== 'py') {
          onerror(`Can't run ${filetype} files, please run only python files`);
          return;
        }
      }
      cb(file, filename);
    }, onerror);
  }

  // remove excessive identation
  __trimcodeblock(codeblock) {
    // regex to split both win and unix style
    const lines = codeblock.match(/[^\n]+(?:\r?\n|$)/g);
    // count leading spaces in line1 ( Only spaces, not TAB)
    let count = 0;
    if (lines) {
      while (lines[0].startsWith(' ', count)) {
        count++;
      }

      // remove from all lines
      if (count > 0) {
        const prefix = ' '.repeat(count);
        for (let i = 0; i < lines.length; i += 1) {
          if (lines[i].startsWith(prefix)) {
            lines[i] = lines[i].slice(count);
          } else {
            // funky identation or selection; just trim spaces and add warning
            lines[i] = `${lines[i].trim()} # <- IndentationError`;
          }
        }
      }
      // glue the lines back together
      return (lines.join(''));
    }
    return codeblock;
  }
}
