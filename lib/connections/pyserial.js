'use babel';

import Logger from '../helpers/logger';

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
      err => {
        // not implemented
      },
    );

    this.comport_manufacturers =
      settings.autoconnect_comport_manufacturers;
    const dtrSupport = ['darwin'];

    this.dtr_supported = dtrSupport.indexOf(process.platform) > -1;
  }

  connect(onconnect, onerror, ontimeout) {
    const _this = this;
    let errorThrown = false;

    // open errors will be emitted as an error event
    this.stream.on('error', err => {
      if (!errorThrown) {
        errorThrown = true;
        onerror(new Error(err));
      }
    });

    let timeout = null;
    this.stream.open(() => {
      _this.sendPing(err => {
        if (!err) {
          clearTimeout(timeout);
          _this.send('\r\n', () => {
            onconnect();
          });
        }
      });
    });

    timeout = setTimeout(() => {
      if (!errorThrown) {
        errorThrown = true;
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
    this.stream.on('data', data => {
      let finalData = data;
      const dataStr = finalData.toString();
      finalData = Buffer(finalData);
      _this.onmessage(dataStr, finalData);
    });
  }

  send(mssg, cb) {
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, cb);
  }

  send_raw(data, cb) {
    const _this = this;
    this.stream.write(data, () => {
      if (cb) {
        _this.stream.drain(cb);
      }
    });
  }

  send_cmd(cmd, cb) {
    const mssg = `\x1b\x1b${cmd}`;
    const data = new Buffer(mssg, 'binary');
    this.send_raw(data, () => {
      cb();
    });
  }

  static isSerialPort(name, cb) {
    if (
      name &&
      (name.substr(0, 3) === 'COM' ||
        name.indexOf('tty') > -1 ||
        name.indexOf('/dev') > -1)
    ) {
      cb(true);
    } else {
      fs.access(name, fs.constants.F_OK, err => {
        if (err === true) {
          cb(true);
        } else {
          cb(false);
        }
      });
    }
  }

  static listPycom(settings, cb) {
    const pycomList = [];
    const pycomManus = [];
    settings.refresh();
    const comportManufacturers =
      settings.autoconnect_comport_manufacturers;
    PySerial.list(settings, (names, manus) => {
      for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        const manu = manus[i];
        if (comportManufacturers.indexOf(manu) > -1) {
          pycomList.push(name);
          pycomManus.push(manu);
        }
      }
      cb(pycomList, pycomManus);
    });
  }

  static list(settings, cb) {
    const comportManufacturers =
      settings.autoconnect_comport_manufacturers;
    SerialPort.list().then(ports => {
      const portnames = [];
      const otherPortnames = [];
      const manufacturers = [];
      const otherManufacturers = [];
      ports.forEach((port, index, array) => {
        const name = port.path;
        let manu = '';
        if (name) {
          if (name.indexOf('Bluetooth') === -1) {
            manu = port.manufacturer
              ? port.manufacturer
              : 'Unknown manufacturer';
            const pycomManuIndex = comportManufacturers.indexOf(manu);
            if (pycomManuIndex > -1) {
              let j;
              for (j = 0; j < manufacturers.length; j += 1) {
                if (
                  pycomManuIndex <
                  comportManufacturers.indexOf(manufacturers[j])
                ) {
                  break;
                }
              }
              portnames.splice(j, 0, name);
              manufacturers.splice(j, 0, manu);
            }
          } else {
            otherPortnames.push(name);
            otherManufacturers.push(manu); // push to top of array
          }
        }
      });
      const result = portnames.concat(otherPortnames);
      const manus = manufacturers.concat(otherManufacturers);
      cb(result, manus);
    });
  }

  sendPing(cb) {
    // not implemented
    if (this.dtr_supported) {
      this.stream.set({ dtr: true }, err => {
        if (cb) {
          cb(err);
          return !err;
        }
        return false;
      });
    } else {
      cb();
      return true;
    }
    return false;
  }

  flush(cb) {
    this.stream.flush(cb);
  }
}
