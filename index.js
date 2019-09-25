// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;
var clients = {};
io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (username in clients) {
      socket.emit('user exist', username + ' username is taken. Try some other username!');
    } else {
      socket.emit('proceed');
      // we store the username in the socket session for this client
      socket.username = username;
      clients[socket.username] = socket;
      ++numUsers;
      addedUser = true;
      socket.emit('login', {
        numUsers: numUsers,
      });
      updateNicknames();

      // echo globally (all clients) that a person has connected
      socket.broadcast.emit('user joined', {
        username: socket.username,
        numUsers: numUsers,
      });
    }

    socket.on('private message', (data) => {
      if (clients[data.username]) {
        sockets.connected[clients[data.username].socket].emit('add private message', data);
      } else {
        Swal.fire({
          type: 'error',
          title: 'Ooops....',
          text: 'User does not exist!'
        })
      }
    });

  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });
  function updateNicknames() {
    io.sockets.emit('usernames', Object.keys(clients));//sending socket does not make sense
  }

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (!socket.username)//when the user has no nickname 
      return;
    delete clients[socket.username];
    updateNicknames();
    if (addedUser) {
      --numUsers;
      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});