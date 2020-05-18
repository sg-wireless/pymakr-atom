'use babel';

import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';

$ = require('jquery');
const EventEmitter = require('events');

fs = require('fs');

export default class ActionView extends EventEmitter {
  constructor(panelview, settings) {
    super();
    this.panelview = panelview;
    this.settings = settings;
    this.visible = true;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.logger = new Logger('PanelView');
  }

  build(rootElement) {
    const _this = this;

    const html = fs.readFileSync(
      `${_this.package_folder}/views/action-view.html`,
    );
    rootElement.append(html.toString());
    this.left_panel = $('#pymakr-left-panel');
    this.connect = $('#pymakr-action-connect');
    this.connect_sub = $('pymakr-action-connect .sub');
    this.run = $('#pymakr-action-run');
    this.run_sub = $('pymakr-action-run .sub');
    this.upload = $('#pymakr-action-upload');
    this.upload_sub = $('pymakr-action-upload .sub');
    this.download = $('#pymakr-action-download');
    this.download_sub = $('pymakr-action-download .sub');
    this.info = $('#pymakr-action-info');
    this.info_sub = $('pymakr-action-info .sub');
    this.left_buttons = $('.left-button');
    this.left_buttons.addClass('disabled');
    this.runActionButton = $('#iab-run');
    this.runActionDialog = $('#action-dialog-run');

    const platform = process.platform;
    const tooltipOptions = title => ({
      title,
      trigger: 'hover',
      delay: 0,
      placement: 'right',
    });
    atom.tooltips.add(
      this.connect,
      tooltipOptions(
        `Connect/Disconnect <span class="keystroke">${
          platform === 'darwin' ? '⌃⌥C' : 'ctrl+alt+c'
        }</span> <span class="keystroke">${
          platform === 'darwin' ? '⌃⌥D' : 'ctrl+alt+d'
        }</span>`,
      ),
    );
    atom.tooltips.add(
      this.run,
      tooltipOptions(
        `Run selected file <span class="keystroke">${
          platform === 'darwin' ? '⌃⌥R' : 'ctrl+alt+r'
        }</span>`,
      ),
    );
    atom.tooltips.add(
      this.download,
      tooltipOptions('Download from device'),
    );
    atom.tooltips.add(
      this.upload,
      tooltipOptions(
        `Upload project to device <span class="keystroke">${
          platform === 'darwin' ? '⌃⌥S' : 'ctrl+alt+s'
        }</span>`,
      ),
    );
    atom.tooltips.add(this.info, tooltipOptions('Get device info'));
    this.bindOnClicks();
  }

  enable() {
    this.left_buttons.removeClass('disabled');
  }

  disable() {
    this.left_buttons.addClass('disabled');
    // $('#pymakr-action-connect span.main').removeClass('toggle-off')
  }

  disableExceptConnectButton() {
    this.left_buttons.addClass('disabled');
    $('#pymakr-action-connect').removeClass('disabled');
  }

  update(connected, disableAll) {
    if (connected) {
      this.enable();
      $('#pymakr-action-connect').removeClass('not-connected');
    } else {
      if (disableAll && !connected) this.disable();
      else this.disableExceptConnectButton();
      $('#pymakr-action-connect').addClass('not-connected');
    }
    $('#pymakr-action-connect span.main').attr(
      'class',
      'main fa fa-toggle-on',
    );
  }

  bindOnClicks() {
    const _this = this;
    this.connect.click(e => {
      e.preventDefault();

      if (
        !_this.connect.hasClass('disabled') &&
        !_this.connect.hasClass('no-devices')
      ) {
        _this.panelview.emit('connect.toggle');
        if (this.panelview.selectedDevice) {
          this.panelview.selectedDevice.terminal.xterm.focus();
        }
      }
    });
    this.run.click(() => {
      $('.device-terminal.open').click();
      if (!_this.run.hasClass('disabled')) {
        _this.panelview.emit('run');
        if (_this.panelview.selectedDevice) {
          _this.panelview.selectedDevice.terminal.xterm.focus();
        }
      }
    });
    this.upload.click(() => {
      $('.device-terminal.open').click();
      if (!_this.run.hasClass('disabled')) {
        _this.panelview.emit('sync');
        if (_this.panelview.selectedDevice) {
          _this.panelview.selectedDevice.terminal.xterm.focus();
        }
      }
    });
    this.download.click(() => {
      $('.device-terminal.open').click();
      if (!_this.run.hasClass('disabled')) {
        _this.panelview.emit('sync_receive');
        if (_this.panelview.selectedDevice) {
          _this.panelview.selectedDevice.terminal.xterm.focus();
        }
      }
    });

    this.info.click(() => {
      $('.device-terminal.open').click();
      if (!_this.run.hasClass('disabled')) {
        _this.panelview.emit('openInfo');
      }
    });
  }
}
