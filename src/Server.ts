// 
// Server.ts
// taketwo
// 
// Created on 11/10/22
// 

import * as express from "express";

interface Source {
  // An unique identifier for this source.
  id: number;
  
  // A description for this source. Eg: MacBook Pro.
  description: string;
}

interface Route {
  // The identifier for the current source, or `null` if no source is set.
  sourceID: number | null;
  
  // The available sources for routing.
  sources: [Source];
}

interface RouteChangeRequest {
  // The identifier to set a source, or `null` to disable routing.
  sourceID: number | null;
}

interface ServerDelegate {
  routeRequestedForServer(server: Server): Promise<Route>;
  serverDidReceiveRouteChangeRequest(server: Server, request: RouteChangeRequest): void;
}

class Server {
  delegate: ServerDelegate;
  #server;
  
  constructor(){
    const server = express();
    
    // Returns the current Status.
    server.get("/input", async (req, res) => {
      try {
        const route = await this.delegate?.routeRequestedForServer(this);
        res.json(route);
      } catch (error) {
        res.send(500);
      }
    });
    
    // Receives an update.
    server.put("/input", (req, res) => {
      try {
        const request = { sourceID: req.sourceID } as RouteChangeRequest;
        this.delegate?.serverDidReceiveRouteChangeRequest(this, request);
        res.send(200);
      } catch (error) {
        res.send(500);
      }
    });
    
    this.#server = server;
  }
  
  async listen(port: number): Promise<void> {
    const server = this.#server;
    
    return new Promise((resolve, reject) => {
      server.listen(port, () => {
        resolve();
      }).on("error", (error) => {
        reject(error);
      });
    });
  }
}

export { Source, Route, RouteChangeRequest, ServerDelegate, Server };