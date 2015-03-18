/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('kola-signals');

export class KontextFactory<T> {

    getInstance: () => T;

    private generator: () => T;
    private singleInstance: T;

    constructor(generator: () => T) {
        this.generator = this.getInstance = generator;
    }

    asSingleton(): void {
        this.getInstance = () => {
            if(!this.singleInstance)
                this.singleInstance = this.generator();
            return this.singleInstance;
        }
    }
}

export interface Hook<T> {
    execute(payload: T, kontext: Kontext): void;
}

export class SignalHook<T> {

    kontext: Kontext;
    signal: signals.Dispatcher<T>;
    hook: Hook<T>;
    callOnce: boolean;

    private listener: signals.Listener<T>;

    constructor( kontext: Kontext, signal: signals.Dispatcher<T>, hook: Hook<T>) {
        this.kontext = kontext;
        this.signal = signal;
        this.hook = hook;
    }

    onDispatch(payload: T): void {
        this.hook.execute(payload, this.kontext);
    }

    attach(): void {
        this.listener = this.signal.listen(this.onDispatch, this, this.callOnce);
    }

    dettach(): void {
        this.listener.unlisten();
    }

    runOnce(): void {
        this.callOnce = true;
    }
}

export interface Kontext {
    parent: Kontext;
    hasSignal(name: string): boolean;
    setSignal<T>(name: string, hook?: Hook<T>): SignalHook<T>;
    getSignal<T>(name: string): signals.Dispatcher<T>;
    setInstance<T>(name: string, factory: () => T): KontextFactory<T>;
    getInstance<T>(name: string): T;
    start(): void;
    stop(): void;
}

export class KontextImpl implements Kontext {

    parent: Kontext;

    private signals: {[s: string]: signals.Dispatcher<any>};
    private signalHooks: SignalHook<any>[];
    private instances: {[s: string]: KontextFactory<any>};

    constructor(parent?: Kontext) {
        this.parent = parent;
        this.signals = {};
        this.signalHooks = [];
        this.instances = {};
    }

    hasSignal(name: string): boolean {
        return this.signals[name] != null;
    }

    setSignal<T>(name: string, hook?: Hook<T>): SignalHook<T> {
        var signal = this.getSignal<T>(name);

        if(!signal)
            signal = this.signals[name] = new signals.Dispatcher();

        var sigHook;

        if(hook) {
            sigHook = new SignalHook(this, signal, hook);
            this.signalHooks.push(sigHook);
        }

        return sigHook;
    }

    getSignal<T>(name: string): signals.Dispatcher<T> {
        var signal = this.signals[name];

        if(this.parent && !signal) {
            signal = this.parent.getSignal(name);
        }

        return signal;
    }

    setInstance<T>(name: string, factory: () => T): KontextFactory<T> {
        if(!factory)
            throw new Error('error trying to define instance: ' + name);

        return this.instances[name] = new KontextFactory(factory);
    }

    getInstance<T>(name: string): T {
        var factory = this.instances[name];

        if(factory)
            return factory.getInstance();

        if(this.parent)
            return this.parent.getInstance<T>(name);
    }

    start(): void {
        //start attaching hooks
        for(var i = 0; i < this.signalHooks.length; i++) {
            this.signalHooks[i].attach();
        }
    }

    stop(): void {
        // detach signal hooks
        for(var i = 0; i < this.signalHooks.length; i++) {
            this.signalHooks[i].dettach();
        }
    }
}

export class App<T> {

    parent: App<any>;
    kontext: Kontext;
    opts: T;

    constructor(parent?: App<any>) {
        this.parent = parent;

        if(this.parent) {
            this.kontext = new KontextImpl(this.parent.kontext);
        }
        else
            this.kontext = new KontextImpl();
    }

    initialize(kontext: Kontext, opts?: T): void {
    }

    start(opts?: T): App<T> {
        this.opts = opts;
        this.initialize(this.kontext, opts);
        this.kontext.start();
        this.onStart();
        return this;
    }

    onStart(): void {

    }

    onStop(): void {

    }

    stop(): App<T> {
        this.kontext.stop();
        this.onStop();
        return this;
    }
}




