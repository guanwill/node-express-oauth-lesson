var User = require('../models/user');
var FacebookStrategy = require('passport-facebook').Strategy;
var GitHubStrategy = require('passport-github').Strategy;

module.exports = function(passport){

	passport.serializeUser(function(user, done){
		//console.log('serializing user: ', user);
		done(null, user._id);
	});

	passport.deserializeUser(function(id, done){
		User.findById(id, function(err, user){
		//	console.log('deserializing user: ', user);
			done(err, user);
		});
	});

	passport.use('github', new GitHubStrategy({
			clientID : '',
			clientSecret: '',
			callbackURL: 'http://localhost:3000/auth/github/callback',
	}, function(access_token, refresh_token, profile, done){
		console.log(profile);
			User.findOne({$or : [{'gh.email': profile._json.email}, {'fb.email' : profile._json.email}]}, function(err, user){
				if(err) return done(err);
				if(user){
					if(user.gh == {}){
						//The user has logged in with facebook before, but not GH
						user.gh.id = profile.id;
						user.gh.name = profile.displayName;
						user.gh.email = profile._json.email;
						user.gh.access_token = access_token;
						user.save(function(err){
							if(err) throw err;
							done(null, user);
						});
					}else {
						//The user has logged in with GH before
						done(null, user);
					}
				}else {
					user = new User();
					user.gh.id = profile.id;
					user.gh.name = profile.displayName;
					user.gh.email = profile._json.email;
					user.gh.access_token = access_token;
					user.save(function(err){
						if(err) throw err;
						done(null, user);
					});
				}
			});
		})
	);

	passport.use('facebook', new FacebookStrategy({
			clientID: process.env.FACEBOOK_API_KEY,
			clientSecret: process.env.FACEBOOK_API_SECRET,
			callbackURL: 'http://localhost:3000/auth/facebook/callback',
			enableProof: true,
			profileFields: ['name', 'email']
	}, function(access_token, refresh_token, profile, done){
		//this is the data sent back from facebook on successful auth.
			console.log(profile);

			process.nextTick(function(){
					User.findOne({'fb.id' : profile.id}, function(err, user){
						if(err) return done(err);
						if(user){
							return done(null, user);
						}else {
							var newUser = new User();
							newUser.fb.id = profile.id;
							newUser.fb.access_token = access_token;
							newUser.fb.firstName = profile.name.givenName;
							newUser.fb.lastName = profile.name.familyName;
							newUser.fb.email = profile.emails[0].value;
							
							newUser.save(function(err){
								if(err) throw err;
								return done(null, newUser);
							});
						}
					});	
			});
	}));
};
