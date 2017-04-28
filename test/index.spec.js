'use strict';

var expect = require('chai').expect;
var mocha = require('mocha');
var nock = require('nock');
var bluebird = require('bluebird');
var vaultKv = require('../index.js');

describe('Vault KeyValueStore', function () {
    // Some variables required in the tests
    var vaultToken = 'a8c914c6-2b71-11e7-93ae-92361f002671';
    var vaultPath = '/v1/secret/myinstance';
    var vaultUrl;
    var member;
    var vaultCompletePath;
    var vaultHeaders = {
        'X-Vault-Token': vaultToken
    };
    var userData;
    var expectedData = JSON.stringify({
        'enrollment': 'enrollmentSecret'
    });

    var vaultKeyValueStore;

    context('when vault server is up and running', function () {
        beforeEach(function () {
            vaultUrl = 'http://crfrlmthrg.hfc.kv';
            vaultCompletePath = vaultUrl + vaultPath;
            member = "member1";
            var vaultServer = nock(vaultUrl, {
                reqheaders: {
                    'X-Vault-Token': vaultToken
                }
            }).post(/v1\/secret\/myinstance\/.*/)
                .reply(204, function (uri, requestBody) {
                    userData = requestBody;
                })
                .get(/v1\/secret\/myinstance\/.*/)
                .reply(200, function (uri, requestBody) {
                    return {
                        "auth": null,
                        "data": userData,
                        "lease_duration": 2764800,
                        "lease_id": "",
                        "renewable": false
                    }
                });
            vaultKeyValueStore = vaultKv.newVaultKeyValStore(vaultCompletePath, vaultToken);
        })

        it('sets the value', function (done) {
            var setValue = bluebird.promisify(vaultKeyValueStore.setValue, {
                context: vaultKeyValueStore
            });
            setValue(member, expectedData).then(function () {
                done();
            }).catch(function (err) {
                done(err);
            });
        })

        it('gets the value', function (done) {
            var getValue = bluebird.promisify(vaultKeyValueStore.getValue, {
                context: vaultKeyValueStore
            });

            getValue(member).then(function (data) {
                expect(data).to.be.equal(expectedData);
                done();
            }).catch(function (err) {
                done(err);
            });
        })
    })

    context('when vault server returns error', function () {
        beforeEach(function () {
            vaultUrl = 'http://yxsiqywqfg.hfc.kv';
            vaultCompletePath = vaultUrl + vaultPath;
            member = "member2";
            var vaultServer = nock(vaultUrl, {
                reqheaders: {
                    'X-Vault-Token': vaultToken
                }
            })
                .post(/v1\/secret\/myinstance\/.*/)
                .replyWithError('kaboom')
                .get(/v1\/secret\/myinstance\/.*/)
                .replyWithError('kaboom again');
            vaultKeyValueStore = vaultKv.newVaultKeyValStore(vaultCompletePath, vaultToken);
        })

        it('sets the value', function (done) {
            var setValue = bluebird.promisify(vaultKeyValueStore.setValue, {
                context: vaultKeyValueStore
            });
            setValue(member, expectedData).then(function () {
                done(new Error('Should have thrown error but it didnt :('));
            }).catch(function (err) {
                console.error('Expected error', err.message);
                if (err.message == 'kaboom') {
                    done();
                } else {
                    done(err);
                }
            });
        })

        it('gets the value', function (done) {
            var getValue = bluebird.promisify(vaultKeyValueStore.getValue, {
                context: vaultKeyValueStore
            });
            getValue(member).then(function (response) {
                done(new Error('Should have thrown error but it didnt :('));
            }
            ).catch(function (err) {
                console.error('Expected error', err.message);
                if (err.message == 'kaboom again') {
                    done();
                } else {
                    done(err);
                }
            });
        })
    })

    context('when vault server returns non 2xx status code', function () {
        beforeEach(function () {
            vaultUrl = 'http://nlbmjkkdbp.hfc.kv';
            member = "member3";
            vaultCompletePath = vaultUrl + vaultPath;
            var vaultServer = nock(vaultUrl, {
                reqheaders: {
                    'X-Vault-Token': vaultToken
                }
            })
                .post(/v1\/secret\/myinstance\/.*/)
                .reply(500, 'Internal server error')
                .get(/v1\/secret\/myinstance\/.*/)
                .reply(500, 'Internal server error');
            vaultKeyValueStore = vaultKv.newVaultKeyValStore(vaultCompletePath, vaultToken);
        })

        it('sets the value', function (done) {
            var setValue = bluebird.promisify(vaultKeyValueStore.setValue, {
                context: vaultKeyValueStore
            });
            setValue(member, expectedData).then(function () {
                done(new Error('Should have thrown error but it didnt :('));
            }).catch(function (err) {
                console.error('Expected error', err.message);
                if (err.message == 'Failed to persist with status code 500') {
                    done();
                } else {
                    done(err);
                }
            });
        })

        it('gets the value', function (done) {
            var getValue = bluebird.promisify(vaultKeyValueStore.getValue, {
                context: vaultKeyValueStore
            });
            getValue(member).then(function (response) {
                done(new Error('Should have thrown error but it didnt :('));
            }
            ).catch(function (err) {
                console.error('Expected error', err.message);
                if (err.message == 'Failed to read from vault with status code 500') {
                    done();
                } else {
                    done(err);
                }
            });
        })
    })

    context('when vault server returns non 404 status code', function () {
        beforeEach(function () {
            vaultUrl = 'http://isawcfzoqr.hfc.kv';
            member = "member4";
            vaultCompletePath = vaultUrl + vaultPath;
            var vaultServer = nock(vaultUrl, {
                reqheaders: {
                    'X-Vault-Token': vaultToken
                }
            }).get(/v1\/secret\/myinstance\/.*/)
              .reply(404, 'Not found');
            vaultKeyValueStore = vaultKv.newVaultKeyValStore(vaultCompletePath, vaultToken);
        })

        it('returns null value', function (done) {
            var getValue = bluebird.promisify(vaultKeyValueStore.getValue, {
                context: vaultKeyValueStore
            });
            getValue(member).then(function (response) {
                expect(response).to.be.null;
                done();
            }
            ).catch(function (err) {
                done(err);
            });
        })
    })

    context('when vault server times out', function () {
        var timeout = 1000;
        beforeEach(function () {
            vaultUrl = 'http://hkfrrpdfsv.hfc.kv';
            member = "member4";
            vaultCompletePath = vaultUrl + vaultPath;
            var vaultServer = nock(vaultUrl, {
                reqheaders: {
                    'X-Vault-Token': vaultToken
                }
            }).get(/v1\/secret\/myinstance\/.*/)
              .socketDelay(timeout+500).reply(200, '');
            vaultKeyValueStore = vaultKv.newVaultKeyValStore(vaultCompletePath, vaultToken, timeout);
        })

        it('returns error on timeout', function (done) {
            var getValue = bluebird.promisify(vaultKeyValueStore.getValue, {
                context: vaultKeyValueStore
            });
            getValue(member).then(function (response) {
                done(new Error('Should not have reached here'));
            }
            ).catch(function (err) {
               if (err.message.includes('ESOCKETTIMEDOUT')) {
                    done();
                } else {
                    done(err);
                }
            });
        })
    })
})