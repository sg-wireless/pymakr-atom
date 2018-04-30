'use strict';
const SerialPort = require('./serialport');
// const Binding = require('./bindings/auto-detect');
const Bindings = require('bindings')('serialport.node');
// var SerialPortBinding = require('../../serialport-win/lib/bindings');
const parsers = require('./parsers');

/**
 * @type {BaseBinding}
 */
SerialPort.Binding = Bindings;

/**
 * @type {Parsers}
 */
SerialPort.parsers = parsers;

module.exports = SerialPort;
