describe('Activity Specs', function(){

  var zzish = require('../zzish');
  var config = require('./config');

  var user;

  beforeAll(function(done) {
    var uuid = 'JSUser' + Date.now() ;
    zzish.init(config.appKey);
    zzish.createUser(uuid, config.username, function(err, data){
      expect(err).toBe(config.noError);
      user = data;
      done();
    });
  });

  it('can create an activity without options', function(done){
    done();
  });

});
