var io      = require('socket.io')(8001, {
    path: '/socket/',
    handlePreflightRequest: (req, res) => {
        const headers = {
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-My-Header, User, Consumer, Type",
            "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
            "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
    }
});

var tokens = {};
var users = {};

io.use(function (socket, next) {
    var auth = socket.request.headers.authorization;
    var user = socket.request.headers.user;
    if (auth && user) {
        const token = auth.replace("Bearer ", "");
        console.log("auth token", token);
        console.log("user", user);
        // do some security check with token
        // ...
        // store token and bind with specific socket id
        if (!tokens[token] && !users[token]) {
            tokens[user] = token;
            users[user] = socket.id;
        }
        //тут можно проверять по базе, есть ли у таких юзерв такие токены и если нет, то отключать от сервера
        console.log('TOKENS: ', tokens);
        console.log('USERS: ', users);
        return next();
    } else {
        console.log("Disconnecting socket ", socket.id);
        socket.emit('auth', 'unauthorized');
        socket.disconnect('unauthorized');
        return next(new Error("no authorization header"));
    }
});

io.on('connection', function (socket){
    console.log('>>>>> SocketIO > Connected socket ' + socket.id);
    // console.log("X-My-Header", socket.handshake.headers['x-my-header']);
    var type = socket.request.headers.type;
    var consumer = socket.request.headers.consumer;
    socket.on(type, function (message) {
        console.log('ElephantIO ' + type +' > ' + JSON.stringify(message));
        if (!message['type']) {
            console.log('SocketIO ' + "Message type is missed.");
        }
        if (type !== message['type']) {
            console.log('SocketIO ' + "Message type is unknown.");
        }
        if (!users[consumer]) {
            console.log('SocketIO ' + "Consumer is not found");
        } else {
            console.log('SocketIO ' + type + ' > ' + 'I am fine, ' + users[consumer]);
            io.to(`${users[consumer]}`).emit(type, message);
        }
    });

    socket.on('disconnect', function () {
        console.log('>>>>> SocketIO > Disconnected socket ' + socket.id);
    });
});