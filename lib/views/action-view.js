"use babel";

import { Pane } from "atom";
import "../../node_modules/xterm/dist/addons/fit/fit.js";
import Term from "./terminal";
import Pyserial from "../connections/pyserial";
import ApiWrapper from "../wrappers/api-wrapper.js";
import Logger from "../helpers/logger.js";
import SnippetsView from "./snippets-view.js";
import OverlayView from "./overlay-view.js";
import Config from "../config.js";
$ = require("jquery");
var EventEmitter = require("events");
const { shell } = require("electron");

fs = require("fs");
var ElementResize = require("element-resize-detector");

export default class ActionView extends EventEmitter {
  constructor(panelview, settings, serializedState) {
    super();
    var _this = this;
    this.panelview = panelview;
    this.settings = settings;
    this.visible = true;
    this.api = new ApiWrapper();
    this.package_folder = this.api.getPackageSrcPath();
    this.logger = new Logger("PanelView");
  }

  build(root_element) {
    var _this = this;

    var html = fs.readFileSync(
      _this.package_folder + "/views/action-view.html"
    );
    root_element.append(html.toString());

    this.left_panel = $("#pymakr-left-panel");

    this.connect = $("#pymakr-action-connect");
    this.connect_sub = $("pymakr-action-connect .sub");
    this.run = $("#pymakr-action-run");
    this.run_sub = $("pymakr-action-run .sub");
    this.upload = $("#pymakr-action-upload");
    this.upload_sub = $("pymakr-action-upload .sub");
    this.download = $("#pymakr-action-download");
    this.download_sub = $("pymakr-action-download .sub");
    this.info = $("#pymakr-action-info");
    this.info_sub = $("pymakr-action-info .sub");
    this.left_buttons = $(".left-button").not("#pymakr-action-connect");
    console.log("left-buttons", this.left_buttons);
    this.left_buttons.addClass("disabled");
    // this.left_panel.addClass("disabled");

    this.runActionButton = $("#iab-run");
    this.runActionDialog = $("#action-dialog-run");

    const tooltipOptions = title => ({
      title,
      trigger: "hover",
      delay: 0,
      placement: "right"
    });
    atom.tooltips.add(this.connect, tooltipOptions("Connect/Disconnect"));
    atom.tooltips.add(this.run, tooltipOptions("Run current file"));
    atom.tooltips.add(this.download, tooltipOptions("Download from device"));
    atom.tooltips.add(this.upload, tooltipOptions("Upload project to device"));
    atom.tooltips.add(this.info, tooltipOptions("Get device info"));
    this.bindOnClicks();
  }

  enable() {
    this.left_buttons.removeClass("disabled");
  }

  disable() {
    this.left_buttons.addClass("disabled");
  }

  update(connected) {
    console.log("Updating action view to " + connected);
    var toggle = "off";
    if (connected) {
      this.enable();
      toggle = "on";
    } else {
      this.disable();
    }
    $("#pymakr-action-connect span.main").attr(
      "class",
      "main fa fa-toggle-" + toggle
    );
  }

  bindOnClicks() {
    var _this = this;
    console.log("Binding action view clicks");

    this.connect.click(function() {
      console.log("Connecting");
      _this.panelview.emit("connect.toggle");
    });
    // this.button_disconnect.onclick = function(){
    //   _this.emit('disconnect')
    // }
    this.run.click(function() {
      // console.log("Running");
      if (!_this.run.hasClass("disabled")) _this.panelview.emit("run");
    });
    this.upload.click(function() {
      if (!_this.run.hasClass("disabled")) {
        console.log("Uploading");
        // _this.panelview.emit("sync");
      }
    });
    this.download.click(function() {
      if (!_this.run.hasClass("disabled")) _this.panelview.emit("sync_receive");
    });

    this.info.click(function() {
      if (!_this.run.hasClass("disabled")) _this.panelview.emit("open_info");
    });

    this.runActionButton.on("click", () => {
      _this.runActionDialog.toggle("opened");
      console.log("opened");
    });

    // this.button_more.onblur = function(){
    //   _this.emit('more_blur')
    //   _this.button_more.classList.remove("open")
    // }

    // this.button_more.onclick = function(){
    //   _this.emit('more')
    //   if(_this.button_more.classList.contains("open")){
    //     _this.button_more.classList.remove("open")
    //   }else{
    //     _this.button_more.classList.add("open")
    //   }
    // }
  }
}
