# Kola

```shell
    npm install kola --save
```

## Getting Started

### App
Everything is an app in kola. To create an app, you extend kola.App and define your application's startup paramater type.
Here we have a Greeter that accepts a message of type string on start(note the generic param).

```typescript

import kola = require("kola");

export class MailingList extends kola.App<{host: string}> {

}

```

### App.initialize(kontext: kola.Kontext, opts?:T)
This is where you can setup your application's kontext. The opts parameter is the one being passed through App.start(opts);

```typescript

import kola = require('kola');
import hooks = require('kola-hooks');

class MailingList extends kola.App<{host: string}> {

    initialize(kontext: kola.Kontext, opts?: string): void {
        kontext.setSignal<{email: string}>('register',
                                hooks.executes([cmd.validateEmail, cmd.registerEmail, cmd.congratulateUser])
                                    .breakChainOnError(true),
                                    .onError(cmd.apologizeToUser)
                                );

        kontext.setSignal<{email: string}>('unregister',
                                hooks.executes([cmd.validateEmail, cmd.unregisterEmail])
                                    .breakChainOnError(true),
                                    .onError(cmd.apologizeToUser)

        kontext.setInstance('service.mailingList', () => {
            return new MailingListService()
        }.asSingleton();
    }

}

```
## Kontext
The Kontext is where you can store instances and signals for your application.

### Kontext.setSignal(name: string, hook: Hook<T>): SignalHook<T>
Kontext.setSignal() allows you to define a signal name and a hook which is any object that implements Hook<T>. This will
return a SignalHook<T> instance whereyou can define if this hook should only run once.

```typescript
    kontext.setSignal<any>('initialize', {
        execute: (payload: any, kontext: Kontext) => {
            //do funky initialization stuff here!
        }
    }).runOnce(); //run initialization only once
```

There is [kola-hooks](https://github.com/staticfunction/kola-hooks) which you can use as a factory to create your hook.

## Kontext.getSignal(name: string): signals.Dispatcher<T>
This will return an instance of signals.Dispatcher with the name you've define in setSignal(). This will return null
if you haven't define any.

## Kontext.setInstance<T>(name: string, factory: () => T): void
Kontext.setInstance() allows you to define a factory with a given name. This returns a KontextFactory<T> instance where you
can set if the factory is singleton or not.

```typescript

kontext.setInstance<MailingListService>('service.mailingList', () => {
    return new MailingListService();
}).asSingleton(); //returns only one instance.

kontext.setInstance<Request>('service.request', () => {
    return new Request();
}) //returns a new instance everytime you call kontext.getInstance()

```


### App.start(opts?: T): kola.App<T>
It is where you can pass arguments for your application to use before it sets up the kontext.

## App.onStart(): void
This is called after initialization. This method is meant to be overridden by the application to do custom behaviour when
application starts.


## App.onStop(): void
This is called when App.stop() is called. This method is meant to be overridden to do custom behaviour when application stops.

## Multiple Apps & Kontext
Everytime you create an app, a Kontext is created for you. You can choose either to extend another App's Kontext or created
an independent one like so:

```typescript

var parentApp = new parent.App(); //completely standalone

var childApp = new child.App(parentApp); //extends parentApp's kontext

```

If you extend an App's Kontext, it's instances and signals will be inherited.