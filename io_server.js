let config = require('./config.json');
var amqp = require('amqp'),
    io = require('socket.io')(8001, {path: '/socket/'});

let checkAuthToken = function(token) {
    //тут можем проверять токен, делая запрос на бекенд
    return (typeof token !== "undefined" && token) ? true : false;
};

io.sockets.on('connection', function(socket){
    console.log('A user connected', socket.id);
    socket.auth = false;
    socket.token = '';

    socket.on('authentication', function(data){
        if(checkAuthToken(data.token)) {
            console.log("Authenticated socket ", socket.id);
            socket.auth = true;
        }
        socket.token = data.token;
        if (!socket.auth) {
            console.log("Disconnecting socket ", socket.id);
            socket.emit('authentication', 'unauthorized');
            socket.disconnect('unauthorized');
        }

        socket.on('disconnect', function () {
            console.log('>>---------------');
            console.log('User disconnected', socket.id);
            console.log('---------------<<');
        });

        socket.on(socket.token, function(msg){
            console.log('>>---------------');
            console.log('Message for clientID: ' + socket.token);
            console.log('Received message from client: ' + msg);
            socket.broadcast.emit(socket.token, msg);
            console.log('---------------<<');
        });
    });
});