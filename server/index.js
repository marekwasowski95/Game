const express = require('express');
const WebSocket = require('ws');
const SocketServer = require('ws').Server;

const server = express().listen(1337);
const wss = new SocketServer({ server });

const rooms = {};

const createRoom = (client, payload) => {
  const id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  rooms[id] = {created: true, data: {}, clients: []};
  client.send(JSON.stringify({
    response: RESPONSES.room_created,
    payload: { id }
  }));
};

const getRoom = (id) => {
  return rooms[id] || false;
};

const joinRoom = (client, payload) => {
  const room = getRoom(payload.id);
  if (room) {
    room.clients.push(client);
    client.send(JSON.stringify({
      response: RESPONSES.room_joined
    }));
    client.send(JSON.stringify({
      response: RESPONSES.update_room,
      payload: room.data
    }));
  } else {
    client.send(JSON.stringify({
      response: RESPONSES.room_not_found
    }));
  }
};

const updateRoom = (client, payload) => {
  const room = getRoom(payload.id);
  if (room) {
    room.data = payload.data;
    room.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) {
        c.send(JSON.stringify({
          response: RESPONSES.update_room,
          payload: room.data
        }));
      }
    });
    // wss.clients.forEach(function each(c) {
    //   if (c !== client && c.readyState === WebSocket.OPEN) {
        
    //   }
    // });
  } else {
    client.send(JSON.stringify({
      response: RESPONSES.room_not_found
    }));
  }
};


const ACTIONS = {
  create_room: createRoom,
  join_room: joinRoom,
  update_room: updateRoom
};

const RESPONSES = {
  room_created: 'room_created',
  room_joined: 'room_joined',
  room_not_found: 'room_not_found',
  update_room: 'update_room'
};

wss.on('connection', (client) => {
  client.on('close', () => {});
  client.on('message', (message) => {
    const jsonMessage = JSON.parse(message);
    if (jsonMessage.method && ACTIONS[jsonMessage.method]) {
      ACTIONS[jsonMessage.method](client, jsonMessage.payload || {});
    }
  });
});