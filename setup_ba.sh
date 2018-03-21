#!/bin/bash

composer runtime install --card PeerAdmin@hlfv1 --businessNetworkName myvc-network

composer network start --card PeerAdmin@hlfv1 --networkAdmin admin --networkAdminEnrollSecret adminpw --archiveFile ./api/myvc-network.bna --file ~/PeerAdmin@hlfv1.card

composer network ping --card admin@myvc-network


