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

class Greeter extends kola.App<string> {

}

```

### App.onKontext(kontext: kola.Kontext, opts?:T)
This is where you can setup your application's kontext. The opts parameter is the one being passed through App.start(opts);

```typescript

import kola = require('kola');
import hooks = require('kola-hooks');

class Greeter extends kola.App<string> {
    onKontext(kontext: kola.Kontext, opts?: string): void {
        kontext.setSignal('say.hello',
                                hooks.executes([com.sayHello, com.showTime]));
        kontext.setInstance('
    }
}

```

### App.start(opts?: T)
It is where you can pass arguments for your application to use before it sets up the kontext.


