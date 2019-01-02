'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'
$ = require('jquery')
var EventEmitter = require('events');

fs = require('fs');
var ElementResize = require("element-resize-detector");

export default class SnippetsView extends EventEmitter {

  constructor(panelview,overlayview,settings) {
    super()
    var _this = this
    this.panelview = panelview
    this.overlayview = overlayview
    this.settings = settings
  }

  build(){

    this.content = this.overlayview.content_wrapper.appendChild(document.createElement('div'));
    this.content.classList = ['snippets'];

    this.conent_list = this.content.appendChild(document.createElement('div'));
    this.conent_list.classList.add('snippets-list');
    this.conent_list.innerHTML = '<span>List of snippets here!</span>';

    this.content_display = this.content.appendChild(document.createElement('div'));
    this.content_display.classList.add('snippets-display');
    this.content_display.innerHTML = '<span>Selected snipped here</span>';
  }


  setContent(list){
    var _this = this

    this.conent_list.innerHTML = "All snippets<br/ >"
    var ul = document.createElement('ul')
    for(var i in list){
      var item = list[i]
      console.log(item)
      var li_el = ul.appendChild(document.createElement('li'))
      li_el.innerHTML = item.name
      li_el.id = item.id
      li_el.onclick = function(el,el2){
        console.log("emitting "+el.srcElement.id)
        _this.panelview.emit('snippets.open',el.srcElement.id)
      }
    }
    this.conent_list.appendChild(ul)

    this.content_display.innerHTML = "Selected snippet: <span id=\"snippet-name\"></span><br/ >"
    this.content_display_input = this.content_display.appendChild(document.createElement('textarea'));
    this.content_display_input.rows = 8
    this.button_insert = this.content_display.appendChild(document.createElement('button'));
    this.button_insert.innerHTML = 'Insert'
    this.button_create_file = this.content_display.appendChild(document.createElement('button'));
    this.button_create_file.innerHTML = 'Create file'

    this.button_insert.onclick = function(){
      console.log(_this.selected_snippet)
      if(_this.selected_snippet){
        console.log("Emitting!")
        _this.panelview.emit('snippet.insert',_this.selected_snippet.id)
      }
    }
    this.button_create_file.onclick = function(){
      if(_this.selected_snippet){
        _this.panelview.emit('snippet.create_file',_this.selected_snippet.id)
      }
    }
  }

  open(snippet){
    var _this = this
    console.log(snippet)
    $('#snippet-name').html(snippet.name)
    $('.snippets ul li').classList = []
    // $('.snippets #'+snippet.id).classList.add('selected')
    this.selected_snippet = snippet
    this.content_display_input.innerHTML = snippet.code
  }


}
