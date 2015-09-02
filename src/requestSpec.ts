import {create, Request, Handler, Promise} from './request';
import {KontextImpl, Kontext} from './kontext';
import * as should from "should";

describe("request specifications", () => {
  let kontext = new KontextImpl();
  let handler: Handler<number, string> = {
    execute: function (payload: number, kontext: Kontext)  {      
      //setTimeout()
      var success = (res: string) => {
        
      }
      
      var error = (error: any) => {
        
      }
      
      
      
      var promise: Promise<string>;
      
      return promise;
    }
  }
  
  it("executes handlers when request is invoked", (done: MochaDone) => {
    let sayHello = create<number, string>(handler, kontext);
    
    sayHello(1).then((res: string) => {
      should.equal(res, "hello 1");
    });
    
  });
  it("returns a promise");
})

