'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../wrappers/api-wrapper.js';
import Logger from '../helpers/logger.js'
var EventEmitter = require('events');
var ElementResize = require("element-resize-detector");
fs = require('fs');
$ = require('jquery')

export default class InfoView extends EventEmitter {

  constructor(panelview,overlayview,settings) {
    super()
    var _this = this
    this.api = new ApiWrapper(settings)
    this.package_folder = this.api.getPackageSrcPath()
    this.panelview = panelview
    this.overlayview = overlayview
    this.settings = settings
    this.package_folder
  }

  build(root_element){
    var _this = this
    $(document).ready(function(){

      var snippets_html = fs.readFileSync(_this.package_folder + '/views/info-view.html')
      root_element.append(snippets_html.toString())

      _this.info_content = $('#pymakr-info-view')
      _this.info_close = $('#pymakr-info-close')

      _this.info_close.click(function(){
        _this.panelview.closeOverlay()
      })

      _this.bindClicks()
    })
  }

  bindClicks(){
    var _this = this

    $('#info-view-fs_type input').change(function(event){
      var commands = _this.panelview.selected_device.commands
      // console.log(event.currentTarget)
      console.log(event.currentTarget.value)
      // commands.prepare(function(){
      //   commands.setFSType(event.currentTarget.value,function(result){
      //     console.log(result)
      //     commands.exit(function(){})
      //   })
      // })
    })
    $('#info-view-heartbeat_on_boot input').change(function(event){
      var commands = _this.panelview.selected_device.commands
      console.log(event.currentTarget.checked)
      // commands.prepare(function(){
      //   commands.setHeartbeatOnBoot(event.currentTarget.checked,function(result){
      //     console.log(result)
      //     commands.exit(function(){})
      //   })
      // })
    })
    $('#info-view-wifi_on_boot input').change(function(event){
      var commands = _this.panelview.selected_device.commands
      console.log(event.currentTarget.checked)
      commands.prepare(function(){
        commands.setWifiOnBoot(event.currentTarget.checked,function(result){
          console.log(result)
          commands.exit(function(){})
        })
      })
    })
    $('button#info-button-free_memory').click(function(){
      var commands = _this.panelview.selected_device.commands
      commands.prepare(function(){
        commands.formatFlash(function(result){
          console.log(result)
          _this.panelview.selected_device.commands.getFreeMemory(function(result){
            commands.exit(function(){
              _this.setContent({'free_memory': result})
            })
          })
        })
      })
    })
    $('button#info-button-free_ram').click(function(){
      var commands = _this.panelview.selected_device.commands
      commands.prepare(function(){
        commands.gcCollect(function(result){
          console.log(result)
          commands.exit(function(){
            _this.setContent({'free_ram': result})
            console.log(result)
          })
        })
      })
    })
    $('button#info-button-reboot').click(function(){
      var commands = _this.panelview.selected_device.commands
      commands.prepare(function(){
        _this.panelview.closeOverlay()
        commands.reset(function(result){
          _this.panelview.closeOverlay()
        })
      })
    })
  }

  setContent(info){
    var _this = this
    $(document).ready(function(){
      for(var key in info){
        var val = info[key]
        var el = $('#info-view-'+key)
        if(el.hasClass('radio')){
          console.log("Setting radio button to "+val)
          $('input:radio[name=info-view-'+key+'-input]').val([val])
          // $('input:radio[name=info-view-fs_type-input]').val([val]).trigger('change');
          $('#info-view-'+key+'-test').html(val)
          console.log('input:radio[name=info-view-'+key+'-input]')
          console.log($('input:radio[name=info-view-'+key+'-input]'))
          console.log(val)
        }else if(el.hasClass('checkbox')){
          $('input:checkbox[name=info-view-'+key+'-input]').attr('checked',val == 'True')
        }else{
          $('#info-view-'+key).html(val)
        }
      }
    })
  }

  open(snippet){
    var _this = this
    // this.snippet_name.html(snippet.name)
    // this.snippets_description.html(snippet.description)
    // // $('#snippet-list li').removeClass()
    // // $('.snippets #'+snippet.id).classList.add('selected')
    // this.selected_snippet = snippet
    // this.content_display_box.val(snippet.code.toString())
  }

}
