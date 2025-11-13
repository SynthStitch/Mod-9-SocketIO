const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);
const users = {};

const sendOnlineUsers = () => {
    io.emit('online users', Object.values(users));
};

const getDefaultName = (id) => `User-${id.slice(-4)}`;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    const defaultName = getDefaultName(socket.id);
    users[socket.id] = defaultName;

    io.emit('chat notice', `${defaultName} joined the chat.`);
    socket.emit('nickname set', defaultName);
    sendOnlineUsers();

    socket.on('set nickname', (nickname) => {
        const name = typeof nickname === 'string' ? nickname.trim() : '';
        if (!name) {
            socket.emit('nickname set', users[socket.id]);
            return;
        }

        const previousName = users[socket.id];
        users[socket.id] = name;
        socket.emit('nickname set', name);
        sendOnlineUsers();

        if (previousName !== name) {
            io.emit('chat notice', `${previousName} is now known as ${name}.`);
        }
    });

    socket.on('chat message', (message) => {
        const text = typeof message === 'string' ? message.trim() : '';
        if (!text) {
            return;
        }

        const payload = {
            from: users[socket.id] || getDefaultName(socket.id),
            text,
        };

        socket.broadcast.emit('chat message', payload);
    });

    socket.on('typing', (isTyping) => {
        socket.broadcast.emit('typing', {
            from: users[socket.id] || getDefaultName(socket.id),
            isTyping: !!isTyping,
        });
    });

    socket.on('disconnect', () => {
        const name = users[socket.id] || getDefaultName(socket.id);
        delete users[socket.id];

        socket.broadcast.emit('typing', {
            from: name,
            isTyping: false,
        });
        io.emit('chat notice', `${name} left the chat.`);
        sendOnlineUsers();
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
