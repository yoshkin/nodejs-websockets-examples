var config  = require('./config.json'),
    amqp    = require('amqp'),
    io      = require('socket.io')(8001, {
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
var connection = amqp.createConnection({
    host: config.host,
    port: config.port,
    login: config.login,
    password: config.password});

connection.on('error', function(e) {
    console.log("Error from amqp: ", e);
});

var tokens = {};
var users = {};
var consumer = '';

io.use(function (socket, next) {
    var auth = socket.request.headers.authorization;
    var user = socket.request.headers.user;
    if (auth && user) {
        const token = auth.replace("Bearer ", "");
        // do some security check with token
        // ...
        // store token and bind with specific socket id
        if (!tokens[token] && !users[token]) {
            tokens[user] = token;
            users[user] = socket.id;
            consumer = socket.request.headers.consumer;
        }
        //тут можно проверять по базе, есть ли у таких юзерв такие токены и если нет, то отключать от сервера
        // console.log('TOKENS: ', tokens);
        // console.log('USERS: ', users);
        return next();
    } else {
        console.log("Disconnecting socket ", socket.id);
        socket.emit('auth', 'unauthorized');
        socket.disconnect('unauthorized');
        return next(new Error("no authorization header"));
    }
});

connection.on('ready', function () {
    connection.exchange("topic_exchange", options={type:'topic'}, function(exchange) {
        io.sockets.on('connection', function (socket){
            var user = socket.request.headers.user;
            var type = socket.request.headers.type;
            console.log(' --- USER JOINED ROOM: ', user);
            console.log('>>>>> SocketIO > Connected socket ' + socket.id);
            // console.log("X-My-Header", socket.handshake.headers['x-my-header']);

            connection.queue('yashenkov-' + user, {closeChannelOnUnsubscribe: true, autoDelete: false}, function (queue) {
                var ctag;
                queue.bind(exchange, user);
                queue.subscribe(function (message) {
                    // console.log('>>---------------');
                    // console.log('IN QUEUE USERS: ', users);
                    // console.log('IN QUEUE CONSUMER: ', consumer);
                    // console.log('IN QUEUE TYPE: ', type);
                    console.log('>>---------------');
                    console.log('Subscribed to queue', queue.name);
                    var encoded_payload = unescape(message.data);
                    var payload = JSON.parse(encoded_payload);
                    console.log('Recieved a message:', payload);
                    console.log(' --- SENDING TO USER ROOM: ', user);
                    // io.sockets.to(`${users[consumer]}`).emit(type, payload);
                    socket.emit(type, payload);
                    // socket.emit(type, payload);
                    console.log('---------------<<');
                }).addCallback(function(ok) { ctag = ok.consumerTag; });

                socket.on('disconnect', function () {
                    console.log('>>>>> SocketIO > Disconnected socket ' + socket.id);
                    queue.unsubscribe(ctag);
                    console.log('>>>>> User unsubscribed', socket.id);
                });

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
                        // io.to(`${users[consumer]}`).emit(type, message);
                        sendMessage(exchange, message, consumer);
                    }
                });
            });
        });
        var sendMessage = function(exchange, payload, consumer) {
            console.log('Sending message to exchange...', exchange.name);
            var encoded_payload = JSON.stringify(payload);
            exchange.publish(consumer, encoded_payload, {})
        };
    });
});
