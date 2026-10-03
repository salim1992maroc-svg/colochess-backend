<?php
// Prevent Cloudflare Edge and browser caching on dynamic API responses
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once(__DIR__ . '/../includes/conn.php');

$request_method = $_SERVER["REQUEST_METHOD"];

function response($response) {
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
?>
