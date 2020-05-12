'use babel';

import { CompositeDisposable } from 'atom';
import Config from './config';

const $ = require('jquery');

export default {
  config: Config.settings(),

  activate(state) {
    const _this = this;
    this.prepareSerialPort(error => {
      if (error) {
        const err_mess =
          'There was an error with your serialport module, Pymakr will likely not work properly. Please try to install again or report an issue on our github (see developer console for details)';
        atom.notifications.addError(err_mess);

        console.log(err_mess);
        console.log(error);
      }

      const Pymakr = require('./pymakr');
      const PanelView = require('./views/panel-view');

      const SettingsWrapper = require('./wrappers/settings-wrapper');

      _this.isDark = false;
      _this.buildStatusBarOnConsume = false;
      _this.settings = new SettingsWrapper(settings => {
        _this.view = new PanelView(settings, state.viewState, null);
        _this.view.addPanel();
        _this.view.build();
        _this.pymakr = new Pymakr(
          state.viewState,
          _this.view,
          settings,
        );
        _this.buildStatusBar();
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        _this.subscriptions = new CompositeDisposable();
        // Register command that toggles this view
        _this.subscriptions.add(
          atom.commands.add('atom-workspace', {
            'pymakr:sync': () => _this.pymakr.sync(),
            'pymakr:upload': () => _this.pymakr.upload(),
            'pymakr:upload File': () => _this.pymakr.uploadFile(),
            'pymakr:toggle REPL': () =>
              _this.pymakr.toggleVisibility(),
            'pymakr:connect': () => _this.pymakr.connect(),
            'pymakr:run': () => _this.pymakr.run(),
            'pymakr:run Selection': () => _this.pymakr.runselection(),
            'pymakr:help': () => _this.pymakr.writeHelpText(),
            'pymakr:clear Terminal': () =>
              _this.pymakr.clearTerminal(),
            'pymakr:disconnect': () => _this.pymakr.disconnect(),
          }),
        );
      });
    });
  },

  buildStatusBar() {
    const _this = this;
    const div = $('<div></div>').addClass('pymakr-status-bar');
    const svg = $('<div></div>').addClass('pymakr-logo');
    svg.load(
      `${this.pymakr.api.getPackagePath()}/styles/assets/pycom-icon.svg`,
    );
    const title = $('<span></span>')
      .addClass('title')
      .html('Pymakr');
    svg.css('color', 'red');
    div.append(svg);
    div.append(title);
    div.click(() => {
      _this.pymakr.toggleVisibility();
    });

    if (this.statusBar)
      this.statusBar.addRightTile({ item: div, priority: 1 });
    else this.buildStatusBarOnConsume = true;
  },

  prepareSerialPort(cb) {
    try {
      require('serialport');
      cb();
    } catch (e) {
      console.log('Error while loading serialport library');
      console.log(e);
    }
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    if (this.buildStatusBarOnConsume) {
      this.buildStatusBar();
    }
  },

  deactivate() {
    this.subscriptions.dispose();
    this.pymakr.destroy();
  },

  serialize() {
    const ser = {
      viewState: null,
      feedbackPopupSeen: null,
    };
    if (this.pymakr) {
      (ser.viewState = this.pymakr.serialize()),
        (ser.feedbackPopupSeen = this.pymakr.view.feedback_popup_seen);
    }
    return ser;
  },
};
