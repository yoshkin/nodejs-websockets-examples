var amqp = require('amqp'),
    io = require('socket.io')(8001, {path: '/socket/'});
//development
var connection = amqp.createConnection({
    port: 5672,
    host: '10.0.0.36',
    login: 'rabbitmq',
    password: 'rabbitmq',
});

var CONNECTION = 'connection';
var DISCONNECT = 'disconnect';
var MESSAGE    = 'server-info';

var QUEUE    = 'my-queue';
var EXCHANGE = 'test';

connection.on('ready', function () {
    connection.exchange(EXCHANGE, options={type:'fanout'}, function(exchange) {
        io.sockets.on('connection', function(socket){
            console.log('A user connected', socket.id);

            socket.on('authentication', function(auth){
                console.log('Authentication',  auth);

                // var auth = JSON.parse(auth);
                var auth = auth;

                socket.emit('authentication', 'ok');

                connection.queue('user-' + auth.token, {closeChannelOnUnsubscribe: true, autoDelete: false}, function (queue) {
                    var ctag;
                    queue.bind(exchange, '');
                    queue.subscribe(function (message) {
                        console.log('-----------------');
                        console.log('Subscribed to queue', queue.name);
                        // console.log('Message: ', message);
                        var encoded_payload = unescape(message.data);
                        var payload = JSON.parse(encoded_payload);
                        console.log('Recieved a message:', payload);

                        console.log('source: ' + payload.source);
                        socket.emit(payload.source, payload);
                    }).addCallback(function(ok) { ctag = ok.consumerTag; });

                    socket.on('disconnect', function () {
                        console.log('User disconnected', socket.id);
                        queue.unsubscribe(ctag);
                        console.log('User unsubscribed', socket.id);
                    });

                    console.log('source: ' + auth.source);
                    socket.on(auth.token, function(msg){
                        console.log('Received message from client: ' + msg);
                        sendMessage(exchange, msg)
                    });
                });
            });
        });
        var sendMessage = function(exchange, payload) {
            console.log('Sending message to exchange...', exchange.name);
            var encoded_payload = JSON.stringify(payload);
            exchange.publish('', encoded_payload, {})
        };
    })
});