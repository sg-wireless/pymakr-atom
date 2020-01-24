// From: https://www.npmjs.com/package/telnetit

const Telnet = require('./util-telnet');
const format = require('./format');
const extend = require('util')._extend;

function noop() {}

function TelnetClient(name) {
  let config = null;
  const c = new Telnet();
  let connectState = false; // is connected?
  let connecting = false; // is connecting?
  const svrReplyList = []; // contain the income message which haven't been read.
  const svrReplyWatchers = []; // contain the reader ,who want to read but no message exists.
  let connectCallback = null; // the message to call if err or if connect succ.
  const _this = this; // this
  let reportErrorHandler = null; // report error to conn manager
  let reportEndHandler = null; // report end to conn manager
  let reportTimeoutHandler = null; // reports timeout to conn manager
  let reportAYTHandler = null; // reports timeout to conn manager
  const cloneobj = obj => {
    return extend({}, obj);
  };

  /**
   * telent connecting
   * */
  c.on('connect', () => {
    format.log(name, 'connecting...');
  });

  /**
   * manually notify telnet to rise error to all reader,
   * that is because telnet can not sense the conn reset by themselves.
   * */
  this.clearWatcher = err => {
    if (connectState) {
      format.log(
        name,
        `will rise error to ${svrReplyWatchers.length} readers.`,
      );
      if (svrReplyWatchers.length > 0) {
        // copy them, to void that
        // in the "watcher" new watcher will be added or clearWatcher will be called
        // so that "svrReplyWatchers" will be called again
        const svrReplyWatchersCopy = svrReplyWatchers.splice(0);
        for (
          let i = 0, len = svrReplyWatchersCopy.length;
          i < len;
          i += 1
        ) {
          const watcher = svrReplyWatchersCopy[i];
          watcher(err);
        }
      }
    }
  };

  /**
   * set handler for end of connection
   * */
  this.setReportEndHandler = fnFromConnManage => {
    reportEndHandler = fnFromConnManage;
  };

  /**
   * set error handle , report error to ConnManager.
   * */
  this.setReportErrorHandler = fnFromConnManage => {
    reportErrorHandler = fnFromConnManage;
  };

  /**
   * set error handle , report error to ConnManager.
   * */
  this.setReportTimeoutHandler = fnFromConnManage => {
    reportTimeoutHandler = fnFromConnManage;
  };

  /**
   * set error handle , report error to ConnManager.
   * */
  this.setReportAYTHandler = fnFromConnManage => {
    reportAYTHandler = fnFromConnManage;
  };

  /**
   * onerrorHandler, called when error happen.
   * */
  this.onerrorHandler = error => {
    // 1. close connect 2. call callback  3.call onTelnetConnError to reconnect
    format.error(name, error);
    _this.clearWatcher(error);
    _this.close();
    connectCallback(error);
    connectCallback = noop;
  };

  // will report conn timeout here
  /**
   * on connection error, eg. ETIMEOUT
   * */
  c.on('error', error => {
    // 1. close connect 2. call callback  3.call onTelnetConnError to reconnect
    // format.error(name, error);
    _this.onerrorHandler(error);
    if (error == 'timeout') {
      if (reportTimeoutHandler) {
        reportTimeoutHandler(_this, 'timeout');
      }
    } else if (reportErrorHandler) {
      reportErrorHandler(_this, error);
    }
  });

  /**
   * in fact not occur, only if you set timeout by manaul, and it doesn't mean an error
   * */
  c.on('timeout', () => {
    format.log(name, 'timeout');
    if (reportTimeoutHandler) {
      reportTimeoutHandler(_this, 'timeout');
    }
  });

  /**
   * in fact not occur, only if you set timeout by manaul, and it doesn't mean an error
   * */
  c.on('AYT', () => {
    if (reportAYTHandler) {
      reportAYTHandler(_this, 'ayt');
    }
  });

  /**
   * on connection close.
   * */
  c.on('close', () => {
    format.log(name, 'close');
    _this.close();
  });

  /**
   * on connection end
   * */
  c.on('end', () => {
    format.log(name, 'end');
    if (reportEndHandler) {
      // reportEndHandler(_this, error);
    }
  });

  /**
   * on connection receive data.
   * */
  c.on('data', data => {
    if (!connectState) {
      // the only place to mean connect succ.
      // 1. set states  2. call callback to notify succ.
      connectState = true;
      connecting = false;
      format.log(name, data);
      svrReplyList.push(data);
      connectCallback(null);
      connectCallback = noop;
    } else if (svrReplyWatchers.length > 0) {
      // if have reader, give message to reader.

      // copy them, to void that
      // in the "watcher" new watcher will be added or clearWatcher will be called
      // so that "svrReplyWatchers" will be called again
      const svrReplyWatchersCopy = svrReplyWatchers.splice(0);
      for (
        let i = 0, len = svrReplyWatchersCopy.length;
        i < len;
        i += 1
      ) {
        const watcher = svrReplyWatchersCopy[i];
        watcher(null, [data]);
        svrReplyWatchers.push(watcher);
      }
    } else {
      // no reader, so store the message.
      svrReplyList.push(data);
    }
  });

  /**
   * interface to read data.
   * */
  this.read = cb => {
    if (!connectState) {
      return cb(new Error('not connected to server'));
    }
    // already exist stored message.
    if (svrReplyList.length > 0) {
      cb(null, svrReplyList.splice(0));
    }
    // no existed message, so store it as a reader.
    svrReplyWatchers.push(cb);
  };

  /**
   * interface to write data.
   * */
  this.write = (data, cb) => {
    if (!connectState) {
      return cb(new Error('not connected to server'));
    }
    return c.write(data, cb);
  };

  /**
   * interface to connect to server.
   * */
  this.connect = (newconfig, cb) => {
    if (connectState) {
      cb(new Error('alreay connected.'));
    } else if (connecting) {
      cb(new Error('alreay connecting.'));
    } else {
      connectCallback = cb;
      connecting = true;
      config = cloneobj(newconfig);
      c.connect(config);
    }
  };

  /**
   * interface to clear stored data.
   * */
  this.clear = () => {
    return svrReplyList.splice(0);
  };

  /**
   * close connection , infact just reset the state.
   * */
  this.close = () => {
    // no interface to close telnet, just reset the state.
    // is the only place to reset the connectState and connecting
    if (connectState || connecting) {
      connectState = false;
      connecting = false;
      c.destroy();
    }
  };

  /**
   * interface to get connection state.
   * */
  this.getState = () => {
    return connectState;
  };

  /**
   * interface to get name.
   * */
  this.getName = () => {
    return name;
  };

  /**
   * get config
   * */
  this.getConfig = () => {
    return config;
  };
}

module.exports = TelnetClient;
