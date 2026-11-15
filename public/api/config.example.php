<?php
// OPTIONAL. Without this file the API uses SQLite in api/data/ (no setup needed).
// To use MySQL instead: copy this file to config.local.php ON THE SERVER and fill in
// the database you created in hPanel (Databases -> MySQL Databases). Never commit config.local.php.
return [
    'db_host' => 'localhost',
    'db_name' => 'u123456789_regolith',
    'db_user' => 'u123456789_regolith',
    'db_pass' => 'CHANGE-ME',
];
