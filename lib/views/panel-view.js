'use babel';

import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';
import Utils from '../helpers/utils';
import OverlayView from './overlay-view';
import SidebarView from './sidebar-view';
import ActionView from './action-view';
import Config from '../config';
import ChromeTabs from '../third-parties/chrome-tabs';

const elementResizeDetectorMaker = require('element-resize-detector');
const $ = require('jquery');
const EventEmitter = require('events');
const { shell } = require('electron');

const fs = require('fs');
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
    this.feedback_popup_seen =
      serializedState &&
      'feedbackPopupSeen' in serializedState &&
      serializedState.feedbackPopupSeen;
    this.selectedDevice = null;
    this.term_rows = Config.constants().term_rows;
    this.utils = new Utils(settings);
    this.tooltips = {}
    this.alreadyResized = false;
    const html = fs.readFileSync(
      `${_this.package_folder}/views/panel-view.html`,
    );
    this.main_el = document.createElement('div');
    this.main_el.insertAdjacentHTML('beforeend', html.toString());
  }

  build() {
    const _this = this;
    this.element = $('#pymakr');
    this.elementOriginal = this.element[0];
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
    this.device_connection_tabs = $('.chrome-tabs-content');
    this.connect_all = $('#pymakr-connect-all');
    this.close_all = $('#pymakr-close-all');
    this.add_address_button = $('#pymakr-add-address-button');
    this.add_address_field = $('#pymakr-add-address-field');
    this.add_address_field_wrapper = $(
      '#pymakr-add-address-field-wrapper',
    );

    this.quick_settings = [];
    this.quick_settings_values = [];
    this.comports = [];
    this.overlay.build(this.overlay_contents);
    this.initResize(_this.resizer);
    this.action_view.build(this.element);
    this.sidebar_view.build(this.element);
    this.bindOnClicks();
    this.bindListeners();
    this.initQuickSettings();
    _this.setProjectNames(null, _this.api.getOpenProjects());
    atom.project.onDidChangePaths(() => {
      _this.setProjectNames(null, _this.api.getOpenProjects());
    });
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
      this.feedback_question.innerHTML +=
        'We are working on ideas for Pymakr 2.0 and would love your feedback! ';
      this.feedback_open_form = this.feedback_question.appendChild(
        document.createElement('div'),
      );
      this.feedback_open_form.innerHTML += 'Click here';
      this.feedback_open_form.classList.add('feedback-link');
      this.feedback_question.appendChild(
        document.createTextNode(
          ' if you have a few minutes to help out.',
        ),
      );
      this.feedbackQuestionDontshowagain = this.feedback_question.appendChild(
        document.createElement('div'),
      );
      this.feedbackQuestionDontshowagain.classList.add(
        'dontshowagain',
      );
      this.feedbackQuestionDontshowagain.innerHTML =
        "Don't show again";
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

      this.feedback_question_close.onclick = () => {
        _this.feedback_question.classList.add('hidden');
      };

      this.feedback_open_form.onclick = () => {
        _this.feedback_popup_seen = true;
        shell.openExternal(
          'https://danielmariano.typeform.com/to/kQ26Iu',
        );
        _this.feedback_question.classList.add('hidden');
      };

      this.feedbackQuestionDontshowagain.onclick = () => {
        _this.feedback_question.classList.add('hidden');
        _this.feedback_popup_seen = true;
        // do something to hide this permantently?
      };
    }
  }

  buildTerminal() {
    const _this = this;

    // terminal resize functionality
    const erd = ElementResize();
    erd.listenTo(document.getElementById('pymakr'), () => {
      if (_this.visible) {
        _this.setPanelHeight();
      }
    });
  }

  resizeTerminals(newHeight) {
    if (this.selectedDevice) {
      const terminals = document.querySelectorAll('.device-terminal');
      terminals.forEach(term => {
        term.style.height = `${newHeight - 30}px`;
      });

      this.selectedDevice.terminal.fit.fit();
    }
  }

  initTerminalHeight() {
    if (!this.alreadyResized) {
      const startRows = Config.constants().term_rows.default;
      const currentFontSize = this.settings.font_size;
      const lineHeight = currentFontSize;
      const startHeight = startRows * lineHeight;
      this.element.height(`${startHeight}px`);
      this.resizeTerminals(startHeight);
      this.alreadyResized = true;
    } else {
      // terminal already open
      this.resizeTerminals(this.element.height());
    }
  }

  initResize(resizer) {
    const _this = this;
    let startY = 0;
    this.initTerminalHeight();
    let startHeight;
    function onMouseDown(e) {
      startY = e.clientY;
      startHeight = parseInt(_this.element.height(), 10) + 6;
      document.documentElement.addEventListener(
        'mousemove',
        onMouseMove,
        false,
      );
      document.documentElement.addEventListener(
        'mouseup',
        stopDrag,
        false,
      );
    }
    function onMouseMove(e) {
      const newHeight = startHeight + startY - e.clientY;
      _this.element.height(`${newHeight}px`);
      _this.resizeTerminals(newHeight);
    }

    function stopDrag() {
      document.documentElement.removeEventListener(
        'mousemove',
        onMouseMove,
        false,
      );
      document.documentElement.removeEventListener(
        'mouseup',
        stopDrag,
        false,
      );
    }

    resizer.mousedown(onMouseDown);
    const erdUltraFast = elementResizeDetectorMaker({
      strategy: 'scroll',
    });
    erdUltraFast.listenTo(
      document.getElementById('pymakr'),
      element => {
        const height = element.offsetHeight - 25;
        _this.resizeTerminals(height);
      },
    );
  }

  bindListeners() {
    const _this = this;
    this.on('device.disconnected', address => {
      _this.setDeviceStatus(address, 'disconnected');
    });

    this.on('device.connected', address => {
      _this.setDeviceStatus(address, 'connected');
    });
  }

  // All button actions
  bindOnClicks() {
    const _this = this;
    this.button_close.click(() => {
      if (_this.visible) {
        setTimeout(() => {
          _this.hidePanel();
          _this.emit('close');
        }, 50);
      } else {
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

    this.add_address_button.click(e => {
      e.stopPropagation();
      _this.add_address_button.addClass('hidden');
      _this.add_address_field_wrapper.removeClass('hidden');
    });

    _this.add_address_field_wrapper.click(e => {
      e.stopPropagation();
    });

    _this.add_address_field.click(e => {
      e.stopPropagation();
    });

    $('button.has-sub').click(function() {
      if ($(this).hasClass('open')) {
        $(this).removeClass('open');
        // don't do anything
      } else {
        $(this).addClass('open');
      }
    });

    $('button.has-sub').on('blur', function() {
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

    this.topbar.onclick = function() {
      _this.emit('topbar');
      if (!_this.visible) {
        _this.visible = true;
        _this.showPanel();
      }
    };
  }

  initQuickSettings() {
    const _this = this;
    const quickSettings = ['auto_connect', 'safe_boot_on_upload'];
    for (let i = 0; i < quickSettings.length; i += 1) {
      const quickSetting = quickSettings[i];
      this.quick_settings[quickSetting] = $(
        `#pymakr-setting-${quickSetting}`,
      );
      const sCheckbox = $(`#setting-${quickSetting}-value`);
      const labelSetting = $(`#label-${quickSetting}`);
      sCheckbox.prop('checked', _this.settings[quickSetting]);
      sCheckbox.on('change', el => {
        _this.settings.set(el.target.name, el.target.checked);
      });
      labelSetting.on('click', () => {
        const newValue = !_this.settings[quickSetting];
        sCheckbox.prop('checked', newValue);
        _this.settings.set(quickSetting, newValue);
      });
      this.quick_settings_values[quickSetting] = sCheckbox;
    }
  }

  createConnectionButton(id, text, parent) {
    const cleanId = this.cleanId(id);

    const button = $(' <div class="chrome-tab"></div>');

    button.html(`
    <div class="chrome-tab-dividers"></div>
      <div class="chrome-tab-content">
              <span class="connection-status"></span>
              <div class="chrome-tab-title">
                ${text}
              </div>
              <div class="chrome-tab-drag-handle"></div>
              <div class="chrome-tab-bg"></div>
      </div>
    
    `);
    button.prop('id', `connection-${cleanId}`);
    parent.append(button);
    return button;
  }

  createButton(id, icon, text, className, parent) {
    const cleanId = this.cleanId(id);

    const button = $('<div></div>');

    button.html(`<span class='fa fa-${icon}'></span> ${text}`);
    button.attr('id', `${className}-${cleanId}`);
    button.attr('name', id);
    if (className && className !== '') {
      button.addClass(`pymakr-${className}`);
    }
    parent.append(button);
    return button;
  }

  setProjectNames(selected, names) {
    let finalSelected = selected;
    const _this = this;
    if (!finalSelected && names.length > 0) {
      finalSelected = names[0];
    }
    this.project_names = names;
    this.selected_project = finalSelected;

    this.setProjectName(finalSelected);

    this.projects_list.html('');
    for (let i = 0; i < names.length; i += 1) {
      const n = names[i];
      let displayN = n;
      if (n.length > 16) {
        displayN = `${n.substr(0, 20)}...`;
      }
      if (!i) {
        if (this.selectedDevice) {
          this.api.setSelectedProjectByName(
            displayN,
            _this.selectedDevice,
          );
        }
      }
      const el = this.createButton(
        n,
        '',
        displayN,
        'project',
        this.projects_list,
      );
      el.click(function() {
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
    this.project_name_display.html(
      `<span class='project-name'>${this.project_name}</span>`,
    );
  }

  setTitle() {
    this.project_name_display.html(this.project_name);
  }

  addComport(com_info) {
    const _this = this;
    const button = this.createButton(
      com_info.name,
      '',
      com_info.title,
      'comport',
      this.comport_list,
    );
    $('#pymakr-comports-list .loading_text').remove();
    button.click(function() {
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
      '<div class="loading_text"><span class=`fa fa-`></span>  No devices detected on USB</div>',
    );
  }

  addAddress(address) {
    const _this = this;
    const button = this.createButton(
      address,
      '',
      address,
      'address',
      this.address_list,
    );
    $('#pymakr-address-list .loading_text').remove();
    button.click(function() {
      _this.emit('connect.device', $(this).attr('name'));
    });
  }

  removeAddress(address) {
    const finalAddress = this.cleanId(address);
    $(`#address-${finalAddress}`).remove();
  }

  addConnectionTab(address) {
    const _this = this;
    const cleanAddress = this.cleanId(address);
    const shortAddress = this.utils.shortenComport(address);
    const button = this.createConnectionButton(
      address,
      `${shortAddress}`,
      this.device_connection_tabs,
    );

    button.click(function() {
      _this.emit('open.tab', shortAddress);
    });
    const closeButton = $('<div class="chrome-tab-close"></div>');
    button.children('.chrome-tab-content').append(closeButton);
    closeButton.click(function() {
      _this.closeOverlay();
      _this.emit(
        'close.tab',
        $(this)
          .parent()
          .children('.chrome-tab-title')
          .text()
          .trim(),
      );
    });

    const terminalElement = $('<div></div>');
    terminalElement.attr('id', `terminal-${cleanAddress}`);
    terminalElement.attr('class', 'device-terminal');
    this.terminal_area.append(terminalElement);
    this.selectTab(address, this.selectedDevice);
    const fontSize = this.settings.font_size;
    terminalElement.css('font-size', `${fontSize}px`);
    $('#pymakr-terminal-placeholder').css(
      'font-size',
      `${fontSize}px`,
    );
    const el = document.querySelector('.chrome-tabs');
    const chromeTabs = new ChromeTabs();
    this.tooltips[cleanAddress] = atom.tooltips.add($(`#connection-${cleanAddress}`), {
      title: address,
      trigger: 'hover',
      delay: 2000,
      placement: 'top',
    });
    chromeTabs.init(el);
    return terminalElement;
  }

  removeConnectionTab(address) {
    const cleanAddress = this.cleanId(address);
    if (this.tooltips[cleanAddress])
      this.tooltips[cleanAddress].dispose();
    $(`#connection-${cleanAddress}`).remove();
    $(`#terminal-${cleanAddress}`).remove();
    if ($('#pymakr-terminal-area div.device-terminal').length === 0) {
      this.terminal_placeholder.addClass('open');
      const runButton = $('#pymakr-action-connect');
      runButton.addClass('no-devices');
      $('#pymakr-action-connect').removeClass('not-connected');
    
    }
  }

  selectTab(address, device) {
    const finalAaddress = this.cleanId(address);
    this.terminal_area.find('.device-terminal').removeClass('open');
    $(`#terminal-${finalAaddress}`).addClass('open');
    this.terminal_placeholder.removeClass('open');
    const runButton = $('#pymakr-action-connect');
    runButton.removeClass('no-devices');
    if (device) {
      this.action_view.update(device.connected());
    }
    this.device_connection_tabs.find('div').removeAttr('active');
    $(`#connection-${finalAaddress}`).attr('active', '');
  }

  setDeviceStatus(address, status) {
    const connected = status === 'connected' || status === true;
    if (status === 'connected') {
      $(`#connection-${this.cleanId(address)}`).addClass('connected');
    } else if (status === 'disconnected') {
      $(`#connection-${this.cleanId(address)}`).removeClass(
        'connected',
      );
    }
     if (this.selectedDevice){
      if (this.selectedDevice.address === address){
        this.action_view.update(connected);
      }
    }
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
    this.api.addBottomPanel({
      item: this.getElement(),
      visible: true,
      priority: 100,
    });
  }

  setPanelHeight(height, minimized) {
    let newHeight = height;
    if (newHeight === undefined) {
      if (this.selectedDevice) {
        const firstTerminal = this.selectedDevice.terminal;
        newHeight = firstTerminal.getHeight() + 25; // add 25 for the bar
      } else {
        newHeight = 200;
      }
    }
    if (!minimized)
      if (newHeight < 200) {
        const startRows = Config.constants().term_rows.default;
        const currentFontSize = this.settings.font_size;
        const lineHeight = currentFontSize + 8;
        newHeight = startRows * lineHeight + 6;
      }
    this.element.height(`${newHeight}px`);
  }

  hidePanel() {
    this.element.removeClass('container-open');
    this.element.addClass('container-close');

    this.visible = false;
  }

  showPanel() {
    this.visible = true;
    this.element.addClass('container-open');
    this.element.removeClass('container-close');
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
