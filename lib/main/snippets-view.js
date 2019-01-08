'use babel';

import { Pane } from 'atom';
import '../../node_modules/xterm/dist/addons/fit/fit.js';
import Term from './terminal';
import Pyserial from '../connections/pyserial';
import ApiWrapper from '../main/api-wrapper.js';
import Logger from '../helpers/logger.js'
var EventEmitter = require('events');
var ElementResize = require("element-resize-detector");
fs = require('fs');
$ = require('jquery')

export default class SnippetsView extends EventEmitter {

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

  build(){
    var _this = this
    $(document).ready(function(){

      var snippets_html = fs.readFileSync(_this.package_folder + 'main/snippets-view.html')
      console.log(snippets_html.toString())
      $('.pymakr-overlay-content-wrapper').append(snippets_html.toString())
      console.log($('.pymakr-overlay-content-wrapper').html())

      _this.content = $('#snippets')
      _this.list = $('#snippets-list')
      _this.snippet_name = $('#snippet-name')
      _this.content_right = $('#snippets-right')
      _this.snippets_description = $('#snippets-description')
      _this.button_insert = $('#snippets-button-insert')
      _this.button_create = $('#snippets-button-create')
      _this.content_display_box = $('#snippets-display-box')
      console.log(_this.button_insert)
      console.log(_this.button_create)
      console.log(_this.snippet_name)
      console.log(_this.snippets_description)

      _this.button_insert.on('click',function(){
        if(_this.selected_snippet){
          _this.panelview.emit('snippet.insert',_this.selected_snippet.id,_this.getInputBoxContent())
        }
      })

      _this.button_create.on('click',function(){
        if(_this.selected_snippet){
          _this.panelview.emit('snippet.create_file',_this.selected_snippet.id,_this.getInputBoxContent())
        }
      })
    })

  //   this.conent_list = this.content.appendChild(document.createElement('div'));
  //   this.conent_list.classList.add('snippets-list');
  //   this.conent_list.innerHTML = '<span>List of snippets here!</span>';
  //
  //   this.content_display = this.content.appendChild(document.createElement('div'));
  //   this.content_display.classList.add('snippets-display');
  //   this.content_display.innerHTML = '<span>Selected snipped here</span>';
  }


  setContent(list){
    var _this = this

    this.list.html("")
    for(var i in list){
      var item = list[i]
      console.log(item)

      // build list item
      var li_el = document.createElement('li')
      li_el.innerHTML = item.name
      li_el.id = item.id
      li_el.onclick = function(el,el2){
        console.log("emitting "+el.srcElement.id)
        _this.panelview.emit('snippets.open',el.srcElement.id)
      }

      this.list.append(li_el)
    }
  }

  getInputBoxContent(){
    console.log(this.content_display_box)
    return this.content_display_box.html()
  }

  open(snippet){
    var _this = this
    console.log(snippet)
    this.snippet_name.html(snippet.name)
    this.snippets_description.html(snippet.description)
    // $('#snippet-list li').removeClass()
    // $('.snippets #'+snippet.id).classList.add('selected')
    this.selected_snippet = snippet
    this.content_display_box.val(snippet.code.toString())
  }


}
