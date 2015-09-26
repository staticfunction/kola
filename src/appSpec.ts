import {App} from './app';
import * as should from 'should';
import * as sinon from 'sinon';

describe("App specifications", () => {
  
  var parentApp:App<string>;
  var childApp:App<number>;
  
  beforeEach(() => {
    parentApp = new App<string>();
    childApp = new App<number>(parentApp);
  })
  
  it("creates a kontext", function() {
   should.exist(parentApp.kontext);
   should.exist(childApp.kontext);
  });
  
  it("creates a kontext with a parent", () => {
    should.equal(childApp.kontext.parent, parentApp.kontext);
  });

  it("calls initialize only once with kontext and opts passed in", () => {
      let initialize = sinon.spy(parentApp, 'initialize');
      
      parentApp.start();
      should.ok(initialize.calledOnce);
      
      parentApp.stop();
      parentApp.start();
      should.ok(initialize.calledOnce);
    });
    
    it("calls onStart when start() is invoked", () => {
      let onStart = sinon.spy(parentApp, 'onStart');
      
      parentApp.start();
      should.ok(onStart.calledOnce);
    });
    
    it("calls onStop when stop() is invoked", () => {
      let onStop = sinon.spy(parentApp, 'onStop');
      
      parentApp.stop();
      should.ok(onStop.calledOnce);
    });
})
