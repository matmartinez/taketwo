// 
// DeviceConnection.ts
// taketwo
// 
// Created on 11/10/22
// 

import { SerialPort, InterByteTimeoutParser } from "serialport";

type StoredByteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

class Command<Response> {
  #instruction: string;
  #parser: (any) => Response;
  
  constructor(instruction: string, parser: (input: any) => Response){
    this.#instruction = instruction;
    this.#parser = parser;
  }
  
  parse(data: any): Response {
    return this.#parser(data);
  }
  
  get instruction(){
    return this.#instruction;
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
  error = "error",
  open = "open"
}

type DataBits = 8 | 7 | 6 | 5;
type OpenOptions = { baudRate: number, parity: Parity, dataBits: DataBits };

class Task {
  #body: string;
  #callback: (input: string) => void;
  
  constructor(body: string, callback: (input: string) => void){
    this.#body = body;
    this.#callback = callback;
  }
  
  get body(){
    return this.#body;
  }
  
  finish(response: string){
    this.#callback(response);
  }
  
}

class DeviceConnection {
  #port: SerialPort;
  #parser: InterByteTimeoutParser;
  #queue: Array<Task>;
  #sender: Task | undefined;
  
  constructor(path: string, options: OpenOptions){
    const configuration = {
      path,
      ...options
    };
    
    this.#port = new SerialPort(configuration, (err) => {
      if (err) {
        console.error("Error ocurred when creating serial port:");
        console.error(err);
      } else {
        console.info("Serial port opened.");
      }
    });

    this.#parser = this.#port.pipe(new InterByteTimeoutParser({ interval: 30 }));
    this.#parser.on("data", this.#parse.bind(this));
    
    this.#queue = [];
  }

  #parse(data){
    const text = data.toString();
    
    if (this.#sender) {
      this.#sender?.finish(text);
      this.#sender = undefined;
      
      console.log(`Reading: ${text}`);
    } else {
      console.warn("No receiver for parsed data.");
    }
    
    this.#writeNextIfNeeded();
  }
  
  #writeNextIfNeeded(){
    if (this.#sender) {
      return;
    }
    
    const task = this.#queue.shift();
    
    if (!task){
      return;
    }
    
    const { body } = task;
    
    this.#sender = task;
    this.#port.write(body);
    
    console.log(`Writing: ${body}`);
  }
  
  on(event: Event, callback: (error: any) => void){
    this.#port.on(event, callback);
  }
  
  disconnect(){
    // TODO: Reject "run" promises.
  }
  
  async run<R, C extends Command<R>>(command: C): Promise<R> {
    const port = this.#port;
    const delimiter = "\r";
	  const body = command.instruction + delimiter;
    
    return new Promise((resolve, reject) => {
      const task = new Task(body, (input) => resolve(command.parse(input)) );
      this.#queue.push(task);
      
      this.#writeNextIfNeeded();
      
      // Reject after timeout.
      const timeout = 100;
      
      setTimeout(() => {
        if (this.#sender === task) {
          this.#sender = undefined;
          reject();
        }
        
        this.#writeNextIfNeeded();
      }, timeout);
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
