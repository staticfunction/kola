/**
 * Created by jcabresos on 2/5/15.
 */
import should = require('should');
import kola = require('../src/kola');
import sinon = require('sinon');

import signals = require('kola-signals');
import hooks = require('kola-hooks');

describe('App', () => {

    var parentApp:kola.App<number>;
    var childApp: kola.App<string>;

    it('initialize App with or without parameter', () => {
        should.doesNotThrow(() => {
            parentApp = new kola.App<number>();
            childApp = new kola.App<string>(parentApp);
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
        var onStart = sinon.spy(childApp, 'onStart');
        var onStop = sinon.spy(childApp, 'onStop');

        var kontextStart = sinon.spy(childApp.kontext, 'start');
        var kontextStop = sinon.spy(childApp.kontext, 'stop');

        childApp.start('hello');
        should.ok(onStart.called, 'onStart listener not called');
        should.ok(kontextStart.called, 'kontext.start not called');

        childApp.stop();
        should.ok(onStop.called, 'onStop listener not called');
        should.ok(kontextStop.called, 'kontext.stop not called');
    })
})

interface Kontext extends kola.Kontext {
    setSignal<T>(name: string, hook?: kola.Hook<T>, local?: boolean): kola.SignalHook<T>;
    getSignal<T>(name: string, local?: boolean): signals.Dispatcher<T>;
    setInstance<T>(name: string, factory: () => T): kola.KontextFactory<T>;
    getInstance<T>(name: string): T;
    getInstance(name: 'models.phonebook'): Phonebook;
}

class Contact {
    name: string;
    phone: number;
    dateAdded: Date;
}

class Phonebook {

    contacts: Contact[];

    constructor() {
        this.contacts = [];
    }

    addContact(contact: Contact): void {
        contact.dateAdded = new Date();
        this.contacts.push(contact);
    }

    removeContact(contact: Contact): void {
        for(var i; i < this.contacts.length; i++) {
            if(this.contacts[i] == contact) {
                this.contacts.splice(i, 1);
                break;
            }
        }

        throw new Error("Contact does not exists!");
    }
}

function AddContact (payload: Contact, kontext: Kontext, done: () => void): void {
    var phonebook = kontext.getInstance<Phonebook>('models.phonebook');
    phonebook.addContact(payload);
    console.log('contact added: ' + payload.name)
}

function ContactIsNotNull (payload: Contact): void {
    if(!payload) {
        var addContactError: AddContactError = new AddContactError(payload, AddContactErrorReason.ContactIsNull);
        throw new Error('Contact is null');
    }
}

function HasPhone(payload: Contact): void {
    if(!payload.phone)
        throw new Error('Contact has no phone');
}

function RemoveContact (payload: Contact, kontext: Kontext): void {
    var phonebook = kontext.getInstance<Phonebook>('models.phonebook');

    try {
        phonebook.removeContact(payload);
    }
    catch(e) {
        throw e;
    }
}

function SayHello(payload: string): void {
        console.log('Hello World!');
}

class Greeting {
    message = "Hello World";
}


enum AddContactErrorReason {
   ContactIsNull,
    HasNoPhone
}

class AddContactError implements Error {

    name: string;
    message: string;
    reason: AddContactErrorReason;
    contact: Contact;

    constructor(contact: Contact, reason: AddContactErrorReason) {
        this.contact = contact;
        this.reason = reason;
        if(reason == AddContactErrorReason.HasNoPhone) {
            this.name = "Contact has no phone";
            this.message = "Contact must have a phone number";
        }
        else {
            this.name = "Contact is null";
            this.message = "Contact must not be null";
        }
    }
}

function ErrorLog (payload: Error): void {
        console.error(payload.message);
}

describe('KontextImpl', () => {
    var parentKontext: kola.KontextImpl;
    var childKontext: Kontext;

    it('create with or without parent', () => {
        should.doesNotThrow(() =>{
            parentKontext = new kola.KontextImpl();
            childKontext = new kola.KontextImpl(parentKontext);
        }, 'error creating kontext');
    });


    //TODO: Move hooks test to kola-hooks
    it('sets a signal', () => {
        should.doesNotThrow(() => {
            childKontext.setSignal<Contact>('signals.contacts.add', hooks.executes([ContactIsNotNull, HasPhone, AddContact])
                .onError(ErrorLog)
                .breakChainOnError(true)
            );
        }, 'error setting signals.contacts.add');

        should.doesNotThrow(() =>{
            childKontext.setSignal<Contact>('signals.contacts.remove', hooks.executes([ContactIsNotNull, RemoveContact])
                .onError(ErrorLog)
                .breakChainOnError(true)
            );
        }, 'error setting up signals.contacts.remove');

        should.doesNotThrow(() =>{
            parentKontext.setSignal<string>('signals.hello', hooks.executes([SayHello]));
        }, 'error setting up signals.hello');
    });

    it('sets a local signal', () => {
        should.doesNotThrow(() => {
            childKontext.setSignal<string>('signals.hello', hooks.executes([SayHello]), true);
        })
    })

    it('sets an getInstance', () => {
        should.doesNotThrow( () => {
            childKontext.setInstance('models.phonebook', () => {return new Phonebook()}).asSingleton();
        }, 'error setting factory for phonebook');

        should.doesNotThrow(() => {
            childKontext.setInstance('models.contact', () => {return new Contact()});
        }, 'error setting factory for contact');

        should.doesNotThrow(() => {
            parentKontext.setInstance('models.greeting', () => {return new Greeting()}).asSingleton();
        }, 'error setting factory for greeting');
    })

    it('starts the kontext and locks signal and getInstance', () => {

        parentKontext.start();
        childKontext.start();

        should.exist(childKontext.getSignal('signals.contacts.add'));
        should.exist(childKontext.getSignal('signals.contacts.remove'));
        should.not.exist(childKontext.getSignal('signals.contacts.edit'));

        var phonebook: Phonebook = <Phonebook>childKontext.getInstance('models.phonebook');
        var contact: Contact = <Contact>childKontext.getInstance('models.contact');

        should.exist(phonebook);
        should.exist(contact);

        should.equal(childKontext.getInstance('models.phonebook'), phonebook, 'phonebook is not singleton!');
        should.notEqual(childKontext.getInstance('models.contact'), contact, 'contact should not be singleton!');

        should.not.exist(childKontext.getInstance('models.email'));
    });

    it('executes kommands if signal is dispatched', () => {
        var contact = new Contact();
        contact.name = 'James';
        contact.phone = 1434469;

        childKontext.getSignal('signals.contacts.add').dispatch(contact);

        //TODO: test for breakChainOnError

        //should.ok(kommandExecute.called, 'kommand has not been executed');
        //should.ok(kommandExecute.calledThrice, 'there should only be 3 calls');
    });

    it('gets a signal from a parent', () => {
        var signalListener = sinon.spy();
        should.equal(childKontext.getSignal('signals.hello'), parentKontext.getSignal('signals.hello'),
            'child signal and parent signal is not equal');
    });

    it('gets an getInstance from a parent', () => {
        should.equal(childKontext.getInstance('models.greeting'), parentKontext.getInstance('models.greeting'),
        'child models.greeting getInstance is not equal to parent  models.greeting getInstance');
    })

    it('stops the kontext', () => {
        childKontext.stop();
    })

    it('child kontext will never receive updates from parent', () => {
        var signalListener = sinon.spy();
        childKontext.getSignal('signals.hello').listen(signalListener, null, true);
    });

});