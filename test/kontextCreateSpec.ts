import kola = require('../src/kola');
import sinon = require('sinon');
import should = require('should');

class MainActivity implements kola.Activity<{msg: string}> {

    onStartSpy = sinon.spy();
    onStopSpy = sinon.spy();

    onStart(kontext: kola.Kontext<{msg: string}>, value: {msg: string}): void {
        this.onStartSpy(kontext, value);
    }

    onStop(): void {
        this.onStopSpy();
    }
}

class ChildActivity implements kola.Activity<number> {
    onStartSpy = sinon.spy();
    onStopSpy = sinon.spy();
    onStart(kontext: kola.Kontext<number>, value: number): void {
        this.onStartSpy(kontext, value);
    }

    onStop(): void {
        this.onStopSpy();
    }
}


describe("Kontext Creation", () => {

    var mainKontext: kola.Kontext<{msg: string}>;
    var levelOneChildKontext: kola.Kontext<number>;
    var levelTwoChildKontext: kola.Kontext<number>;

    it('can create kontext', () => {
        should.doesNotThrow(() => {
            mainKontext  = kola.createKontext<{msg: string}>('main', MainActivity);
        }, "error occurred while creating kontext");

        should.doesNotThrow(() => {
            levelOneChildKontext  = mainKontext.childKontext<number>('child', ChildActivity);
        }, "error occurred while creating kontext");

        should.doesNotThrow(() => {
            levelTwoChildKontext  = levelOneChildKontext.childKontext<number>('child', ChildActivity);
        }, "error occurred while creating kontext");

        should.equal(levelOneChildKontext.parent, mainKontext);

        should.throws(() => {mainKontext.childKontext('test.error')});
    });

    it('can start and stop activity', () => {
        var obj1 = {msg: 'hello'};

        var mainActivity:MainActivity = <MainActivity>mainKontext.start(obj1);
        should.ok(() => {return mainActivity instanceof MainActivity}, "mainActivity is not instance of MainActivity");
        should.ok(mainActivity.onStartSpy.calledWith(mainKontext, obj1), "MainActivity.onStart was not called");

        var levelOneChildActivity: ChildActivity = <ChildActivity>mainKontext.childKontext('child').start(1);
        should.ok(() => {return levelOneChildActivity instanceof ChildActivity}, "levelOneChildActivity is not instance of ChildActivity");
        should.ok(levelOneChildActivity.onStartSpy.calledWith(levelOneChildKontext, 1), "ChildActivity.onStart was not called");

        var levelTwoChildActivity: ChildActivity = <ChildActivity>levelTwoChildKontext.start(2);
        should.ok(levelTwoChildActivity.onStartSpy.calledWith(levelTwoChildKontext, 2), "ChildActivity.onStart was not called");

        levelTwoChildKontext.stop();
        should.ok(levelTwoChildActivity.onStopSpy.calledOnce, 'levelTwoChildActivity.onStop not called');

        //multi level kontext stop
        mainKontext.stop();
        should.ok(levelOneChildActivity.onStopSpy.calledOnce, 'levelOneChildActivity.onStop not called');
        should.ok(mainActivity.onStopSpy.calledOnce, 'mainActivity.onStop not called');
    })
});