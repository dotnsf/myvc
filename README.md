# MyVC(Virtucal Coin)

## Overview

MyVC is one of virtual coin public implementations with Hyperledger Fabric and Hyperledger Composer.

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

- Run app.js with Node.js

    - `$ node app`

## Access to Swagger API Document

- Browse this URL:

    - http://servername:3001/doc/

## How to initialize Platform, and how to test.

1. Call ** POST /api/adminuser ** to create admin user

2. Call ** POST /api/login ** to login with admin user, and get token

3. Call ** POST /api/user ** to create non-admin user. You need to specify token from 2.

4. Call ** GET /api/users ** to view all users. You need to specify token from 2.

5. Call ** POST /api/item ** to create item. You need to specify token from 2.

6. Call ** GET /api/items ** to view all items. You need to specify token from 2.

7. Call ** POST /api/login ** to login with owner user of item, and get token

8. Call ** POST /api/trade ** to change owner of item. This API must be called with original owners token from 7.

9. Call ** POST /api/queryUsers ** to search users with specified keyword and token.

10. Call ** POST /api/queryItems ** to search items with specified keyword and token.

## Licenging

This code is licensed under MIT.

## Copyright

2018 K.Kimura @ Juge.Me all rights reserved.
