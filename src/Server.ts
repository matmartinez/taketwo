// 
// Server.ts
// taketwo
// 
// Created on 11/10/22
// 

import * as express from "express";
import * as bodyParser from "body-parser";

interface Source {
  // An unique identifier for this source.
  id: number;
  
  // A description for this source. Eg: MacBook Pro.
  description: string | null;
}

interface Route {
  // The identifier for the current source, or `null` if no source is set.
  sourceID: number | null;
  
  // The available sources for routing.
  sources: Array<Source>;
}

interface RouteChangeRequest {
  // The identifier to set a source, or `null` to disable routing.
  sourceID: number | null;
}

interface ServerDelegate {
  routeRequestedForServer(server: Server): Promise<Route>;
  serverDidReceiveRouteChangeRequest(server: Server, request: RouteChangeRequest): Promise<void>;
}

class Server {
  delegate: ServerDelegate;
  #server;
  
  constructor(){
    const server = express();
    
    // Parse application/json.
    server.use(bodyParser.json());
    
    // Returns the current Status.
    server.get("/input", async (req, res) => {
      try {
        const route = await this.delegate?.routeRequestedForServer(this);
        res.json(route);
      } catch (error) {
        console.error("Error when processing GET /input:");
        console.error(error);
        
        res.sendStatus(500);
      }
    });
    
    // Receives an update.
    server.put("/input", (req, res) => {
      try {
        const { sourceID } = req.body;
        
        if (sourceID === undefined) {
          res.sendStatus(400);
          return;
        }
        
        console.log(`Requested sourceID change to ${sourceID}`);
        
        const request = { sourceID } as RouteChangeRequest;
        this.delegate?.serverDidReceiveRouteChangeRequest(this, request);
        res.sendStatus(200);
      } catch (error) {
        console.error("Error when processing PUT /input:");
        console.error(error);
        
        res.sendStatus(500);
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