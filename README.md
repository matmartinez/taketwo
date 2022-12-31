# Take-Two

A _work-in-progress_ Node.js app that can talk to a [Model 3141][model-3141] USB4 Switch.

## What for?

I'm combining a [Raspberry Pi][pi-zero-w], a [Model 3141][model-3141], and a [Microsoft Surface Dial][ms-surface-dial] to easily switch between my MacBook Pro and PC (equipped with Thunderbolt).

## So far:

- [x] 🤖 Two-way serial communication with the device through USB. Tested on Debian and macOS.
- [x] 🌎 Basic HTTP server that allows switching between devices (and querying connection status). 
- [ ] 🌎 Expose more functionality through the HTTP server. Include stress testing options?
- [ ] 💻 Expose more settings and functionality through CLI arguments.
- [ ] ⚙️ Scripts and guide to deploy as a system service.
- [ ] 📓 Documentation.
- [ ] 💣 Unit tests.

**Note**: This is a personal project and is provided _as is_, without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this project. Use of the Model 3141 USB4 Switch is at your own risk and the authors provide no guarantee that it will not damage equipment or cause any other harm. By using this code, you acknowledge and accept these risks.


[model-3141]: https://mcci.com/usb/dev-tools/model-3141/
[pi-zero-w]: https://www.raspberrypi.com/products/raspberry-pi-zero-w/
[ms-surface-dial]: https://www.microsoft.com/en-us/d/surface-dial/925r551sktgn
