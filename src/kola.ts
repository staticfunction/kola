/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('kola-signals');

export interface Kommand<T> {
    (payload: T, kontext?: Kontext, done?: (error?: Error) => void): void;
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
    kontext: Kontext;
    options: ExecutionOptions<T>;

    private currentIndex: number;
    private executed: {[n: number]: boolean};
    private timeoutId: number;
    private executeCommand: (index: number, executable: () => void) => void;

    constructor(payload: T, kontext: Kontext, options: ExecutionOptions<T>) {
        this.payload = payload;
        this.kontext = kontext;
        this.options = options;
        this.currentIndex = 0;
        this.executed = {};

        if(options.errorCommand) {
            this.executeCommand = (index:number, executable:() => void) => {
                try {
                    executable();
                }
                catch (e) {
                    this.onDone(index, e);
                }
            }
        }
        else {
            this.executeCommand =(index: number, executable: () => void) => {
                executable();
            }
        }

    }

    now(): ExecutionChain<T> {
        this.next();

        return this;
    }

    private onDone(index: number, error? : Error): void {
        //if this index is equal to currentIndex then call next
        //if not, ignore, but if it has an error, let it call on error

        clearTimeout(this.timeoutId);

        if(error && this.options.errorCommand) {
            this.options.errorCommand(error, this.kontext);
            if(this.options.fragile)
                return;
        }

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

                this.executeCommand(this.currentIndex, () => {command(this.payload, this.kontext, done)});
                //wait for it... but set a timeout

                var onTimeout = () => {
                    this.onDone(this.currentIndex, new ExecutionChainTimeout(command));
                }

                this.timeoutId = setTimeout(onTimeout, this.options.timeout);
            }
            else {
                ;
                this.executeCommand(this.currentIndex, () => {command(this.payload, this.kontext)})
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

    execute(payload: T, kontext: Kontext): ExecutionChain<T> {
        return new ExecutionChain(payload, kontext, {
            "commands": this.commandChain,
            "errorCommand": this.onErrorCommand,
            "fragile": this.chainBreaksOnError,
            "timeout": this.timeoutMs
        }).now();
    }
}

export function executes<T>(kommand: Kommand<T>[]) {
    return new ExecutionChainFactory(kommand);
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




