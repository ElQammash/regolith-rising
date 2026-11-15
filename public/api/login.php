<?php
declare(strict_types=1);
require __DIR__ . '/db.php';

require_post();
rate_limit();
[$u, $p] = valid_credentials(body());

$q = db()->prepare('SELECT id, username, pass_hash FROM rr_users WHERE username = ?');
$q->execute([$u]);
$row = $q->fetch();
if (!$row || !password_verify($p, $row['pass_hash'])) fail(401, 'Wrong username or password');

if (password_needs_rehash($row['pass_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE rr_users SET pass_hash = ? WHERE id = ?')->execute([password_hash($p, PASSWORD_DEFAULT), $row['id']]);
}
echo json_encode(['token' => issue_token((int)$row['id']), 'username' => $row['username']]);
