import "reflect-metadata";

export class App<T> {
    
    initialized: boolean;
    opts: T;
    
    private _onStart: string[] = Reflect.getMetadata('onStart', Object.getPrototypeOf(this)) || [];
    private _onStop: string[] = Reflect.getMetadata('onStop', Object.getPrototypeOf(this)) || [];
    private _onInit: string[] = Reflect.getMetadata('onInit', Object.getPrototypeOf(this)) || [];

    initialize(kontext, opts?: T): void {
    }

    start(opts?: T): App<T> {
        this.opts = opts;
        
        if(!this.initialized) {
            this._onInit.map(method => {this[method].apply(this)});
            this.initialized = true;
        }
            
        this._onStart.map(method => {this[method].apply(this)});
        return this;
    }

    stop(): App<T> {
        this._onStop.map(method => {this[method].apply(this)});
        return this;
    }
}

function invokables(metadataKey:string, target:Object, key:string, descriptor:PropertyDescriptor) {
    if(!Reflect.hasMetadata(metadataKey, target))
        Reflect.defineMetadata(metadataKey, [], target);
        
    Reflect.getMetadata(metadataKey, target).push(key);      
    return descriptor;
}

export function onStart(target: Object, key: string, descriptor: PropertyDescriptor) {
    return invokables('onStart', target, key, descriptor);
}

export function onStop(target: Object, key: string, descriptor: PropertyDescriptor) {
    return invokables('onStop', target, key, descriptor);
}

export function onInit(target: Object, key: string, descriptor: PropertyDescriptor) {
    return invokables('onInit', target, key, descriptor);
}