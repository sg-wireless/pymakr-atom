'use babel';

import Config from '../config';
import Pyserial from '../connections/pyserial';
import Pytelnet from '../connections/pytelnet';
import Pysocket from '../connections/pysocket';
import Authorize from './authorize';
import Logger from '../helpers/logger';

const CTRL_A = '\x01'; // raw repl
const CTRL_B = '\x02'; // exit raw repl
const CTRL_C = '\x03'; // ctrl-c
const CTRL_D = '\x04'; // reset (ctrl-d)
const CTRL_E = '\x05'; // paste mode (ctrl-e)
const CTRL_F = '\x06'; // safe boot (ctrl-f)
const EOF = '\x04'; // end of file

// statuses
const DISCONNECTED = 0;
const FRIENDLY_REPL = 2;
const RAW_REPL = 3;
const RUNNING_FILE = 4;
const PASTE_MODE = 5;

export default class Pyboard {
  constructor(settings) {
    this.connected = false;
    this.connecting = false;
    this.receiveBuffer = '';
    this.receiveBufferRaw = Buffer(0);
    this.waiting_for = null;
    this.waitingForCb = null;
    this.waitingForTimeout = 8000;
    this.status = DISCONNECTED;
    this.pingTimer = null;
    this.pingCount = 0;
    this.isSerial = false;
    this.type = null;
    this.settings = settings;
    this.timeout = settings.timeout;
    this.authorize = new Authorize(this);
    this.logger = new Logger('Pyboard');
    this.config = Config.constants();
    this.refreshConfig();
    this.configuredAddress = null;
    this.address = null;
  }

  refreshConfig(cb) {
    const _this = this;
    this.settings.refresh(() => {
      _this.params = {
        port: 23,
        username: _this.settings.username,
        password: _this.settings.password,
        enpassword: '',
        timeout: _this.settings.timeout,
        ctrl_c_on_connect: _this.settings.ctrl_c_on_connect,
      };
      // if(!_this.settings.auto_connect){
      _this.configuredAddress = _this.settings.address;
      // }
      if (cb) cb();
    });
  }

  getCallbacks() {
    return [
      this.onmessage,
      this.onerror,
      this.ontimeout,
      this.onmessage,
    ];
  }

  startPings(interval) {
    const _this = this;
    this.pingTimer = setInterval(() => {
      _this.logger.silly('Sending ping...');
      _this.connection.sendPing(err => {
        if (err) {
          _this.logger.silly(
            `Upping ping fail count from ${
              _this.pingCount
            } to ${_this.pingCount + 1}`,
          );
          _this.pingCount += 1;
        } else {
          _this.logger.silly(
            'Ping succeeded, reseting ping fail count',
          );
          _this.pingCount = 0;
        }

        if (_this.pingCount > 1) {
          // timeout after 2 pings
          _this.logger.silly('Ping fails more than 3, timing out');
          _this.pingCount = 0;
          clearInterval(_this.pingTimer);
          _this.ontimeout(new Error('Connection lost'));
          _this.disconnect();
        }
      });
    }, interval * 1000);
  }

  stopPings() {
    clearInterval(this.pingTimer);
  }

  setStatus(status) {
    if (status !== this.status) {
      this.status = status;
      if (this.statusListenerCB) {
        this.statusListenerCB(status);
      }
    }
  }

  registerStatusListener(cb) {
    this.statusListenerCB = cb;
  }

  enterFriendlyRepl(callback) {
    const _this = this;
    _this.sendWaitForBlocking(CTRL_B, '\r\n>>>', err => {
      if (!err) {
        _this.setStatus(FRIENDLY_REPL);
      }
      if (callback) {
        callback(err);
      }
    });
  }

  enterFriendlyReplWait(callback) {
    const _this = this;
    _this.sendWaitFor(
      CTRL_B,
      'Type "help()" for more information.\r\n>>>',
      err => {
        if (!err) {
          _this.setStatus(FRIENDLY_REPL);
        }
        if (callback) {
          callback(err);
        }
      },
    );
  }

  enterFriendlyReplNonBlocking(callback) {
    const _this = this;
    _this.send(
      CTRL_B,
      err => {
        if (!err) {
          _this.setStatus(FRIENDLY_REPL);
        }
        if (callback) {
          callback(err);
        }
      },
      2000,
    );
  }

