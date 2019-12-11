'use babel';

import Logger from '../helpers/logger.js';

const SerialPort = require('serialport');
const fs = require('fs');

export default class PySerial {
  constructor(address, params, settings) {
    this.type = 'serial';
    this.params = params;
    this.address = address;
    this.ayt_pending = false;
    this.logger = new Logger('PySerial');
    this.stream = new SerialPort(
      address,
      {
        baudRate: 115200,
        autoOpen: false,
      },
      ((err) => {
        // not implemented
      }),
    );

    this.comport_manufacturers = settings.autoconnect_comport_manufacturers;

    const dtr_support = ['darwin'];

    this.dtr_supported = dtr_support.indexOf(process.platform) > -1;
  }

  connect(onconnect, onerror, ontimeout) {
    const _this = this;
    let error_thrown = false;

    // open errors will be emitted as an error event
    this.stream.on('error', (err) => {
      if (!error_thrown) {
        error_thrown = true;
        onerror(new Error(err));
      }
    });

    let timeout = null;
    this.stream.open(() => {
      _this.sendPing((err) => {
        if (!err) {
          clearTimeout(timeout);
          _this.send('\r\n', () => {
            onconnect();
          });
        }
      });
    });

    timeout = setTimeout(() => {
      if (!error_thrown) {
        error_thrown = true;
        ontimeout(new Error('Timeout while connecting'));
        _this.disconnect(() => {});
      }
    }, _this.params.timeout);
  }

  disconnect(cb) {
    this.stream.close();
    cb();
  }

  registerListener(cb) {
    const _this = this;
    this.onmessage = cb;
    this.stream.on('data', (data) => {
      const data_str = data.toString();
      data = Buffer(data);
      _this.onmessage(data_str, data);
    });
  }

  send(mssg, cb) {
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, cb);
  }

  send_raw(data, cb) {
    const _this = this;
    let r = false;
    this.stream.write(data, () => {
      if (cb) {
        r = true;
        _this.stream.drain(cb);
      }
    });
  }

  send_cmd(cmd, cb) {
    const mssg = `\x1b\x1b${cmd}`;
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, () => {
      // setTimeout(cb,400)
      cb();
    });
  }

  static isSerialPort(name, cb) {
    if (
      name
      && (name.substr(0, 3) == 'COM'
        || name.indexOf('tty') > -1
        || name.indexOf('/dev') > -1)
    ) {
      cb(true);
    } else {
      fs.access(name, fs.constants.F_OK, (err) => {
        if (err == true) {
          cb(true);
        } else {
          cb(false);
        }
      });
    }
  }

  static listPycom(settings, cb) {
    const pycom_list = [];
    const pycom_manus = [];
    settings.refresh();
    comport_manufacturers = settings.autoconnect_comport_manufacturers;
    PySerial.list(settings, (names, manus) => {
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const manu = manus[i];
        if (comport_manufacturers.indexOf(manu) > -1) {
          pycom_list.push(name);
          pycom_manus.push(manu);
        }
      }
      cb(pycom_list, pycom_manus);
    });
  }

  static list(settings, cb) {
    const comport_manufacturers = settings.autoconnect_comport_manufacturers;
    SerialPort.list().then((ports) => {
      const portnames = [];
      const other_portnames = [];
      const manufacturers = [];
      const other_manufacturers = [];
      ports.forEach((port, index, array) => {
        const name = port.path;
        if (name) {
          if (name.indexOf('Bluetooth') == -1) {
            var manu = port.manufacturer
              ? port.manufacturer
              : 'Unknown manufacturer';
            const pycom_manu_index = comport_manufacturers.indexOf(manu);
            if (pycom_manu_index > -1) {
              let j;
              for (j = 0; j < manufacturers.length; j++) {
                if (
                  pycom_manu_index
                  < comport_manufacturers.indexOf(manufacturers[j])
                ) {
                  break;
                }
              }
              portnames.splice(j, 0, name);
              manufacturers.splice(j, 0, manu);
              // if(PySerial.COMPORT_MANUFACTURERS[0] == manu){
              //   portnames.unshift(name) // push to top of array
              //   manufacurers.unshift(manu) // push to top of array
              // }else{
              //   portnames.push(name)
              //   manufacurers.push(manu) // push to top of array
              // }
            }
          } else {
            other_portnames.push(name);
            other_manufacturers.push(manu); // push to top of array
          }
        }
      });
      const result = portnames.concat(other_portnames);
      const manus = manufacturers.concat(other_manufacturers);
      cb(result, manus);
    });
  }

  sendPing(cb) {
    const _this = this;
    // not implemented
    if (this.dtr_supported) {
      this.stream.set({ dtr: true }, (err) => {
        if (cb) {
          cb(err);
          return !err;
        }
      });
    } else {
      cb();
      return true;
    }
  }

  flush(cb) {
    this.stream.flush(cb);
  }
}
