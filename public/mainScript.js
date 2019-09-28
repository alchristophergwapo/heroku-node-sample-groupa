$(function () {
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initiapze variables
  var $window = $(window);
  var $usernameInput = $('.nickName'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.container-2'); // The chatroom page
  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var $currentInput = $usernameInput.focus();
  var $activeUsers = $('.activeUsers');
  var socket = io();

  const addParticipantsMessage = (data) => {
    var message = '';
    if (data.numUsers === 1) {
      message += "There's 1 participant joined";
    } else {
      message += "There are " + data.numUsers + " participants joined";
    }
    log(message);
  }
  // Sets the cpent's username
  const setUsername = () => {
    username = $usernameInput.val().trim();

    // If the username is vapd
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();
      // Tell the server your username
      socket.emit('add user', username);




    }
  }

  // Sends a chat message
  const sendMessage = () => {
    var message = $inputMessage.val();
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  const log = (message) => {
    var $el = $('<p>').addClass('log').text(message);
    addMessageElement($el);
  }

  // Adds the visual chat message to the message pst
  const addChatMessage = (data) => {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    if (data.username == username) {
      var $messageDiv = $('<p class="message" style="background-color: antiquewhite; margin-left:50%"></p>')
        .addClass(typingClass)
        .append($messageBodyDiv);

      addMessageElement($messageDiv);
    } else {
      var $messageDiv = $('<p class="message" style="margin-right:50%"><i class="glyphicon glyphicon-user" style="margin-right: 5px"></i></p>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);

      addMessageElement($messageDiv);
    }

  }

  // Adds the visual chat typing message
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  const addMessageElement = (el) => {
    var $el = $(el);
    $messages.append($el);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Updates the typing event
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
    }
  }

  // Gets the 'X is typing' messages of a user
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  const getUsernameColor = (username) => {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(event => {
    // When the cpent hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

  // Click events
  $("#submit").click(function () {
    setUsername();
  })

  $("#send").click(function () {
    if (username) {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    }
  })
  // Focus input when clicking anywhere on login page
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  // Socket events
  socket.on('proceed', () => {
    proceed = true;
  })

  // Whenever the server emits 'login', log the login message
  socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);

  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  socket.on('usernames', (data) => {
    $activeUsers.empty();
    for (var i = 0; i < data.length; i++) {
      if (data[i] != username) {
        $activeUsers.append($('<h3 class="active_user"><i class="glyphicon glyphicon-user" style="margin-right: 5px"></i>' + data[i] + '</h3>'));
      }
    }

  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', (data) => {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  socket.on('user exist', (data) => {
    Swal.fire({
      type: 'error',
      title: 'Oops...',
      text: data,
    })
    proceed = false;
  })
  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', (data) => {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {
    log('You have been disconnected');
  });

  socket.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

});