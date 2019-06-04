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
    })
  }

  setContent(info){
    var _this = this
    $(document).ready(function(){
      for(var key in info){
        var val = info[key]
        var el = $('#info-view-'+key)
        if(el.hasClass('radio')){
          $('input:radio[name=info-view-'+key+'-input]').val([val]).trigger('change');
          console.log('input:radio[name=info-view-'+key+'-input]')
          console.log($('input:radio[name=info-view-'+key+'-input]'))
          console.log(val)
        }else if(el.hasClass('checkbox')){
          $('input:checkbox[name=info-view-'+key+'-input]').attr('checked',val == 'True').trigger('change');
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
