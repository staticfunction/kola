/**
 * Created by jcabresos on 2/5/15.
 */
import should = require('should');
import kola = require('../src/kola');
import sinon = require('sinon');
describe('App', () => {


    it('initialize App with or without parameter', () => {
        should.doesNotThrow(() => {new kola.App<void>(new kola.App<number>())}, 'should not throw an error');
    })
})