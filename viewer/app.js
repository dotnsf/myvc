//. app.js

var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    cfenv = require( 'cfenv' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    request = require( 'request' ),
    app = express();
var settings = require( './settings' );
//var appEnv = cfenv.getAppEnv();

var port = /*appEnv.port ||*/ 8000;

app.all( '/*', basicAuth( function( user, pass ){
  return ( user === settings.basic_username && pass === settings.basic_password );
}));

app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/public' );
app.set( 'view engine', 'ejs' );

app.get( '/', function( req, res ){
  res.render( 'index', {} );
});

app.get( '/transactions', function( req, res ){
  res.contentType( 'application/json' );
  var options1 = {
    url: settings.api_url + '/transactions',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  request( options1, ( err1, res1, body1 ) => {
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      res.write( JSON.stringify( body1, 2, null ) );
      res.end();
    }
  });
});

app.get( '/transaction', function( req, res ){
  res.contentType( 'application/json' );
  var transactionId = req.query.transactionId;
  var type = req.query.type;
  var options1 = {
    url: settings.api_url + '/transaction?transactionId=' + transactionId + '&type=' + type,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  request( options1, ( err1, res1, body1 ) => {
    if( err1 ){
      console.log( err1 );
      res.status( 403 );
      res.write( JSON.stringify( err1, 2, null ) );
      res.end();
    }else{
      //console.log( body1 );
      res.write( JSON.stringify( body1, 2, null ) );
      res.end();
    }
  });
});


app.listen( port );
console.log( "server starting on " + port + " ..." );
