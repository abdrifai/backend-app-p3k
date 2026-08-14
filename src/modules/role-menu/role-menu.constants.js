/**
 * Definisi resmi seluruh Menu dan Sub-Menu di SIPPPK
 */
export const MENU_CATALOG = [
  // 1. Dashboard
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'ri-dashboard-line',
    parentKey: null,
    group: 'Utama',
    order: 1
  },

  // 2. Data Utama (Dropdown)
  {
    key: 'data-utama',
    label: 'Data Utama',
    path: null,
    icon: 'ri-database-2-line',
    parentKey: null,
    group: 'Data Kepegawaian',
    order: 2
  },
  {
    key: 'profil-pegawai',
    label: 'Profil Pegawai',
    path: '/profil-pegawai',
    icon: 'ri-user-search-line',
    parentKey: 'data-utama',
    group: 'Data Kepegawaian',
    order: 2.1
  },
  {
    key: 'data-p3k',
    label: 'Data Induk P3K',
    path: '/data-p3k',
    icon: 'ri-user-shared-line',
    parentKey: 'data-utama',
    group: 'Data Kepegawaian',
    order: 2.2
  },
  {
    key: 'statistik-p3k',
    label: 'Statistik P3K',
    path: '/statistik-p3k',
    icon: 'ri-pie-chart-line',
    parentKey: 'data-utama',
    group: 'Data Kepegawaian',
    order: 2.3
  },
  {
    key: 'manajemen-pensiun',
    label: 'Pengajuan Pensiun',
    path: '/manajemen-pensiun',
    icon: 'ri-user-unfollow-line',
    parentKey: 'data-utama',
    group: 'Data Kepegawaian',
    order: 2.4
  },
  {
    key: 'perbedaan-data',
    label: 'Cek Perbedaan Data',
    path: '/perbedaan-data',
    icon: 'ri-file-search-line',
    parentKey: 'data-utama',
    group: 'Data Kepegawaian',
    order: 2.5
  },

  // 3. Perpanjangan PK (Dropdown)
  {
    key: 'perpanjangan-pk',
    label: 'Perpanjangan PK',
    path: null,
    icon: 'ri-file-text-line',
    parentKey: null,
    group: 'Perpanjangan Kontrak',
    order: 3
  },
  {
    key: 'perpanjangan-dashboard',
    label: 'Dashboard Perpanjangan',
    path: '/perpanjangan-kontrak/dashboard',
    icon: 'ri-dashboard-3-line',
    parentKey: 'perpanjangan-pk',
    group: 'Perpanjangan Kontrak',
    order: 3.1
  },
  {
    key: 'perpanjangan-usulan',
    label: 'Usulan Perpanjangan',
    path: '/perpanjangan-kontrak/usulan',
    icon: 'ri-file-add-line',
    parentKey: 'perpanjangan-pk',
    group: 'Perpanjangan Kontrak',
    order: 3.2
  },
  {
    key: 'perpanjangan-inbox',
    label: 'Inbox Usulan',
    path: '/perpanjangan-kontrak/inbox',
    icon: 'ri-inbox-archive-line',
    parentKey: 'perpanjangan-pk',
    group: 'Perpanjangan Kontrak',
    order: 3.3
  },

  // 4. Task User (Dropdown)
  {
    key: 'task-user',
    label: 'Task User',
    path: null,
    icon: 'ri-checkbox-circle-line',
    parentKey: null,
    group: 'Tugas Pengguna',
    order: 4
  },
  {
    key: 'task-peremajaan',
    label: 'Usul Peremajaan Data',
    path: '/task-user-peremajaan',
    icon: 'ri-edit-circle-line',
    parentKey: 'task-user',
    group: 'Tugas Pengguna',
    order: 4.1
  },
  {
    key: 'task-usulan-pk',
    label: 'Usulan Perpanjangan PK',
    path: '/task-user-usulan-pk',
    icon: 'ri-task-line',
    parentKey: 'task-user',
    group: 'Tugas Pengguna',
    order: 4.2
  },

  // 5. Laporan (Dropdown)
  {
    key: 'laporan',
    label: 'Laporan',
    path: null,
    icon: 'ri-file-chart-line',
    parentKey: null,
    group: 'Laporan & Rekapitulasi',
    order: 5
  },
  {
    key: 'laporan-perpanjangan',
    label: 'Laporan Perpanjangan PK',
    path: '/laporan/perpanjangan-pk',
    icon: 'ri-file-list-3-line',
    parentKey: 'laporan',
    group: 'Laporan & Rekapitulasi',
    order: 5.1
  },
  {
    key: 'laporan-unit-kerja',
    label: 'Laporan Per Unit Kerja',
    path: '/laporan/per-unit-kerja',
    icon: 'ri-building-line',
    parentKey: 'laporan',
    group: 'Laporan & Rekapitulasi',
    order: 5.2
  },
  {
    key: 'laporan-estimasi-pensiun',
    label: 'Estimasi Pensiun',
    path: '/estimasi-pensiun',
    icon: 'ri-hourglass-2-line',
    parentKey: 'laporan',
    group: 'Laporan & Rekapitulasi',
    order: 5.3
  },
  {
    key: 'laporan-statistik-task',
    label: 'Statistik Task',
    path: '/statistik-task',
    icon: 'ri-bar-chart-box-line',
    parentKey: 'laporan',
    group: 'Laporan & Rekapitulasi',
    order: 5.4
  },

  // 6. Pengaturan (Dropdown)
  {
    key: 'pengaturan',
    label: 'Pengaturan',
    path: null,
    icon: 'ri-settings-4-line',
    parentKey: null,
    group: 'Pengaturan Sistem',
    order: 6
  },
  // Sub-menu Pengaturan: Import CSV
  {
    key: 'setting-p3k-import',
    label: 'Data P3K (Hasil Import)',
    path: '/data-p3k-import',
    icon: 'ri-file-excel-2-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Import CSV',
    order: 6.1
  },
  {
    key: 'setting-statistik-import',
    label: 'Statistik P3K (Import)',
    path: '/statistik-p3k-import',
    icon: 'ri-bubble-chart-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Import CSV',
    order: 6.2
  },
  {
    key: 'setting-import-csv',
    label: 'Import CSV Baru',
    path: '/import-p3k-csv',
    icon: 'ri-upload-cloud-2-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Import CSV',
    order: 6.3
  },
  // Sub-menu Pengaturan: Manajemen Tugas
  {
    key: 'setting-task-peremajaan',
    label: 'Pembagian Task Peremajaan',
    path: '/setting/pembagian-task-peremajaan',
    icon: 'ri-user-shared-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Manajemen Tugas',
    order: 6.4
  },
  {
    key: 'setting-task-usulan-pk',
    label: 'Pembagian Task Usulan PK',
    path: '/setting/pembagian-task-usulan-pk',
    icon: 'ri-user-follow-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Manajemen Tugas',
    order: 6.5
  },
  // Sub-menu Pengaturan: Referensi & Master
  {
    key: 'setting-ref-unor',
    label: 'Referensi Unit Kerja (UNOR)',
    path: '/ref-unor',
    icon: 'ri-organization-chart',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Referensi',
    order: 6.6
  },
  {
    key: 'setting-ref-gaji',
    label: 'Referensi Gaji',
    path: '/setting/referensi-gaji',
    icon: 'ri-money-dollar-circle-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Referensi',
    order: 6.7
  },
  {
    key: 'setting-kegiatan',
    label: 'Referensi Kegiatan',
    path: '/setting/kegiatan',
    icon: 'ri-calendar-event-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Referensi',
    order: 6.8
  },
  // Sub-menu Pengaturan: Sistem & Keamanan
  {
    key: 'setting-manajemen-user',
    label: 'Manajemen Pengguna',
    path: '/manajemen-user',
    icon: 'ri-user-settings-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Sistem',
    order: 6.9
  },
  {
    key: 'setting-hak-akses',
    label: 'Hak Akses Menu',
    path: '/setting/hak-akses',
    icon: 'ri-shield-keyhole-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Sistem',
    order: 6.91
  },
  {
    key: 'setting-activity-log',
    label: 'Log Aktivitas',
    path: '/setting/activity-log',
    icon: 'ri-history-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Sistem',
    order: 6.92
  },
  {
    key: 'setting-backup',
    label: 'Backup & Restore',
    path: '/setting/backup',
    icon: 'ri-database-line',
    parentKey: 'pengaturan',
    group: 'Pengaturan - Sistem',
    order: 6.93
  }
];

/**
 * Default menu permissions per role jika belum dikonfigurasi di database
 */
export const DEFAULT_PERMISSIONS = {
  admin: MENU_CATALOG.map(m => m.key), // Admin has all access
  user: [
    'dashboard',
    'data-utama',
    'profil-pegawai',
    'data-p3k',
    'statistik-p3k',
    'perbedaan-data',
    'perpanjangan-pk',
    'perpanjangan-dashboard',
    'perpanjangan-usulan',
    'perpanjangan-inbox',
    'task-user',
    'task-peremajaan',
    'task-usulan-pk',
    'laporan',
    'laporan-perpanjangan',
    'laporan-unit-kerja',
    'laporan-statistik-task'
  ],
  pensiun: [
    'dashboard',
    'data-utama',
    'profil-pegawai',
    'manajemen-pensiun',
    'laporan',
    'laporan-estimasi-pensiun'
  ]
};
