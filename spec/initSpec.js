

describe('Check Jasmine works', function() {
  it('contains spec with an expectation that should pass', function() {
    expect(true).toBe(true);
  });
});


describe('Initalisation', function() {

  var zzish = require('../zzish');
  var config = require('./config');

	it('can initialise an instance of the SDK', function() {
	  zzish.init(config.appKey);
	  if (config.debug) console.log('zzish inialised ', zzish);
  });

  /*  it('has a set of methods', function(){
    var functionNames = { 'debugState',
  init: [Function],
  initState: [Function],
  getUserWithOptions: [Function],
  getUser: [Function],
  startActivity: [Function],
  startActivityWithOptions: [Function],
  stopActivity: [Function],
  cancelActivity: [Function],
  logAction: [Function],
  registerWithClass: [Function],
  validateClassCode: [Function],
  authUser: [Function],
  createUser: [Function],
  listGroups: [Function],
  postContent: [Function],
  deleteContent: [Function],
  getContent: [Function],
  listContent: [Function],
  publishContentToGroup: [Function],
  login: [Function],
  getCurrentUser: [Function],
  logout: [Function] }
    zzish.init(config.appKey);
  */  
  
});
