module.exports = {
    apps: [
        {
            name: "backend-p3k",
            script: "./server.js",           // Atau ./dist/index.js jika hasil build
            cwd: "/var/www/backend-app-p3k", // PENTING: Agar path 'uploads/' tidak salah
            instances: 1,                   // Bisa diisi 'max' untuk cluster mode
            autorestart: true,
            watch: false,                   // Jangan aktifkan watch di production
            max_memory_restart: "1G",       // Restart jika memori tembus 1GB

            // Environment Variables
            env: {
                NODE_ENV: "production",
                PORT: 3000,

                // Database Configuration
                DB_HOST: "localhost",
                DB_USER: "root",
                DB_PASSWORD: "masukmas",
                DB_NAME: "p3k_db",

                // Path Konfigurasi (Opsional, untuk memastikan hapus file lancar)
                UPLOAD_DIR: "/var/www/backend-app-p3k/uploads",

                // Jika backend Anda perlu tahu domain frontend untuk CORS
                FRONTEND_URL: "http://33.33.33.5"
            }
        }
    ]
};