/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('stfu-signals');

export interface Kommand<T> {
    (payload: T, kontext?: KontextInterface, done?: (error?: Error) => void): void;
}

export interface ExecutionOptions<T> {
    commands: Kommand<T>[];
    errorCommand: Kommand<Error>;
    fragile?: boolean;
    timeout?: number;
}

export class ExecutionChainTimeout<T> implements Error {
    kommand: Kommand<T>;
    name: string;
    message: string;
    constructor(kommand: Kommand<T>) {
        this.name = "ExecutionChainTimeout";
        this.message = "Execution timeout";
        this.kommand = kommand;
    }
}

export class ExecutionChain<T> {

    payload: T;
    kontext: KontextInterface;
    options: ExecutionOptions<T>;

    private currentIndex: number;
    private executed: {[n: number]: boolean};
    private timeoutId: number;

    constructor(payload: T, kontext: KontextInterface, options: ExecutionOptions<T>) {
        this.payload = payload;
        this.kontext = kontext;
        this.options = options;
        this.currentIndex = 0;
        this.executed = {};
    }

    now(): ExecutionChain<T> {
        this.next();

        return this;
    }

    private onDone(index: number, error? : Error): void {
        //if this index is equal to currentIndex then call next
        //if not, ignore, but if it has an error, let it call on error

        clearTimeout(this.timeoutId);

        this.next();
    }

    private next(): void {
        if(this.executed[this.currentIndex])
            return;

        if(this.currentIndex < this.options.commands.length) {
            var command = this.options.commands[this.currentIndex];

            var done: (error?: Error) => void;

            if(command.length > 2) {
                done = (error?: Error) => {
                    this.onDone(this.currentIndex, error);
                }

                command(this.payload, this.kontext, done);
                //wait for it... but set a timeout

                var onTimeout = () => {
                    this.onDone(this.currentIndex, new ExecutionChainTimeout(command));
                }

                this.timeoutId = setTimeout(onTimeout, this.options.timeout);
            }
            else {
                command(this.payload, this.kontext);
                this.currentIndex++;
                this.next();
            }

            this.executed[this.currentIndex] = true;
        }


    }
}

export class ExecutionChainFactory<T> implements Hook<T>{

    private commandChain: Kommand<T>[];
    private onErrorCommand: Kommand<Error>;
    private chainBreaksOnError: boolean;
    private timeoutMs: number;

    constructor(commandChain: Kommand<T>[]) {
        this.commandChain = commandChain;
    }

    breakChainOnError(value: boolean): ExecutionChainFactory<T> {
        this.chainBreaksOnError = value;
        return this;
    }

    onError(command: Kommand<Error>): ExecutionChainFactory<T> {
        this.onErrorCommand = command;
        return this;
    }

    timeout(ms: number): ExecutionChainFactory<T> {
        this.timeoutMs = ms;
        return this;
    }

    execute(payload: T, kontext: KontextInterface): ExecutionChain<T> {
        return new ExecutionChain(payload, kontext, {
            "commands": this.commandChain,
            "errorCommand": this.onErrorCommand,
            "fragile": this.chainBreaksOnError,
            "timeout": this.timeoutMs
        }).now();
    }
}

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
    execute(payload: T, kontext: KontextInterface): void;
}

export class SignalHook<T> {

    kontext: KontextInterface;
    signal: signals.SignalDispatcher<T>;
    hook: Hook<T>;

    private listener: signals.SignalListener<T>;

    constructor( kontext: KontextInterface, signal: signals.SignalDispatcher<T>, hook: Hook<T>) {
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

    detach(): void {
        this.signal.removeListener(this.listener);
    }

    runOnce(): void {
        this.listener = new signals.SignalListener(this.onDispatch, this, true);
    }
}

export interface KontextInterface {
    parent: KontextInterface;
    hasSignal(name: string): boolean;
    setSignal<T>(name: string, hook?: Hook<T>): SignalHook<T>;
    getSignal<T>(name: string): signals.SignalDispatcher<T>;
    setInstance<T>(name: string, factory: () => T): KontextFactory<T>;
    getInstance<T>(name: string): T;
    start(): void;
    stop(): void;
}

export class Kontext implements KontextInterface {

    parent: KontextInterface;

    private signals: {[s: string]: signals.SignalDispatcher<any>};
    private signalHooks: SignalHook<any>[];
    private instances: {[s: string]: KontextFactory<any>};

    constructor(parent?: KontextInterface) {
        this.parent = parent;
        this.signals = {};
        this.signalHooks = [];
        this.instances = {};
    }

    hasSignal(name: string): boolean {
        return this.signals[name] != null;
    }

    setSignal<T>(name: string, hook: Hook<T>): SignalHook<T> {
        return null;
    }

    getSignal<T>(name: string): signals.SignalDispatcher<T> {
        return null;
    }

    setInstance<T>(name: string, factory: () => T): KontextFactory<T> {
        return null;
    }

    getInstance<T>(name: string): T {
        var factory = this.instances[name];

        if(factory)
            return factory.getInstance();

        if(this.parent)
            return this.parent.getInstance<T>(name);
    }

    start(): void {

    }

    stop(): void {
    }
}


export class App<T> {

    parent: App<any>;
    kontext: KontextInterface;
    onStart: signals.SignalDispatcher<T>;
    onStop: signals.SignalDispatcher<{}>;

    constructor(parent?: App<any>) {
        if(parent) {
            this.kontext = new Kontext(parent.kontext);
        }
        else
            this.kontext = new Kontext();

        this.parent = parent;
        this.onKontext(this.kontext);
        this.onStart = new signals.SignalDispatcher();
        this.onStop = new signals.SignalDispatcher();
    }

    onKontext(kontext: KontextInterface): void {
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




