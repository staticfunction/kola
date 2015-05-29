import {App, onStart, onStop, onInit} from './app';
import * as sinon from 'sinon';
import * as should from 'should';

class StartStopApp extends App<any> {
	helloMsg:string;
	
	@onInit
	oneTimeInvokeFirst() {
		
	}
	
	@onInit
	oneTimeInvokeSecond() {
		
	}
	
	@onStart
	invokeFirst() {
		this.helloMsg = 'hello world!';
	}
	
	@onStart
	invokeSecond() {
		
	}
	
	@onStop
	invokeThird() {
		this.helloMsg = 'goodbye world!';
	}
	
	@onStop
	invokeLast() {
		
	}
}

describe('app', () => {
	it('calls annotated @onStart methods when App.start() is called', () => {
		var app = new StartStopApp();
		var invokeFirst = sinon.spy(app, 'invokeFirst');
		var invokeSecond = sinon.spy(app, 'invokeSecond');
		
		app.start();
		
		should.ok(invokeFirst.called);
		should.ok(invokeSecond.called);
		should.equal(app.helloMsg, 'hello world!');
	});
	
	it('calls annotated @onStop methods when App.stop() is called', () => {
		var app = new StartStopApp();
		var invokeThird = sinon.spy(app, 'invokeThird');
		var invokeLast = sinon.spy(app, 'invokeLast');
		
		app.stop();
		
		should.ok(invokeThird.called);
		should.ok(invokeLast.called);
		should.equal(app.helloMsg, 'goodbye world!');
	});
	
	it('calls annotated @onInit when App is started for the first time', () => {
		var app = new StartStopApp();
		var oneTimeInvokeFirst = sinon.spy(app, 'oneTimeInvokeFirst');
		var oneTimeInvokeSecond = sinon.spy(app, 'oneTimeInvokeSecond');
		app.start();
		app.start();
		
		should.ok(oneTimeInvokeFirst.calledOnce);
		should.ok(oneTimeInvokeSecond.calledOnce);
	})
})