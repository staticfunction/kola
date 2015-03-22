# Kola

```shell
    npm install kola --save
```

# Getting Started

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

# Multiple App and Kontext
When creating a kola App, you can choose whether to extend another App or a standalone. By extending another App you get
to inherit all its Kontext instances and signals.

```typescript
import parent = require('./parent/app');
import child = require('./child/app');

var parentApp = new parent.App();
var childApp = new child.App(parentApp); //this enables us to inherit instances and signals from parent.

```

## Kontext.setInstance() on a child App
When you set an instance in a child App, that instance will only be available to that child. Even if you try to set it with a
key that has the same name in the parent.

## Kontext.getInstance() from a child App
As everything is inherited from the parent, getting an instance with a key that was define in the parent will return you
an instance from that parent. The logic when getting an instance is that it would check first locally if a factory is define for
that instance otherwise it would check its parent. If you have a deep hierarchy of apps, the check will be perform recursively until
it finds the factory or until it reached its root parent.


## Kontext.setSignal() on a child App
Setting a signal works differently from setting an instance. When you set a signal, it checks first if that signal is already
defined in the current Kontext and if you have a hierarchy of apps, it will recursively look for that signal until it reaches the root. When
it finds one, it will Kontext will create a SignalHook for that signal. Otherwise a new signal instance is created for the current Kontext.

## Kontext.getSignal() on a child App
Same as getInstance, you'll be able to inherit signals from parent.