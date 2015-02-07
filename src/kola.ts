/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('stfu-signals');

export class Kommand<T> {
    constructor (kontext?: KontextInterface) {

    }
    execute(payload: T): Error {
        return null;
    }
}

export interface ExecutionOptions<T> {
    commands: {new(kontext?: KontextInterface): Kommand<T>}[];
    errorCommand: {new(kontext? : KontextInterface): Kommand<Error>};
    fragile?: boolean;
}

export class ExecutionChain<T> {

    kontext: KontextInterface;
    options: ExecutionOptions<T>;

    constructor(kontext: KontextInterface, options: ExecutionOptions<T>) {
        this.kontext = kontext;
        this.options = options;
    }

    executeChain(payload: T): ExecutionChain<T> {
        for(var i = 0; i < this.options.commands.length; i++) {
            var commandClass = this.options.commands[i];

            var commandInstance = new commandClass(this.kontext);

            var error = commandInstance.execute(payload);

            if(error) {
                if(this.options.errorCommand) {
                    var errorCommandInstance = new this.options.errorCommand(this.kontext);
                    errorCommandInstance.execute(error);
                }

                if(this.options.fragile)
                    break;
            }
        }

        return this;
    }
}

export class ExecutionChainFactory<T> {

    kontext: KontextInterface;
    commandChain: {new(kontext?: KontextInterface): Kommand<T>}[];
    onErrorCommand: {new(kontext?: KontextInterface): Kommand<Error>};
    chainBreaksOnError: boolean;

    constructor(kontext: KontextInterface, commandChain: {new(kontext?: KontextInterface): Kommand<T>}[]) {
        this.kontext = kontext;
        this.commandChain = commandChain;
    }

    onKontextInterface(kontext: KontextInterface): void {
        this.kontext = kontext;
    }

    breakChainOnError(value: boolean): ExecutionChainFactory<T> {
        this.chainBreaksOnError = value;
        return this;
    }

    onError(command: {new(): Kommand<Error>}): ExecutionChainFactory<T> {
        this.onErrorCommand = command;
        return this;
    }

    newExecution(payload: T): ExecutionChain<T> {
        return new ExecutionChain(this.kontext, {
            "commands": this.commandChain,
            "errorCommand": this.onErrorCommand,
            "fragile": this.chainBreaksOnError
        }).executeChain(payload);
    }
}

export class KolaSignal<T> extends signals.SignalDispatcher<T>{

    kontext: KontextInterface;
    executionChainFactory: ExecutionChainFactory<T>;

    constructor(kontext: KontextInterface) {
        super();
        this.kontext = kontext;
        this.addListener(new signals.SignalListener<T>(this.onDispatch, this));
    }

    onDispatch(payload: T): void {
        if(this.executionChainFactory)
            this.executionChainFactory.newExecution(payload);
    }

    // in the future make this execution customizable where users can use their own execution factory
    executes(commands: {new(kontext?: KontextInterface): Kommand<T>}[]): ExecutionChainFactory<T> {
        return this.executionChainFactory = new ExecutionChainFactory<T>(this.kontext, commands);
    }
}

export class KontextFactory<T> {

    getInstance: () => T;

    private generator: () => T;
    private singleInstance: T;

    constructor(generator: () => T) {
        this.getInstance = generator;
    }

    asSingleton(): void {
        this.getInstance = () => {

            if(!this.singleInstance)
                this.singleInstance = this.generator();

            return this.singleInstance;
        }
    }
}

export interface Instance {
    <T>(name: string): T;
    <T>(name: string, factory: () => T): KontextFactory<T>
}

export interface Signal {
    <T>(name: string): KolaSignal<T>;
    <T>(name: string, commandChain: {new(kontext?: KontextInterface): Kommand<T>}[]): ExecutionChainFactory<T>;
}

export interface KontextInterface {
    parent: KontextInterface;
    hasSignal(name: string): boolean;
    signal: Signal;
    instance: Instance;
    start(): void;
    stop(): void;
}


export class Kontext implements KontextInterface {

    parent: KontextInterface;
    signal: Signal;
    instance: Instance;

    private signals: {[s: string]: KolaSignal<any>};
    private parentSignalListeners: {[s: string]: signals.SignalListener<any>};
    private instances: {[s: string]: any};

    constructor(parent?: KontextInterface) {
        this.parent = parent;
        this.signals = {};
        this.parentSignalListeners = {};
        this.instances = {};

        /**
         * TODO: report this issue
         * Bug? error TS2322: Type '<T>(name: string, factory: () => T) => KontextFactory<T>' is not assignable to type 'Instance'.
         * When implementing an interface function where the function has 2 signatures, 1 that accepts
         * only 1 parameter and the ooher with 2 parameters, you must make the second parameter optional even
         * if your interface declares it mandatory.
         */
        this.instance = <T>(name: string, factory?: () => T) => {
            if(!factory)
                throw new Error('No instance defined for' + name);

            return this.instances[name] = new KontextFactory(factory);
        }

        /**
         * TODO: report this issue
         * this.signal won't accept the sig if not cast although it implements the same signature.
         */
        var sig = <T>(name: string, commandChain?: {new(kontext?: KontextInterface): Kommand<T>}[]) => {
            var signal = this.signals[name] = new KolaSignal(this);
            return signal.executes(commandChain);
        }

        this.signal = <Signal>sig;
    }

    hasSignal(name: string): boolean {
        return this.signals[name] != null;
    }

    start(): void {
        var sig = (name: string) => {
            return this.signals[name];
        }

        this.signal = <Signal>sig;

        //lock instance
        if(this.parent) {
            this.instance = <T>(name: string) => {
                return this.instances[name] || this.parent.instance(name);
            }
        }
        else {
            this.instance = <T>(name: string) => {
                return this.instances[name];
            };
        }


        //start listening to parent signals if signal created has same name to parent kontext's signal
        if(this.parent) {
            for(var key in this.signals) {
                var signal = this.signals[key];

                if(this.parent.hasSignal(key)) {
                    this.parentSignalListeners[key] = new signals.SignalListener(signal.onDispatch, signal);
                    this.parent.signal(key).addListener(this.parentSignalListeners[key]);
                }
            }
        }
    }

    stop(): void {
        //stop listening to parent signals
        for(var key in this.parentSignalListeners) {
            this.parent.signal[key].removeListener(this.parentSignalListeners[key]);
        }
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




