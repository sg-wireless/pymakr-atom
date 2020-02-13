'use babel';

import TelnetClient from './telnet/telnetcli';

const AYT = '\xff\xf6';

export default class PyTelnet {
  constructor(address, params) {
    this.type = 'telnet';
    this.stream = new TelnetClient('pycomboard');
    this.connected = false;
    this.listening = false;
    this.username_sent = false;
    this.password_sent = false;
    this.params = params;
    this.address = address;
    this.pingTimer = null;
    this.receive_buffer = '';
    this.ayt_pending = false;
  }

  sendPing(cb) {
    if (this.ayt_pending) {
      cb(new Error('Ping failed'));
    } else {
      cb(null);
    }
    this.ayt_pending = true;
    this.send(AYT);
    return true;
  }

  connect(onconnect, onerror, ontimeout) {
    this.onconnect = onconnect;
    this.onerror = onerror;
    this.ontimeout = ontimeout;
    this.username_sent = false;
    this.password_sent = false;
    const _this = this;
    this.params.host = this.address;
    this.stream.connect(this.params, err => {
      onconnect(new Error(err));
    });
    this.stream.setReportErrorHandler((telnet, error) => {
      let finalError = error;
      if (onerror) {
        if (!finalError) {
          finalError = 'Connection lost';
        }
        onerror(new Error(finalError));
      }
    });

    let timeoutTriggered = false;
    this.stream.setReportTimeoutHandler((telnet, error) => {
      if (ontimeout) {
        if (!timeoutTriggered) {
          timeoutTriggered = true;
          ontimeout(error);
        }
      }
    });

    this.stream.setReportAYTHandler(() => {
      _this.ayt_pending = false;
    });
  }

  disconnect(cb) {
    this.stream.close();
    // give the connection time to close.
    // there is no proper callback for this in the telnet lib.
    setTimeout(cb, 200);
  }

  registerListener(cb) {
    this.onmessage = cb;

    this.stream.read((err, recv) => {
      if (recv) {
        const data = recv.join('');
        const raw = Buffer(recv);
        cb(data, raw);
      }
    });
  }

  send(mssg, cb) {
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, cb);
  }

  send_raw(data, cb) {
    this.stream.write(data, () => {
      if (cb) cb();
    });
  }

  send_cmd(cmd, cb) {
    const mssg = `\x1b\x1b${cmd}`;
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, cb);
  }

  flush(cb) {
    cb();
  }
}
