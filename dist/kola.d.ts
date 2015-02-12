/**
 * Created by staticfunction on 8/20/14.
 */

declare module "kola" {
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
        signal: signals.SignalDispatcher<T>;
        hook: Hook<T>;
        private listener;
        constructor(kontext: Kontext, signal: signals.SignalDispatcher<T>, hook: Hook<T>);
        onDispatch(payload: T): void;
        attach(): void;
        dettach(): void;
        runOnce(): void;
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
        private signals;
        private signalHooks;
        private instances;
        constructor(parent?: Kontext);
        hasSignal(name: string): boolean;
        setSignal<T>(name: string, hook?: Hook<T>): SignalHook<T>;
        getSignal<T>(name: string): signals.SignalDispatcher<T>;
        setInstance<T>(name: string, factory: () => T): KontextFactory<T>;
        getInstance<T>(name: string): T;
        start(): void;
        stop(): void;
    }
    export class App<T> {
        parent: App<any>;
        kontext: Kontext;
        onStart: signals.SignalDispatcher<T>;
        onStop: signals.SignalDispatcher<{}>;
        constructor(parent?: App<any>);
        onKontext(kontext: Kontext): void;
        start(opts: T): App<T>;
        stop(): App<T>;
    }
}

