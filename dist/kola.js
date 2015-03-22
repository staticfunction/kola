/**
 * Created by staticfunction on 8/20/14.
 */
var signals = require('kola-signals');
var KontextFactory = (function () {
    function KontextFactory(generator) {
        this.generator = this.getInstance = generator;
    }
    KontextFactory.prototype.asSingleton = function () {
        var _this = this;
        this.getInstance = function () {
            if (!_this.singleInstance)
                _this.singleInstance = _this.generator();
            return _this.singleInstance;
        };
    };
    return KontextFactory;
})();
exports.KontextFactory = KontextFactory;
var SignalHook = (function () {
    function SignalHook(kontext, signal, hook) {
        this.kontext = kontext;
        this.signal = signal;
        this.hook = hook;
    }
    SignalHook.prototype.onDispatch = function (payload) {
        this.hook.execute(payload, this.kontext);
    };
    SignalHook.prototype.attach = function () {
        this.listener = this.signal.listen(this.onDispatch, this, this.callOnce);
    };
    SignalHook.prototype.dettach = function () {
        this.listener.unlisten();
    };
    SignalHook.prototype.runOnce = function () {
        this.callOnce = true;
    };
    return SignalHook;
})();
exports.SignalHook = SignalHook;
var KontextImpl = (function () {
    function KontextImpl(parent) {
        this.parent = parent;
        this.signals = {};
        this.signalHooks = [];
        this.instances = {};
    }
    KontextImpl.prototype.hasSignal = function (name) {
        return this.signals[name] != null;
    };
    KontextImpl.prototype.setSignal = function (name, hook) {
        var signal = this.getSignal(name);
        if (!signal)
            signal = this.signals[name] = new signals.Dispatcher();
        var sigHook;
        if (hook) {
            sigHook = new SignalHook(this, signal, hook);
            this.signalHooks.push(sigHook);
        }
        return sigHook;
    };
    KontextImpl.prototype.getSignal = function (name) {
        var signal = this.signals[name];
        if (this.parent && !signal) {
            signal = this.parent.getSignal(name);
        }
        return signal;
    };
    KontextImpl.prototype.setInstance = function (name, factory) {
        if (!factory)
            throw new Error('error trying to define instance: ' + name);
        return this.instances[name] = new KontextFactory(factory);
    };
    KontextImpl.prototype.getInstance = function (name) {
        var factory = this.instances[name];
        if (factory)
            return factory.getInstance();
        if (this.parent)
            return this.parent.getInstance(name);
        return null;
    };
    KontextImpl.prototype.start = function () {
        for (var i = 0; i < this.signalHooks.length; i++) {
            this.signalHooks[i].attach();
        }
    };
    KontextImpl.prototype.stop = function () {
        for (var i = 0; i < this.signalHooks.length; i++) {
            this.signalHooks[i].dettach();
        }
    };
    return KontextImpl;
})();
exports.KontextImpl = KontextImpl;
var App = (function () {
    function App(parent) {
        this.parent = parent;
        if (this.parent) {
            this.kontext = new KontextImpl(this.parent.kontext);
        }
        else
            this.kontext = new KontextImpl();
    }
    App.prototype.initialize = function (kontext, opts) {
    };
    App.prototype.start = function (opts) {
        this.opts = opts;
        this.initialize(this.kontext, opts);
        this.kontext.start();
        this.onStart();
        return this;
    };
    App.prototype.onStart = function () {
    };
    App.prototype.onStop = function () {
    };
    App.prototype.stop = function () {
        this.kontext.stop();
        this.onStop();
        return this;
    };
    return App;
})();
exports.App = App;
