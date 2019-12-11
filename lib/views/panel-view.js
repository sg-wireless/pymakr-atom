'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper.js';
import Logger from '../helpers/logger.js';
import Utils from '../helpers/utils.js';
import SnippetsView from './snippets-view.js';
import OverlayView from './overlay-view.js';
import SidebarView from './sidebar-view.js';
import ActionView from './action-view.js';
import Config from '../config.js';

$ = require('jquery');
const EventEmitter = require('events');
const { shell } = require('electron');

fs = require('fs');
const ElementResize = require('element-resize-detector');

export default class PanelView extends EventEmitter {
  constructor(settings, serializedState) {
    super();
    const _this = this;
    this.settings = settings;
    this.visible = true;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.logger = new Logger('PanelView');
    this.overlay = new OverlayView(this, settings);
    this.action_view = new ActionView(this, settings);
    this.sidebar_view = new SidebarView(this, settings);
    this.feedback_popup_seen = serializedState
      && 'feedbackPopupSeen' in serializedState
      && serializedState.feedbackPopupSeen;
    this.selected_device = null;
    this.term_rows = Config.constants().term_rows;
    this.utils = new Utils(settings);

    const html = fs.readFileSync(`${_this.package_folder}/views/panel-view.html`);
    this.main_el = document.createElement('div');
    this.main_el.insertAdjacentHTML('beforeend', html.toString());
  }

  build() {
    const _this = this;
    // main element
    this.element = $('#pymakr');
    this.element_original = this.element[0];
    this.resizer = $('#pymakr-resizer');
    this.overlay_contents = $('#pymakr-overlay-contents');
    this.topbar = $('#pycom-top-bar');
    this.title = $('#pymakr-title');
    this.projects_button = $('#pymakr-projects');
    this.projects_list = $('#pymakr-projects .subnav');
    this.project_name_display = $('#pymakr-projects #project-name');
    this.project_name = '';
    this.buttons = $('#pymakr-buttons');
    this.button_more_tab = $('#pymakr-more-subnav');
    this.overlay_wrapper = $('#pymakr-overlay');
    this.terminal_area = $('#pymakr-terminal-area');
    this.terminal_placeholder = $('#pymakr-terminal-placeholder');
    this.button_more = $('#pymakr-buttons #more');
    this.button_more_sub = $('#pymakr-buttons #more .subnav');
    this.button_close = $('#pymakr-buttons #close');

    this.comport_list = $('#pymakr-comports-list');
    this.address_list = $('#pymakr-address-list');
    this.device_connection_tabs = $('#pymakr-connection-tabs');
    this.connect_all = $('#pymakr-connect-all');
    this.close_all = $('#pymakr-close-all');
    this.add_address_button = $('#pymakr-add-address-button');
    this.add_address_field = $('#pymakr-add-address-field');
    this.add_address_field_wrapper = $('#pymakr-add-address-field-wrapper');

    this.quick_settings = [];
    this.quick_settings_values = [];
    this.comports = [];

    // this.showFeedbackPopup()

    // build all buttons inside wrapper
    // this.buildButtons(this.buttons)

    this.initResize(_this.resizer);

    this.overlay.build(this.overlay_contents);
    this.action_view.build(this.element); // can be bound to main element because of absolute positioning
    this.sidebar_view.build(this.element); // can be bound to main element because of absolute positioning

    // creates the terminal elements and bindings
    // this.buildTerminal()

    // binds click actions for all elements
    this.bindOnClicks();
    this.bindListeners();

    this.initQuickSettings();

    // Sets project name in top bar
    _this.setProjectNames(null, _this.api.getOpenProjects());
    // this.settings.registerProjectChangeWatcher(function(path){
    //   _this.setProjectName(path)
    // })
  }

  openSnippet(s) {
    this.overlay.openSnippet(s);
  }

