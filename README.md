# OreCoin

## Overview

Ore(my) Coin is one of virtual coin public implementations with Hyperledger Fabric and Hyperledger Composer.

OreCoin supports simple CRUD API for User and Item, and Owner change API for Item also.

## How to deploy business Network from API server.

- Prepare API server with Ubuntu 16.04.

- Login to that API Server(Ubuntu 16.04) with SSH or terminal

- Install Node.js(V6.x) and npm

    - `$ sudo apt-get install -y nodejs npm`

    - `$ sudo npm cache clean`

    - `$ sudo npm install n -g`

    - `$ sudo n list`

        - find latest 6.x.x version, for example 6.12.3

    - `$ sudo n 6.13.3`

    - `$ sudo apt-get purge nodejs npm`

- Install composer-cli

    - `$ npm install -g composer-cli`

- Prepare Hyperledger Fabric v1.

    - http://blog.idcf.jp/entry/hyperledger-fabric

- Create BNC(Business Network Card) for PeerAdmin@hlfv1

    - `$ cd ~/fabric/; ./createPeerAdminCard.sh`

    - `$ cp /tmp/PeerAdmin@hlfv1.card ./`

- Import Business Network Card for PeerAdmin@hlfv1

    - `$ composer card import --file PeerAdmin@hlfv1.card`

- Install myvc-network runtime

    - `$ composer runtime install --card PeerAdmin@hlfv1 --businessNetworkName myvc-network`

- Start myvc-network with BNA

    - `$ composer network start --card PeerAdmin@hlfv1 --networkAdmin admin --networkAdminEnrollSecret adminpw --archiveFile myvc-network.bna --file PeerAdmin@hlfv1.card`

- Create new BNC for admin@myvc-network, and import it

    - `$ composer card create`

    - `$ composer card import --file admin@myvc-network.card`

- Ping to Business Network with admin@myvc-network(for confirmation)

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

- Run app.js with Node.js

    - `$ node app`

## Access to Swagger API Document

- Browse this URL:

    - http://servername:3001/doc/

## Licenging

This code is licensed under MIT.

## Copyright

2018 K.Kimura @ Juge.Me all rights reserved.
