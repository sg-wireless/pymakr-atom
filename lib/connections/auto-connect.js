'use babel';

import Config from '../config';
import Logger from '../helpers/logger';
import Utils from '../helpers/utils';
import PySerial from './pyserial';

const EventEmitter = require('events');

export default class AutoConnect extends EventEmitter {
  constructor(pymakr, terminal, settings) {
    super();
    this.terminal = terminal;
    this.pymakr = pymakr;
    this.settings = settings;
    this.logger = new Logger('ConnectionHelper');
    this.autoConnect_timer = null;
    this.autoConnect_address = undefined;
    this.connection_timer = null;
    this.addresses = [];
    this.address_names = [];
    this.ip_addresses = [];
    this.ip_address_names = [];
    this.initial_scan = true;
    this.utils = new Utils(settings);
  }

  getAllAddressNames() {
    return this.address_names.concat(this.ip_address_names);
  }

  getAllAddresses() {
    return this.addresses.concat(this.ip_addresses);
  }

  enabled() {
    return this.settings.auto_connect;
  }

  start(cb, wait) {
    const _this = this;
    this.stop();
    if (!wait) {
      this.refreshPycomBoards();
    }

    this.refreshIpAddresses();

    this.settings.onChange('address', () => {
      _this.refreshIpAddresses();
    });

    this.autoConnect_timer = setInterval(() => {
      _this.refreshPycomBoards();
    }, 2500);
  }

  stop() {
    if (this.autoConnect_timer) {
      clearInterval(this.autoConnect_timer);
      this.autoConnect_address = undefined;
    }
  }

  refreshIpAddresses() {
    let addedAddresses = 0;
    $('#pymakr-address-list').html(
      '<div class="loading_text">No valid IP addresses found</div>',
    );
    if (
      typeof this.settings.address === 'string' ||
      this.settings.address instanceof String
    ) {
      if (this.settings.address !== 'PASTE_YOUR_SERIAL_PORT_HERE') {
        this.addIpAddress(this.settings.address);
        addedAddresses += 1;
      }
    } else {
      for (let i = 0; i < this.settings.address.length; i += 1) {
        const a = this.settings.address[i];
        if (this.ip_addresses.indexOf(a) === -1) {
          this.addIpAddress(a);
          addedAddresses += 1;
        }
      }
      for (let j = 0; j < this.ip_addresses.length; j += 1) {
        const ip = this.ip_addresses[j];
        if (this.settings.address.indexOf(ip) === -1) {
          this.removeIpAddress(ip);
          addedAddresses -= 1;
          j -= 1;
        }
      }
    }
    if (addedAddresses) {
      $('#pymakr-address-list').removeClass('disabled');
    } else {
      $('#pymakr-address-list').addClass('disabled');
      $('#pymakr-address-list').html(
        '<div class="loading_text">No valid addresses were found</div>',
      );
    }
  }

  refreshPycomBoards(cb) {
    const addressStartCount = this.address_names.length;
    // const loopWithDelay = index => {
    //   let finalIndex = index ? index : 0;
    //   if (finalIndex < addressArray.length) {
    //     setTimeout(() => {
    //       addressArray[finalIndex].click();
    //       finalIndex += 1;
    //       loopWithDelay(finalIndex);
    //     }, 50);
    //   }
    // };
    PySerial.listPycom(this.settings, (list, manufacturers) => {
      const loopListWithDelay = index => {
        let finalIndex = index ? index : 0;
        if (finalIndex < list.length) {
          const name = list[finalIndex];
          const m = manufacturers[finalIndex];
          if (this.address_names.indexOf(name) === -1) {
            setTimeout(() => {
              this.addToAddresses(name, m);
              finalIndex += 1;
              loopListWithDelay(finalIndex)
            }, 50);
          }
        }
      };
      loopListWithDelay();

      for (let i = 0; i < this.addresses.length; i += 1) {
        if (list.indexOf(this.addresses[i].name) === -1) {
          this.removeAddress(this.addresses[i].name, i);
        }
      }

      if (
        list.length === 0 &&
        (addressStartCount > 0 || this.initial_scan)
      ) {
        this.emit('autoconnect.no_addresses');
      }
      if (!this.initial_scan) {
        this.initial_scan = true;
      }
      if (cb) {
        cb(this.addresses, this.address_names);
      }
    });
  }

  addIpAddress(ip) {
    this.ip_addresses.push(ip);
    this.ip_address_names.push(ip);
    this.emit('autoconnect.ip_added', ip);
  }

  removeIpAddress(ip) {
    const i = this.ip_addresses.indexOf(ip);
    if (i > -1) {
      this.ip_addresses.splice(i, 1);
      this.emit('autoconnect.ip_removed', ip);
    }
  }

  addToAddresses(name, manual) {
    const title = `${name} (${manual})`;
    const shortName = this.utils.shortenComport(name);
    const comInfo = {
      name,
      manual,
      title,
      shortName,
    };
    this.addresses.push(comInfo);
    this.address_names.push(name);
    this.emit('autoconnect.address_added', comInfo, name);
  }

  removeAddress(name, i) {
    this.addresses.splice(i, 1);
    this.address_names.splice(i, 1);
    this.emit('autoconnect.address_removed', name);
  }
}
