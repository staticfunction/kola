!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.kola=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        this.listener = new signals.SignalListener(this.onDispatch, this);
    }
    SignalHook.prototype.onDispatch = function (payload) {
        this.hook.execute(payload, this.kontext);
    };
    SignalHook.prototype.attach = function () {
        this.signal.addListener(this.listener);
    };
    SignalHook.prototype.dettach = function () {
        this.signal.removeListener(this.listener);
    };
    SignalHook.prototype.runOnce = function () {
        this.listener = new signals.SignalListener(this.onDispatch, this, true);
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
            signal = this.signals[name] = new signals.SignalDispatcher();
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
        if (parent) {
            this.kontext = new KontextImpl(parent.kontext);
        }
        else
            this.kontext = new KontextImpl();
        this.parent = parent;
        this.onKontext(this.kontext);
        this.onStart = new signals.SignalDispatcher();
        this.onStop = new signals.SignalDispatcher();
    }
    App.prototype.onKontext = function (kontext) {
    };
    App.prototype.start = function (opts) {
        this.kontext.start();
        this.onStart.dispatch(opts);
        return this;
    };
    App.prototype.stop = function () {
        this.kontext.stop();
        this.onStop.dispatch(null);
        return this;
    };
    return App;
})();
exports.App = App;

},{"kola-signals":2}],2:[function(require,module,exports){
/**
 * Created by jcabresos on 2/15/14.
 */
var signalCount = 0;
function generateSignalId() {
    var nextId = signalCount++;
    return nextId;
}
var SignalDispatcher = (function () {
    function SignalDispatcher() {
        this.listeners = {};
        this.numListeners = 0;
    }
    SignalDispatcher.prototype.addListener = function (listener) {
        this.listeners[listener.id] = listener;
        this.numListeners++;
    };
    SignalDispatcher.prototype.removeListener = function (listener) {
        this.listeners[listener.id] = undefined;
        this.numListeners--;
    };
    SignalDispatcher.prototype.removeAllListeners = function () {
        this.listeners = {};
        this.numListeners = 0;
    };
    SignalDispatcher.prototype.getListenersLength = function () {
        return this.numListeners;
    };
    SignalDispatcher.prototype.dispatch = function (payload) {
        var listenersTmp = {};
        for (var id in this.listeners) {
            var listener = this.listeners[id];
            if (listener) {
                listener.receiveSignal(payload);
                if (listener.callOnce) {
                    this.removeListener(listener);
                    continue;
                }
                listenersTmp[id] = this.listeners[id];
            }
        }
        this.listeners = listenersTmp;
    };
    return SignalDispatcher;
})();
exports.SignalDispatcher = SignalDispatcher;
var SignalListener = (function () {
    function SignalListener(callback, target, callOnce) {
        this.id = generateSignalId();
        this.callback = callback;
        this.target = target;
        this.callOnce = callOnce;
    }
    SignalListener.prototype.receiveSignal = function (payload) {
        this.callback.call(this.target, payload);
    };
    return SignalListener;
})();
exports.SignalListener = SignalListener;

},{}]},{},[1])(1)
});