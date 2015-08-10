import {App} from './app';

export class GreeterApp extends App<string> {

}

describe("App specifications", () => {
  it("creates a kontext");
  it("creates a kontext with a parent");
  it("calls initialize only once with kontext and opts passed in");
  it("calls onStart when start() is invoked");
  it("calls onStop when stop() is invoked");
})
