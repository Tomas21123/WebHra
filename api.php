<?php
// =============================================================================
// Voxelový svět - Backend API (api.php)
// Server: Endora.cz hosting (https://podsednikt.endora.site/api.php)
// =============================================================================

// Povolení CORS pro volání z webu i lokálního testování
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Zpracování preflight OPTIONS požadavku
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Zamezení vypsání nechtěného textu do JSON odpovědi
ini_set('display_errors', 0);
error_reporting(E_ALL);

function sendJson($status, $data = [], $httpCode = 200) {
    http_response_code($httpCode);
    $response = array_merge(['status' => $status], $data);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// -----------------------------------------------------------------------------
// KONFIGURACE DATABÁZE (Endora.cz)
// -----------------------------------------------------------------------------
$db_host = 'db.dw239.endora.cz';
$db_name = 'podsednikt_endor';
$db_user = 'podsednikt_endor';
$db_pass = 'mKzBNxKNKsL4jL-';

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Automatické vytvoření tabulky Uzivatele, pokud ještě v databázi neexistuje
    $pdo->exec("CREATE TABLE IF NOT EXISTS `Uzivatele` (
        `Email` VARCHAR(190) NOT NULL PRIMARY KEY,
        `NickName` VARCHAR(100) NOT NULL UNIQUE,
        `Password` VARCHAR(255) NOT NULL,
        `CreatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

} catch (PDOException $e) {
    sendJson('error', [
        'message' => 'Chyba připojení k MySQL databázi: ' . $e->getMessage()
    ], 500);
}

// Zpracování těla požadavku
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Test funkčnosti při otevření api.php v prohlížeči (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($input)) {
    sendJson('success', [
        'message' => 'Voxelový svět API běží správně.',
        'database' => 'Připojeno k databázi ' . $db_name,
        'table' => 'Uzivatele'
    ]);
}

if (!is_array($input) || empty($input['action'])) {
    sendJson('error', ['message' => 'Neplatný požadavek. Očekáváno JSON pole s klíčem "action".'], 400);
}

$action = trim($input['action']);

// -----------------------------------------------------------------------------
// 1. REGISTRACE (action: "register")
// -----------------------------------------------------------------------------
if ($action === 'register') {
    $email = trim($input['email'] ?? '');
    $nickname = trim($input['nickname'] ?? '');
    $password = (string)($input['password'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Zadejte platnou e-mailovou adresu.'], 400);
    }
    if (strlen($nickname) < 3 || strlen($nickname) > 30) {
        sendJson('error', ['message' => 'Přezdívka (NickName) musí mít 3 až 30 znaků.'], 400);
    }
    if (strlen($password) < 6) {
        sendJson('error', ['message' => 'Heslo musí mít alespoň 6 znaků.'], 400);
    }

    // Kontrola existence e-mailu nebo přezdívky
    $stmt = $pdo->prepare("SELECT Email, NickName FROM `Uzivatele` WHERE Email = ? OR NickName = ? LIMIT 1");
    $stmt->execute([$email, $nickname]);
    $existing = $stmt->fetch();

    if ($existing) {
        if (strcasecmp($existing['Email'], $email) === 0) {
            sendJson('error', ['message' => 'Uživatel s tímto e-mailem již existuje.'], 409);
        } else {
            sendJson('error', ['message' => 'Tato přezdívka je již obsazená.'], 409);
        }
    }

    // Bezpečný hash hesla
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $insert = $pdo->prepare("INSERT INTO `Uzivatele` (Email, NickName, Password) VALUES (?, ?, ?)");
    $insert->execute([$email, $nickname, $hash]);

    sendJson('success', [
        'message' => 'Registrace proběhla úspěšně.',
        'user' => [
            'email' => $email,
            'nickname' => $nickname
        ]
    ]);
}

// -----------------------------------------------------------------------------
// 2. PŘIHLÁŠENÍ (action: "login")
// -----------------------------------------------------------------------------
if ($action === 'login') {
    $login = trim($input['login'] ?? '');
    $password = (string)($input['password'] ?? '');

    if (empty($login) || empty($password)) {
        sendJson('error', ['message' => 'Zadejte přihlašovací jméno (nebo e-mail) a heslo.'], 400);
    }

    // Hledání podle Email nebo NickName
    $stmt = $pdo->prepare("SELECT Email, NickName, Password FROM `Uzivatele` WHERE Email = ? OR NickName = ? LIMIT 1");
    $stmt->execute([$login, $login]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Nesprávné přihlašovací jméno nebo heslo.'], 401);
    }

    // Podpora pro zahashovaná hesla i případná plain-text hesla z phpMyAdmin
    $passwordMatches = password_verify($password, $user['Password']) || ($password === $user['Password']);

    if (!$passwordMatches) {
        sendJson('error', ['message' => 'Nesprávné přihlašovací jméno nebo heslo.'], 401);
    }

    // Pokud bylo heslo uloženo jako plain-text, automaticky ho převedeme na bezpečný hash
    if ($password === $user['Password'] && !password_verify($password, $user['Password'])) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $upd = $pdo->prepare("UPDATE `Uzivatele` SET Password = ? WHERE Email = ?");
        $upd->execute([$newHash, $user['Email']]);
    }

    sendJson('success', [
        'message' => 'Přihlášení bylo úspěšné.',
        'user' => [
            'email' => $user['Email'],
            'nickname' => $user['NickName']
        ]
    ]);
}

// -----------------------------------------------------------------------------
// 3. OBNOVA HESLA (action: "reset_password")
// -----------------------------------------------------------------------------
if ($action === 'reset_password') {
    $email = trim($input['email'] ?? '');
    $new_password = (string)($input['new_password'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Zadejte platnou e-mailovou adresu.'], 400);
    }
    if (strlen($new_password) < 6) {
        sendJson('error', ['message' => 'Nové heslo musí mít alespoň 6 znaků.'], 400);
    }

    $stmt = $pdo->prepare("SELECT Email FROM `Uzivatele` WHERE Email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Uživatel s tímto e-mailem nebyl nalezen.'], 404);
    }

    $hash = password_hash($new_password, PASSWORD_DEFAULT);
    $update = $pdo->prepare("UPDATE `Uzivatele` SET Password = ? WHERE Email = ?");
    $update->execute([$hash, $email]);

    sendJson('success', [
        'message' => 'Heslo bylo úspěšně obnoveno. Nyní se můžete přihlásit novým heslem.'
    ]);
}

sendJson('error', ['message' => "Neznámá akce '{$action}'."], 400);
