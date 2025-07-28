<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");


$method = $_SERVER['REQUEST_METHOD'];
$requestUri = explode('/', trim($_SERVER['REQUEST_URI'], '/'));

$apiIndex = array_search('api', $requestUri);
if ($apiIndex === false || !isset($requestUri[$apiIndex + 1])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit;
}

$table = $requestUri[$apiIndex + 1];
$id = $requestUri[$apiIndex + 2] ?? null;

// biztonságos tábla név ellenőrzés
function isValidTableName($name) {
    return preg_match('/^[a-zA-Z0-9_]+$/', $name);
}

// MySQL kapcsolat

$host = 'localhost';
$db   = 'sugomedi_inmandemo';
$user = 'sugomedi_inmandemouser';
$pass = 'Sr9xEElVFb5Ei7nn';
$charset = 'utf8mb4';

/*
// MySQL kapcsolat
$host = 'localhost';
$db   = 'inmandemo';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
*/
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

// JSON input beolvasása
$input = json_decode(file_get_contents('php://input'), true);

// REST logika
try {
    if (!isValidTableName($table)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid table name']);
        exit;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
                $stmt->execute([$id]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Not found']);
                } else {
                    echo json_encode($row);
                }
            } else {
                $stmt = $pdo->query("SELECT * FROM `$table`");
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($rows);
            }
            break;

        case 'POST':
            if (!$input) throw new Exception("Invalid JSON");
            $columns = implode('`, `', array_keys($input));
            $placeholders = implode(', ', array_fill(0, count($input), '?'));
            $stmt = $pdo->prepare("INSERT INTO `$table` (`$columns`) VALUES ($placeholders)");
            $stmt->execute(array_values($input));
            echo json_encode(['id' => $pdo->lastInsertId()]);
            break;

        case 'PATCH':
            if (!$id) throw new Exception("Missing ID");
            if (!$input) throw new Exception("Invalid JSON");
            $set = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($input)));
            $stmt = $pdo->prepare("UPDATE `$table` SET $set WHERE id = ?");
            $stmt->execute([...array_values($input), $id]);
            echo json_encode(['affectedRows' => $stmt->rowCount()]);
            break;

        case 'DELETE':
            if (!$id) throw new Exception("Missing ID");
            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['affectedRows' => $stmt->rowCount()]);
            break;

        case 'OPTIONS':
            // előzetes CORS kérés válasza
            http_response_code(200);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
