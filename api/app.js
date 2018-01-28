//. app.js

//. Run following commands to create BNC(Business Network Card) for PeerAdmin
//. $ cd /fabric
//. $ ./createPeerAdmin.sh

//. Run following command to deploy business network before running this app.js
//. $ composer network deploy -a ./bcdev-basickit-network.bna -A admin -S adminpw -c PeerAdmin@hlfv1 -f admincard

var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    cfenv = require( 'cfenv' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    http = require( 'http' ),
    uuid = require( 'node-uuid' ),
    jwt = require( 'jsonwebtoken' ),
    app = express();
var settings = require( './settings' );
var appEnv = cfenv.getAppEnv();

const HyperledgerClient = require( './hyperledger-client' );
const client = new HyperledgerClient();

app.set( 'superSecret', settings.superSecret );

var port = 3001; /*appEnv.port || 3000*/;

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );

app.all( '/apidoc.html', basicAuth( function( user, pass ){
  return ( user === settings.basic_username && pass === settings.basic_password );
}));

app.use( express.static( __dirname + '/public' ) );

app.get( '/', function( req, res ){
  res.write( 'OK' );
  res.end();
});

var apiRoutes = express.Router();

apiRoutes.get( '/test', function( req, res ){
  res.contentType( 'application/json' );
  var id = req.query.id;
  client.getUserForLogin( id, user => {
    res.write( JSON.stringify( { status: true, message: user }, 2, null ) );
    res.end();
  }, error => {
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
    res.end();
  });
});

apiRoutes.post( '/login', function( req, res ){
  res.contentType( 'application/json' );
  var id = req.body.id;
  var password = req.body.password;
  client.getUserForLogin( id, user => {
    if( id && password && user.password == password ){
      var token = jwt.sign( user, app.get( 'superSecret' ), { expiresIn: '25h' } );
      //console.log( 'token=' + token);

      res.write( JSON.stringify( { status: true, token: token }, 2, null ) );
      res.end();
    }else{
      res.status( 401 );
      res.write( JSON.stringify( { status: false, message: 'Not valid id/password.' }, 2, null ) );
      res.end();
    }
  }, error => {
    console.log( 'getUser error: ' + JSON.stringify( error, 2, null ) );
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'Not valid id/password.' }, 2, null ) );
    res.end();
  });
});

apiRoutes.post( '/adminuser', function( req, res ){
  res.contentType( 'application/json' );
  var id = 'admin'; //req.body.id;
  var password = req.body.password;
  if( !password ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No password provided.' }, 2, null ) );
    res.end();
  }else{
    client.getUser( id, user => {
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: 'User ' + id + ' already existed.' }, 2, null ) );
      res.end();
    }, error => {
      var dt = new Date();
      var user = { id: id, password: password, name: 'admin', role: 0 };

      client.createUserTx( user, result => {
        res.write( JSON.stringify( { status: true }, 2, null ) );
        res.end();
      }, error => {
        console.log( error );
        res.status( 500 );
        res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
        res.end();
      });
    });
  }
});

//. ここより上で定義する API には認証フィルタをかけない
//. ここより下で定義する API には認証フィルタをかける

apiRoutes.use( function( req, res, next ){
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    return res.status( 403 ).send( { status: false, message: 'No token provided.' } );
  }

  jwt.verify( token, app.get( 'superSecret' ), function( err, decoded ){
    if( err ){
      return res.json( { status: false, message: 'Invalid token.' } );
    }

    req.decoded = decoded;
    next();
  });
});

