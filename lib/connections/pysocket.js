'use babel';

const { Socket } = require('net');

export default class PySocket {
  constructor(address, params) {
    this.type = 'socket';
    this.stream = new Socket();

    this.stream.setTimeout(params.timeout);
    this.connected = false;
    this.params = params;
    this.address = address;
    this.receive_buffer = '';
    this.on_error_called = false;
  }

  connect(onconnect, onerror, ontimeout) {
    this.onconnect = onconnect;
    this.onerror = onerror;
    this.ontimeout = ontimeout;
    this.username_sent = false;
    this.password_sent = false;
    const _this = this;
    this.stream.connect(this.params.port, this.address);
    this.stream.on('connect', () => {
      onconnect();
    });
    this.stream.on('timeout', () => {
      ontimeout();
    });
    this.stream.on('error', error => {
      if (!_this.on_error_called) {
        _this.on_error_called = true;
        onerror(error);
      }
    });
    this.stream.on('close', hadError => {
      if (hadError && !_this.on_error_called) {
        _this.on_error_called = true;
        onerror();
      }
    });
    this.stream.on('end', () => {
      if (!_this.on_error_called) {
        _this.on_error_called = true;
      }
    });
  }

  disconnect(cb) {
    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }
    cb();
  }

  registerListener(cb) {
    this.onmessage = cb;
    this.stream.on('data', data => {
      const raw = Buffer(data);
      cb(data, raw);
    });
  }

  send(mssg, cb) {
    mssg = mssg.replace('\x1b', '\x1b\x1b');
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, cb);
  }

  send_raw(data, cb) {
    if (this.stream) {
      this.stream.write(data, () => {
        if (cb) cb();
      });
    } else {
      cb(new Error('Not connected'));
    }
  }

  send_cmd(cmd, cb) {
    const mssg = `\x1b\x1b${cmd}`;
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, cb);
  }

  sendPing(cb) {
    if (cb) cb(null);
    return true;
  }

  flush(cb) {
    cb();
  }
}
