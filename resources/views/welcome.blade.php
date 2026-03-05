<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Operations Control Center</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #0b1220;
        }

        iframe {
            border: 0;
            width: 100%;
            height: 100%;
            display: block;
        }
    </style>
</head>
<body>
    <iframe
        id="occ-app"
        title="Operations Control Center"
        src="about:blank"
        loading="eager"
        referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>

    <script>
        (function () {
            var frontendBase = @json(env('FRONTEND_URL', 'http://localhost:3000'));
            var currentPath = window.location.pathname || '/';
            var currentQuery = window.location.search || '';
            var target = frontendBase.replace(/\/$/, '') + currentPath + currentQuery;
            document.getElementById('occ-app').src = target;
        })();
    </script>
</body>
</html>