apiRoutes.post( '/user', function( req, res ){
  res.contentType( 'application/json' );
  console.log( 'POST /user' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        var dt = new Date();

        var id = req.body.id;
        var password = req.body.password;
        var name = req.body.name;
        var role = req.body.role;

        client.getUser( id, user0 => {
          //. 更新
          var user1 = {
            id: id,
            password: ( password ? password : user0.password ),
            name: ( name ? name : user0.name ),
            role: ( role ? role : user0.role )
          };
          client.updateUserTx( user1, result => {
            console.log( 'result(1)=' + JSON.stringify( result, 2, null ) );
            res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
            res.end();
          }, error => {
            console.log( error );
            res.status( 500 );
            res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
            res.end();
          });
        }, error => {
          //. 新規作成
          if( id && password && name ){
            var user1 = {
              id: id,
              password: password,
              name: name,
              role: role
            };
            client.createUserTx( user1, result => {
              console.log( 'result(0)=' + JSON.stringify( result, 2, null ) );
              res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
              res.end();
            }, error => {
              res.status( 500 );
              res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
              res.end();
            });
          }else{
            //. 必須項目が足りない
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'Failed to create/update new user.' }, 2, null ) );
            res.end();
          }
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.get( '/users', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        client.getAllUsers( result => {
          var users = [];
          switch( user.role ){
          case 0: //. admin
            //. 全ユーザーが見える
            users = result;
            break;
          default:
            //. 自分しか見れない
            var result0 = [];
            result.forEach( user0 => {
              if( user0.id == user.id ){
                result0.push( user0 );
              }
            });
            users = result0;
            break;
          }

          res.write( JSON.stringify( users, 2, null ) );
          res.end();
        }, error => {
          res.status( 500 );
          res.write( JSON.stringify( error, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.get( '/user', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        var id = req.query.id;
        switch( user.role ){
        case 0: //. admin
          //. 全ユーザーが見える
          client.getUser( id, result => {
            res.write( JSON.stringify( result, 2, null ) );
            res.end();
          }, error => {
            res.status( 404 );
            res.write( JSON.stringify( error, 2, null ) );
            res.end();
          });
          break;
        default:
          //. 自分しか見れない
          if( id == user.id ){
            res.write( JSON.stringify( user, 2, null ) );
            res.end();
          }else{
            res.status( 403 );
            res.write( JSON.stringify( { status: false, message: 'Forbidden' }, 2, null ) );
            res.end();
          }
          break;
        }
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.delete( '/user', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        //console.log( 'DELETE /user : user.id = ' + user.id );

        var id = req.body.id;

        client.deleteUserTx( id, result => {
          res.write( JSON.stringify( { status: true }, 2, null ) );
          res.end();
        }, error => {
          res.status( 404 );
          res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.post( '/item', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        var id = ( req.body.id ? req.body.id : uuid.v1() );
        var user_id = user.id;
        var body = ( req.body.body ? req.body.body : '' );

        client.getItem( id, item0 => {
          //. 更新
          var item1 = {
            id: id,
            user_id: user_id,
            body: body
          };
          client.updateItemTx( item1, result => {
            console.log( 'result(1)=' + JSON.stringify( result, 2, null ) );
            res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
            res.end();
          }, error => {
            console.log( error );
            res.status( 500 );
            res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
            res.end();
          });
        }, error => {
          //. 新規作成
          if( id ){
            var item1 = {
              id: id,
              user_id: user_id,
              body: body
            };
            client.createItemTx( item1, result => {
              console.log( 'result(0)=' + JSON.stringify( result, 2, null ) );
              res.write( JSON.stringify( { status: true, result: result }, 2, null ) );
              res.end();
            }, error => {
              res.status( 500 );
              res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
              res.end();
            });
          }else{
            //. 必須項目が足りない
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: 'Failed to create/update new user.' }, 2, null ) );
            res.end();
          }
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.get( '/items', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        client.getAllItems( result => {
          var items = [];
          switch( user.role ){
          case 0: //. admin
            //. 全商品が見える
            items = result;
            break;
          default:
            //. 自分しか見れない
            var result0 = [];
            result.forEach( item0 => {
              if( item0.user_id == user.id ){
                result0.push( item0 );
              }
            });
            items = result0;
            break;
          }

          res.write( JSON.stringify( items, 2, null ) );
          res.end();
        }, error => {
          res.status( 500 );
          res.write( JSON.stringify( error, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }
    });
  }
});

apiRoutes.get( '/item', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        var id = req.query.id;
        client.getItem( id, result => {
          switch( user.role ){
          case 0: //. admin
            //. 全商品が見える
            res.write( JSON.stringify( result, 2, null ) );
            res.end();
            break;
          default:
            //. 自分しか見れない
            if( result.user_id[0] == user.id ){
              res.write( JSON.stringify( result, 2, null ) );
              res.end();
            }else{
              res.status( 403 );
              res.write( JSON.stringify( { status: false, message: 'Forbidden' }, 2, null ) );
              res.end();
            }
            break;
          }
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }
    }, error => {
      res.status( 500 );
      res.write( JSON.stringify( error, 2, null ) );
      res.end();
    });
  }
});

apiRoutes.delete( '/item', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id && user.role == 0 ){
        var id = req.body.id;

        client.deleteItemTx( id, result => {
          res.write( JSON.stringify( { status: true }, 2, null ) );
          res.end();
        }, error => {
          res.status( 404 );
          res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
          res.end();
        });
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});



apiRoutes.get( '/userinfo', function( req, res ){
  res.contentType( 'application/json' );
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコード
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Invalid token.' }, 2, null ) );
        res.end();
      }else if( user && user.id ){
        //. デコードして id が存在していれば成功とみなして、その user を返す
        res.write( JSON.stringify( { status: true, user: user }, 2, null ) );
        res.end();
      }else{
        res.status( 401 );
        res.write( JSON.stringify( { status: false, message: 'Valid token is missing.' }, 2, null ) );
        res.end();
      }
    });
  }
});


app.use( '/api', apiRoutes );

app.listen( port );
console.log( "server starting on " + port + " ..." );
