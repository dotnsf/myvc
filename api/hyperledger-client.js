//. hyperledger-client.js

//. Run following commands to create BNC(Business Network Card) for PeerAdmin
//. $ cd /fabric
//. $ ./createPeerAdmin.sh

//. Run following command to deploy business network before running this app.js
//. $ composer network deploy -a ./bcdev-basickit-network.bna -A admin -S adminpw -c PeerAdmin@hlfv1 -f admincard
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
      transaction.owner = item.owner; //. "resource:me.juge.myvc.network.User#" + owner.id;

      //console.log( transaction );

      return vm.businessNetworkConnection.submitTransaction(transaction)
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
      transaction.owner = item.owner; //. "resource:me.juge.myvc.network.User#" + owner.id;

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
      transaction.item = item; //. "resource:me.juge.myvc.network.Item#" + item.id;
      transaction.user = user; //. "resource:me.juge.myvc.network.User#" + user.id;
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
      })
      .then(users0 => {
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


  vm.getItem = (id, resolved, rejected) => {
    vm.prepare(() => {
      return vm.businessNetworkConnection.getAssetRegistry(NS + '.Item')
      .then(registry => {
        return registry.resolve(id);
      }).then(message => {
        resolved(message);
      }).catch(error => {
        resolved(null);
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
}

module.exports = HyperledgerClient;
