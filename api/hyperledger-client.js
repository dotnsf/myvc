//. hyperledger-client.js

//. Run following commands to create BNC(Business Network Card) for PeerAdmin
//. $ cd /fabric
//. $ ./createPeerAdminCard.sh

var settings = require( './settings' );

const NS = 'me.juge.myvc.network';
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;

const HyperledgerClient = function() {
  var vm = this;
  vm.businessNetworkConnection = null;
  vm.businessNetworkDefinition = null;

  vm.prepare = (resolved, rejected) => {
    if (vm.businessNetworkConnection != null && vm.businessNetworkDefinition != null) {
      resolved();
    } else {
      console.log('HyperLedgerClient.prepare(): create new business network connection');
      vm.businessNetworkConnection = new BusinessNetworkConnection();
      const cardName = settings.cardName;
      return vm.businessNetworkConnection.connect(cardName)
      .then(result => {
        vm.businessNetworkDefinition = result;
        resolved();
      }).catch(error => {
        console.log('HyperLedgerClient.prepare(): reject');
        rejected(error);
      });
    }
  };

  //. User
  vm.createUserTx = (user, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'CreateUserTx');
      transaction.id = user.id;
      transaction.password = user.password;
      transaction.name = user.name;
      transaction.email = ( user.email ? user.email : [] );
      transaction.role = user.role;

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        //resolved(result);
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.createUserTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.updateUserTx = (user, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'UpdateUserTx');
      transaction.id = user.id;
      transaction.password = user.password;
      transaction.name = user.name;
      transaction.email = user.email;
      transaction.role = user.role;

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        //resolved(result);
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.updateUserTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.deleteUserTx = (id, resolved, rejected) => {
    vm.prepare(() => {
      if( id == 'admin' ){
        rejected( 'Can not delete admin user.' );
      }else{
        let factory = vm.businessNetworkDefinition.getFactory();
        let transaction = factory.newTransaction(NS, 'DeleteUserTx');
        transaction.id = id;
        return vm.businessNetworkConnection.submitTransaction(transaction)
        .then(result => {
          resolved(result);
        }).catch(error => {
          console.log('HyperLedgerClient.deleteUserTx(): reject');
          rejected(error);
        });
      }
    }, rejected);
  };


  vm.createItemTx = (item, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'CreateItemTx');
      //console.log( transaction );
      transaction.id = item.id;
      transaction.name = item.name;
      transaction.body = item.body;
      transaction.amount = item.amount;
      //transaction.owner = item.owner; //. "resource:me.juge.myvc.network.User#" + owner.id;
      transaction.owner = factory.newRelationship( NS, 'User', item.owner.id );

      let serializer = vm.businessNetworkDefinition.getSerializer();
      let resource = serializer.fromJSON({
        '$class': NS + '.CreateItemTx',
        'id': item.id,
        'name': item.name,
        'body': item.body,
        'amount': item.amount,
        'owner': item.owner.id
      });

      //console.log( transaction );

      return vm.businessNetworkConnection.submitTransaction(transaction)
      //return vm.businessNetworkConnection.submitTransaction(resource)
      .then(result => {
        //resolved(result);
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.createItemTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.updateItemTx = (item, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'UpdateItemTx');
      //console.log( transaction );
      transaction.id = item.id;
      transaction.name = item.name;
      transaction.body = item.body;
      transaction.amount = item.amount;
      //transaction.owner = item.owner; //. "resource:me.juge.myvc.network.User#" + owner.id;
      transaction.owner = factory.newRelationship( NS, 'User', item.owner.id ); //. "resource:me.juge.myvc.network.User#" + owner.id;

      //console.log( transaction );

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        //resolved(result);
        var result0 = {transactionId: transaction.transactionId, timestamp: transaction.timestamp};
        resolved(result0);
      }).catch(error => {
        console.log('HyperLedgerClient.updateItemTx(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.deleteItemTx = (id, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'DeleteItemTx');
      transaction.id = id;
      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.deleteItemTx(): reject');
        rejected(error);
      });
    }, rejected);
  };


  vm.changeOwnerTx = (item, user, resolved, rejected) => {
    vm.prepare(() => {
      let factory = vm.businessNetworkDefinition.getFactory();
      let transaction = factory.newTransaction(NS, 'ChangeOwnerTx');

      //transaction.item = item; //. "resource:me.juge.myvc.network.Item#" + item.id;
      //transaction.user = user; //. "resource:me.juge.myvc.network.User#" + user.id;
      transaction.item = factory.newRelationship( NS, 'Item', item.id );
      transaction.user = factory.newRelationship( NS, 'User', user.id );

      return vm.businessNetworkConnection.submitTransaction(transaction)
      .then(result => {
        resolved(result);
      }).catch(error => {
        console.log('HyperLedgerClient.changeOwnerTx(): reject');
        rejected(error);
      });
    }, rejected);
  };


  vm.getUserForLogin = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.User')
      .then(registry => {
        return registry.resolve(id);
      }).then(user => {
        resolved(user);
      }).catch(error => {
        console.log('HyperLedgerClient.getUserForLogin(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getUser = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.User')
      .then(registry => {
        return registry.resolve(id);
      }).then(user => {
        delete user['password'];
        resolved(user);
      }).catch(error => {
        console.log('HyperLedgerClient.getUser(): reject');
        rejected(error);
      });
    }, rejected);
  };

  vm.getAllUsers = ( resolved, rejected ) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getParticipantRegistry(NS + '.User')
      .then(registry => {
        return registry.getAll();
      }).then(users0 => {
        var users = [];
        users0.forEach( function( element ){
          if( element.id && element.password && ( element.role || element.role === 0 ) ){
            delete element.password;
            users.push( element );
          }
        });
        resolved(users);
      }).catch(error => {
        console.log('HyperLedgerClient.getAllUsers(): reject');
        rejected(error);
      });
    }, rejected);
  };

  //. Not sophisticated enough yet ..
  vm.queryUsers = ( keyword, resolved, rejected ) => {
    vm.getAllUsers((users0) => {
      var users = [];
      users0.forEach( function( user0 ){
        if( user0.id.indexOf( keyword ) > -1 || user0.name.indexOf( keyword ) > -1 ){
          users.push( user0 );
        }else{
          var b = false;
          if( user0.email ){
            for( var i = 0; !b && i < user0.email.length; i ++ ){
              b = ( user0.email[i].indexOf( keyword ) > -1 );
            }
          }
          if( b ){
            users.push( user0 );
          }
        }
      });
      resolved(users);
    }, rejected);
  };


  vm.getItem = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getAssetRegistry(NS + '.Item')
      .then(registry => {
        return registry.resolve(id);
      }).then(message => {
        resolved(message);
      }).catch(error => {
        console.log('HyperLedgerClient.getItem(): reject');
        rejected(null);
      });
    }, rejected);
  };

  vm.getAllItems = (resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getAssetRegistry(NS + '.Item')
      .then(registry => {
        return registry.getAll();
      })
      .then(items => {
        resolved(items);
      }).catch(error => {
        console.log('HyperLedgerClient.getAllItems(): reject');
        rejected(error);
      });
    }, rejected);
  };

  //. Not sophisticated enough yet ..
  vm.queryItems = ( keyword, resolved, rejected ) => {
    vm.getAllItems((items0) => {
      var items = [];
      items0.forEach( function( item0 ){
        if( item0.id.indexOf( keyword ) > -1 || item0.name.indexOf( keyword ) > -1 || item0.body.indexOf( keyword ) > -1 ){
          items.push( item0 );
        }
      });
      resolved(items);
    }, rejected);
  };


  //. Transaction Registries
  vm.getTransactionRegistries = ( resolved, rejected ) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getAllTransactionRegistries()
      .then(registries => {
        resolved(registries);
      }).catch(error => {
        console.log('HyperLedgerClient.getTransactionRegistries(): reject');
        console.log( error );
        rejected(error);
      });
    }, rejected);
  };

  //. All Transactions
  vm.getAllTransactions = ( transactionRegistry, resolved, rejected ) => {
    vm.prepare(() => {
      return transactionRegistry.getAll()
      .then(transactions0 => {
        var transactions = [];
        transactions0.forEach( function( transaction0 ){
          transactions.push( { transactionId: transaction0.transactionId, timestamp: transaction0.timestamp /*, item: transaction0.item */, namespace: transaction0['$namespace'], type: transaction0['$type'] } );
        });
        resolved( transactions );
      }).catch(error => {
        console.log('HyperLedgerClient.getAllTransactions(): reject');
        console.log( error );
        rejected(error);
      });
    }, rejected);
  };

  //. Transaction detail
  vm.getTransaction = ( type, transactionId, resolved, rejected ) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getTransactionRegistry(NS + '.' + type)
      .then(registry => {
        return registry.get(transactionId);
      }).then(transaction => {
        var serializer = vm.businessNetworkDefinition.getSerializer();
        resolved( serializer.toJSON( transaction ) );
      }).catch(error => {
        console.log('HyperLedgerClient.getTransaction(): reject');
        console.log( error );
        rejected(error);
      });
    }, rejected);
  };
}

module.exports = HyperledgerClient;
