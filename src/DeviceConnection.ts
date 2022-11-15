// 
// DeviceConnection.ts
// taketwo
// 
// Created on 11/10/22
// 

import { SerialPort } from "serialport";

type StoredByteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

class Command<Response> {
  #parser: (any) => Response;
  #instruction: string;
  
  constructor(instruction: string, parser: (input: any) => Response){
    this.#instruction = instruction;
    this.#parser = parser;
  }
  
  parse(data: any): Response {
    return this.#parser(data);
  }
  
  // Returns board and Firmware version
  static version(): Command<string> {
    return new Command("version", data => data as string);
  }
  
  // Print useful status information
  static status(): Command<string> {
    return new Command("status", data => data as string);
  }
  
  // Returns current connected port number
  static port(): Command<number> {
    return new Command("port", data => data as number);
  }
  
  // Connect to USB port at provided number.
  static setPort(port: number): Command<number> {
    return new Command(`port ${port}`, data => data as number);
  }
  
  // Set the default power on port to the provided number.
  static setDefaultPort(port: number): Command<number> {
    return new Command(`defaultport ${port}`, data => data as number);
  }
  
  // Seconds to delay the port change.
  static setDelay(seconds: number): Command<void> {
    return new Command(`delay ${seconds}`, data => {});
  }
  
  // Next port change will disconnect after specified number of seconds.
  static setTimeout(seconds: number): Command<void> {
    return new Command(`delay ${seconds * 1000}`, data => {}); // accepts seconds.
  }
  
  // Enable or disable superspeed.
  static setSuperspeed(flag: boolean): Command<void> {
    return new Command(`superspeed ${flag ? 1 : 0}`, data => {});
  }
  
  // Stores byte value at index, where index is less than 10.
  static putByte(index: StoredByteIndex, value: number): Command<void>{
    return new Command(`put ${index} ${value}`, data => {});
  }
  
  // Return byte value stored at index.
  static byte(index: StoredByteIndex): Command<number>{
    return new Command(`get ${index}`, data => data as number);
  }
  
  // Uses the GPIO line to reset the microcontroller.
  static reset(): Command<void> {
    return new Command("reset", data => {});
  }
}

enum Parity {
  none = "none"
}

enum Event {
  error = "error"
}

type DataBits = 8 | 7 | 6 | 5;
type OpenOptions = { baudRate: number, parity: Parity, dataBits: DataBits };

class DeviceConnection {
  #port: SerialPort;
  
  constructor(path: string, options: OpenOptions){
    this.#port = new SerialPort({
      path,
      ...options
    });
  }
  
  on(event: Event, callback: (error: any) => void){
    this.#port.on(event, callback);
  }
  
  disconnect(){
    // TODO: Reject "run" promises.
  }
  
  async run<R, C extends Command<R>>(command: C): Promise<R> {
    return new Promise((resolve, reject) => {
      
    });
  }
  
  static async devices(): Promise<Array<string>> {
    const devices = await SerialPort.list();
    const paths = devices.map(device => device.path);
    
    return paths;
  }
  
  static Event = Event;
}

export { DeviceConnection, Parity, DataBits, Command };
