/**
 * Created by staticfunction on 8/20/14.
 */
import signals = require('stfu-signals');

export interface Kolable {
    onKontext(kontext: Kontext<any>): void;
}

export class KolableFactory<T extends Kolable> {

    kontext: Kontext<any>;
    generator: {new(): T};

    private oneInstance: T;

    constructor(kontext: Kontext<any>, generator:{new() : T}) {
        this.kontext = kontext;
        this.generator = generator;
    }

    getInstance(): T {
        if(this.oneInstance) {
            return this.oneInstance;
        }

        var instance = new this.generator();
        instance.onKontext(this.kontext);
        return instance;
    }

    asSingleton(): KolableFactory<T> {
        this.oneInstance = this.getInstance();
        return this;
    }
}

export interface Activity<P> {
    onStart(kontext: Kontext<P>, opts: P): void;
    onStop(): void;
}

export class Kontext<P>  {

    name: string;

    parent: Kontext<any>;
    children: {[name: string]: Kontext<any>};
    private activity: {new(): Activity<P>};
    private activityInstance: Activity<P>;
    private factories: {[s: string]: KolableFactory<any>};
    private signals: {[s: string]: KolaSignal<any>};
    private instances: {[s: string]: any};

    constructor(name: string, activity: {new(): Activity<P>}) {
        this.name = name;
        this.activity = activity;
        this.factories = {};
        this.signals = {};
        this.children = {};
    }

    signal<T>(name: string): KolaSignal<T> {
        if(this.signals[name]) {
            return this.signals[name];
        }

        //if signal is on parent, add a listener to it and make add a new dispatcher as a listener.

        return this.signals[name] = new KolaSignal(this);
    }

    factory<T extends Kolable>(name: string, clazz?: {new() : T}): KolableFactory<T> {
        if(this.factories[name])
            return this.factories[name];

        if(!clazz)
            throw new Error('no factory defined for: ' + name);

        return this.factories[name] = new KolableFactory(this, clazz);
    }

    instance(name: string, instanceObj: any): any {
        if(this.instances[name])
            return this.instances[name];

        if(!instanceObj)
            throw new Error('no instance defined for: ' + name);

        this.instances[name] = instanceObj;
    }

    childKontext<P>(name: string, activity?: {new(): Activity<P>}): Kontext<P> {
        var kontext: Kontext<P> = this.children[name];

        if(kontext)
            return kontext;

        if(!activity)
            throw new Error("When setting a child kontext, activity must be a non-null value");

        kontext = this.children[name] = createKontext(name, activity);
        kontext.parent = this;
        return kontext;
    }

    start(opts: P): Activity<P> {
        this.activityInstance = new this.activity();
        this.activityInstance.onStart(this, opts);
        return this.activityInstance;
    }

    stop(): void {
        for(var child in this.children) {
            this.children[child].stop();
        }

        if(!this.activityInstance)
            return;

        this.activityInstance.onStop();
        this.activityInstance = null;
    }
}

export class Command<T> implements Kolable {

    execute(payload: T): Error {
        return null;
    }

    onKontext(kontext: Kontext<any>): void {
    }
}

export interface ExecutionOptions<T> {
    commands: {new(): Command<T>}[];
    errorCommand: {new(): Command<Error>};
    fragile?: boolean;
}

export class ExecutionChain<T> {

    kontext: Kontext<any>;
    options: ExecutionOptions<T>;

    constructor(kontext: Kontext<any>, options: ExecutionOptions<T>) {
        this.kontext = kontext;
        this.options = options;
    }

    executeChain(payload: T): ExecutionChain<T> {
        for(var i = 0; i < this.options.commands.length; i++) {
            var commandClass = this.options.commands[i];

            var commandInstance = new commandClass();
            commandInstance.onKontext(this.kontext);

            var error = commandInstance.execute(payload);

            if(error) {
                if(this.options.errorCommand) {
                    var errorCommandInstance = new this.options.errorCommand();
                    errorCommandInstance.onKontext(this.kontext);
                    errorCommandInstance.execute(error);
                }

                if(this.options.fragile)
                    break;
            }
        }

        return this;
    }
}

export class ExecutionChainFactory<T> implements Kolable{

    kontext: Kontext<any>;
    commandChain: {new(): Command<T>}[];
    onErrorCommand: {new(): Command<Error>};
    chainBreaksOnError: boolean;

    constructor(kontext: Kontext<any>, commandChain: {new(): Command<T>}[]) {
        this.kontext = kontext;
        this.commandChain = commandChain;
    }

    onKontext(kontext: Kontext<any>): void {
        this.kontext = kontext;
    }

    breakChainOnError(value: boolean): ExecutionChainFactory<T> {
        this.chainBreaksOnError = value;
        return this;
    }

    onError(command: {new(): Command<Error>}): ExecutionChainFactory<T> {
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

    kontext: Kontext<any>;
    executionChainFactory: ExecutionChainFactory<T>;

    constructor(kontext: Kontext<any>) {
        super();
        this.kontext = kontext;
        this.addListener(new signals.SignalListener<T>(this.onDispatch, this));
    }

    onDispatch(payload: T): void {
        if(this.executionChainFactory)
            this.executionChainFactory.newExecution(payload);
    }

    executes(commands: {new(): Command<T>}[]): ExecutionChainFactory<T> {
        return this.executionChainFactory = new ExecutionChainFactory<T>(this.kontext, commands);
    }
}

export function createKontext<P>(name: string, activity: {new(): Activity<P>}): Kontext<P> {
    return new Kontext<P>(name, activity);
}