<?php
// Trust CF-Connecting-IP only (Cloudflare edge proxy guarantees this header)
// Do NOT trust arbitrary X-Forwarded-For headers from untrusted clients
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_CF_CONNECTING_IP'];
}

// Safe Cloudflare HTTPS scheme detection
if (isset($_SERVER['HTTP_CF_VISITOR'])) {
    $visitor = json_decode($_SERVER['HTTP_CF_VISITOR'], true);
    if (isset($visitor['scheme']) && $visitor['scheme'] === 'https') {
        $_SERVER['HTTPS'] = 'on';
        $_SERVER['SERVER_PORT'] = '443';
    }
} elseif (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' && !empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    // Only trust X-Forwarded-Proto when verified to be behind Cloudflare
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = '443';
}

// Environment-variable support for DB configuration with fallback to existing credentials
$servername = getenv('DB_HOST') ?: 'localhost';
$username   = getenv('DB_USER') ?: 'pointgam_colochess';
$password   = getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'N4?5-E1#pP=Z';
$dbname     = getenv('DB_NAME') ?: 'pointgam_colochess';
$port       = getenv('DB_PORT') ? (int)getenv('DB_PORT') : 3306;

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname, $port);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Set utf8mb4 encoding
mysqli_set_charset($conn, "utf8mb4");
?>
