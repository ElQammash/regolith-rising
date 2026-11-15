<?php
declare(strict_types=1);
require __DIR__ . '/db.php';

require_post();
rate_limit();
[$u, $p] = valid_credentials(body());

$pdo = db();
$q = $pdo->prepare('SELECT 1 FROM rr_users WHERE username = ?');
$q->execute([$u]);
if ($q->fetchColumn()) fail(409, 'That username is taken');

$pdo->prepare('INSERT INTO rr_users (username, pass_hash, created_at) VALUES (?, ?, ?)')->execute([$u, password_hash($p, PASSWORD_DEFAULT), time()]);
$id = (int)$pdo->lastInsertId();
echo json_encode(['token' => issue_token($id), 'username' => $u]);
