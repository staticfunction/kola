declare module "kola" {
/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('kola-signals');
export class KontextFactory<T> {
    getInstance: () => T;
    private generator;
    private singleInstance;
    constructor(generator: () => T);
    asSingleton(): void;
}
export interface Hook<T> {
    execute(payload: T, kontext: Kontext): void;
}
export class SignalHook<T> {
    kontext: Kontext;
    signal: signals.Dispatcher<T>;
    hook: Hook<T>;
    callOnce: boolean;
    private listener;
    constructor(kontext: Kontext, signal: signals.Dispatcher<T>, hook: Hook<T>);
    onDispatch(payload: T): void;
    attach(): void;
    dettach(): void;
    runOnce(): void;
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
    private signals;
    private signalHooks;
    private instances;
    constructor(parent?: Kontext);
    hasSignal(name: string): boolean;
    setSignal<T>(name: string, hook?: Hook<T>): SignalHook<T>;
    getSignal<T>(name: string): signals.Dispatcher<T>;
    setInstance<T>(name: string, factory: () => T): KontextFactory<T>;
    getInstance<T>(name: string): T;
    start(): void;
    stop(): void;
}
export class App<T> {
    parent: App<any>;
    kontext: Kontext;
    startupOptions: T;
    constructor(parent?: App<any>);
    onKontext(kontext: Kontext, opts?: T): void;
    start(opts?: T): App<T>;
    onStart(): void;
    onStop(): void;
    stop(): App<T>;
}

}