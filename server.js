var fs = require('fs')
var http = require('http')
var sqlite3 = require('sqlite3').verbose();
var db;
var passport = require('passport')
var util = require('util')
var FacebookStrategy = require('passport-facebook').Strategy
var config = require('./fb.js')
var express = require('express')
var session = require('express-session')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var config = require('./fb.js')
var app = express()

db = new sqlite3.Database('facemaze.db');
//db.run("CREATE TABLE RecordTimes(id int, milliseconds int, at VARCHAR(50))")

/*
db.run("INSERT INTO Users VALUES(12)")
db.all("SELECT * FROM Users", function(err, rows) {
        for (i = 0; i < rows.length; i++)
        	console.log(rows[i].id)
});
*/
//db.all("SELECT * FROM RecordTimes", function(err, rows) {
//        for (i = 0; i < rows.length; i++)
//        	console.log(rows[i])
//    })

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
passport.use(new FacebookStrategy({
    clientID: config.facebook_api_key,
    clientSecret:config.facebook_api_secret ,
    callbackURL: config.callback_url
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      //Check whether the User exists or not using profile.id
      //Further DB code.
      return done(null, profile);
    });
  }
));

app.set('views', './')
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'keyboard cat', key: 'sid'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('./'));

app.get('/generateMaze', function(req,res) {
	if (req.url == '/generateMaze') {
		console.log('/generateMaze')
		res.writeHead(200, {'content-type':'text/plain'})

		var execFile = require('child_process').spawn('java', ['PacmanMap']);
		var maze = ""
		execFile.on('exit', function(code) {
			fs.createReadStream('maze.txt').on('data', function(data) {
				maze += data.toString('utf-8')

			}).on('end', function(error) {
				res.end(maze)
			})
		})
	}
})

app.get('/storeTime', function(req,res) {
	console.log('/storeTime')
	console.log(req.url)
	var id = req.url.split("/")[1].split("?")[1].split('&')[0].split("=")[1]
	var time = req.url.split("/")[1].split("?")[1].split('&')[1].split("=")[1]
	var request = "INSERT INTO RecordTimes VALUES(\""+id+"\","+time+",\"" + Date.now() + "\")"
	console.log("request = " + request)
	db.run(request)

	res.send('OK')
})

app.get('/highScores', function(req, res) {
	console.log('/highScores')
	var id = req.url.split('/')[1].split('?')[1].split('=')[1]
	var request = "SELECT * FROM RecordTimes WHERE id = \"" + id + "\"";
	var result = ""
	console.log(request)
	db.all(request, function(err,rows) {
		if (rows == undefined || rows.length == 0) {
			res.send('No highscores or id not found')
			console.log(rows)
		} else {
			for (var i = 0; i < rows.length; i++) {
				result += ("" + (rows[i].milliseconds)/1000 + " seconds")
				result += "<br>"
			}
			res.send(result)
			console.log(result)
		}
	})
})

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
       successRedirect : '/game.html',
       failureRedirect: '/'
  }),
  function(req, res) {
    res.redirect('/');
  }
)
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

app.listen(8000)