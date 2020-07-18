const io = require('socket.io')();

const Rooms = new Map();

function socketToUser(socket) {
  return {
    id: socket.id,
    ipAddress: socket.handshake.address,
  };
}

io.on('connection', (client) => {
  client.on('enterRoom', (msg) => {
    if (client.roomName) {
      io.to(client.roomName).emit('leaveRoom', socketToUser(client));
    }
    client.leaveAll();

    const { roomName } = msg;
    client.roomName = roomName;

    if (roomName) {
      client.join(roomName, (err) => {
        if (!err) {
          console.log(`client "${client.id}" entered room "${roomName}"`);

          let users = Rooms.get(roomName);

          if (!users) {
            users = new Map([[client.id, client]]);
            Rooms.set(roomName, users);
          } else {
            users.set(client.id, client);
          }

          client.emit(
            'users',
            Array.from(Rooms.get(roomName).values()).map(socketToUser)
          );

          io.to(roomName).emit('enterRoom', socketToUser(client));
        }
      });
    }
  });

  client.on('notifyRoom', function (msg) {
    console.log('notifyRoom', msg);
    var keys = Object.keys(client.rooms);
    for (var i = 0; i < keys.length; i++) {
      io.to(client.rooms[keys[i]]).emit('notifyRoom', msg);
    }
  });

  client.on('disconnecting', () => {
    if (client.roomName) {
      Rooms.get(client.roomName).delete(client.roomName);
      io.to(client.roomName).emit('leaveRoom', socketToUser(client));
    }
  });

  client.on('disconnect', () => {
    console.log(`client "${client.id}" disconnected`);
  });
});

io.listen(80);