  showFeedbackPopup() {
    const _this = this;
    if (!this.feedback_popup_seen) {
      this.feedback_question = document.createElement('div');
      this.feedback_question.classList.add('pymakr-feedback');
      this.feedback_question.innerHTML = '<h2>Hi Pymakr User!</h2> ';
      this.feedback_question.innerHTML
        += 'We are working on ideas for Pymakr 2.0 and would love your feedback! ';
      this.feedback_open_form = this.feedback_question.appendChild(
        document.createElement('div'),
      );
      this.feedback_open_form.innerHTML += 'Click here';
      this.feedback_open_form.classList.add('feedback-link');
      this.feedback_question.appendChild(
        document.createTextNode(' if you have a few minutes to help out.'),
      );
      this.feedback_question_dontshowagain = this.feedback_question.appendChild(
        document.createElement('div'),
      );
      this.feedback_question_dontshowagain.classList.add('dontshowagain');
      this.feedback_question_dontshowagain.innerHTML = "Don't show again";
      this.feedback_question_point = this.feedback_question.appendChild(
        document.createElement('div'),
      );
      this.feedback_question_point.classList.add('square');
      this.feedback_question_close = this.feedback_question.appendChild(
        document.createElement('div'),
      );
      this.feedback_question_close.classList.add('close-button');
      this.feedback_question_close.innerHTML = 'x';

      this.element.append(this.feedback_question);

      this.feedback_question_close.onclick = function () {
        _this.feedback_question.classList.add('hidden');
      };

      this.feedback_open_form.onclick = function () {
        _this.feedback_popup_seen = true;
        shell.openExternal('https://danielmariano.typeform.com/to/kQ26Iu');
        _this.feedback_question.classList.add('hidden');
      };

      this.feedback_question_dontshowagain.onclick = function () {
        _this.feedback_question.classList.add('hidden');
        _this.feedback_popup_seen = true;
        // do something to hide this permantently?
      };
    }
  }

  buildTerminal(cb) {
    const _this = this;

    // terminal resize functionality
    const erd = ElementResize();
    erd.listenTo(this.terminal_element, (element) => {
      if (_this.visible) {
        _this.setPanelHeight();
      }
    });
  }

  initResize(resizer) {
    const _this = this;
    let startY = 0;
    let lastY = 0;
    let startHeight = 0;
    const startRows = Config.constants().term_rows.default;
    let startTermHeight = 300;
    let lineHeight = 0;
    let currentRows = startRows;

    function onMouseDown(e) {
      console.log('Bind onmousedown');
      startY = e.clientY;
      startHeight = parseInt(_this.element.height(), 10);
      console.log(`Startheight: ${startHeight}`);
      if (_this.selected_device) {
        startTermHeight = _this.selected_device.terminal.getHeight();
        console.log(`Start term height: ${startTermHeight}`);
      }
      if (lineHeight == 0) {
        lineHeight = startTermHeight / startRows;
        console.log(`Lineheight: ${lineHeight}`);
      }

      document.documentElement.addEventListener(
        'mousemove',
        onMouseMove,
        false,
      );
      document.documentElement.addEventListener('mouseup', stopDrag, false);
    }
    function onMouseMove(e) {
      console.log('On mouse move');
      const new_height = startHeight + startY - e.clientY;
      console.log(`New height: ${new_height}`);
      const new_term_height = startTermHeight + startY - e.clientY;
      console.log(`New term height: ${new_term_height}`);
      const newRows = Math.floor(new_term_height / lineHeight);
      console.log(newRows);
      console.log(currentRows);
      if (
        newRows != currentRows
        && newRows <= _this.term_rows.max
        && newRows >= _this.term_rows.min
      ) {
        currentRows = newRows;

        // when decreasing terminal size, this correction is needed to prevent terminal being slightly too high
        const correction = Math.round(new_term_height % lineHeight);

        _this.element.height(`${new_height - correction}px`);
        const term_height = new_term_height - correction;
        if (_this.selected_device) {
          console.log(`Set height to ${term_height} with rows ${newRows}`);
          _this.selected_device.resizeAllTerminals(term_height, newRows);
          _this.lastRows = newRows;
        } else {
          console.log('No device selected');
        }
      } else {
        console.log('rows not valid');
      }
      lastY = e.clientY;
    }

    function stopDrag() {
      document.documentElement.removeEventListener(
        'mousemove',
        onMouseMove,
        false,
      );
      document.documentElement.removeEventListener('mouseup', stopDrag, false);
    }

    resizer.mousedown(onMouseDown);
  }

  bindListeners() {
    const _this = this;
    this.on('device.disconnected', (address, device) => {
      _this.setDeviceStatus(address, 'disconnected');
    });

    this.on('device.connected', (address, device) => {
      _this.setDeviceStatus(address, 'connected');
    });
  }

