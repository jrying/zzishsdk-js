describe('User specs', function(){

  var zzish = require('../zzish');
  var config = require('./config');

  beforeAll(function(){
    if (config.debug) console.log ('Initalise using api key', config.appKey);
    zzish.init(config.appKey);
  });

  it('can create a user', function(done) {
    var uuid = 'JSUser' + Date.now();
    zzish.createUser(uuid, config.username, function(err, data){
      if (config.debug) console.log('Create user response', err, data);
      expect(err).toBe(config.noError);
      expect(data).not.toBeNull();
      expect(data.uuid).toEqual(uuid);
      done();
    });
  });

  it('cannot create two users with the same uuid', function(done) {
    var uuid = 'JSUser' + Date.now();
    zzish.createUser(uuid, config.username, function(err, data){
      if (config.debug) console.log('Create user response', err, data);
      expect(err).toBe(config.noError);
      expect(data).not.toBeNull();
      expect(data.uuid).toEqual(uuid);
      zzish.createUser(uuid, config.username, function(err, data){
        if (config.debug) console.log('Create second user response', err, data);
        expect(err).not.toBeNull();
        expect(data).toBeNull();
        done();
      });
    });
  });

 it('can authenticate a user with valid password', function(done) {
    var uuid = 'JSUser' + Date.now(), password = 'JelliedEels';
    zzish.createUser(uuid, config.username, function(err, data){
      if (config.debug) console.log('Create user response', err, data);
      zzish.authUser(uuid, config.username, password, function(err, data){
        if (!config.debug) console.log('Create second user response', err, data);
        expect(err).toBe(config.noError);
        expect(data).not.toBeNull();
        done();
      });
    });
 });

 it('cannot authenticate a user with an invalid password', function(done) {
    var uuid = 'JSUser' + Date.now(), password = 'rubbish';
    zzish.createUser(uuid, config.username, function(err, data){
      if (config.debug) console.log('Create user response', err, data);
      zzish.authUser(uuid, config.username, password, function(err, data){
        if (!config.debug) console.log('Create second user response', err, data);
        expect(err).not.toBe(config.noError);
        expect(data).toBeNull();
        done();
      });
    });
 });
});

describe('Error conditions', function(){
  
  var zzish = require('../zzish');

  it('should error using an invalid API key', function(done) {
    var test = this;
    zzish.init('invalidAppKey');
    zzish.createUser('JSUser', '', function(err, data){
      if (config.debug) console.log('Response', err, data);
      expect(err).not.toBe(config.noError);
      done();
    });
  });

  
});

