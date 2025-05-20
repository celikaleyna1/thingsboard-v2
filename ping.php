<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['time'])) {
    http_response_code(400);
    echo json_encode(["error" => "Eksik veya geçersiz veri"]);
    exit;
}

$time = $data['time'];
$userAgent = $data['userAgent'] ?? '';
$page = $data['page'] ?? '';
$device = $data['device'] ?? 'Bilinmiyor';

try {
    $pdo = new PDO("mysql:host=localhost;dbname=pingdb;charset=utf8", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("INSERT INTO pings (time, user_agent, page_url, device_name) VALUES (?, ?, ?, ?)");
    $stmt->execute([$time, $userAgent, $page, $device]);

    echo json_encode(["status" => "OK"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Veritabanı hatası"]);
}
?>
