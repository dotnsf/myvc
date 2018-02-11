# MyVC(Virtucal Coin)

## Overview

MyVC is one of virtual coin public implementations using Hyperledger Fabric and Hyperledger Composer.

MyVC supports simple CRUD API for User and Item, and Owner change API for Item also. This API would be run on port 3001(default).

## How to deploy business Network from API server.

- Prepare API server with Ubuntu 16.04.

- Login to that API Server(Ubuntu 16.04) with SSH or terminal

- (Once)Install Node.js(V6.x) and npm

    - `$ sudo apt-get install -y nodejs npm`

    - `$ sudo npm cache clean`

    - `$ sudo npm install n -g`

    - `$ sudo n list`

        - find latest 6.x.x version, for example 6.12.3

    - `$ sudo n 6.12.3`

    - `$ sudo apt-get purge nodejs npm`

- (Once)Install composer-cli

    - `$ npm install -g composer-cli`

- (Once)Prepare Hyperledger Fabric v1.

    - http://blog.idcf.jp/entry/hyperledger-fabric

- (Once)Create BNC(Business Network Card) for PeerAdmin@hlfv1

    - `$ cd ~/fabric/; ./createPeerAdminCard.sh`

    - `$ cp /tmp/PeerAdmin@hlfv1.card ./`

- (Once)Import Created Business Network Card for PeerAdmin@hlfv1

    - `$ composer card import --file PeerAdmin@hlfv1.card`

- (Once)Import BNC for admin@myvc-network

    - `$ cd **/myvc/api`

    - `$ composer card import --file admin@myvc-network.card`

- (Everytime after starting Hyperledger Fabric)Install myvc-network runtime

    - `$ composer runtime install --card PeerAdmin@hlfv1 --businessNetworkName myvc-network`

- (Everytime after starting Hyperledger Fabric)Start myvc-network with BNA

    - `$ composer network start --card PeerAdmin@hlfv1 --networkAdmin admin --networkAdminEnrollSecret adminpw --archiveFile myvc-network.bna --file PeerAdmin@hlfv1.card`

- (Everytime after starting Hyperledger Fabric)Ping to Business Network with admin@myvc-network(for confirmation)

    - `$ composer network ping --card admin@myvc-network`

## How to install/run Platform API( and API Document) in API Server

- Prepare API Server with Ubuntu 16.04

- Login to that API Server(Ubuntu 16.04) with SSH or terminal

- Install Node.js(V6.x) and npm

    - See above for detailed commands

- Prepare for folowing composer commands

    - `$ cd **/myvc/api`

- Install dependencies

    - `$ npm install`

- (Optional)Edit public/doc/swagger.yaml host value for Swagger API Document, if needed.

- (Optional)Edit setttings.js, if needed.

    - exports.cardName : Business Network Card name for Hyperledger Fabric access

    - exports.superSecret : Seed string for encryption

    - exports.basic_username : Username for Basic authentication

    - exports.basic_password : Password for Basic authentication

- Run app.js with Node.js

    - `$ node app`

## Set admin Password

- If this is your first time access after deployment of Business Network, you should set password for user "admin", who is privileaged user with role 0, as soon as possible:

    - `$ curl -XPOST -H 'Content-Type: application/json' 'http://xx.xx.xx.xx:3001/api/adminuser' -d '{"password":"(password for admin)"}'`

## Access to Swagger API Document

- Browse this URL:

    - http://xx.xx.xx.xx:3001/doc/

- Basic authentication:

    - See api/settings.js : exports.basic_username and exports.basic_password

## How to initialize Platform, and how to test.

1. Call **POST /api/adminuser** to create admin user

2. Call **POST /api/login** to login with admin user, and get token

3. Call **POST /api/user** to create non-admin user. You need to specify token from 2.

4. Call **GET /api/users** to view all users. You need to specify token from 2.

5. Call **POST /api/item** to create item. You need to specify token from 2.

6. Call **GET /api/items** to view all items. You need to specify token from 2.

7. Call **POST /api/login** to login with owner user of item, and get token

8. Call **POST /api/trade** to change owner of item. This API must be called from original owner with token from 7.

9. Call **POST /api/queryUsers** to search users with specified keyword and token.

10. Call **POST /api/queryItems** to search items with specified keyword and token.

## Licensing

This code is licensed under MIT.

https://github.com/dotnsf/myvc/blob/master/MIT-LICENSE.txt

## Copyright

2018 K.Kimura @ Juge.Me all rights reserved.
