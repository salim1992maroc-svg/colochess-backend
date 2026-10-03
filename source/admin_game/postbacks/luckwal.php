<?php
require_once __DIR__ . "/../includes/conn.php";

$params   = array_merge($_GET, $_POST);
$user_id  = isset($params['user_id']) ? $params['user_id'] : (isset($params['subId']) ? $params['subId'] : (isset($params['userId']) ? $params['userId'] : null));
$amount   = isset($params['amount']) ? $params['amount'] : (isset($params['points']) ? $params['points'] : 0);
$trans_id = isset($params['trans_id']) ? $params['trans_id'] : (isset($params['transId']) ? $params['transId'] : null);

$user_id  = (int)$user_id;
$amount   = (int)$amount;
$trans_id = trim((string)$trans_id);

if ($user_id <= 0 || empty($trans_id) || $amount <= 0) {
    echo "0";
    exit;
}

// Duplicate transaction protection
$check = $conn->prepare("SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1");
$check->bind_param("s", $trans_id);
$check->execute();
$check->store_result();
if ($check->num_rows > 0) {
    $check->close();
    // Return success code "1" without crediting again
    echo "1";
    exit;
}
$check->close();

$conn->begin_transaction();
try {
    $stmt1 = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    $stmt1->bind_param("ii", $amount, $user_id);
    $stmt1->execute();
    $stmt1->close();

    $stmt2 = $conn->prepare("INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, 'Luckywall', ?, ?, NOW())");
    $stmt2->bind_param("iiss", $user_id, $amount, $trans_id);
    $stmt2->execute();
    $stmt2->close();

    $conn->commit();
    echo "1";
} catch (Exception $e) {
    $conn->rollback();
    echo "0";
}
?>
