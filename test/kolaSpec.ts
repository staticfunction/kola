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
    (name: 'signals.addContact'): kola.KolaSignal<string>;
}

interface KontextInstance extends kola.Instance {
    <T>(name: string): T;
    (name: 'models.phonebook'): Phonebook;
}

interface Kontext extends kola.KontextInterface{
    signal: KontextSignal;
    instance: KontextInstance;
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

class AddContact extends kola.Kommand<Contact> {

    phonebook: Phonebook;

    constructor(kontext: Kontext) {
        super(kontext);
        this.phonebook = <Phonebook>kontext.instance('models.phonebook');
    }

    execute(payload: Contact): Error {
        this.phonebook.addContact(payload);
        console.log('contact added: ' + payload.name)
        return null;
    }
}

class ContactIsNotNull extends kola.Kommand<Contact> {
    execute(payload: Contact): Error {
        if(!payload) {
            var addContactError: AddContactError = new AddContactError(payload, AddContactErrorReason.ContactIsNull);
            return new Error('Contact is null');
        }
        return null;
    }
}

class HasPhone extends kola.Kommand<Contact> {
    execute(payload: Contact): Error {
        if(!payload.phone)
            return new Error('Contact has no phone');
        return null;
    }
}

class RemoveContact extends kola.Kommand<Contact> {

    phonebook: Phonebook;

    constructor(kontext: Kontext) {
        super(kontext);
        this.phonebook = <Phonebook>kontext.instance('models.phonebook');
    }

    execute(payload: Contact): Error {
        try {
            this .phonebook.removeContact(payload);
        }
        catch(e) {
            return e;
        }

        return null;
    }
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

class ErrorLog extends kola.Kommand<Error> {
    execute(payload: Error): Error {
        console.error(payload.message);
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
        should.doesNotThrow(() => {
            childKontext.signal<Contact>('signals.contacts.add', [ContactIsNotNull, HasPhone, AddContact])
            .onError(ErrorLog)
            .breakChainOnError(true)
        }, 'error setting signals.contacts.add');

        should.doesNotThrow(() =>{
            childKontext.signal<Contact>('signals.contacts.remove', [ContactIsNotNull, RemoveContact])
                .onError(ErrorLog)
                .breakChainOnError(true);
        }, 'error setting up signals.contacts.remove');
    });

    it('sets an instance', () => {
        should.doesNotThrow( () => {
            childKontext.instance('models.phonebook', () => {return new Phonebook()}).asSingleton();
        }, 'error setting factory for phonebook');

        should.doesNotThrow(() => {
            childKontext.instance('models.contact', () => {return new Contact()});
        }, 'error setting factory for contact');
    })

    it('starts the kontext and locks signal and instance', () => {

        parentKontext.start();
        childKontext.start();

        should.exist(childKontext.signal('signals.contacts.add'));
        should.exist(childKontext.signal('signals.contacts.remove'));
        should.throws(() => {
            childKontext.signal('signals.contacts.edit')
        }, 'should throw an error since signals.contacts.edit is not defined');

        var phonebook: Phonebook = <Phonebook>childKontext.instance('models.phonebook');
        var contact: Contact = <Contact>childKontext.instance('models.contact');

        should.exist(phonebook);
        should.exist(contact);

        should.equal(childKontext.instance('models.phonebook'), phonebook, 'phonebook is not singleton!');
        should.notEqual(childKontext.instance('models.contact'), contact, 'contact should not be singleton!');

        should.throws(() => {
            (childKontext.instance('models.email'));
        }, 'models.email was not defined')
    });

    it('executes kommands if signal is dispatched', () => {
        var kommandExecute = sinon.stub(kola.Kommand.prototype, 'execute');

        var contact = new Contact();
        contact.name = 'James';
        contact.phone = 1434469;

        childKontext.signal('signals.contacts.add').dispatch(contact);

        //should.ok(kommandExecute.called, 'kommand has not been executed');
        //should.ok(kommandExecute.calledThrice, 'there should only be 3 calls');
    });

    it('gets a signal from a parent', () => {

    })

});