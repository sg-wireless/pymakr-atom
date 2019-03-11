'use babel';

export default class ConfigSnippets {
  static defaults(){
    return {
      files: [
        {
          name: "WiFi Simple",
          description: "Very basic router connection script",
          id: "wifi-simple"
        },
        {
          name: "WiFi Static IP",
          description: "Connect to a router with a static IP",
          id: "wifi-static-ip"
        },
        {
          name: "WiFi Multiple networks",
          description: "Extended WiFi script with static IP and multi network",
          id: "wifi-multi-network"
        },
        {
          name: "Bluetooth Connect",
          description: "Connect and retrieve data from bluetooth device",
          id: "ble-connect-data"
        },
        {
          name: "RGB LED Trafic light",
          description: "Switches the RGB LED between red orange and green",
          id: "rgb-led-traficlight"
        },
        {
          name: "Pytrack",
          description: "Basic pytrack example",
          id: "pytrack"
        },
        {
          name: "Pysense",
          description: "Basic pysense example",
          id: "pysense"
        },
        {
          name: "Pyscan",
          description: "Basic pyscan example",
          id: "pyscan"
        },
        {
          name: "LTE Cat-M1",
          description: "Connect over LTE Cat M1 to Google's web server over secure SSL:",
          id: "lte-cat-m1"
        },
        {
          name: "LTE NB-IoT",
          description: "Narrow Band IoT example with Vodaphone",
          id: "lte-nb-iot"
        },
        {
          name: "LTE get IMEI",
          description: "Returns your modules IMEI number",
          id: "lte-get-imei"
        },
        {
          name: "Pyscan",
          description: "Basic pyscan example",
          id: "pyscan"
        },
        {
          name: "Pyscan",
          description: "Basic pyscan example",
          id: "pyscan"
        },
      ],
    }
  }
}
