'use babel';

export default class Authorize {
  constructor(pyboard) {
    this.pyboard = pyboard;
    this.running = false;
    this.received_login_as = false;
  }

  run(cb) {
    const { pyboard } = this;
    const _this = this;
    this.running = true;

    if (pyboard.connection.type === 'telnet') {
      pyboard.waitForBlocking('Login as:', (err) => {
        _this.received_login_as = true;
        if (err) {
          _this._stoppedRunning();
          if (err.message === 'timeout') {
            cb(new Error('Login timed out'));
          } else {
            cb(new Error(err.message));
          }
        } else {
          pyboard.sendWaitForBlocking(pyboard.params.username, 'Password:', (err2) => {
            if (err2 && err2.message === 'timeout') {
              _this._stoppedRunning();
              cb(new Error('Username timed out'));
            } else {
              // timeout of 50 ms to be sure the board is ready to receive the password
              // Without this, sometimes connecting via the boards access point fails
              setTimeout(() => {
                pyboard.sendWaitForBlocking(
                  pyboard.params.password,
                  'Login succeeded!\r\nType "help()" for more information.\r\n',
                  err3 => {
                    _this._stoppedRunning();
                    if (err3 && err3.message === 'timeout') {
                      cb('Password timed out');
                    } else {
                      cb(null);
                    }
                  },
                  7000,
                );
              }, 50);
            }
          }, 7000);
        }
      }, 7000);
    } else {
      cb('Telnet connection, no login needed');
      this.running = false;
    }
  }

  _stoppedRunning() {
    this.running = false;
    this.received_login_as = false;
  }
}
