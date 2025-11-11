<?php
// debug friendly
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Adjust path if needed
require __DIR__ . '/../PHPMailer/src/Exception.php';
require __DIR__ . '/../PHPMailer/src/PHPMailer.php';
require __DIR__ . '/../PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json; charset=utf-8');

// Simple helper to return json and exit
function resp($type, $text){
    echo json_encode(['type' => $type, 'text' => $text]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    resp('error', 'Invalid request method.');
}

// Basic sanitize / fetch
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

// Additional optional fields if your form has them
// $subject = trim($_POST['subject'] ?? 'Contact Form Message');

if (!$name || !$email || !$message) {
    resp('error', 'Please fill all required fields (name, email, message).');
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    resp('error', 'Please provide a valid email address.');
}

// Create PHPMailer instance
$mail = new PHPMailer(true);

try {
    // SMTP settings for Gmail
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'raihan25kzs@gmail.com';        // <-- আপনার Gmail here (recipient too)
    $mail->Password   = 'opqq oeig yexy jahz';            // <-- **এখানে 16 অক্ষরের App Password বসান** (no spaces)
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // or 'tls'
    $mail->Port       = 587;

    // Sender & recipient
    // setFrom: visitor email (some SMTP blocks this; যদি সমস্যা হয়, use your gmail as setFrom and addReplyTo visitor)
    $mail->setFrom('raihan25kzs@gmail.com', 'Portfolio Contact'); // safer: use your gmail as From
    $mail->addReplyTo($email, $name); // so you can reply to visitor
    $mail->addAddress('raihan25kzs@gmail.com', 'Raihan'); // recipient (you)

    // Content
    $mail->isHTML(false);
    $mail->Subject = 'New Contact Message from Portfolio';
    $body = "Name: {$name}\nEmail: {$email}\n\nMessage:\n{$message}\n\n--\nSent from portfolio contact form";
    $mail->Body = $body;

    // Optional: set charset and encoding
    $mail->CharSet = 'UTF-8';

    if ($mail->send()) {
        resp('success', 'Message sent successfully! Thanks.');
    } else {
        resp('error', 'Mailer failed to send message.');
    }

} catch (Exception $e) {
    // Return PHPMailer error info — helpful for debugging
    resp('error', 'Mailer Error: ' . $mail->ErrorInfo);
}
