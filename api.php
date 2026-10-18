<?php
// =============================================================================
// Voxelový svět - Backend API (api.php)
// Server: Endora.cz hosting (https://podsednikt.endora.site/api.php)
// Bezpečné API s ověřováním e-mailem přes SMTP, ochranou proti brute-force a správou účtu
// =============================================================================

// Bezpečnostní hlavičky a CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");

// Zpracování preflight OPTIONS požadavku
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Zamezení vypsání nechtěného textu do JSON odpovědi
ini_set('display_errors', 0);
error_reporting(E_ALL);

function sendJson($status, $data = [], $httpCode = 200)
{
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

// Tajná sůl pro HMAC hashování jednorázových ověřovacích kódů v databázi
$secret_salt = 'voxel_sec_salt_2026_x9k2m';

// -----------------------------------------------------------------------------
// KONFIGURACE SMTP PRO ODESÍLÁNÍ E-MAILŮ S OVĚŘOVACÍM KÓDEM
// -----------------------------------------------------------------------------
// Zde zadejte přihlašovací údaje ke své e-mailové schránce:
//
// PŘÍKLADY NASTAVENÍ:
// 1) Seznam.cz:
//    'host' => 'smtp.seznam.cz', 'port' => 465, 'encryption' => 'ssl',
//    'user' => 'vas-email@seznam.cz', 'pass' => 'vase-heslo'
// 2) Endora.cz:
//    'host' => 'mail.endora.cz', 'port' => 465, 'encryption' => 'ssl',
//    'user' => 'info@vasedomena.cz', 'pass' => 'vase-heslo'
// 3) Gmail:
//    'host' => 'smtp.gmail.com', 'port' => 465, 'encryption' => 'ssl',
//    'user' => 'vas-email@gmail.com', 'pass' => 'heslo-pro-aplikace'
//
$smtp_config = [
    'enabled' => true,                      // true = odesílat přes SMTP
    'host' => 'smtp.seznam.cz',          // SMTP server
    'port' => 465,                       // Port: 465 (SSL) nebo 587 (TLS)
    'encryption' => 'ssl',                     // 'ssl' nebo 'tls'
    'user' => 'testovanitom@seznam.cz',    // Celá vaše e-mailová adresa (uživatelské jméno SMTP)
    'pass' => 'HesloOdMailu',   // Heslo k vaší e-mailové schránce
    'from' => 'testovanitom@seznam.cz',    // Adresa odesílatele (shodná s user)
    'from_name' => 'Voxelový svět'            // Jméno odesílatele zobrazené v e-mailu
];

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);

    // 1. Vytvoření základní tabulky Uzivatele (pokud neexistuje)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `Uzivatele` (
        `Email` VARCHAR(190) NOT NULL PRIMARY KEY,
        `NickName` VARCHAR(100) NOT NULL UNIQUE,
        `Password` VARCHAR(255) NOT NULL,
        `CreatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Kontrola a automatická migrace sloupců pro zabezpečení a ověřování e-mailem
    $cols = [];
    $colStmt = $pdo->query("SHOW COLUMNS FROM `Uzivatele`");
    while ($row = $colStmt->fetch()) {
        $cols[$row['Field']] = true;
    }

    // IsVerified (0 = neověřený, 1 = aktivní ověřený účet). Výchozí 1 pro stávající uživatele.
    if (!isset($cols['IsVerified'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `IsVerified` TINYINT(1) NOT NULL DEFAULT 1");
    }
    // Zahashovaný 6místný kód (HMAC-SHA256)
    if (!isset($cols['VerificationCode'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `VerificationCode` VARCHAR(255) NULL");
    }
    // Expirace ověřovacího kódu
    if (!isset($cols['CodeExpiresAt'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `CodeExpiresAt` DATETIME NULL");
    }
    // Počítadlo chybných pokusů o zadání kódu (max 5)
    if (!isset($cols['CodeAttempts'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `CodeAttempts` INT NOT NULL DEFAULT 0");
    }
    // Čas posledního odeslání e-mailu (rate limit 60 s)
    if (!isset($cols['LastCodeSentAt'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `LastCodeSentAt` DATETIME NULL");
    }
    // Počítadlo chybných hesel (ochrana před brute-force)
    if (!isset($cols['FailedLogins'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `FailedLogins` INT NOT NULL DEFAULT 0");
    }
    // Dočasný zámek účtu
    if (!isset($cols['LockedUntil'])) {
        $pdo->exec("ALTER TABLE `Uzivatele` ADD COLUMN `LockedUntil` DATETIME NULL");
    }

} catch (PDOException $e) {
    sendJson('error', [
        'message' => 'Chyba připojení k MySQL databázi: ' . $e->getMessage()
    ], 500);
}

// -----------------------------------------------------------------------------
// Pomocné bezpečnostní funkce
// -----------------------------------------------------------------------------
function hashVerificationCode($code, $salt)
{
    return hash_hmac('sha256', (string) $code, $salt);
}

// -----------------------------------------------------------------------------
// Samostatný nativní PHP SMTP Socket klient (nevyžaduje Composer ani PHPMailer)
// -----------------------------------------------------------------------------
function sendSmtpEmail($toEmail, $subject, $htmlBody, $smtpConfig)
{
    $cleanEmail = filter_var($toEmail, FILTER_VALIDATE_EMAIL);
    if (!$cleanEmail) {
        return ['success' => false, 'error' => 'Neplatná e-mailová adresa příjemce.'];
    }

    $host = trim($smtpConfig['host'] ?? '');
    $port = (int) ($smtpConfig['port'] ?? 465);
    $user = trim($smtpConfig['user'] ?? '');
    $pass = (string) ($smtpConfig['pass'] ?? '');
    $from = trim($smtpConfig['from'] ?? $user);
    $fromName = trim($smtpConfig['from_name'] ?? 'Voxelový svět');
    $encryption = strtolower(trim($smtpConfig['encryption'] ?? 'ssl'));

    if (empty($host) || empty($user) || empty($pass) || $pass === 'SEM_ZADEJTE_SVE_HESLO') {
        return [
            'success' => false,
            'error' => 'V api.php ještě nebylo nastaveno heslo k SMTP e-mailu. Zadejte prosím své heslo do pole $smtp_config[\'pass\'].'
        ];
    }

    $timeout = 12;
    $contextOptions = [
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ];
    $context = stream_context_create($contextOptions);

    $protocolPrefix = ($encryption === 'ssl') ? 'ssl://' : '';
    $socket = @stream_socket_client($protocolPrefix . $host . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);

    if (!$socket) {
        return ['success' => false, 'error' => "Nelze se připojit k SMTP serveru {$host}:{$port} ({$errstr})"];
    }

    stream_set_timeout($socket, $timeout);

    $readResponse = function () use ($socket) {
        $data = '';
        while ($str = fgets($socket, 515)) {
            $data .= $str;
            if (isset($str[3]) && $str[3] === ' ')
                break;
        }
        return $data;
    };

    $sendCommand = function ($cmd) use ($socket, $readResponse) {
        fputs($socket, $cmd . "\r\n");
        return $readResponse();
    };

    // 1. Uvítání serveru (očekáváno 220)
    $welcome = $readResponse();
    if (substr($welcome, 0, 3) !== '220') {
        fclose($socket);
        return ['success' => false, 'error' => 'Chyba SMTP uvítání: ' . trim($welcome)];
    }

    // 2. EHLO
    $clientHost = !empty($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'voxel.server';
    $ehloRes = $sendCommand("EHLO " . $clientHost);

    // 3. STARTTLS, pokud je vybráno TLS na portu 587
    if ($encryption === 'tls') {
        $tlsRes = $sendCommand("STARTTLS");
        if (substr($tlsRes, 0, 3) !== '220') {
            fclose($socket);
            return ['success' => false, 'error' => 'Chyba STARTTLS: ' . trim($tlsRes)];
        }
        $cryptoOk = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if (!$cryptoOk) {
            fclose($socket);
            return ['success' => false, 'error' => 'Nepodařilo se navázat zabezpečené TLS šifrování.'];
        }
        $ehloRes = $sendCommand("EHLO " . $clientHost);
    }

    // 4. Autentizace AUTH LOGIN
    $authRes = $sendCommand("AUTH LOGIN");
    if (substr($authRes, 0, 3) !== '334') {
        fclose($socket);
        return ['success' => false, 'error' => 'Server nepodporuje AUTH LOGIN: ' . trim($authRes)];
    }

    // Odeslání uživatelského jména
    $userRes = $sendCommand(base64_encode($user));
    if (substr($userRes, 0, 3) !== '334') {
        fclose($socket);
        return ['success' => false, 'error' => 'Chyba uživatelského jména SMTP: ' . trim($userRes)];
    }

    // Odeslání hesla
    $passRes = $sendCommand(base64_encode($pass));
    if (substr($passRes, 0, 3) !== '235') {
        fclose($socket);
        return ['success' => false, 'error' => 'Neplatné SMTP heslo k e-mailu (chyba autentizace): ' . trim($passRes)];
    }

    // 5. MAIL FROM
    $fromRes = $sendCommand("MAIL FROM:<{$from}>");
    if (substr($fromRes, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => 'Odesílatel odmítnut: ' . trim($fromRes)];
    }

    // 6. RCPT TO
    $rcptRes = $sendCommand("RCPT TO:<{$cleanEmail}>");
    if (substr($rcptRes, 0, 3) !== '250') {
        fclose($socket);
        return ['success' => false, 'error' => 'Příjemce odmítnut serverem: ' . trim($rcptRes)];
    }

    // 7. DATA
    $dataRes = $sendCommand("DATA");
    if (substr($dataRes, 0, 3) !== '354') {
        fclose($socket);
        return ['success' => false, 'error' => 'Chyba zahájení těla zprávy DATA: ' . trim($dataRes)];
    }

    // 8. Sestavení MIME těla
    $subjectEncoded = "=?UTF-8?B?" . base64_encode($subject) . "?=";
    $fromEncoded = "=?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>";

    $messageHeaders = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "From: {$fromEncoded}",
        "To: <{$cleanEmail}>",
        "Subject: {$subjectEncoded}",
        "Date: " . date('r'),
        "Message-ID: <" . md5(uniqid(microtime(), true)) . "@{$host}>",
        "X-Mailer: VoxelWorld Custom SMTP"
    ];

    $encodedBody = chunk_split(base64_encode($htmlBody));
    $fullPayload = implode("\r\n", $messageHeaders) . "\r\n\r\n" . $encodedBody . "\r\n.";

    $endRes = $sendCommand($fullPayload);
    $sendCommand("QUIT");
    fclose($socket);

    if (substr($endRes, 0, 3) === '250') {
        return ['success' => true, 'error' => null];
    } else {
        return ['success' => false, 'error' => 'Chyba při odeslání zprávy: ' . trim($endRes)];
    }
}

function sendVerificationEmail($toEmail, $nickname, $plainCode, $smtpConfig)
{
    $cleanEmail = filter_var($toEmail, FILTER_VALIDATE_EMAIL);
    if (!$cleanEmail)
        return ['success' => false, 'error' => 'Neplatná e-mailová adresa.'];

    $safeNick = htmlspecialchars(strip_tags($nickname), ENT_QUOTES, 'UTF-8');
    $subject = "Voxelový svět – Ověřovací kód: " . $plainCode;

    $htmlBody = "<!DOCTYPE html>
<html lang='cs'>
<head>
  <meta charset='UTF-8'>
  <title>Ověřovací kód – Voxelový svět</title>
</head>
<body style='margin:0;padding:24px;background-color:#0a0e17;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#f8fafc;'>
  <div style='max-width:540px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:36px;box-shadow:0 12px 36px rgba(0,0,0,0.6);'>
    <div style='text-align:center;margin-bottom:24px;'>
      <h1 style='color:#10b981;font-size:26px;margin:0;letter-spacing:1.5px;text-transform:uppercase;'>Voxelový svět</h1>
      <p style='color:#38bdf8;font-size:13px;margin-top:6px;letter-spacing:1px;font-weight:600;'>NEKONEČNÉ RPG DOBRODRUŽSTVÍ</p>
    </div>
    <p style='font-size:16px;line-height:1.5;color:#f1f5f9;'>Ahoj <strong>{$safeNick}</strong>,</p>
    <p style='color:#cbd5e1;font-size:15px;line-height:1.6;'>
      Děkujeme za registraci do hry <strong>Voxelový svět</strong>! Pro aktivaci tvého herního účtu a ověření e-mailu zadej ve hře následující 6místný ověřovací kód:
    </p>
    <div style='text-align:center;margin:32px 0;'>
      <div style='display:inline-block;background:rgba(16,185,129,0.12);border:2px solid #10b981;border-radius:14px;padding:16px 36px;font-size:36px;font-weight:800;letter-spacing:8px;color:#38bdf8;font-family:monospace;box-shadow:0 0 25px rgba(16,185,129,0.3);'>
        {$plainCode}
      </div>
    </div>
    <div style='background:rgba(2,6,23,0.5);border:1px solid #1e293b;border-radius:10px;padding:12px 16px;margin-bottom:20px;'>
      <p style='margin:0;font-size:13px;color:#94a3b8;line-height:1.5;'>
        ⏱️ <strong>Platnost kódu:</strong> 15 minut.<br>
        🛡️ <strong>Bezpečnost:</strong> Kód nikomu nesděluj. Administrátoři hry tvé heslo ani kód nikdy nebudou vyžadovat.
      </p>
    </div>
    <p style='color:#64748b;font-size:12.5px;line-height:1.5;'>
      Pokud jsi o registraci nežádal(a), můžeš tento e-mail bez obav ignorovat – účet bez zadání kódu nebude aktivován.
    </p>
    <hr style='border:none;border-top:1px solid #1e293b;margin:24px 0;'>
    <p style='color:#475569;font-size:11.5px;text-align:center;margin:0;'>
      Voxelový svět © 2026 · Bezpečný herní portál · https://podsednikt.endora.site
    </p>
  </div>
</body>
</html>";

    if (!empty($smtpConfig['enabled'])) {
        return sendSmtpEmail($cleanEmail, $subject, $htmlBody, $smtpConfig);
    } else {
        $headers = [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "From: " . ($smtpConfig['from_name'] ?? 'Voxelový svět') . " <" . ($smtpConfig['from'] ?? 'noreply@podsednikt.endora.site') . ">",
            "Reply-To: " . ($smtpConfig['from'] ?? 'noreply@podsednikt.endora.site'),
            "X-Mailer: PHP/" . phpversion()
        ];
        $ok = @mail($cleanEmail, "=?UTF-8?B?" . base64_encode($subject) . "?=", $htmlBody, implode("\r\n", $headers));
        return ['success' => (bool) $ok, 'error' => $ok ? null : 'Klasická funkce mail() na serveru selhala.'];
    }
}

// Zpracování těla požadavku
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Test funkčnosti při otevření api.php v prohlížeči (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($input)) {
    sendJson('success', [
        'message' => 'Voxelový svět API běží správně s rozšířeným zabezpečením.',
        'database' => 'Připojeno k databázi ' . $db_name,
        'table' => 'Uzivatele',
        'features' => [
            'smtp_email' => true,
            'smtp_host' => $smtp_config['host'],
            'email_verification' => true,
            'change_password' => true,
            'change_nickname' => true,
            'brute_force_lockout' => true
        ]
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
    $password = (string) ($input['password'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
        sendJson('error', ['message' => 'Zadejte platnou e-mailovou adresu.'], 400);
    }
    if (strlen($nickname) < 3 || strlen($nickname) > 30 || !preg_match('/^[a-zA-Z0-9_\-\.]{3,30}$/u', $nickname)) {
        sendJson('error', ['message' => 'Přezdívka (NickName) musí mít 3 až 30 znaků a může obsahovat pouze písmena, čísla, podtržítka nebo pomlčky.'], 400);
    }
    if (strlen($password) < 6) {
        sendJson('error', ['message' => 'Heslo musí mít alespoň 6 znaků.'], 400);
    }
    if (strlen($password) > 128) {
        sendJson('error', ['message' => 'Heslo nesmí mít více než 128 znaků.'], 400);
    }

    // Kontrola existence e-mailu nebo přezdívky
    $stmt = $pdo->prepare("SELECT Email, NickName, IsVerified FROM `Uzivatele` WHERE Email = ? OR NickName = ? LIMIT 1");
    $stmt->execute([$email, $nickname]);
    $existing = $stmt->fetch();

    $plainCode = sprintf("%06d", random_int(100000, 999999));
    $codeHash = hashVerificationCode($plainCode, $secret_salt);
    $expiresAt = date('Y-m-d H:i:s', time() + (15 * 60)); // 15 minut
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    if ($existing) {
        if ((int) $existing['IsVerified'] === 1) {
            if (strcasecmp($existing['Email'], $email) === 0) {
                sendJson('error', ['message' => 'Uživatel s tímto e-mailem již existuje a je ověřen.'], 409);
            } else {
                sendJson('error', ['message' => 'Tato herní přezdívka je již obsazená.'], 409);
            }
        } else {
            // Účet ještě nebyl ověřen - pokud se shoduje e-mail, aktualizujeme heslo, nick a zašleme nový kód
            if (strcasecmp($existing['Email'], $email) === 0) {
                // Zkontrolujeme, zda nový nick nekoliduje s jiným ověřeným uživatelem
                $checkNick = $pdo->prepare("SELECT Email FROM `Uzivatele` WHERE NickName = ? AND Email != ? LIMIT 1");
                $checkNick->execute([$nickname, $email]);
                if ($checkNick->fetch()) {
                    sendJson('error', ['message' => 'Tato herní přezdívka je již obsazená.'], 409);
                }

                $upd = $pdo->prepare("UPDATE `Uzivatele` SET NickName = ?, Password = ?, VerificationCode = ?, CodeExpiresAt = ?, CodeAttempts = 0, LastCodeSentAt = NOW() WHERE Email = ?");
                $upd->execute([$nickname, $passwordHash, $codeHash, $expiresAt, $email]);

                $mailRes = sendVerificationEmail($email, $nickname, $plainCode, $smtp_config);

                if ($mailRes['success']) {
                    sendJson('success', [
                        'message' => 'Na váš e-mail byl odeslán 6místný ověřovací kód pro aktivaci účtu.',
                        'requires_verification' => true,
                        'email' => $email,
                        'nickname' => $nickname
                    ]);
                } else {
                    // Fallback: Pokud SMTP není nakonfigurováno nebo selže, kód se vrátí v odpovědi pro okamžité otestování
                    sendJson('success', [
                        'message' => 'Registrace byla vytvořena. E-mail se nepodařilo odeslat (' . $mailRes['error'] . '). Zkušební ověřovací kód: ' . $plainCode,
                        'requires_verification' => true,
                        'fallback_code' => $plainCode,
                        'email' => $email,
                        'nickname' => $nickname,
                        'smtp_error' => $mailRes['error']
                    ]);
                }
            } else {
                sendJson('error', ['message' => 'Tato herní přezdívka je již obsazená.'], 409);
            }
        }
    }

    // Nový záznam uživatele s IsVerified = 0
    $insert = $pdo->prepare("INSERT INTO `Uzivatele` (Email, NickName, Password, IsVerified, VerificationCode, CodeExpiresAt, CodeAttempts, LastCodeSentAt) VALUES (?, ?, ?, 0, ?, ?, 0, NOW())");
    $insert->execute([$email, $nickname, $passwordHash, $codeHash, $expiresAt]);

    $mailRes = sendVerificationEmail($email, $nickname, $plainCode, $smtp_config);

    if ($mailRes['success']) {
        sendJson('success', [
            'message' => 'Registrace byla vytvořena. Na váš e-mail byl odeslán 6místný ověřovací kód.',
            'requires_verification' => true,
            'email' => $email,
            'nickname' => $nickname
        ]);
    } else {
        // Fallback: Pokud SMTP není nakonfigurováno nebo selže, kód se vrátí v odpovědi pro okamžité otestování
        sendJson('success', [
            'message' => 'Registrace byla uložena. E-mail se nepodařilo odeslat (' . $mailRes['error'] . '). Zkušební ověřovací kód: ' . $plainCode,
            'requires_verification' => true,
            'fallback_code' => $plainCode,
            'email' => $email,
            'nickname' => $nickname,
            'smtp_error' => $mailRes['error']
        ]);
    }
}

// -----------------------------------------------------------------------------
// 2. OVĚŘENÍ E-MAILU KÓDEM (action: "verify_email")
// -----------------------------------------------------------------------------
if ($action === 'verify_email') {
    $email = trim($input['email'] ?? '');
    $code = trim($input['code'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Zadejte platnou e-mailovou adresu.'], 400);
    }
    if (empty($code) || strlen($code) !== 6 || !ctype_digit($code)) {
        sendJson('error', ['message' => 'Ověřovací kód musí obsahovat přesně 6 číslic.'], 400);
    }

    $stmt = $pdo->prepare("SELECT Email, NickName, IsVerified, VerificationCode, CodeExpiresAt, CodeAttempts FROM `Uzivatele` WHERE Email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Uživatel s tímto e-mailem nebyl nalezen.'], 404);
    }

    if ((int) $user['IsVerified'] === 1) {
        sendJson('success', [
            'message' => 'Váš účet je již ověřen. Můžete se přihlásit a hrát.',
            'user' => [
                'email' => $user['Email'],
                'nickname' => $user['NickName']
            ]
        ]);
    }

    // Ochrana před hádáním kódu (max 5 pokusů)
    if ((int) $user['CodeAttempts'] >= 5) {
        sendJson('error', [
            'message' => 'Bylo překročeno maximální množství neúspěšných pokusů (5). Klikněte na "Znovu odeslat kód" pro vygenerování nového kódu.'
        ], 429);
    }

    // Kontrola expirace kódu
    if (empty($user['CodeExpiresAt']) || strtotime($user['CodeExpiresAt']) < time()) {
        sendJson('error', [
            'message' => 'Platnost ověřovacího kódu již vypršela (platí 15 minut). Klikněte na "Znovu odeslat kód".'
        ], 400);
    }

    // Porovnání kódů bezpečně proti timing attackům
    $inputHash = hashVerificationCode($code, $secret_salt);
    if (!hash_equals($user['VerificationCode'] ?? '', $inputHash)) {
        $newAttempts = (int) $user['CodeAttempts'] + 1;
        $upd = $pdo->prepare("UPDATE `Uzivatele` SET CodeAttempts = ? WHERE Email = ?");
        $upd->execute([$newAttempts, $email]);

        $left = max(0, 5 - $newAttempts);
        sendJson('error', [
            'message' => "Zadaný ověřovací kód je nesprávný. Zbývající počet pokusů: {$left}."
        ], 400);
    }

    // Kód je správný -> Aktivace účtu
    $upd = $pdo->prepare("UPDATE `Uzivatele` SET IsVerified = 1, VerificationCode = NULL, CodeExpiresAt = NULL, CodeAttempts = 0 WHERE Email = ?");
    $upd->execute([$email]);

    sendJson('success', [
        'message' => 'E-mail byl úspěšně ověřen! Váš herní účet je nyní aktivní.',
        'user' => [
            'email' => $user['Email'],
            'nickname' => $user['NickName']
        ]
    ]);
}

// -----------------------------------------------------------------------------
// 3. ZNOVUODESLÁNÍ OVĚŘOVACÍHO KÓDU (action: "resend_code")
// -----------------------------------------------------------------------------
if ($action === 'resend_code') {
    $email = trim($input['email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Zadejte platnou e-mailovou adresu.'], 400);
    }

    $stmt = $pdo->prepare("SELECT Email, NickName, IsVerified, LastCodeSentAt FROM `Uzivatele` WHERE Email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Uživatel s tímto e-mailem nebyl nalezen.'], 404);
    }

    if ((int) $user['IsVerified'] === 1) {
        sendJson('success', [
            'message' => 'Tento účet je již plně ověřen. Můžete se rovnou přihlásit.'
        ]);
    }

    // Rate limiting: minimálně 60 sekund mezi odesláními
    if (!empty($user['LastCodeSentAt'])) {
        $elapsed = time() - strtotime($user['LastCodeSentAt']);
        if ($elapsed < 60) {
            $remaining = 60 - $elapsed;
            sendJson('error', [
                'message' => "Počkejte prosím ještě {$remaining} s před vyžádáním dalšího kódu."
            ], 429);
        }
    }

    $plainCode = sprintf("%06d", random_int(100000, 999999));
    $codeHash = hashVerificationCode($plainCode, $secret_salt);
    $expiresAt = date('Y-m-d H:i:s', time() + (15 * 60));

    $upd = $pdo->prepare("UPDATE `Uzivatele` SET VerificationCode = ?, CodeExpiresAt = ?, CodeAttempts = 0, LastCodeSentAt = NOW() WHERE Email = ?");
    $upd->execute([$codeHash, $expiresAt, $email]);

    $mailRes = sendVerificationEmail($email, $user['NickName'], $plainCode, $smtp_config);

    if ($mailRes['success']) {
        sendJson('success', [
            'message' => 'Nový ověřovací kód byl úspěšně odeslán na váš e-mail.',
            'email' => $email
        ]);
    } else {
        // Fallback: Pokud SMTP není nakonfigurováno nebo selže, kód se vrátí v odpovědi pro okamžité otestování
        sendJson('success', [
            'message' => 'Nový kód byl vygenerován. E-mail se nepodařilo odeslat (' . $mailRes['error'] . '). Zkušební kód: ' . $plainCode,
            'fallback_code' => $plainCode,
            'email' => $email,
            'smtp_error' => $mailRes['error']
        ]);
    }
}

// -----------------------------------------------------------------------------
// 4. PŘIHLÁŠENÍ (action: "login")
// -----------------------------------------------------------------------------
if ($action === 'login') {
    $login = trim($input['login'] ?? '');
    $password = (string) ($input['password'] ?? '');

    if (empty($login) || empty($password)) {
        sendJson('error', ['message' => 'Zadejte přihlašovací jméno (nebo e-mail) a heslo.'], 400);
    }

    // Hledání podle Email nebo NickName
    $stmt = $pdo->prepare("SELECT Email, NickName, Password, IsVerified, FailedLogins, LockedUntil FROM `Uzivatele` WHERE Email = ? OR NickName = ? LIMIT 1");
    $stmt->execute([$login, $login]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Nesprávné přihlašovací jméno nebo heslo.'], 401);
    }

    // Kontrola dočasného zámku účtu po opakovaných neúspěšných pokusech (brute-force ochrana)
    if (!empty($user['LockedUntil']) && strtotime($user['LockedUntil']) > time()) {
        $waitMinutes = ceil((strtotime($user['LockedUntil']) - time()) / 60);
        sendJson('error', [
            'message' => "Účet je dočasně uzamčen kvůli opakovaným neúspěšným pokusům. Zkuste to za {$waitMinutes} min."
        ], 423);
    }

    // Ověření hesla (bcrypt hash + zpětná kompatibilita pro stará plain-text hesla)
    $passwordMatches = password_verify($password, $user['Password']) || ($password === $user['Password']);

    if (!$passwordMatches) {
        $failed = (int) $user['FailedLogins'] + 1;
        if ($failed >= 5) {
            // Uzamčení účtu na 10 minut
            $lockStmt = $pdo->prepare("UPDATE `Uzivatele` SET FailedLogins = ?, LockedUntil = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE Email = ?");
            $lockStmt->execute([$failed, $user['Email']]);
            sendJson('error', ['message' => 'Příliš mnoho neúspěšných pokusů o přihlášení. Účet byl na 10 minut uzamčen.'], 423);
        } else {
            $failStmt = $pdo->prepare("UPDATE `Uzivatele` SET FailedLogins = ? WHERE Email = ?");
            $failStmt->execute([$failed, $user['Email']]);
            sendJson('error', ['message' => 'Nesprávné přihlašovací jméno nebo heslo.'], 401);
        }
    }

    // Úspěšné heslo -> Reset počítadla chyb
    $pdo->prepare("UPDATE `Uzivatele` SET FailedLogins = 0, LockedUntil = NULL WHERE Email = ?")->execute([$user['Email']]);

    // Pokud bylo heslo staré (plain-text), automaticky ho převedeme na moderní hash
    if ($password === $user['Password'] && !password_verify($password, $user['Password'])) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $upd = $pdo->prepare("UPDATE `Uzivatele` SET Password = ? WHERE Email = ?");
        $upd->execute([$newHash, $user['Email']]);
    }

    // Kontrola ověření e-mailu
    if (isset($user['IsVerified']) && (int) $user['IsVerified'] === 0) {
        sendJson('unverified', [
            'message' => 'Váš herní účet ještě nebyl aktivován. Zadejte prosím 6místný ověřovací kód z e-mailu.',
            'email' => $user['Email'],
            'nickname' => $user['NickName']
        ], 403);
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
// 5. ZMĚNA HESLA (action: "change_password")
// -----------------------------------------------------------------------------
if ($action === 'change_password') {
    $email = trim($input['email'] ?? '');
    $current_password = (string) ($input['current_password'] ?? '');
    $new_password = (string) ($input['new_password'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Neplatný e-mail uživatele.'], 400);
    }
    if (empty($current_password)) {
        sendJson('error', ['message' => 'Zadejte stávající heslo.'], 400);
    }
    if (strlen($new_password) < 6) {
        sendJson('error', ['message' => 'Nové heslo musí mít alespoň 6 znaků.'], 400);
    }
    if (strlen($new_password) > 128) {
        sendJson('error', ['message' => 'Nové heslo nesmí mít více než 128 znaků.'], 400);
    }

    $stmt = $pdo->prepare("SELECT Email, NickName, Password FROM `Uzivatele` WHERE Email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Uživatel nebyl nalezen.'], 404);
    }

    // Ověření stávajícího hesla pro zabezpečení
    $passwordMatches = password_verify($current_password, $user['Password']) || ($current_password === $user['Password']);
    if (!$passwordMatches) {
        sendJson('error', ['message' => 'Současné heslo není správné.'], 401);
    }

    if ($current_password === $new_password) {
        sendJson('error', ['message' => 'Nové heslo musí být jiné než vaše současné heslo.'], 400);
    }

    $hash = password_hash($new_password, PASSWORD_DEFAULT);
    $update = $pdo->prepare("UPDATE `Uzivatele` SET Password = ? WHERE Email = ?");
    $update->execute([$hash, $email]);

    sendJson('success', [
        'message' => 'Vaše heslo bylo úspěšně změněno.'
    ]);
}

// -----------------------------------------------------------------------------
// 6. ZMĚNA NICKNAME (action: "change_nickname")
// -----------------------------------------------------------------------------
if ($action === 'change_nickname') {
    $email = trim($input['email'] ?? '');
    $current_password = (string) ($input['current_password'] ?? '');
    $new_nickname = trim($input['new_nickname'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Neplatný e-mail uživatele.'], 400);
    }
    if (empty($current_password)) {
        sendJson('error', ['message' => 'Pro změnu přezdívky musíte zadat své stávající heslo.'], 400);
    }
    if (strlen($new_nickname) < 3 || strlen($new_nickname) > 30 || !preg_match('/^[a-zA-Z0-9_\-\.]{3,30}$/u', $new_nickname)) {
        sendJson('error', ['message' => 'Nový nickname musí mít 3 až 30 znaků (povoleny jsou znaky a-z, A-Z, 0-9, _, -, .).'], 400);
    }

    $stmt = $pdo->prepare("SELECT Email, NickName, Password FROM `Uzivatele` WHERE Email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJson('error', ['message' => 'Uživatel nebyl nalezen.'], 404);
    }

    // Ověření hesla
    $passwordMatches = password_verify($current_password, $user['Password']) || ($current_password === $user['Password']);
    if (!$passwordMatches) {
        sendJson('error', ['message' => 'Zadané heslo pro potvrzení změny přezdívky je nesprávné.'], 401);
    }

    if (strcasecmp($user['NickName'], $new_nickname) === 0) {
        sendJson('error', ['message' => 'Nový nickname je stejný jako váš stávající.'], 400);
    }

    // Kontrola, zda novou přezdívku již nemá někdo jiný
    $checkNick = $pdo->prepare("SELECT Email FROM `Uzivatele` WHERE NickName = ? AND Email != ? LIMIT 1");
    $checkNick->execute([$new_nickname, $email]);
    if ($checkNick->fetch()) {
        sendJson('error', ['message' => "Přezdívka '{$new_nickname}' je již obsazena jiným hráčem."], 409);
    }

    $update = $pdo->prepare("UPDATE `Uzivatele` SET NickName = ? WHERE Email = ?");
    $update->execute([$new_nickname, $email]);

    sendJson('success', [
        'message' => "Vaše herní přezdívka byla úspěšně změněna na '{$new_nickname}'.",
        'user' => [
            'email' => $email,
            'nickname' => $new_nickname
        ]
    ]);
}

// -----------------------------------------------------------------------------
// 7. OBNOVA HESLA (action: "reset_password")
// -----------------------------------------------------------------------------
if ($action === 'reset_password') {
    $email = trim($input['email'] ?? '');
    $new_password = (string) ($input['new_password'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson('error', ['message' => 'Zadejte platnou e-mailovou adresu.'], 400);
    }
    if (strlen($new_password) < 6) {
        sendJson('error', ['message' => 'Nové heslo musí mít alespoň 6 znaků.'], 400);
    }
    if (strlen($new_password) > 128) {
        sendJson('error', ['message' => 'Nové heslo nesmí mít více než 128 znaků.'], 400);
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
