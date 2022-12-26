// 
// index.ts
// taketwo
// 
// Created on 11/9/22
// 

import { Command, Parity, DataBits, DeviceConnection } from "./src/DeviceConnection";
import { Server, Route, RouteChangeRequest } from "./src/Server";
import { State, StateMachine } from "./src/StateMachine";

interface Settings {
  // The http port for the API.
  serverPort?: number;
  
  // Timeout in seconds when performing requests and device cannot be reached.
  timeout: number;
  
  // The device to connect to. Model 3141 can be found by default under "/dev/ttyACM0".
  device: string;
  baudRate: number;
  parity: Parity;
  dataBits: DataBits;
}

//       _____________________________       _______________________
//      |                            |       |                     |
// |Default|  |Disconnected| --> |Waiting for Device| --> |Connecting| --> |Connected|
//                       ^                                                      |
//                       |------------------------------------------------------|
//
// Notes: 1) Set up server with a valid port on `default`, else quit.
//        2) Try to actually send data when connected! So maybe we connect only when we need to.

class Context {
  #stateMachine: StateMachine;
  #settings: Settings;
  
  server: Server;
  connectedDevice: DeviceConnection | undefined;
  
  constructor(settings: Settings, stateMachine: StateMachine){
    this.#stateMachine = stateMachine;
    this.#settings = settings;
  }
  
  applyState(stateType: typeof State) {
    const didEnter = this.#stateMachine.enterState(stateType);
    
    if (!didEnter) {
      console.error("Did not entered state", stateType);
    }
  }
  
  get settings(): Settings {
    return this.#settings;
  }
}

interface ContextAware {
  context: Context | undefined;
}

class DefaultState implements State, ContextAware {
  context: Context
  
  isValidNext(stateType: typeof State): boolean {
    return stateType == WaitingForDeviceState;
  }
  
  didEnterFrom(previousState?: State){
    console.info("Did enter `DefaultState`.");
    
    const { settings } = this.context;
    const { serverPort } = settings;
    
    const advance = () => this.context.applyState(WaitingForDeviceState);
    
    if (serverPort) {
      const server = new Server();
      const serve = async (port: number) => {
        try {
          await server.listen(port);
        } catch (error) {
          switch (error.code){
            case "EADDRINUSE":
              console.error(`Port ${port} is already in use. Quitting...`);
              break;
            default:
              console.error(`Throwing unknown error when opening port ${port}. Quitting...`);
              console.error(error);
          }
          process.exit(1);
          return;
        }
        
        console.info(`Listening at port ${port}.`);
        advance();
      };
      
      const { serverPort } = settings;
      console.info(`Launching server at port ${serverPort}.`);
      serve(serverPort);
    } else {
      advance();
    }
  }
}

class DeviceDisconnectedState implements State, ContextAware {
  context: Context
  
  isValidNext(stateType: typeof State): boolean {
    return stateType == WaitingForDeviceState;
  }
  
  didEnterFrom(previousState: State){
    console.info("Did enter `DeviceDisconnectedState`.");
    
    // Wait for device:
    this.context.applyState(WaitingForDeviceState);
  }
}

class WaitingForDeviceState implements State, ContextAware {
  context: Context;
  
  isValidNext(stateType: typeof State): boolean {
    return stateType == ConnectDeviceState;
  }
  
  didEnterFrom(previousState: State){
    console.info("Did enter `WaitingForDeviceState`");
    
    const tryToInitDevice = async () => {
      const devices = await DeviceConnection.devices();
      console.info("Available devices:", devices);
      
      const { device } = this.context.settings;
      
      if (!devices.includes(device)){
        const delaySeconds = 2;
        console.warn(`Device "${device}" is not available. Retrying in ${delaySeconds}s...`);
        setTimeout(tryToInitDevice, delaySeconds * 1000);
      } else {
        this.context.applyState(ConnectDeviceState);
      }
    };
    
    tryToInitDevice();
  }
}

class ConnectDeviceState implements State, ContextAware {
  context: Context;
  
  isValidNext(stateType: typeof State): boolean {
    return stateType == DeviceConnectedWaitingForEventState || stateType == DeviceDisconnectedState;
  }
  
  didEnterFrom(previousState: State){
    console.info("Did enter `ConnectDeviceState`");
    
    const { settings } = this.context;
    const { device, baudRate, parity, dataBits } = settings;
    
    console.info(`Trying to connect to:`, settings);
    
    const connection = new DeviceConnection(device, { baudRate, parity, dataBits });
    connection.on(DeviceConnection.Event.error, (error) => {
      console.error(`An error ocurred when connecting to ${device}`);
      console.error(error);
      
      this.#disconnectIfNeeded();
    });
    
    this.context.connectedDevice = connection;
    
    const queryStatus = async () => {
      console.info(`Running .status on ${device}...`);
      
      let status: string;
      try {
        status = await connection.run(Command.status());
      } catch (error) {
        console.warn(`Unable to run .status on ${device}...`);
        console.warn(error);
        this.#disconnectIfNeeded();
        return;
      }
      
      console.info(`.status on ${device}:`);
      console.info(status);
      
      this.context.applyState(DeviceConnectedWaitingForEventState);
    }
    
    queryStatus();
  }
  
  #disconnectIfNeeded(){
    const { connectedDevice } = this.context;
    
    if (connectedDevice) {
      connectedDevice.disconnect();
      
      const delaySeconds = 2;
      const disconnect = () => {
        this.context.connectedDevice = undefined;
        this.context.applyState(DeviceDisconnectedState);
      };
      
      console.warn(`Disconnecting in ${delaySeconds}s...`);
      setTimeout(disconnect, delaySeconds * 1000);
    }
  }
}

class DeviceConnectedWaitingForEventState implements State, ContextAware {
  context: Context;
  
  isValidNext(stateType: typeof State): boolean {
    return stateType == DeviceDisconnectedState;
  }
  
  didEnterFrom(previousState: State){
    console.info("Did enter `DeviceConnectedWaitingForEventState`.");
    
    const { server, connectedDevice } = this.context;
    
    if (!server) {
      console.info("The server for listing to events was not configured, quitting...");
      process.exit(0);
      return;
    }
    
    server.delegate = {
      routeRequestedForServer(server: Server): Promise<Route> {
        const solve = async (): Promise<Route> => {
          const command = Command.port();
          const device = await connectedDevice.run(command) as number;
          
          return { sourceID: device, sources: [] };
        };
        return solve();
      },
      
      serverDidReceiveRouteChangeRequest(server: Server, request: RouteChangeRequest): Promise<void> {
        const solve = async (): Promise<void> => {
          const setPort = Command.setPort(request.sourceID);
          const setDefaultPort = Command.setDefaultPort(request.sourceID);
          
          await connectedDevice.run(setPort);
          await connectedDevice.run(setDefaultPort);
        };
        return solve();
      }
    }
  }
  
}

const possible: Array<State> = [
  new DefaultState(),
  new DeviceDisconnectedState(),
  new WaitingForDeviceState(),
  new ConnectDeviceState(),
  new DeviceConnectedWaitingForEventState()
];

const stateMachine = new StateMachine(possible);

const settings: Settings = {
  serverPort: 3001,
  timeout: 10,
  device: "/dev/ttyACM0",
  baudRate: 9600,
  parity: Parity.none,
  dataBits: 8
};

const ctx = new Context(settings, stateMachine);

for (const state of possible) {
  (state as any as ContextAware).context = ctx;
}

stateMachine.enterState(DefaultState);
