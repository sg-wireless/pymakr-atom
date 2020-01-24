const { Socket } = require('net');
const { EventEmitter } = require('events');
const util = require('util');

const Telnet = function() {
  this.operation = [];
  this.operation[255] = 'IAC';
  this.operation[254] = 'DONT';
  this.operation[253] = 'DO';
  this.operation[252] = 'WONT';
  this.operation[251] = 'WILL';
  this.operation[250] = 'SB';
  this.operation[249] = 'GA';
  this.operation[248] = 'EL';
  this.operation[247] = 'EC';
  this.operation[246] = 'AYT';
  this.operation[245] = 'AO';
  this.operation[244] = 'IP';
  this.operation[243] = 'BRK';
  this.operation[242] = 'DM';
  this.operation[241] = 'NOP';
  this.operation[240] = 'SE';
  this.option = [];
  this.option[0] = 'transmitBinary';
  this.option[1] = 'echo';
  this.option[2] = 'reconnection';
  this.option[3] = 'suppressGoAhead';
  this.option[4] = 'approxMessageSizeNegotiation';
  this.option[5] = 'status';
  this.option[6] = 'timingMark';
  this.option[7] = 'remoteControlledTransandEcho';
  this.option[8] = 'outputLineWidth';
  this.option[9] = 'outputPageSize';
  this.option[10] = 'outputCarriageReturnDisposition';
  this.option[23] = 'sendLocation';
  this.option[24] = 'terminalType';
  this.option[31] = 'windowSize';
  this.option[32] = 'terminalSpeed';
  this.option[33] = 'remoteFlowControl';
  this.option[34] = 'linemode';
  this.option[35] = 'displayLocation';
  this.option[36] = 'environmentVariables';
  this.option[39] = 'environmentOption';
};
util.inherits(Telnet, EventEmitter);
Telnet.prototype.connect = function(opts) {
  this._host = opts.host || 'localhost';
  this._port = opts.port || 23;
  this._log = opts.log || false;
  this._timeout = opts.timeout || 20000;
  this._username = opts.username;
  this._password = opts.password;
  this._enpassword = opts.enpassword;
  this._en = false;
  this._authenticated = false;
  this._sock = opts.sock ? opts.sock : new Socket();
  const _self = this;
  this._sock.connect(this._port, this._host);
  this._sock.setTimeout(this._timeout);
  this._sock.on('connect', () => {
    _self.emit('connect');
  });
  this._sock.on('data', data => {
    _self.processBuffer(data);
  });
  this._sock.on('timeout', () => {
    _self.emit('timeout');
  });
  this._sock.on('error', Error => {
    _self.emit('error', Error);
  });
  this._sock.on('end', () => {
    _self.emit('end');
  });
  this._sock.on('close', had_error => {
    _self.emit('close', had_error);
  });
};
Telnet.prototype.processBuffer = buffer => {
  const _self = this;
  const result = {};
  result.cmd = [];
  result.data = [];
  let negotiation = { IAC: false, operation: '', option: '' };
  const keyfound = false;
  for (let i = 0; i < buffer.length; i += 1) {
    if (this.operation[buffer[i]] === 'IAC') {
      negotiation.IAC = true;
      i += 1;
      negotiation.operation = this.operation[buffer[i]];
      i += 1;
      if (negotiation.operation === 'SB') {
        while (this.operation[buffer[i]] !== 'IAC') {
          negotiation.option += `${this.option[buffer[i]]} `;
          i += 1;
        }
        negotiation.option += `${this.operation[buffer[i]]}.${
          this.operation[buffer[i + 1]]
        }`;
        i += 1;
      } else {
        negotiation.option = this.option[buffer[i]];
      }
      result.cmd.push(negotiation);
      negotiation = { IAC: false, operation: '', option: '' };
    } else {
      result.data.push(buffer[i]);
    }
  }
  result.data = new Buffer(result.data);

  Object.keys(result.cmd).forEach(key => {
    const reqCMD = `IAC.${result.cmd[key].operation}.${result.cmd[key].option}`;
    let resCMD = 'IAC.WONT.';
    switch (result.cmd[key].operation) {
      case 'DO':
        switch (result.cmd[key].option) {
          case 'terminalType':
            resCMD = `IAC.WILL.${result.cmd[key].option}`;
            resCMD += '.IAC.WILL.windowSize';
            break;
          case 'windowSize':
            resCMD =
              'IAC.SB.windowSize.transmitBinary.200.transmitBinary.64.IAC.SE';
            break;
          default:
            resCMD += result.cmd[key].option;
            break;
        }
        break;
      case 'AYT':
        resCMD = '';
        _self.emit('AYT');
        break;
      case 'WILL':
        switch (result.cmd[key].option) {
          case 'suppressGoAhead':
            resCMD = `IAC.DO.${result.cmd[key].option}`;
            break;
          default:
            resCMD = `IAC.DO.${result.cmd[key].option}`;
            break;
        }
        break;
      case 'SB':
        switch (result.cmd[key].option) {
          case 'terminalType echo IAC.SE':
            resCMD = 'IAC.SB.terminalType.transmitBinary.ANSI.IAC.SE';
            break;
          default:
            break;
        }
        break;
      case 'DONT':
        switch (result.cmd[key].option) {
          default:
            resCMD += result.cmd[key].option;
            break;
        }
        break;
      case 'WONT':
        switch (result.cmd[key].option) {
          default:
            resCMD = `IAC.DONT.${result.cmd[key].option}`;
            break;
        }
      default:
        break;
    }
    if (_self._log) {
      console.log('rx:', reqCMD);
      console.log('tx:', resCMD);
    }

    _self.write(_self.cmdtoBuffer(resCMD));
  });

  if (result.data.length > 0) {
    _self.emit('data', result.data);
  }
};

Telnet.prototype.write = function(data, cb) {
  this._sock.write(data);
  if (cb) {
    cb();
  }
};

Telnet.prototype.cmdtoBuffer = function(cmd) {
  const _self = this;
  const CMD = cmd.split('.');
  const buffer = [];

  Object.keys(CMD).forEach(key => {
    if (_self.operation.indexOf(CMD[key]) != -1) {
      buffer.push(_self.operation.indexOf(CMD[key]));
    } else if (_self.option.indexOf(CMD[key]) != -1) {
      buffer.push(_self.option.indexOf(CMD[key]));
    } else if (parseInt(CMD[key]) >= 0) {
      buffer.push(parseInt(CMD[key]));
    } else {
      for (let i = 0; i < CMD[key].length; i += 1) {
        buffer.push(CMD[key].charCodeAt(i));
      }
    }
  });
  return new Buffer(buffer);
};

Telnet.prototype.destroy = function(cmd) {
  this._sock.destroy();
  this._sock = null;
};

module.exports = exports = Telnet;
exports.Telnet = Telnet;
exports.native = undefined;
