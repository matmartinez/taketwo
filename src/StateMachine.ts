// 
// StateMachine.ts
// taketwo
// 
// Created on 11/11/22
// 

class State {
  isValidNext(stateType: typeof State): boolean {
    return this instanceof stateType;
  }
  
  didEnterFrom?(previousState: State | undefined): void
  willExitTo?(nextState: State) : void
}

class StateMachine {
  #states: Array<State>;
  #currentState: State | undefined;
  
  get currentState(): State | undefined {
    return this.#currentState;
  }
  
  constructor(states: Array<State>){
    this.#states = states;
  }
  
  canEnterState(stateType: typeof State): boolean {
    const state = this.#currentState;
    if (state) {
      return state.isValidNext(stateType);
    } else {
      return true;
    }
  }
  
  enterState(stateType: typeof State): boolean {
    if (this.canEnterState(stateType)) {
      const next = this.stateForType(stateType);
      if (next) {
        const willExit = this.#currentState?.willExitTo?.bind(this.#currentState);
        if (willExit) {
          willExit(next);
        }
        
        this.#currentState = next;
        
        const didEnter = next.didEnterFrom?.bind(next);
        if (didEnter) {
          didEnter(this.#currentState);
        }
        
        return true;
      }
    }
    return false;
  }
  
  stateForType(stateType: typeof State): State | undefined {
    for (const state of this.#states) {
      if (state instanceof stateType) {
        return state;
      }
    }
    return undefined;
  }
}

export { State, StateMachine };