  // All button actions
  bindOnClicks() {
    const _this = this;
    this.button_close.click(() => {
      if (_this.visible) {
        console.log('Hiding panel');
        setTimeout(() => {
          _this.hidePanel();
          _this.emit('close');
          // closed_using_button = true
        }, 50);
      } else {
        console.log('Showing panel');
        _this.showPanel();
        _this.emit('open');
      }
    });

    this.connect_all.click(() => {
      _this.emit('connect.all');
    });

    this.close_all.click(() => {
      _this.emit('close.all');
    });

    this.add_address_button.click((e) => {
      e.stopPropagation();
      _this.add_address_button.addClass('hidden');
      _this.add_address_field_wrapper.removeClass('hidden');
    });

    _this.add_address_field_wrapper.click((e) => {
      e.stopPropagation();
    });

    _this.add_address_field.click((e) => {
      e.stopPropagation();
    });

    $('button.has-sub').click(function () {
      if ($(this).hasClass('open')) {
        $(this).removeClass('open');
        // don't do anything
      } else {
        $(this).addClass('open');
      }
    });

    $('button.has-sub').on('blur', function () {
      const button = $(this);
      setTimeout(() => {
        button.removeClass('open');
      }, 150);
    });

    // }
    // this.option_get_serial.onclick = function(){
    //   _this.emit('get_serial')
    // }
    //

    // this.option_get_help.onclick = function(){
    //   _this.emit('help')
    // }

    this.topbar.onclick = function () {
      _this.emit('topbar');
      if (!_this.visible) {
        _this.visible = true;
        // TODO: the line doesn't work yet. Clicking 'button_close' also toggles, creating unwanted behaviour
        _this.showPanel();
      }
    };
  }

  initQuickSettings() {
    const _this = this;
    const quick_settings = ['auto_connect', 'safe_boot_on_upload'];
    for (let i = 0; i < quick_settings.length; i++) {
      const quickSetting = quick_settings[i];
      this.quick_settings[quickSetting] = $(`#pymakr-setting-${quickSetting}`);
      const s_checkbox = $(`#setting-${quickSetting}-value`);
      const labelSetting = $(`#label-${quickSetting}`);
      s_checkbox.prop('checked', _this.settings[quickSetting]);
      s_checkbox.on('change', (el, el2) => {
        _this.settings.set(el.target.name, el.target.checked);
      });
      labelSetting.on('click', () => {
        const newValue = !_this.settings[quickSetting];
        s_checkbox.prop('checked', newValue);
        _this.settings.set(quickSetting, newValue);
      });
      this.quick_settings_values[quickSetting] = s_checkbox;
    }
  }

  createButton(id, type, icon, text, classname, parent) {
    type = 'div';
    const clean_id = this.cleanId(id);

    button = $('<div></div>');

    button.html(`<span class="fa fa-${icon}"></span> ${text}`);
    button.attr('id', `${classname}-${clean_id}`);
    button.attr('name', id);
    if (classname && classname != '') {
      button.addClass(`pymakr-${classname}`);
    }
    parent.append(button);
    return button;
  }

  setProjectNames(selected, names) {
    const _this = this;
    if (!selected && names.length > 0) {
      selected = names[0];
    }
    this.project_names = names;
    this.selected_project = selected;

    this.setProjectName(selected);

    this.projects_list.html('');
    for (let i = 0; i < names.length; i++) {
      const n = names[i];
      let display_n = n;
      if (n.length > 16) {
        display_n = `${n.substr(0, 20)}...`;
      }
      const el = this.createButton(
        n,
        'div',
        '',
        display_n,
        'project',
        this.projects_list,
      );
      el.click(function (element) {
        _this.emit('project.selected', $(this).attr('name'));
        _this.setProjectName($(this).attr('name'));
      });
    }
  }

  setProjectName(name) {
    const _this = this;
    if (name) {
      this.project_name = name;
    } else {
      this.project_name = 'No project';
    }
    this.project_name_display.html(this.project_name);

    // adjust connection tabs left margin based on project name width
    $(document).ready(() => {
      const width = parseInt($('#pymakr-options-left').width());
      console.log(width);
      _this.device_connection_tabs.css('left', width + 5);
    });
  }

  setTitle(status) {
    // if(status == 'connected'){
    //    this.title.html('<img class="pymakr-logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Connected<i class="fa fa-check fa-lg icon" id="green"></i> <span id="pymakr-project_title">'+this.project_name+"</span>")
    // }else{
    //    this.title.html('<img class="pymakr-logo" src="'+this.api.getPackagePath()+'/styles/assets/logo.png">  Disconnected<i class="fa fa-times fa-lg icon" id="red"></i> <span id="pymakr-project_title">'+this.project_name+'</span>')
    // }
    this.project_name_display.html(this.project_name);
  }

  addComport(com_info) {
    const _this = this;
    const button = this.createButton(
      com_info.name,
      'div',
      '',
      com_info.title,
      'comport',
      this.comport_list,
    );
    $('#pymakr-comports-list .loading_text').remove();
    button.click(function (element) {
      console.log(`Connect to: ${$(this).attr('name')}`);
      _this.emit('connect.device', $(this).attr('name'));
    });
    this.comports[com_info.name] = button;
  }

  removeComport(name) {
    this.comports[name].remove();
  }

  removeComports() {
    for (k in this.comports) {
      this.comports[k].remove();
    }
    this.comport_list.html(
      "<div class='loading_text'>No devices detected on USB</div>",
    );
  }

