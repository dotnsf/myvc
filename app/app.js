//. app.js

var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    cfenv = require( 'cfenv' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    i18n = require( 'i18n' ),
    jwt = require( 'jsonwebtoken' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    app = express();
var settings = require( './settings' );
//var appEnv = cfenv.getAppEnv();

var port = /*appEnv.port ||*/ 3000;

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );

app.set( 'superSecret', settings.superSecret );
app.use( session({
  secret: settings.superSecret,
  resave: false,
  saveUnitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,  //. https で使う場合は true
    maxage: 1000 * 60 * 60   //.  60min
  }
}) );


app.all( '/*', basicAuth( function( user, pass ){
  return ( user === settings.basic_username && pass === settings.basic_password );
}));

app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/public' );
app.set( 'view engine', 'ejs' );

/* i18n */
i18n.configure({
  locales: ['en'],
  directory: __dirname + '/locales'
});
app.use( i18n.init );

app.get( '/', function( req, res ){
  if( req.session && req.session.token ){
    //. トークンをデコード
    var token = req.session.token;
    jwt.verify( token, app.get('superSecret'), function( err, user ){
      if( err ){
        res.redirect( '/login?message=Invalid token.' );
      }else if( user && user.id ){
        res.render( 'index', { user: user } );
      }else{
        res.redirect( '/login?message=Invalid token.' );
      }
    });
  }else{
    res.redirect( '/login' );
  }
});

app.get( '/test', function( req, res ){
  if( req.session && req.session.token ){
    //. トークンをデコード
    var token = req.session.token;
    jwt.verify( token, app.get('superSecret'), function( err, user ){
      if( err ){
        res.redirect( '/login?message=Invalid token.' );
      }else if( user && user.id ){
        res.render( 'test', { user: user } );
      }else{
        res.redirect( '/login?message=Invalid token.' );
      }
    });
  }else{
    res.redirect( '/login' );
  }
});

app.get( '/login', function( req, res ){
  var message = ( req.query.message ? req.query.message : '' );
  res.render( 'login', { message: message } );
});

app.post( '/login', function( req, res ){
  var id = req.body.id;
  var password = req.body.password;
  //console.log( 'id=' + id + ',password=' + password);

  var options1 = {
    url: settings.api_url + '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    json: {
      id: id,
      password: password,
    }
  };
  request( options1, ( err1, res1, body1 ) => {
    if( err1 ){
      console.log( err1 );
      res.redirect( '/login?message=' + err1.message );
    }else{
      //console.log( body1 );
      if( body1.status && body1.token ){
        req.session.token = body1.token;
        res.redirect( '/' );
      }else{
        res.redirect( '/login?message=' + body1.message );
      }
    }
  });
});

app.post( '/logout', function( req, res ){
  req.session.token = null;
  res.redirect( '/' );
});


app.get( '/users', function( req, res ){
  var token = req.session.token; //req.body.token;
  var limit = ( req.query.limit ? req.query.limit : 0 );
  var skip = ( req.query.skip ? req.query.skip : 0 );

  var json1 = { token: token };
  if( limit ){ json1['limit'] = limit; }
  if( skip ){ json1['skip'] = skip; }
  var options1 = {
    url: settings.api_url + '/users',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, users1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( users1 );
      res.write( JSON.stringify( users1, 2, null ) );
      res.end();
    }
  });
});

app.post( '/user', function( req, res ){
  var token = req.session.token; //req.body.token;

  var json1 = { token: token };
  if( req.body.id ){ json1['id'] = req.body.id; }
  if( req.body.password ){ json1['password'] = req.body.password; }
  if( req.body.name ){ json1['name'] = req.body.name; }
  if( req.body.email ){ json1['email'] = req.body.email.split(','); }
  if( req.body.role ){ json1['role'] = parseInt( req.body.role ); } //. parseInt() 必須
  var options1 = {
    url: settings.api_url + '/user',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, user1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( user1 );
      res.write( JSON.stringify( user1, 2, null ) );
      res.end();
    }
  });
});

app.delete( '/user', function( req, res ){
  var token = req.session.token; //req.body.token;

  var json1 = { token: token };
  if( req.body.id ){ json1['id'] = req.body.id; }
  var options1 = {
    url: settings.api_url + '/user',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, user1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( user1 );
      res.write( JSON.stringify( user1, 2, null ) );
      res.end();
    }
  });
});


app.get( '/items', function( req, res ){
  var token = req.session.token; //req.body.token;
  var limit = ( req.query.limit ? req.query.limit : 0 );
  var skip = ( req.query.skip ? req.query.skip : 0 );

  var json1 = { token: token };
  if( limit ){ json1['limit'] = limit; }
  if( skip ){ json1['skip'] = skip; }
  var options1 = {
    url: settings.api_url + '/items',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, items1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( items1 );
      res.write( JSON.stringify( items1, 2, null ) );
      res.end();
    }
  });
});

app.post( '/item', function( req, res ){
  var token = req.session.token; //req.body.token;

  var json1 = { token: token };
  if( req.body.id ){ json1['id'] = req.body.id; }
  if( req.body.name ){ json1['name'] = req.body.name; }
  if( req.body.body ){ json1['body'] = req.body.body; }
  if( req.body.amount ){ json1['amount'] = parseInt( req.body.amount ); } //. parseInt() 必須
  //if( req.body.owner_id ){ json1['owner_id'] = req.body.owner_id; }
  var options1 = {
    url: settings.api_url + '/item',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, item1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( item1 );
      res.write( JSON.stringify( item1, 2, null ) );
      res.end();
    }
  });
});

app.delete( '/item', function( req, res ){
  var token = req.session.token; //req.body.token;

  var json1 = { token: token };
  if( req.body.id ){ json1['id'] = req.body.id; }
  var options1 = {
    url: settings.api_url + '/item',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, item1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( item1 );
      res.write( JSON.stringify( item1, 2, null ) );
      res.end();
    }
  });
});

app.post( '/trade', function( req, res ){
  var token = req.session.token; //req.body.token;

  var json1 = { token: token };
  if( req.body.item_id ){ json1['item_id'] = req.body.item_id; }
  if( req.body.user_id ){ json1['user_id'] = req.body.user_id; }
console.log( json1 );
  var options1 = {
    url: settings.api_url + '/trade',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    json: json1
  };
  request( options1, ( err1, res1, item1 ) => {
    res.contentType( 'application/json' );
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( item1 );
      res.write( JSON.stringify( item1, 2, null ) );
      res.end();
    }
  });
});



app.listen( port );
console.log( "server starting on " + port + " ..." );
