<?php
// GET  -> { save: <blob> | null }
// POST { save: <blob> } -> { ok: true }
declare(strict_types=1);
require __DIR__ . '/db.php';

$userId = current_user_id();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $q = $pdo->prepare('SELECT data FROM rr_saves WHERE user_id = ?');
    $q->execute([$userId]);
    $data = $q->fetchColumn();
    echo '{"save":' . ($data ?: 'null') . '}';
    exit;
}

require_post();
$b = body();
if (!isset($b['save']) || !is_array($b['save']) || ($b['save']['version'] ?? null) !== 1) fail(400, 'Invalid save');
$json = json_encode($b['save'], JSON_UNESCAPED_UNICODE);
if ($json === false || strlen($json) > MAX_SAVE_BYTES) fail(413, 'Save too large');

// Portable upsert (works on SQLite and MySQL)
$pdo->beginTransaction();
$pdo->prepare('DELETE FROM rr_saves WHERE user_id = ?')->execute([$userId]);
$pdo->prepare('INSERT INTO rr_saves (user_id, data, updated_at) VALUES (?, ?, ?)')->execute([$userId, $json, time()]);
$pdo->commit();
echo json_encode(['ok' => true]);
