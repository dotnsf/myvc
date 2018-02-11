//. app.js

//. Run following commands to create BNC(Business Network Card) for PeerAdmin
//. $ cd /fabric
//. $ ./createPeerAdmin.sh

//. Run following command to deploy business network before running this app.js
//. $ composer network deploy -a ./myvc-network.bna -A admin -S adminpw -c PeerAdmin@hlfv1 -f admincard

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

app.all( '/doc/*', basicAuth( function( user, pass ){
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

  /* get User information from id */
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


/* Secret API */
apiRoutes.get( '/transactions', function( req, res ){
  res.contentType( 'application/json' );
  client.getTransactionRegistries( registries => {
    var messages = [];
    var idx = 0;
    for( var i = 0; i < registries.length; i ++ ){
      var registry = registries[i];
      client.getAllTransactions( registry, transactions => {
        transactions.forEach( transaction => {
          messages.push( transaction );
        });

        idx ++;
        if( idx >= registries.length ){
          //. sort by timestamp
          messages.sort( compare );
          res.write( JSON.stringify( { status: true, transactions: messages }, 2, null ) );
          res.end();
        }
      }, error => {
        idx ++;
        if( idx >= registries.length ){
          //. sort by timestamp
          messages.sort( compare );
          res.write( JSON.stringify( { status: true, transactions: messages }, 2, null ) );
          res.end();
        }
      });
    }
  }, error => {
    res.status( 401 );
    res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
    res.end();
  });
});

apiRoutes.get( '/transaction', function( req, res ){
  res.contentType( 'application/json' );
  var type = req.query.type;
  var transactionId = req.query.transactionId;
  client.getTransaction( type, transactionId, transaction => {
    res.write( JSON.stringify( { status: true, transaction: transaction }, 2, null ) );
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

      //. user.loggedin を更新する
      user.loggedin = new Date();
      client.updateUserTx( user, success => {
        res.write( JSON.stringify( { status: true, token: token }, 2, null ) );
        res.end();
      }, error => {
        console.log( error );
        res.write( JSON.stringify( { status: true, token: token }, 2, null ) );
        res.end();
      });
    }else{
      res.status( 401 );
      res.write( JSON.stringify( { status: false, message: 'Not valid id/password.' }, 2, null ) );
      res.end();
    }
  }, error => {
    console.log( 'getUserForLogin error: ' + JSON.stringify( error, 2, null ) );
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
  //console.log( 'POST /user' );
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
        var email = ( req.body.email ? req.body.email : [] );
        var role = req.body.role;

        client.getUser( id, user0 => {
          //. 更新
          var user1 = {
            id: id,
            password: ( password ? password : user0.password ),
            name: ( name ? name : user0.name ),
            email: ( email ? email : user0.email ),
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
              email: email,
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
            var result0 = [];
            result.forEach( user0 => {
              result0.push( { id: user0.id, name: user0.name, email: user0.email, role: user0.role, created: user0.created, loggedin: user0.loggedin } );
            });
            users = result0;
            break;
          default:
            //. 自分しか見れない
            var result0 = [];
            result.forEach( user0 => {
              if( user0.id == user.id ){
                result0.push( { id: user0.id, name: user0.name, email: user0.email, role: user0.role, created: user0.created, loggedin: user0.loggedin } );
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

apiRoutes.post( '/queryUsers', function( req, res ){
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
        var keyword = req.body.keyword;
        client.queryUsers( keyword, result => {
          var users = [];
          switch( user.role ){
          case 0: //. admin
            //. 全ユーザーが見える
            var result0 = [];
            result.forEach( user0 => {
              result0.push( { id: user0.id, name: user0.name, email: user0.email, role: user0.role, created: user0.created, loggedin: user0.loggedin } );
            });
            users = result0;
            break;
          default:
            //. 自分しか見れない
            var result0 = [];
            result.forEach( user0 => {
              if( user0.id == user.id ){
                result0.push( { id: user0.id, name: user0.name, email: user0.email, role: user0.role, created: user0.created, loggedin: user0.loggedin } );
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
        var name = ( req.body.name ? req.body.name : '' );
        var body = ( req.body.body ? req.body.body : '' );
        var amount = ( req.body.amount ? ( typeof( req.body.amount ) == 'number' ? req.body.amount : parseInt( req.body.amount ) ) : 1 );
        var owner = user;

        client.getItem( id, item0 => {
          //. 更新
          var item1 = {
            id: id,
            name: name,
            body: body,
            amount: amount,
            owner: owner
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
              name: name,
              body: body,
              amount: amount,
              owner: owner
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
            var result0 = [];
            result.forEach( item0 => {
              result0.push( { id: item0.id, name: item0.name, body: item0.body, amount: item0.amount, owner: item0.owner.toString(), modified: item0.modified } );
            });
            items = result0;
            break;
          default:
            //. 自分のアイテムしか見れない
            var result0 = [];
            result.forEach( item0 => {
              if( item0.owner.toString().endsWith( '#' + user.id + '}' ) ){
                result0.push( { id: item0.id, name: item0.name, body: item0.body, amount: item0.amount, owner: item0.owner.toString(), modified: item0.modified } );
              }
            });
            items = result0;
            break;
          }

          //console.log( items );
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

apiRoutes.post( '/queryItems', function( req, res ){
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
        var keyword = req.body.keyword;
        client.queryItems( keyword, result => {
          var items = [];
          switch( user.role ){
          case 0: //. admin
            //. 全商品が見える
            var result0 = [];
            result.forEach( item0 => {
              result0.push( { id: item0.id, name: item0.name, body: item0.body, amount: item0.amount, owner: item0.owner.toString() } );
            });
            items = result0;
            break;
          default:
            //. 自分のアイテムしか見れない
            var result0 = [];
            result.forEach( item0 => {
              if( item0.owner.id == user.id ){
                result0.push( { id: item0.id, name: item0.name, body: item0.body, amount: item0.amount, owner: item0.owner.toString() } );
              }
            });
            items = result0;
            break;
          }

          //console.log( items );
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
            if( result.owner.id == user.id ){
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

apiRoutes.post( '/trade', function( req, res ){
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
        var item_id = req.body.item_id;
        if( !item_id ){
          res.status( 404 );
          res.write( JSON.stringify( { status: false, message: 'No item_id provided' }, 2, null ) );
          res.end();
        }else{
          client.getItem( item_id, item => {
            if( item && item.owner ){
              if( item.owner.id == user.id ){
                var user_id = req.body.user_id;
                client.getUser( user_id, new_owner => {
                  client.changeOwnerTx( item, new_owner, result => {
                    res.write( JSON.stringify( { status: true }, 2, null ) );
                    res.end();
                  }, error => {
                    res.status( 404 );
                    res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
                    res.end();
                  });
                }, error => {
console.log( error );
                  res.status( 404 );
                  res.write( JSON.stringify( { status: false, message: error }, 2, null ) );
                  res.end();
                });
              }else{
                res.status( 404 );
                res.write( JSON.stringify( { status: false, message: 'Invalid item_id.' }, 2, null ) );
                res.end();
              }
            }else{
              res.status( 401 );
              res.write( JSON.stringify( { status: false, message: 'Invalid item_id.' }, 2, null ) );
              res.end();
            }
          }, error => {
            res.status( 404 );
            res.write( JSON.stringify( { status: false, message: 'No item found with id = ' + item_id + '.' }, 2, null ) );
            res.end();
          });
        }


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


//. compare transaction by timestamp
function compare( a, b ){
  const tA = a.timestamp.getTime();
  const tB = b.timestamp.getTime();

  var comparison = 0;
  if( tA > tB ){
    comparison = 1;
  }else if( tA < tB ){
    comparison = -1;
  }

  return comparison;
}

