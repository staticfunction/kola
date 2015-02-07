/**
* Created by staticfunction on 8/20/14.
*/
import signals = require('stfu-signals');
export interface Kolable {
    onKontext(kontext: Kontext): void;
}
export declare class KolableFactory<T extends Kolable> {
    public kontext: Kontext;
    public generator: new() => T;
    private oneInstance;
    constructor(kontext: Kontext, generator: new() => T);
    public getInstance(): T;
    public asSingleton(): KolableFactory<T>;
}
export declare class Kontext {
    public name: string;
    private factories;
    private signals;
    private instances;
    constructor(name: string);
    public signal<T>(name: string): KolaSignal<T>;
    public factory(name: string, clazz?: new() => Kolable): KolableFactory<Kolable>;
    public instance(name: string, instanceObj: any): any;
}
export declare class Command<T> implements Kolable {
    public execute(payload: T): Error;
    public onKontext(kontext: Kontext): void;
}
export interface ExecutionOptions<T> {
    commands: {
        new(): Command<T>;
    }[];
    errorCommand: new() => Command<Error>;
    fragile?: boolean;
}
export declare class ExecutionChain<T> {
    public kontext: Kontext;
    public options: ExecutionOptions<T>;
    constructor(kontext: Kontext, options: ExecutionOptions<T>);
    public executeChain(payload: T): ExecutionChain<T>;
}
export declare class ExecutionChainFactory<T> implements Kolable {
    public kontext: Kontext;
    public commandChain: {
        new(): Command<T>;
    }[];
    public onErrorCommand: new() => Command<Error>;
    public chainBreaksOnError: boolean;
    constructor(kontext: Kontext, commandChain: {
        new(): Command<T>;
    }[]);
    public onKontext(kontext: Kontext): void;
    public breakChainOnError(value: boolean): ExecutionChainFactory<T>;
    public onError(command: new() => Command<Error>): ExecutionChainFactory<T>;
    public newExecution(payload: T): ExecutionChain<T>;
}
export declare class KolaSignal<T> extends signals.SignalDispatcher<T> {
    public kontext: Kontext;
    public executionChainFactory: ExecutionChainFactory<T>;
    constructor(kontext: Kontext);
    public onDispatch(payload: T): void;
    public executes(commands: {
        new(kontext?: Kontext): Command<T>;
    }[]): ExecutionChainFactory<T>;
}
export declare function createKontext(name: string): Kontext;
