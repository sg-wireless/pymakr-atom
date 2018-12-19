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
      ],
    }
  }
}
