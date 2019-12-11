'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper';
import Logger from '../helpers/logger';

const EventEmitter = require('events');
const ElementResize = require('element-resize-detector');
fs = require('fs');
$ = require('jquery');

export default class InfoView extends EventEmitter {
  constructor(panelview, overlayview, settings) {
    super();
    const _this = this;
    this.api = new ApiWrapper(settings);
    this.package_folder = this.api.getPackageSrcPath();
    this.panelview = panelview;
    this.overlayview = overlayview;
    this.settings = settings;
    this.package_folder;
  }

  build(root_element) {
    const _this = this;
    $(document).ready(() => {
      const snippets_html = fs.readFileSync(`${_this.package_folder}/views/info-view.html`);
      root_element.append(snippets_html.toString());

      _this.info_content = $('#pymakr-info-view');
      _this.info_close = $('#pymakr-info-close');

      _this.info_close.click(() => {
        _this.panelview.closeOverlay();
      });

      _this.bindClicks();
    });
  }

  bindClicks() {
    const _this = this;

    $('#info-view-fs_type input').change((event) => {
      const { commands } = _this.panelview.selected_device;
      // console.log(event.currentTarget)
      console.log(event.currentTarget.value);
      // commands.prepare(function(){
      //   commands.setFSType(event.currentTarget.value,function(result){
      //     console.log(result)
      //     commands.exit(function(){})
      //   })
      // })
    });
    $('#info-view-heartbeat_on_boot input').change((event) => {
      const { commands } = _this.panelview.selected_device;
      console.log(event.currentTarget.checked);
      // commands.prepare(function(){
      //   commands.setHeartbeatOnBoot(event.currentTarget.checked,function(result){
      //     console.log(result)
      //     commands.exit(function(){})
      //   })
      // })
    });
    $('#info-view-wifi_on_boot input').change((event) => {
      const { commands } = _this.panelview.selected_device;
      console.log(event.currentTarget.checked);
      commands.prepare(() => {
        commands.setWifiOnBoot(event.currentTarget.checked, (result) => {
          console.log(result);
          commands.exit(() => {});
        });
      });
    });
    $('button#info-button-free_memory').click(() => {
      const { commands } = _this.panelview.selected_device;
      commands.prepare(() => {
        commands.formatFlash((result) => {
          console.log(result);
          _this.panelview.selected_device.commands.getFreeMemory((result) => {
            commands.exit(() => {
              _this.setContent({ free_memory: result });
            });
          });
        });
      });
    });
    $('button#info-button-free_ram').click(() => {
      const { commands } = _this.panelview.selected_device;
      commands.prepare(() => {
        commands.gcCollect((result) => {
          console.log(result);
          commands.exit(() => {
            _this.setContent({ free_ram: result });
            console.log(result);
          });
        });
      });
    });
    $('button#info-button-reboot').click(() => {
      const { commands } = _this.panelview.selected_device;
      commands.prepare(() => {
        _this.panelview.closeOverlay();
        commands.reset((result) => {
          _this.panelview.closeOverlay();
        });
      });
    });
  }

  setContent(info) {
    const _this = this;
    $(document).ready(() => {
      for (const key in info) {
        const val = info[key];
        const el = $(`#info-view-${key}`);
        if (el.hasClass('radio')) {
          console.log(`Setting radio button to ${val}`);
          $(`input:radio[name=info-view-${key}-input]`).val([val]);
          // $('input:radio[name=info-view-fs_type-input]').val([val]).trigger('change');
          $(`#info-view-${key}-test`).html(val);
          console.log(`input:radio[name=info-view-${key}-input]`);
          console.log($(`input:radio[name=info-view-${key}-input]`));
          console.log(val);
        } else if (el.hasClass('checkbox')) {
          $(`input:checkbox[name=info-view-${key}-input]`).attr('checked', val == 'True');
        } else {
          $(`#info-view-${key}`).html(val);
        }
      }
    });
  }

  open(snippet) {
    const _this = this;
    // this.snippet_name.html(snippet.name)
    // this.snippets_description.html(snippet.description)
    // // $('#snippet-list li').removeClass()
    // // $('.snippets #'+snippet.id).classList.add('selected')
    // this.selected_snippet = snippet
    // this.content_display_box.val(snippet.code.toString())
  }
}
