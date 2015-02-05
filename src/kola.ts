/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('stfu-signals');

export interface Kommand<T> {
    new (kontext?: Kontext);
    execute(payload: T): Error;
}

export interface ExecutionOptions<T> {
    commands: {new(kontext?: Kontext): Kommand<T>}[];
    errorCommand: {new(kontext? : Kontext): Kommand<Error>};
    fragile?: boolean;
}

export class ExecutionChain<T> {

    kontext: Kontext;
    options: ExecutionOptions<T>;

    constructor(kontext: Kontext, options: ExecutionOptions<T>) {
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

    kontext: Kontext;
    commandChain: {new(kontext?: Kontext): Kommand<T>}[];
    onErrorCommand: {new(kontext?: Kontext): Kommand<Error>};
    chainBreaksOnError: boolean;

    constructor(kontext: Kontext, commandChain: {new(kontext?: Kontext): Kommand<T>}[]) {
        this.kontext = kontext;
        this.commandChain = commandChain;
    }

    onKontext(kontext: Kontext): void {
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

    kontext: Kontext;
    executionChainFactory: ExecutionChainFactory<T>;

    constructor(kontext: Kontext) {
        super();
        this.kontext = kontext;
        this.addListener(new signals.SignalListener<T>(this.onDispatch, this));
    }

    onDispatch(payload: T): void {
        if(this.executionChainFactory)
            this.executionChainFactory.newExecution(payload);
    }

    executes(commands: {new(kontext?: Kontext): Kommand<T>}[]): ExecutionChainFactory<T> {
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


export class Kontext {

    parent: Kontext;
    private signals: {[s: string]: KolaSignal<any>};
    private parentSignalListeners: {[s: string]: signals.SignalListener<any>};
    private instances: {[s: string]: any};

    constructor(parent?: Kontext) {
        this.parent = parent;
        this.signals = {};
        this.parentSignalListeners = {};
    }

    hasSignal(name: string): boolean {
        return this.signals[name] != null;
    }

    signal<T>(name: string): KolaSignal<T> {
        if(this.signals[name]) {
            return this.signals[name];
        }

        return this.signals[name] = new KolaSignal(this);
    }

    getInstance<T>(name: string): T {
        var instanz;

        if(this.parent) {
            instanz = this.instances[name] || this.parent.getInstance(name);
        }
        else
            instanz = this.instances[name];

        return instanz;
    }

    setInstance<T>(name: string, factory: () => T): KontextFactory<T> {
        if(!factory)
            throw new Error('No instance defined for' + name);

        return this.instances[name] = new KontextFactory(factory);
    }


    start(): void {
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
    kontext: Kontext;

    constructor(parent?: App<any>) {
        if(parent) {
            this.kontext = new Kontext(parent.kontext);
        }
        else
            this.kontext = new Kontext();

        this.parent = parent;
        this.onKontext(this.kontext);
    }

    onKontext(kontext: Kontext): void {
    }

    start(opts: T): App<T> {
        this.kontext.start();
        return this;
    }

    stop(): App<T> {
        this.kontext.stop();
        return this;
    }
}




