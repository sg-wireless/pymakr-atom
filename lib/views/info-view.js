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
      const snippets_html = fs.readFileSync(
        `${_this.package_folder}/views/info-view.html`,
      );
      root_element.append(snippets_html.toString());

      _this.info_content = $('#pymakr-info-view');
      _this.info_close = $('#pymakr-info-close');

      _this.info_close.click(async () => {
        _this.panelview.closeOverlay();
        const { commands } = _this.panelview.selected_device;
        await commands.exitAsync();
      });

      _this.bindClicks();
    });
  }

  bindClicks() {
    const _this = this;

    $('#info-view-fsType input').change(event => {
      const { commands } = _this.panelview.selected_device;
      // commands.prepare(function(){
      //   commands.setFSType(event.currentTarget.value,function(result){
      //     commands.exit(function(){})
      //   })
      // })
    });
    $('#info-view-heartBeatOnBoot input').change(event => {
      const { commands } = _this.panelview.selected_device;
      // commands.prepare(function(){
      //   commands.setHeartbeatOnBoot(event.currentTarget.checked,function(result){
      //     commands.exit(function(){})
      //   })
      // })
    });
    $('#info-view-wifiOnBoot input').change(event => {
      const { commands } = _this.panelview.selected_device;
      commands.prepare(() => {
        commands.setWifiOnBoot(
          event.currentTarget.checked,
          result => {
            commands.exit(() => {});
          },
        );
      });
    });
    $('button#info-button-free-memory').click(() => {
      const { commands } = _this.panelview.selected_device;
      commands.prepare(() => {
        commands.formatFlash(result => {
          _this.panelview.selected_device.commands.getFreeMemory(
            result => {
              commands.exit(() => {
                _this.setContent({ freeMemory: result });
              });
            },
          );
        });
      });
    });
    $('button#info-button-free-ram').click(async () => {
      const { commands } = _this.panelview.selected_device;
      await commands.prepareAsync();
      const result = await commands.gcCollect();
      await commands.exit();
      this.setContent({ freeRam: result });
    });
    $('button#info-button-reboot').click(async () => {
      const { commands } = _this.panelview.selected_device;
      await commands.prepare();

      this.panelview.closeOverlay();
      await commands.reset();
      this.panelview.closeOverlay();
    });
  }

  setContent(info) {
    const _this = this;
    $(document).ready(() => {
      for (const key in info) {
        const val = info[key];
        const el = $(`#info-view-${key}`);
        if (el.hasClass('radio')) {
          $(`input:radio[name=info-view-${key}-input]`).val([val]);
          // $('input:radio[name=info-view-fsType-input]').val([val]).trigger('change');
          $(`#info-view-${key}-test`).html(val);
        } else if (el.hasClass('checkbox')) {
          $(`input:checkbox[name=info-view-${key}-input]`).attr(
            'checked',
            val == 'True',
          );
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
