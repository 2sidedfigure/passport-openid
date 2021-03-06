var vows = require('vows');
var assert = require('assert');
var util = require('util');
var OpenIDStrategy = require('passport-openid/strategy');
var BadRequestError = require('passport-openid/errors/badrequesterror');


vows.describe('OpenIDStrategy').addBatch({
  
  'strategy': {
    topic: function() {
      return new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function() {}
      );
    },
    
    'should be named session': function (strategy) {
      assert.equal(strategy.name, 'openid');
    },
  },
  
  'strategy handling an authorized request': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username' });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
    },
  },
  
  'strategy handling an authorized request using req argument to callback': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
          passReqToCallback: true
        },
        function(req, identifier, done) {
          done(null, { foo: req.foo, identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username' });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        req.foo = 'bar';
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should have request details' : function(err, req) {
        assert.equal(req.user.foo, 'bar');
      },
    },
  },
  
  'strategy handling an authorized request with addtional info': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier }, { message: 'Welcome!' });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username' });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user, info) {
          req.user = user;
          self.callback(null, req, info);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should pass additional info' : function(err, user, info) {
        assert.equal(info.message, 'Welcome!');
      },
    },
  },
  
  'strategy handling an authorized request with simple registration extensions': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, profile, done) {
          done(null, { identifier: identifier, displayName: profile.displayName, emails: profile.emails });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username',
          nickname: 'Johnny',
          email: 'username@example.com',
          fullname: 'John Doe',
          dob: '1955-05-25',
          gender: 'M',
          postcode: '90210',
          country: 'US',
          language: 'EN',
          timezone: 'America/Los_Angeles'
        });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should parse profile' : function(err, req) {
        assert.equal(req.user.displayName, 'John Doe');
        assert.lengthOf(req.user.emails, 1);
        assert.equal(req.user.emails[0].value, 'username@example.com');
      },
    },
  },
  
  'strategy handling an authorized request with attribute exchange extensions': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, profile, done) {
          done(null, { identifier: identifier, displayName: profile.displayName, name: profile.name, emails: profile.emails });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username',
          firstname: 'John',
          lastname: 'Doe',
          email: 'username@example.com'
        });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should parse profile' : function(err, req) {
        assert.equal(req.user.displayName, 'John Doe');
        assert.equal(req.user.name.familyName, 'Doe');
        assert.equal(req.user.name.givenName, 'John');
        assert.lengthOf(req.user.emails, 1);
        assert.equal(req.user.emails[0].value, 'username@example.com');
      },
    },
  },
  
  'strategy handling an authorized request with profile option using arguments rather than arity': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
          profile: true
        },
        function() {
          // identifier, profile, done
          var identifier = arguments[0];
          var profile = arguments[1];
          var done = arguments[2];
          
          done(null, { identifier: identifier, displayName: profile.displayName, name: profile.name, emails: profile.emails });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username',
          firstname: 'John',
          lastname: 'Doe',
          email: 'username@example.com'
        });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should parse profile' : function(err, req) {
        assert.equal(req.user.displayName, 'John Doe');
        assert.equal(req.user.name.familyName, 'Doe');
        assert.equal(req.user.name.givenName, 'John');
        assert.lengthOf(req.user.emails, 1);
        assert.equal(req.user.emails[0].value, 'username@example.com');
      },
    },
  },
  
  'strategy handling an authorized request with attribute exchange extensions using req argument to callback': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
          passReqToCallback: true
        },
        function(req, identifier, profile, done) {
          done(null, { foo: req.foo, identifier: identifier, displayName: profile.displayName, name: profile.name, emails: profile.emails });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username',
          firstname: 'John',
          lastname: 'Doe',
          email: 'username@example.com'
        });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        req.foo = 'bar';
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should have request details' : function(err, req) {
        assert.equal(req.user.foo, 'bar');
      },
      'should parse profile' : function(err, req) {
        assert.equal(req.user.displayName, 'John Doe');
        assert.equal(req.user.name.familyName, 'Doe');
        assert.equal(req.user.name.givenName, 'John');
        assert.lengthOf(req.user.emails, 1);
        assert.equal(req.user.emails[0].value, 'username@example.com');
      },
    },
  },
  
  'strategy handling an authorized request with profile option and req argument to callback using arguments rather than arity': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
          profile: true,
          passReqToCallback: true
        },
        function() {
          // identifier, profile, done
          var req = arguments[0];
          var identifier = arguments[1];
          var profile = arguments[2];
          var done = arguments[3];
          
          done(null, { foo: req.foo, identifier: identifier, displayName: profile.displayName, name: profile.name, emails: profile.emails });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username',
          firstname: 'John',
          lastname: 'Doe',
          email: 'username@example.com'
        });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        req.foo = 'bar';
        strategy.success = function(user) {
          req.user = user;
          self.callback(null, req);
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call fail' : function(err, req) {
        assert.isNull(err);
      },
      'should authenticate' : function(err, req) {
        assert.equal(req.user.identifier, 'http://www.example.com/profiles/username');
      },
      'should have request details' : function(err, req) {
        assert.equal(req.user.foo, 'bar');
      },
      'should parse profile' : function(err, req) {
        assert.equal(req.user.displayName, 'John Doe');
        assert.equal(req.user.name.familyName, 'Doe');
        assert.equal(req.user.name.givenName, 'John');
        assert.lengthOf(req.user.emails, 1);
        assert.equal(req.user.emails[0].value, 'username@example.com');
      },
    },
  },
  
  'strategy handling an authorized request that encounters an error while verifying assertion': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(new Error('something went wrong'));
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.error = function(err) {
          self.callback(null, req);
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should call error' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },
  
  'strategy handling an authorized request that is not authenticated after verifying assertion': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: false });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.error = function(err) {
          self.callback(null, req);
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should call error' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },
  
  'strategy handling an authorized request that is not validated': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, false);
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username' });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(null, req);
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success' : function(err, req) {
        assert.isNull(err);
      },
      'should call fail' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },
  
  'strategy handling an authorized request that is not validated with addtional info': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, false, { message: 'Unwelcome.' });
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username' });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function(info) {
          self.callback(null, req, info);
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success' : function(err, req) {
        assert.isNull(err);
      },
      'should call fail' : function(err, req) {
        assert.isNotNull(req);
      },
      'should pass additional info' : function(err, req, info) {
        assert.equal(info.message, 'Unwelcome.');
      },
    },
  },
  
  'strategy handling an authorized request that encounters an error during validation': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(new Error('something went wrong'));
        }
      );
      
      // mock
      strategy._relyingParty.verifyAssertion = function(url, callback) {
        callback(null, { authenticated: true, claimedIdentifier: 'http://www.example.com/profiles/username' });
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.error = function(err) {
          self.callback(null, req);
        }
        
        req.query = {};
        req.query['openid.mode'] = 'id_res'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should call error' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },
  
  'strategy handling an authentication canceled request': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function(info) {
          self.callback(null, req, info);
        }
        
        req.query = {};
        req.query['openid.mode'] = 'cancel'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success' : function(err, req) {
        assert.isNull(err);
      },
      'should call fail' : function(err, req) {
        assert.isNotNull(req);
      },
      'should pass canceled message as additional info' : function(err, req, info) {
        assert.equal(info.message, 'OpenID authentication canceled');
      },
    },
  },
  
  'strategy handling a request to be redirected for authentication with identifier in body': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(null, 'http://provider.example.com/openid' + '#' + identifier);
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.redirect = function(url) {
          req.redirectURL = url;
          self.callback(null, req);
        }
        
        req.body = {};
        req.body['openid_identifier'] = 'http://www.example.me/'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should redirect to user OpenID provider URL' : function(err, req) {
        assert.equal(req.redirectURL, 'http://provider.example.com/openid#http://www.example.me/');
      },
    },
  },
  
  'strategy handling a request to be redirected for authentication with identifier in query': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(null, 'http://provider.example.com/openid' + '#' + identifier);
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.redirect = function(url) {
          req.redirectURL = url;
          self.callback(null, req);
        }
        
        req.query = {};
        req.query['openid_identifier'] = 'http://www.example.me/'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should redirect to user OpenID provider URL' : function(err, req) {
        assert.equal(req.redirectURL, 'http://provider.example.com/openid#http://www.example.me/');
      },
    },
  },
  
  'strategy handling a request to be redirected for authentication with identifier in body and identifierField option set': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          identifierField: 'identifier',
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(null, 'http://provider.example.com/openid' + '#' + identifier);
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.redirect = function(url) {
          req.redirectURL = url;
          self.callback(null, req);
        }
        
        req.body = {};
        req.body['identifier'] = 'http://www.example.me/'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should redirect to user OpenID provider URL' : function(err, req) {
        assert.equal(req.redirectURL, 'http://provider.example.com/openid#http://www.example.me/');
      },
    },
  },
  
  'strategy handling a request to be redirected for authentication with provider URL option set': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          providerURL: 'http://provider.example.net/openid',
          returnURL: 'https://www.example.com/auth/openid/return'
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(null, 'http://provider.example.com/openid' + '#' + identifier);
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.redirect = function(url) {
          req.redirectURL = url;
          self.callback(null, req);
        }
        
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should redirect to user OpenID provider URL' : function(err, req) {
        assert.equal(req.redirectURL, 'http://provider.example.com/openid#http://provider.example.net/openid');
      },
    },
  },
  
  'strategy handling a request to be redirected with an undefined identifier': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(null, 'http://provider.example.com/openid');
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function(info) {
          self.callback(null, req, info);
        }
        strategy.error = function(err) {
          self.callback(new Error('should not be called'));
        }
        
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or error' : function(err, req) {
        assert.isNull(err);
      },
      'should call fail' : function(err, req) {
        assert.isNotNull(req);
      },
      'should pass BadReqestError as additional info' : function(err, req, info) {
        assert.instanceOf(info, Error);
        assert.instanceOf(info, BadRequestError);
      },
    },
  },
  
  'strategy handling a request to be redirected that encouters an error during discovery': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(new Error('something went wrong'));
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.error = function(err) {
          self.callback(null, req);
        }
        
        req.body = {};
        req.body['openid_identifier'] = 'http://www.example.me/'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should call error' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },
  
  'strategy handling a request to be redirected that does not find a provider during discovery': {
    topic: function() {
      var strategy = new OpenIDStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        },
        function(identifier, done) {
          done(null, { identifier: identifier });
        }
      );
      
      // mock
      strategy._relyingParty.authenticate = function(identifier, immediate, callback) {
        callback(null, null);
      }
      
      return strategy;
    },
    
    'after augmenting with actions': {
      topic: function(strategy) {
        var self = this;
        var req = {};
        strategy.success = function(user) {
          self.callback(new Error('should not be called'));
        }
        strategy.fail = function() {
          self.callback(new Error('should not be called'));
        }
        strategy.error = function(err) {
          self.callback(null, req);
        }
        
        req.body = {};
        req.body['openid_identifier'] = 'http://www.example.me/'
        process.nextTick(function () {
          strategy.authenticate(req);
        });
      },
      
      'should not call success or fail' : function(err, req) {
        assert.isNull(err);
      },
      'should call error' : function(err, req) {
        assert.isNotNull(req);
      },
    },
  },
  
  'strategy constructed without a validate callback': {
    'should throw an error': function (strategy) {
      assert.throws(function() {
        new OAuthStrategy({
          returnURL: 'https://www.example.com/auth/openid/return',
        });
      });
    },
  },

}).export(module);
