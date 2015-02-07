/**
 * Created by jcabresos on 2/5/15.
 */
import should = require('should');
import kola = require('../src/kola');
import sinon = require('sinon');

import signals = require('stfu-signals');

describe('App', () => {

    var parentApp:kola.App<number>;
    var childApp: kola.App<string>;

    it('initialize App with or without parameter', () => {
        should.doesNotThrow(() => {
            parentApp = new kola.App();
            childApp = new kola.App(parentApp);
        }, 'should not throw an error');

    });

    it('kontext is created', () => {
        should.ok(parentApp.kontext, 'No kontext created!');
        should.ok(childApp.kontext, 'No kontext created!');
    });

    it('childApp\'s kontext.parent is parentApp.kontext', () => {
        should.equal(childApp.kontext.parent, parentApp.kontext, 'parent of childApp.kontext is not parentApp.kontext')
    });

    it('signals start and stop, and kontext starts or stops', () => {
        var onStart = sinon.spy();
        var onStop = sinon.spy();

        var kontextStart = sinon.spy(childApp.kontext, 'start');
        var kontextStop = sinon.spy(childApp.kontext, 'stop');

        childApp.onStart.addListener(new signals.SignalListener(onStart));
        childApp.onStop.addListener(new signals.SignalListener(onStop));

        childApp.start('hello');
        should.ok(onStart.calledWith('hello'), 'onStart listener not called');
        should.ok(kontextStart.called, 'kontext.start not called');

        childApp.stop();
        should.ok(onStop.called, 'onStop listener not called');
        should.ok(kontextStop.called, 'kontext.stop not called');
    })
})

interface KontextSignal extends kola.Signal {
    <T>(name: string): kola.KolaSignal<T>;
    (name: 'signals.greet'): kola.KolaSignal<string>;
}

interface KontextInstance extends kola.Instance {
    <T>(name: string): T;
}

interface Kontext extends kola.KontextInterface{
    signal: KontextSignal;
    instance: KontextInstance;
}

class Contact {
    name: string;

}

class Phonebook {
    contacts;

    addContact(): void {

    }
}

class Greet extends kola.Kommand<string> {
    constructor(kontext?: Kontext) {
        super();
    }

    execute(payload: string): Error {
        console.log(payload);
        return null;
    }
}

class TellTime extends kola.Kommand<Date> {

    kontext: Kontext;

    constructor(kontext?: Kontext) {
        super(kontext);
        this.kontext = kontext;
    }

    execute(payload: Date): Error {
        console.log(payload.getTime());
        return null;
    }
}

describe('Kontext', () => {
    var parentKontext: kola.Kontext;
    var childKontext: Kontext;

    it('create with or without parent', () => {
        should.doesNotThrow(() =>{
            parentKontext = new kola.Kontext();
            childKontext = new kola.Kontext(parentKontext);
        }, 'error creating kontext');
    });

    it('sets a signal', () => {
        childKontext.signal('signals.greet').dispatch(1);
    });
});