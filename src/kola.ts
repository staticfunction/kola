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
    signal: signals.SignalDispatcher<T>;
    hook: Hook<T>;

    private listener: signals.SignalListener<T>;

    constructor( kontext: Kontext, signal: signals.SignalDispatcher<T>, hook: Hook<T>) {
        this.kontext = kontext;
        this.signal = signal;
        this.hook = hook;

        this.listener = new signals.SignalListener(this.onDispatch, this);
    }

    onDispatch(payload: T): void {
        this.hook.execute(payload, this.kontext);
    }

    attach(): void {
        this.signal.addListener(this.listener);
    }

    dettach(): void {
        this.signal.removeListener(this.listener);
    }

    runOnce(): void {
        this.listener = new signals.SignalListener(this.onDispatch, this, true);
    }
}

export interface Kontext {
    parent: Kontext;
    hasSignal(name: string): boolean;
    setSignal<T>(name: string, hook?: Hook<T>): SignalHook<T>;
    getSignal<T>(name: string): signals.SignalDispatcher<T>;
    setInstance<T>(name: string, factory: () => T): KontextFactory<T>;
    getInstance<T>(name: string): T;
    start(): void;
    stop(): void;
}

export class KontextImpl implements Kontext {

    parent: Kontext;

    private signals: {[s: string]: signals.SignalDispatcher<any>};
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
            signal = this.signals[name] = new signals.SignalDispatcher();

        var sigHook;

        if(hook) {
            sigHook = new SignalHook(this, signal, hook);
            this.signalHooks.push(sigHook);
        }

        return sigHook;
    }

    getSignal<T>(name: string): signals.SignalDispatcher<T> {
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
    onStart: signals.SignalDispatcher<T>;
    onStop: signals.SignalDispatcher<{}>;

    constructor(parent?: App<any>) {
        if(parent) {
            this.kontext = new KontextImpl(parent.kontext);
        }
        else
            this.kontext = new KontextImpl();

        this.parent = parent;
        this.onKontext(this.kontext);
        this.onStart = new signals.SignalDispatcher();
        this.onStop = new signals.SignalDispatcher();
    }

    onKontext(kontext: Kontext): void {
    }

    start(opts: T): App<T> {
        this.kontext.start();
        this.onStart.dispatch(opts);
        return this;
    }

    stop(): App<T> {
        this.kontext.stop();
        this.onStop.dispatch(null);
        return this;
    }
}




