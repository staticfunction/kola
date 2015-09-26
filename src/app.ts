import {Kontext, KontextImpl} from './kontext';

export class App<T> {

    initialized: boolean = false;
    kontext: Kontext;
    opts: T = null;

    constructor(parent?: App<any>) {
        this.kontext = parent ? new KontextImpl(parent.kontext) : new KontextImpl();
    }

    protected initialize(kontext: Kontext, opts?: T): void {
   
    }
    
    
    start(opts?: T): App<T> {
        if(!this.initialized) {
            this.initialize(this.kontext, opts);
            this.initialized = true;
        }
        
        this.kontext.start();
        this.opts = opts;
        this.onStart();
        return this;
    }
    
    protected onStart(): void {
        
    }

    stop(): App<T> {
      this.kontext.stop();
      this.onStop();
      return this;
    }
    
    protected onStop(): void {
        
    }
}