  addAddress(address) {
    const clean_address = this.cleanId(address);
    const _this = this;
    const button = this.createButton(
      address,
      'div',
      '',
      address,
      'address',
      this.address_list,
    );
    $('#pymakr-address-list .loading_text').remove();
    button.click(function (element) {
      console.log(`Connect to: ${$(this).attr('name')}`);
      _this.emit('connect.device', $(this).attr('name'));
    });
  }

  removeAddress(address) {
    console.log('Removing address');
    address = this.cleanId(address);
    console.log(address);
    $(`#address-${address}`).remove();
  }

  addConnectionTab(address) {
    const _this = this;
    console.log(`Opening terminal and tab for ${address}`);

    const clean_address = this.cleanId(address);
    const short_address = this.utils.shortenComport(address);

    // create tab
    const button = this.createButton(
      address,
      'div',
      '',
      short_address,
      'connection',
      this.device_connection_tabs,
    );
    button.click(function (element) {
      _this.emit('open.tab', $(this).attr('name'));
    });

    const conn_status = $('<span></span>');
    conn_status.addClass('connection-status');
    button.append(conn_status);
    const close_icon = $('<span></span>');
    close_icon.addClass('close');
    close_icon.html('<span class="fa fa-times"></span>');
    button.append(close_icon);
    close_icon.click(function (element) {
      _this.emit(
        'close.tab',
        $(this)
          .parent('.pymakr-connection')
          .text()
          .trim(),
      );
    });

    const terminal_element = $('<div></div>');
    terminal_element.attr('id', `terminal-${clean_address}`);
    terminal_element.attr('class', 'device-terminal');
    this.terminal_area.append(terminal_element);
    this.selectTab(address, this.selected_device);
    return terminal_element;
  }

  removeConnectionTab(address) {
    console.log(`Removing connection tab: ${address}`);
    address = this.cleanId(address);
    $(`#connection-${address}`).remove();
    $(`#terminal-${address}`).remove();
    if ($('#pymakr-terminal-area div.device-terminal').length == 0) {
      console.log('No more terminals, opening placeholder');
      this.terminal_placeholder.addClass('open');
    }
  }

  selectTab(address, device) {
    console.log(`Selecting tab ${address}`);
    address = this.cleanId(address);
    this.terminal_area.find('.device-terminal').removeClass('open');
    $(`#terminal-${address}`).addClass('open');
    this.terminal_placeholder.removeClass('open');
    if (device) {
      this.action_view.update(device.connected());
    }
    this.device_connection_tabs.find('div').removeClass('open');
    $(`#connection-${address}`).addClass('open');
  }

  setDeviceStatus(address, status) {
    let toggle = 'off';
    const connected = status == 'connected';
    if (status == 'connected') {
      toggle = 'on';
      $(`#connection-${this.cleanId(address)}`).addClass('connected');
    } else if (status == 'disconnected') {
      $(`#connection-${this.cleanId(address)}`).removeClass('connected');
    }
    this.action_view.update(connected);
  }

  syncActionView() {}

  cleanId(id) {
    return id
      .replace(/\./g, '')
      .replace(/\//g, '')
      .replace(/\\/g, '')
      .trim();
  }

  // UI Stuff
  addPanel() {
    console.log('Adding bottom panel to html');
    this.api.addBottomPanel({
      item: this.getElement(),
      visible: true,
      priority: 100,
    });
  }

  setPanelHeight(height) {
    if (height === undefined) {
      if (this.selected_device) {
        const first_terminal = this.selected_device.terminal;
        height = first_terminal.getHeight() + 25; // add 25 for the bar
      } else {
        height = 200;
      }

      console.log(`setting height to ${height}`);
    }
    this.element.height(`${height}px`);
  }

  hidePanel() {
    this.setPanelHeight(-5);
    this.element.removeClass('open');
    this.visible = false;
  }

  showPanel() {
    this.visible = true;
    this.setPanelHeight(); // no param wil make it auto calculate based on xterm height
    this.element.addClass('open');
  }

  openInfoOverlay(info) {
    this.overlay_wrapper.addClass('pymakr-open');
    this.overlay_contents.addClass('pymakr-open');
    this.overlay.open(info);
    $('.xterm-rows').addClass('blur-text');
  }

  closeOverlay() {
    this.overlay_wrapper.removeClass('pymakr-open');
    this.overlay_contents.removeClass('pymakr-open');
    $('.xterm-rows').removeClass('blur-text');
    this.emit('snippets.close');
  }

  // Tear down any state and detach
  removeElement() {
    this.element.remove();
  }

  getElement() {
    return this.main_el;
  }
}
