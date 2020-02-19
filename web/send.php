<?php
$localsocket = 'tcp://websockets.localdev:1234';
$user = 'tester01';
$message = 'test3';
// connect to a local tcp-server
$instance = stream_socket_client($localsocket);
// send message
fwrite($instance, json_encode(['user' => $user, 'message' => $message])  . "\n");