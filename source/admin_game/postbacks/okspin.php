<?php
require_once __DIR__ . '/../includes/conn.php';

header('Content-Type: application/json; charset=utf-8');

// Normalize GET and POST input parameters
$params = array_merge($_GET, $_POST);

// OkSpin sends user ID as 'userId'; also support 'user_id' and 'subId' for compatibility
$user_id = null;
if (!empty($params['userId'])) {
    $user_id = $params['userId'];
} elseif (!empty($params['user_id'])) {
    $user_id = $params['user_id'];
} elseif (!empty($params['subId'])) {
    $user_id = $params['subId'];
}

// Transaction ID normalization (OkSpin standard is 'transId'; fallback to 'trans_id')
$trans_id = null;
if (!empty($params['transId'])) {
    $trans_id = $params['transId'];
} elseif (!empty($params['trans_id'])) {
    $trans_id = $params['trans_id'];
}

// Points/Reward normalization (OkSpin sends 'points'; fallback to 'amount')
$points = 0;
if (isset($params['points'])) {
    $points = $params['points'];
} elseif (isset($params['amount'])) {
    $points = $params['amount'];
}

// OkSpin signature parameter
$sign = isset($params['sign']) ? trim($params['sign']) : '';

// Validation of required inputs
$user_id  = (int)$user_id;
$points   = (int)$points;
$trans_id = trim((string)$trans_id);

if ($user_id <= 0 || empty($trans_id) || $points <= 0) {
    echo json_encode(["code" => 1, "message" => "Invalid parameters"]);
    exit;
}

// Signature verification note:
// If OkSpin App Secret is provided via environment/config in the future,
// signature validation should be enforced here. Currently kept functional.

// 1. Duplicate transaction protection: check if trans_id was already processed
$check = $conn->prepare("SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1");
$check->bind_param("s", $trans_id);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    $check->close();
    // Return success code 0 to OkSpin so it stops retrying, without double-crediting
    echo json_encode(["code" => 0, "message" => "success"]);
    exit;
}
$check->close();

// 2. Atomic transaction to insert record and update user points
$conn->begin_transaction();

try {
    $stmt1 = $conn->prepare("INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, 'Okspin', ?, ?, NOW())");
    $stmt1->bind_param("iiss", $user_id, $points, $trans_id);
    $stmt1->execute();
    $stmt1->close();

    $stmt2 = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    $stmt2->bind_param("ii", $points, $user_id);
    $stmt2->execute();
    $stmt2->close();

    $conn->commit();
    echo json_encode(["code" => 0, "message" => "success"]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["code" => 1, "message" => "Failed to process transaction"]);
}
?>
