/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('stfu-signals');

var contexts: {[s: string]: KolaContext};

export interface Factory<T> {
    getInstance(): T;
}

export class KolaCommand<T> {
    execute(payload: T): Error {
        return null;
    }
}

export class KolaExecutionChain<T> {

    commands: {new(): KolaCommand<T>}[];
    errorCommand: {new(): KolaCommand<Error>};
    fragile: boolean;

    constructor(commands: {new(): KolaCommand<T>}[], errorCommand: {new(): KolaCommand<Error>}, fragile: boolean) {
        this.commands = commands;
        this.errorCommand = errorCommand;
        this.fragile = fragile;
    }

    executeChain(payload: T): KolaExecutionChain<T> {
        for(var i = 0; i < this.commands.length; i++) {
            var commandClass = this.commands[i];
            var error = new commandClass().execute(payload);

            if(error) {
                if(this.errorCommand)
                    new this.errorCommand().execute(error);

                if(this.fragile)
                    break;
            }
        }

        return this;
    }
}

export class KolaExecutionChainFactory <T> {

    commandChain: {new(): KolaCommand<T>}[];
    onErrorCommand: {new(): KolaCommand<Error>};
    chainBreaksOnError: boolean;

    constructor(commandChain: {new(): KolaCommand<T>}[]) {
        this.commandChain = commandChain;
    }

    breakChainOnError(value: boolean): KolaExecutionChainFactory<T> {
        this.chainBreaksOnError = value;
        return this;
    }

    onError(command: {new(): KolaCommand<Error>}): KolaExecutionChainFactory<T> {
        this.onErrorCommand = command;
        return this;
    }

    newExecution(payload: T): KolaExecutionChain<T> {
        return new KolaExecutionChain(
            this.commandChain, this.onErrorCommand, this.chainBreaksOnError)
            .executeChain(payload);
    }
}

export class KolaSignal<T> extends signals.SignalDispatcher<T>{

    executionChainFactory: KolaExecutionChainFactory<T>;

    constructor() {
        super();
        this.addListener(new signals.SignalListener<T>(this.onDispatch, this));
    }

    onDispatch(payload: T): void {
        if(this.executionChainFactory)
            this.executionChainFactory.newExecution(payload);
    }

    executes(commands: {new(): KolaCommand<T>}[]): KolaExecutionChainFactory<T> {
        return this.executionChainFactory = new KolaExecutionChainFactory<T>(commands);
    }
}

export class KolaContext {

    contextId: string;
    private store: {[s: string]: Factory<any>};

    constructor(contextId: string) {
        this.contextId = contextId;
        this.store = {};
    }

    getMe(name: string): any {
        return this.store[name].getInstance();
    }

    signal<T>(name: string): KolaSignal<T> {
        var kolaSignal = new KolaSignal();
        this.store[name] = {getInstance: () =>{return kolaSignal}};
        return kolaSignal;
    }

    factory<T>(name: string, clazz: {new() : T}): KolaFactory<T> {
        return this.store[name] = new KolaFactory(clazz);
    }
}

export class KolaFactory<T> implements Factory<T>{

    generator: {new(): T};

    private oneInstance: T;

    constructor(generator:{new() : T}) {
        this.generator = generator;
    }

    getInstance(): T {
        if(this.oneInstance) {
            return this.oneInstance;
        }

        return new this.generator();
    }

    asSingleton(): KolaFactory<T> {
        this.oneInstance = new this.generator();
        return this;
    }
}

export function getContext(name: string): KolaContext {
    return contexts[name];
}

export function createContext(name?: string): KolaContext {
    if(!contexts)
        contexts = {};

    return contexts[name] = new KolaContext(name);
}