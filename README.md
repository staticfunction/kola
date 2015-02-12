# Kola

```shell
    npm install kola --save
```

## Getting Started

### App
Everything is an app in kola. To create an app, you extend kola.App and define your application's startup option.
Here we have a Greeter that accepts a message of type string on start(note the generic param).

```typescript

import kola = require("kola");

class Greeter extends kola.App<string> {

}

```

Right now, this does nothing but restricts you to only pass string arguments on App.start() method.