<?php

use ElephantIO\Client;
use ElephantIO\Engine\SocketIO\Version2X;
require __DIR__ . '/../vendor/autoload.php';
$token = 'some-secret-token-in-hash256';
$consumer = 'user-10';
$type = 'private_message';
$client = new Client(new Version2X('http://websockets.localdev/socket/', [
    'headers' => [
        'X-My-Header: websocket rocks',
        'Authorization: Bearer ' . $token,
        'User: php-client',
        'Consumer: ' . $consumer,
        'Type: '. $type
    ]
]));

$data = [
    'message' => 'How are you? ' . $consumer,
//    'consumer' => $consumer,
    'type' => $type,
];
$client->initialize();
$client->emit($type, $data);
$client->close();