  async softResetAsync(timeout) {
    let finalTimeout = timeout;
    return new Promise((resolve, reject) => {
      try {
        if (!finalTimeout) {
          finalTimeout = 5000;
        }
        this.logger.info('Soft reset');
        const waitFor = this.status == RAW_REPL ? '>' : 'OK';
        this.sendWaitForBlocking(
          CTRL_D,
          waitFor,
          resolve,
          finalTimeout,
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  softReset(cb, timeout) {
    let finalTimeout = timeout;
    if (!finalTimeout) {
      finalTimeout = 5000;
    }
    this.logger.info('Soft reset');
    const waitFor = this.status == RAW_REPL ? '>' : 'OK';
    this.sendWaitForBlocking(CTRL_D, waitFor, cb, finalTimeout);
  }

  softResetNoFollow(cb) {
    this.logger.info('Soft reset no follow');
    this.send(CTRL_D, cb, 5000);
  }

  safeBoot(cb, timeout) {
    const _this = this;
    this.logger.info('Safe boot');
    this.sendWaitFor(
      CTRL_F,
      'Type "help()" for more information.\r\n>>>',
      err => {
        _this.logger.info('Safe boot done...');
        if (cb) cb(err);
      },
      timeout,
    );
  }

  stopRunningPrograms(cb) {
    this.sendWaitFor(
      CTRL_C,
      '>>>',
      err => {
        if (cb) cb(err);
      },
      2000,
    );
  }

  stopRunningProgramsDouble(cb, timeout) {
    this.sendWaitFor(
      CTRL_C + CTRL_C,
      '>>>',
      err => {
        if (cb) cb(err);
      },
      timeout,
    );
  }

  stopRunningProgramsNofollow(callback) {
    this.logger.info('CTRL-C (nofollow)');
    this.sendWithEnter(CTRL_C, () => {
      callback();
    });
  }

  enterRawReplNoReset(callback) {
    const _this = this;
    _this.flush(() => {
      _this.logger.info('Entering raw repl');
      _this.sendWaitForBlocking(
        CTRL_A,
        'raw REPL; CTRL-B to exit\r\n>',
        err => {
          if (!err) {
            _this.setStatus(RAW_REPL);
          }
          callback(err);
        },
        5000,
      );
    });
    // })
  }

  enterRawRepl(callback) {
    const _this = this;
    this.enterRawReplNoReset(() => {
      _this.flush(() => {
        _this.softReset(() => {
          callback();
        }, 5000);
      });
    });
  }

  isConnecting() {
    return this.connecting && !this.connected;
  }

  connectRaw(cb, onerror, ontimeout, onmessage) {
    this.connect(cb, onerror, ontimeout, onmessage, true);
  }

  connect(address, callback, onerror, ontimeout, onmessage, raw) {
    this.connecting = true;
    this.onconnect = callback;
    this.onmessage = onmessage;
    this.ontimeout = ontimeout;
    this.onerror = onerror;
    this.address = address;
    this.stopWaitingForSilent();
    this.refreshConfig();
    const _this = this;
    Pyserial.isSerialPort(this.address, res => {
      _this.isSerial = res;
      if (res) {
        _this.connection = new Pyserial(
          _this.address,
          _this.params,
          _this.settings,
        );
      } else if (raw) {
        _this.connection = new Pysocket(_this.address, _this.params);
      } else {
        _this.connection = new Pytelnet(_this.address, _this.params);
      }
      _this.type = _this.connection.type;

      if (_this.connection.type == 'telnet') {
        _this.authorize.run(error => {
          if (error) {
            _this._disconnected();
            callback(error);
          } else {
            _this._onconnect(callback);
          }
        });
      }

      _this.connection.connect(
        () => {
          _this.connection.registerListener((mssg, raw) => {
            _this.receive(mssg, raw);
          });
          if (_this.connection.type != 'telnet') {
            _this._onconnect(callback);
          }
        },
        err => {
          _this._disconnected();
          _this.onerror(err);
        },
        mssg => {
          // Timeout callback only works properly during connect
          // after that it might trigger unneccesarily
          if (_this.isConnecting()) {
            _this._disconnected();
            ontimeout(mssg, raw);
          }
        },
      );
    });
  }

  _onconnect(cb) {
    const _this = this;

    _this.connected = true;
    _this.connection.connected = true;

    _this.connecting = false;

    if (_this.params.ctrl_c_on_connect && this.type != 'socket') {
      _this.stopRunningPrograms(cb);
    } else {
      cb();
    }
    _this.startPings(5);
  }

  _disconnected(cb) {
    if (this.connection) {
      this.connection.disconnect(() => {
        if (cb) {
          cb();
        }
      });
    }
    this.connecting = false;
    this.connected = false;
    this.stopPings();
  }

  receive(mssg, raw) {
    this.logger.silly(`Received message: ${mssg}`);
    if (!this.wait_for_block && typeof mssg !== 'object') {
      this.onmessage(mssg);
    }
    const errInOutput = this.getErrorMessage(mssg);

    this.receiveBuffer += mssg;
    this.receiveBufferRaw = Buffer.concat([
      this.receiveBufferRaw,
      raw,
    ]);

    if (this.receiveBuffer.length > 80000) {
      this.receiveBuffer = this.receiveBuffer.substr(40000);
    }

    if (this.receiveBufferRaw.length > 80000) {
      this.receiveBufferRaw = this.receiveBufferRaw.slice(40000);
    }

    this.logger.silly(
      `Buffer length now ${this.receiveBuffer.length}`,
    );

    if (errInOutput != '') {
      this.logger.silly(`Error in output: ${errInOutput}`);
      const err = new Error(errInOutput);
      if (this.waiting_for != null) {
        this.stopWaitingFor(
          this.receiveBuffer,
          this.receiveBufferRaw,
          err,
        );
      } else {
        this.onerror(err);
      }
    } else if (this.waiting_for != null && mssg) {
      this.logger.silly(`Waiting for ${this.waiting_for}`);
      if (this.receiveBuffer === undefined) this.receiveBuffer = '';
      if (
        this.receiveBuffer.indexOf(
          'Invalid credentials, try again.',
        ) > -1
      ) {
        this._disconnected();
        this.onconnect('Invalid credentials');
        this.stopWaitingForSilent();
        this.waitForBlocking('Login as:', () => {
          // do nothing
        });
      }

      if (this.waiting_for_type == 'length') {
        this.logger.silly(
          `Waiting for ${this.waiting_for}, got ${this.receiveBuffer.length} so far`,
        );
        if (this.receiveBuffer.length >= this.waiting_for) {
          this.stopWaitingFor(
            this.receiveBuffer,
            this.receiveBufferRaw,
          );
        }
      } else if (
        this.receiveBuffer.indexOf(this.waiting_for) > -1 ||
        this.receiveBufferRaw.indexOf(this.waiting_for) > -1
      ) {
        const trail = this.receiveBuffer
          .split(this.waiting_for)
          .pop(-1);
        if (trail && trail.length > 0 && this.wait_for_block) {
          this.onmessage(trail);
        }
        this.stopWaitingFor(
          this.receiveBuffer,
          this.receiveBufferRaw,
        );
      }
    }
  }

  stopWaitingForSilent() {
    clearTimeout(this.waitingForTimer);
    this.waiting_for = null;
    this.wait_for_block = false;
  }

  stopWaitingFor(msg, raw, err) {
    this.logger.silly(
      `Stopping waiting for, got message of ${msg.length} chars`,
    );
    this.stopWaitingForSilent();
    if (this.waitingForCb) {
      this.logger.silly('Callback after waiting for');
      this.waitingForCb(err, msg, raw);
    } else {
      this.logger.silly('No callback after waiting');
    }
  }

  disconnect(cb) {
    this.disconnectSilent(cb);
    this.setStatus(DISCONNECTED);
  }

  disconnectSilent(cb) {
    this._disconnected(cb);
  }

  run(fileContents, cb) {
    let finalFileContents = fileContents;
    const _this = this;
    this.stopRunningPrograms(() => {
      _this.enterRawReplNoReset(() => {
        _this.setStatus(RUNNING_FILE);

        finalFileContents += '\r\nimport time';
        finalFileContents += '\r\ntime.sleep(0.1)';

        // executing code delayed (20ms) to make sure _this.wait_for(">") is executed before execution is complete
        _this.execRaw(`${finalFileContents}\r\n`, () => {
          _this.waitFor('>', () => {
            _this.enterFriendlyReplWait(cb);
          });
        });
      });
    });
  }

  // run a line or a block of code using paste mode
  // TODO: has a bug where wait_for_blocking sometimes hangs forever
  // Function is not currently used anywhere, run() function is used for running selections.
  runblock(codeblock, cb) {
    const _this = this;
    this.stopRunningPrograms(() => {
      _this.setStatus(PASTE_MODE);

      const lastCommand = codeblock.split('/r/n').pop();
      _this.execRawNoReset(
        `${CTRL_E + codeblock}\r\n${CTRL_D}`,
        () => {
          _this.waitForBlocking(`${lastCommand}\r\n===`, () => {
            cb();
          });
        },
      );

      _this.setStatus(FRIENDLY_REPL);
    });
  }

  send(mssg, cb) {
    this.connection.send(mssg, cb);
  }

  sendWithEnter(mssg, cb) {
    this.connection.send(`${mssg}\r\n`, cb);
  }

  sendCmd(cmd, cb) {
    const mssg = `\x1b${cmd}`;
    const data = new Buffer(mssg, 'binary');
    this.connection.send_raw(data, cb);
  }

  sendCmdRead(cmd, wait_for, cb, timeout) {
    if (typeof wait_for === 'string') {
      wait_for = `\x1b${wait_for}`;
      wait_for = new Buffer(wait_for, 'binary');
    }
    this.read(wait_for, cb, timeout);
    this.sendCmd(cmd);
  }

  sendCmdWaitFor(cmd, wait_for, cb, timeout) {
    if (typeof wait_for === 'string') {
      wait_for = `\x1b${wait_for}`;
      wait_for = new Buffer(wait_for, 'binary');
    }
    this.waitFor(wait_for, cb, timeout);
    this.sendCmd(cmd, () => {});
  }

  sendUserInput(mssg, cb) {
    this.send(mssg, cb);
  }

  sendRawWaitFor(mssg, wait_for, cb, timeout) {
    this.waitFor(wait_for, cb, timeout);
    this.sendRaw(mssg);
  }

  sendWaitFor(mssg, wait_for, cb, timeout) {
    this.waitFor(wait_for, cb, timeout);
    this.sendWithEnter(mssg);
  }

  sendWaitForBlocking(mssg, wait_for, cb, timeout) {
    this.waitForBlocking(wait_for, cb, timeout);
    this.sendWithEnter(mssg);
  }

  async sendWaitForBlockingAsync(mssg, waitFor, timeout) {
    return new Promise((resolve, reject) => {
      try {
        this.waitForBlocking(waitFor, resolve, timeout);
        this.sendWithEnter(mssg);
      } catch (e) {
        reject(e);
      }
    });
  }

  waitForBlockingAsync(waitFor, cb, timeout, type) {
    this.waitFor(waitFor, cb, timeout, type);
    this.wait_for_block = true;
  }

  waitForBlocking(wait_for, cb, timeout, type) {
    this.waitFor(wait_for, cb, timeout, type);
    this.wait_for_block = true;
  }

  sendRead(mssg, number, cb, timeout) {
    this.read(number, cb, timeout);
    this.sendWithEnter(mssg);
  }

  read(number, cb, timeout) {
    this.waitForBlocking(number, cb, timeout, 'length');
  }

  waitFor(waitFor, cb, timeout, type, clear = true) {
    if (!type) {
      type = 'string';
    }
    this.waiting_for_type = type;
    this.wait_for_block = false;
    this.waiting_for = waitFor;
    this.waitingForCb = cb;
    this.waitingForTimeout = timeout;
    if (clear) {
      this.receiveBuffer = '';
      this.receiveBufferRaw = Buffer(0);
    }

    const _this = this;
    clearTimeout(this.waitingForTimer);
    if (timeout) {
      this.waitingForTimer = setTimeout(() => {
        if (_this.waitingForCb) {
          const tmpCb = _this.waitingForCb;
          _this.waitingForCb = null;
          _this.wait_for_block = false;
          _this.waiting_for = null;
          _this.receiveBuffer = '';
          _this.receiveBufferRaw = Buffer(0);
          tmpCb(new Error('timeout'), _this.receiveBuffer);
        }
      }, timeout);
    }
  }

  follow(cb) {
    this.logger.verbose('Following up...');
    cb(null, '');
  }

  sendRaw(mssg, cb) {
    this.connection.send_raw(mssg, cb);
  }

  execRawNoReset(code, cb) {
    this.logger.verbose(`Executing code:${code}`);
    const data = new Buffer(code, 'binary');
    this.sendRaw(data, err => {
      if (cb) {
        cb(err);
      }
    });
  }

  execRawDelayed(code, cb, timeout) {
    const _this = this;
    setTimeout(() => {
      _this.execRaw(code, cb, timeout);
    }, 50);
  }

  execRaw(code, cb, timeout) {
    const _this = this;
    this.execRawNoReset(code, () => {
      _this.logger.silly('Executed raw code, now resetting');
      _this.softReset(cb, timeout);
    });
  }

  exec_(code, cb) {
    const _this = this;
    this.execRawNoReset(`\r\n${code}`, () => {
      _this.logger.silly('Executed code, now resetting');
      _this.softReset(cb);
    });
  }

  async execAsync(code) {
    return new Promise((resolve, reject) => {
      try {
        const _this = this;
        this.execRawNoReset(`\r\n${code}`, () => {
          _this.logger.silly('Executed code, now resetting');
          _this.softReset(resolve);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  flush(cb) {
    this.connection.flush(cb);
  }

  getErrorMessage(text) {
    const messages = this.config.error_messages;
    for (const key in messages) {
      if (text.indexOf(key) > -1) {
        return messages[key];
      }
    }
    return '';
  }
}
