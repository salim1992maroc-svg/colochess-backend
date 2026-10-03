<?php
include_once __DIR__ . "/includes/conn.php";

$user_id    = isset($_REQUEST['subId']) ? $_REQUEST['subId'] : (isset($_REQUEST['user_id']) ? $_REQUEST['user_id'] : (isset($_REQUEST['userId']) ? $_REQUEST['userId'] : null));
$trans_id   = isset($_REQUEST['trans_id']) ? $_REQUEST['trans_id'] : (isset($_REQUEST['transId']) ? $_REQUEST['transId'] : null);
$points     = isset($_REQUEST['amount']) ? $_REQUEST['amount'] : (isset($_REQUEST['payout']) ? $_REQUEST['payout'] : (isset($_REQUEST['points']) ? $_REQUEST['points'] : 0));
$status     = isset($_REQUEST['status']) ? (int)$_REQUEST['status'] : 1;
$offer_name = isset($_REQUEST['offer_name']) ? trim($_REQUEST['offer_name']) : 'Offerwall';

if (!$user_id || !$trans_id) {
    echo "0";
    exit;
}

$user_id  = (int)$user_id;
$points   = (int)$points;
$trans_id = trim((string)$trans_id);

if ($user_id <= 0 || empty($trans_id)) {
    echo "0";
    exit;
}

// If status is 2 (reversal / chargeback)
if ($status == 2) {
    if ($points < 0) {
        $points = abs($points);
    }
    // Check if reversal was already processed for this transaction
    $rev_trans_id = 'REV_' . $trans_id;
    $check_rev = $conn->prepare("SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1");
    $check_rev->bind_param("s", $rev_trans_id);
    $check_rev->execute();
    $check_rev->store_result();
    if ($check_rev->num_rows > 0) {
        $check_rev->close();
        echo "1";
        exit;
    }
    $check_rev->close();

    $conn->begin_transaction();
    try {
        $sql = $conn->prepare("UPDATE users SET points = GREATEST(0, points - ?) WHERE id = ?");
        $sql->bind_param("ii", $points, $user_id);
        $sql->execute();
        $sql->close();

        $neg_points = -$points;
        $sql_trans = $conn->prepare("INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, ?, ?, ?, NOW())");
        $sql_trans->bind_param("isis", $user_id, $offer_name, $neg_points, $rev_trans_id);
        $sql_trans->execute();
        $sql_trans->close();

        $conn->commit();
        echo "1";
    } catch (Exception $e) {
        $conn->rollback();
        echo "0";
    }
    exit;
}

// Normal conversion / credit (status != 2)
if ($points <= 0) {
    echo "0";
    exit;
}

// Duplicate protection: check if this transaction was already credited
$check = $conn->prepare("SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1");
$check->bind_param("s", $trans_id);
$check->execute();
$check->store_result();
if ($check->num_rows > 0) {
    $check->close();
    // Return success code "1" so network stops retrying, without double-crediting
    echo "1";
    exit;
}
$check->close();

$conn->begin_transaction();
try {
    $stmt_upd = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    $stmt_upd->bind_param("ii", $points, $user_id);
    $stmt_upd->execute();
    $stmt_upd->close();

    $stmt_ins = $conn->prepare("INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, ?, ?, ?, NOW())");
    $stmt_ins->bind_param("isis", $user_id, $offer_name, $points, $trans_id);
    $stmt_ins->execute();
    $stmt_ins->close();

    $conn->commit();
    echo "1";
} catch (Exception $e) {
    $conn->rollback();
    echo "0";
}
?>
