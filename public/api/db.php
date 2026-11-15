<?php
// Shared helpers for the Regolith Rising cloud-save API.
// Storage: SQLite by default (zero setup: a file in api/data/, blocked from the web),
// or MySQL if config.local.php provides credentials (see config.example.php).
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$configFile = __DIR__ . '/config.local.php';
$config = is_file($configFile) ? require $configFile : [];

const TOKEN_DAYS = 180;
const MAX_SAVE_BYTES = 2_000_000;

function is_mysql(): bool
{
    global $config;
    return !empty($config['db_name']);
}

function db(): PDO
{
    static $pdo = null;
    global $config;
    if ($pdo) return $pdo;
    $opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
    try {
        if (is_mysql()) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'] ?? 'localhost', $config['db_name']);
            $pdo = new PDO($dsn, $config['db_user'] ?? '', $config['db_pass'] ?? '', $opts);
            $ai = 'INT AUTO_INCREMENT PRIMARY KEY';
            $text = 'MEDIUMTEXT';
            $tail = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
        } else {
            $dir = $config['sqlite_dir'] ?? (__DIR__ . '/data');
            if (!is_dir($dir)) mkdir($dir, 0750, true);
            $pdo = new PDO('sqlite:' . $dir . '/regolith.sqlite', null, null, $opts);
            $pdo->exec('PRAGMA journal_mode=WAL');
            $ai = 'INTEGER PRIMARY KEY AUTOINCREMENT';
            $text = 'TEXT';
            $tail = '';
        }
    } catch (Throwable $e) {
        fail(503, 'Cloud save is not available on this server');
    }
    // Create tables on first use. Times are Unix seconds, so SQL stays portable.
    $pdo->exec("CREATE TABLE IF NOT EXISTS rr_users (id $ai, username VARCHAR(24) NOT NULL UNIQUE, pass_hash VARCHAR(255) NOT NULL, created_at INT NOT NULL)$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rr_tokens (token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at INT NOT NULL)$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rr_saves (user_id INT PRIMARY KEY, data $text NOT NULL, updated_at INT NOT NULL)$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rr_attempts (id $ai, ip VARCHAR(64) NOT NULL, at INT NOT NULL)$tail");
    return $pdo;
}

function fail(int $code, string $msg): never
{
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_SAVE_BYTES + 1);
    if ($raw === false || strlen($raw) > MAX_SAVE_BYTES) fail(413, 'Request too large');
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) fail(400, 'Invalid JSON');
    return $data;
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Use POST');
}

function valid_credentials(array $b): array
{
    $u = trim((string)($b['username'] ?? ''));
    $p = (string)($b['password'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_-]{3,24}$/', $u)) fail(400, 'Username: 3-24 letters, numbers, _ or -');
    if (strlen($p) < 6 || strlen($p) > 200) fail(400, 'Password: at least 6 characters');
    return [$u, $p];
}

/** Simple brute-force brake: at most 20 auth attempts per IP per 15 minutes. */
function rate_limit(): void
{
    $ip = substr($_SERVER['REMOTE_ADDR'] ?? 'unknown', 0, 64);
    $pdo = db();
    $now = time();
    $pdo->prepare('DELETE FROM rr_attempts WHERE at < ?')->execute([$now - 86400]);
    $q = $pdo->prepare('SELECT COUNT(*) FROM rr_attempts WHERE ip = ? AND at > ?');
    $q->execute([$ip, $now - 900]);
    if ((int)$q->fetchColumn() >= 20) fail(429, 'Too many attempts, try again later');
    $pdo->prepare('INSERT INTO rr_attempts (ip, at) VALUES (?, ?)')->execute([$ip, $now]);
}

function issue_token(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO rr_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        ->execute([hash('sha256', $token), $userId, time() + TOKEN_DAYS * 86400]);
    return $token;
}

function bearer(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strcasecmp((string)$k, 'Authorization') === 0) $h = $v;
    }
    return preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $h, $m) ? strtolower($m[1]) : null;
}

function current_user_id(): int
{
    $t = bearer();
    if (!$t) fail(401, 'Not logged in');
    $q = db()->prepare('SELECT user_id FROM rr_tokens WHERE token_hash = ? AND expires_at > ?');
    $q->execute([hash('sha256', $t), time()]);
    $id = $q->fetchColumn();
    if (!$id) fail(401, 'Session expired, please log in again');
    return (int)$id;
}
