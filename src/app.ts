import {Instance, Instances} from './instance';

export class App<T> {

    initialized: boolean = false;
    opts: T = null;

    constructor(parent?: App<any>) {

    }

    initialize(opts?: T): void {

    }
    
    start(opts?: T): App<T> {
        this.opts = opts;
        return this;
    }

    stop(): App<T> {
      return this;
    }
}
