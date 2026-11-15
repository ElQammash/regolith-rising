<?php
declare(strict_types=1);
require __DIR__ . '/db.php';

require_post();
$t = bearer();
if ($t) db()->prepare('DELETE FROM rr_tokens WHERE token_hash = ?')->execute([hash('sha256', $t)]);
echo json_encode(['ok' => true]);
