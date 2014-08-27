/**
* Created by staticfunction on 8/20/14.
*/
import signals = require('stfu-signals');
export interface Factory<T> {
    getInstance(): T;
}
export declare class KolaCommand<T> {
    public execute(payload: T): Error;
}
export declare class KolaExecutionChain<T> {
    public commands: {
        new(): KolaCommand<T>;
    }[];
    public errorCommand: new() => KolaCommand<Error>;
    public fragile: boolean;
    constructor(commands: {
        new(): KolaCommand<T>;
    }[], errorCommand: new() => KolaCommand<Error>, fragile: boolean);
    public executeChain(payload: T): KolaExecutionChain<T>;
}
export declare class KolaExecutionChainFactory<T> {
    public commandChain: {
        new(): KolaCommand<T>;
    }[];
    public onErrorCommand: new() => KolaCommand<Error>;
    public chainBreaksOnError: boolean;
    constructor(commandChain: {
        new(): KolaCommand<T>;
    }[]);
    public breakChainOnError(value: boolean): KolaExecutionChainFactory<T>;
    public onError(command: new() => KolaCommand<Error>): KolaExecutionChainFactory<T>;
    public newExecution(payload: T): KolaExecutionChain<T>;
}
export declare class KolaSignal<T> extends signals.SignalDispatcher<T> {
    public executionChainFactory: KolaExecutionChainFactory<T>;
    constructor();
    public onDispatch(payload: T): void;
    public executes(commands: {
        new(): KolaCommand<T>;
    }[]): KolaExecutionChainFactory<T>;
}
export declare class KolaContext {
    public contextId: string;
    private store;
    constructor(contextId: string);
    public getMe(name: string): any;
    public signal<T>(name: string): KolaSignal<T>;
    public factory<T>(name: string, clazz: new() => T): KolaFactory<T>;
}
export declare class KolaFactory<T> implements Factory<T> {
    public generator: new() => T;
    private oneInstance;
    constructor(generator: new() => T);
    public getInstance(): T;
    public asSingleton(): KolaFactory<T>;
}
export declare function getContext(name: string): KolaContext;
export declare function createContext(name?: string): KolaContext;
