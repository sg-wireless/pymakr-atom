'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';
import SnippetsView from './snippets-view';
import OverlayView from './overlay-view';
import Config from '../config';

$ = require('jquery');
const EventEmitter = require('events');
const { shell } = require('electron');

fs = require('fs');
const ElementResize = require('element-resize-detector');

export default class ActionView extends EventEmitter {
  constructor(panelview, settings, serializedState) {
    super();
    const _this = this;
    this.panelview = panelview;
    this.settings = settings;
    this.visible = true;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.logger = new Logger('PanelView');
  }

  build(root_element) {
    const _this = this;

    const html = fs.readFileSync(
      `${_this.package_folder}/views/action-view.html`,
    );
    root_element.append(html.toString());

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
    // .not(
    //   '#pymakr-action-connect',
    // );
    this.left_buttons.addClass('disabled');
    this.runActionButton = $('#iab-run');
    this.runActionDialog = $('#action-dialog-run');

    const tooltipOptions = title => ({
      title,
      trigger: 'hover',
      delay: 0,
      placement: 'right',
    });
    atom.tooltips.add(
      this.connect,
      tooltipOptions('Connect/Disconnect'),
    );
    atom.tooltips.add(this.run, tooltipOptions('Run current file'));
    atom.tooltips.add(
      this.download,
      tooltipOptions('Download from device'),
    );
    atom.tooltips.add(
      this.upload,
      tooltipOptions('Upload project to device'),
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
    this.connect.click(() => {
      if (
        !_this.connect.hasClass('disabled') &&
        !_this.connect.hasClass('no-devices')
      ) {
        _this.panelview.emit('connect.toggle');
      }
    });
    this.run.click(() => {
      if (!_this.run.hasClass('disabled'))
        _this.panelview.emit('run');
    });
    this.upload.click(() => {
      if (!_this.run.hasClass('disabled')) {
        _this.panelview.emit('sync');
      }
    });
    this.download.click(() => {
      if (!_this.run.hasClass('disabled'))
        _this.panelview.emit('sync_receive');
    });

    this.info.click(() => {
      if (!_this.run.hasClass('disabled'))
        _this.panelview.emit('openInfo');
    });
  }
}
