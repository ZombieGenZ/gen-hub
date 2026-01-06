<!DOCTYPE html>

<html class="light" lang="vi"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>SmartWarehouse Pro - Chi tiết kho</title>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&amp;family=Noto+Sans:wght@400;500;600;700;900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#2463eb",
                        "background-light": "#f6f6f8",
                        "background-dark": "#111621",
                    },
                    fontFamily: {
                        "display": ["Inter", "Noto Sans", "sans-serif"]
                    },
                    borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
                },
            },
        }
    </script>
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased transition-colors duration-200">
<!-- Top Navigation -->
<header class="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e5e7eb] dark:border-b-gray-800 bg-white dark:bg-[#1a202c] px-6 py-3 lg:px-10">
<div class="flex items-center gap-4 text-[#111318] dark:text-white">
<div class="size-8 text-primary">
<span class="material-symbols-outlined !text-[32px]">warehouse</span>
</div>
<h2 class="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">SmartWarehouse Pro</h2>
</div>
<div class="hidden md:flex flex-1 justify-end gap-8">
<div class="flex items-center gap-9">
<a class="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Kho cho thuê</a>
<a class="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Dịch vụ quản lý</a>
<a class="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Về chúng tôi</a>
<a class="text-[#111318] dark:text-gray-200 text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Liên hệ</a>
</div>
<button class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors shadow-sm">
<span class="truncate">Đăng nhập</span>
</button>
</div>
<div class="md:hidden flex items-center">
<button class="text-[#111318] dark:text-white">
<span class="material-symbols-outlined">menu</span>
</button>
</div>
</header>
<div class="flex min-h-screen flex-col">
<!-- Main Content Area -->
<main class="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
<!-- Breadcrumbs -->
<nav class="flex flex-wrap items-center gap-2 mb-6 text-sm">
<a class="text-[#616e89] dark:text-gray-400 font-medium hover:text-primary" href="#">Trang chủ</a>
<span class="material-symbols-outlined text-[#616e89] dark:text-gray-400 text-base">chevron_right</span>
<a class="text-[#616e89] dark:text-gray-400 font-medium hover:text-primary" href="#">Danh sách kho</a>
<span class="material-symbols-outlined text-[#616e89] dark:text-gray-400 text-base">chevron_right</span>
<span class="text-[#111318] dark:text-white font-medium">Kho Tech-Zone A12</span>
</nav>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
<!-- Left Column: Details (8 cols) -->
<div class="lg:col-span-8 space-y-8">
<!-- Header Section -->
<div class="space-y-4">
<div class="flex flex-wrap items-start justify-between gap-4">
<div>
<h1 class="text-[#111318] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Kho Tech-Zone A12</h1>
<div class="flex items-center gap-1 mt-2 text-[#616e89] dark:text-gray-400">
<span class="material-symbols-outlined text-lg">location_on</span>
<p class="text-base font-normal">Lô CN1, Khu Công Nghệ Cao Hòa Lạc, Hà Nội</p>
</div>
</div>
<div class="flex gap-2">
<div class="flex h-8 items-center justify-center gap-x-2 rounded-lg bg-green-100 dark:bg-green-900/30 px-3 border border-green-200 dark:border-green-800">
<span class="relative flex h-2 w-2">
<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
<span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
</span>
<p class="text-green-700 dark:text-green-400 text-xs font-bold uppercase">Đang trống</p>
</div>
<div class="flex h-8 items-center justify-center gap-x-2 rounded-lg bg-[#f0f1f4] dark:bg-gray-800 px-3">
<span class="material-symbols-outlined text-sm text-[#111318] dark:text-white">verified</span>
<p class="text-[#111318] dark:text-white text-xs font-bold uppercase">ISO 9001</p>
</div>
</div>
</div>
</div>
<!-- Gallery Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] md:h-[480px]">
<div class="md:col-span-1 h-full relative group overflow-hidden rounded-xl">
<div class="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-105" data-alt="Modern high-tech warehouse interior with high shelves and polished concrete floor" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBWHOMNETsNrjINPx2KtOh-PYfd__y5AM2SkXlehFnChUEaLMWjCr7EVujir4GnY6udbK_mV1Zb10ojERPCInAypYVmhJ7bWzkIkwW6ZogBWJl_oBwicPN8PTxkiVo-TA9RSBEoEEIkVFx1TmsrPcIK602W7H3WVWkBaNKPTsq7yB_-VvLHOzXKL6DfhZEMN-rZbOy9Rz_qqg5h98yj32GUYPNuv6UFkvZ7lXp8j8OkcJD5sT7evlNs78UCH98RAfa0CiodRkGsR5p3");'></div>
<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
<div class="absolute bottom-4 left-4">
<span class="text-white font-medium text-lg shadow-black/50 drop-shadow-md">Khu vực lưu trữ chính</span>
</div>
</div>
<div class="md:col-span-1 flex flex-col gap-4 h-full">
<div class="flex-1 relative group overflow-hidden rounded-xl">
<div class="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-105" data-alt="Detailed loading dock area with trucks and automated systems" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCrl3DOF9pzJOsEHThaw42i77xBbHtDTLoCP8QaMN2ot1mZHM3IqC3GTxVYya9K55UcHsd3QIo6eoDUY05TzhcWMMcHIsiM0K1CKB1EhjkDPoY2ui9yn1480llVcrY7AIEjwssIHw4Mxdu2DaGn0pD4Cl2jHWOKo9RB72i0mOqv_lrnv1gvAUrbuuJA0_McVe1XC-BVABLJseJ4DEq_0eeJ68XLzEDvhWtOCDb_fuU8-Z7PAWPsdN3hmTW2XCJDSyRIWp0HOclQH4-M");'></div>
</div>
<div class="flex-1 relative group overflow-hidden rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
<div class="w-full h-full bg-center bg-no-repeat bg-contain p-4" data-alt="Blueprint 2D floor plan of the warehouse layout showing entry and storage zones" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuChLxY269HD6_UrMXjHAFHXyvZDmvztNmUsUEqfgO9Zou2OT5er2MVaaHcpT01iwfxHyvR6vonK8QzXt6qj38GsFDKxVIipqPWhp___JCJpDErXEVoO_nfnJSHA1uj42wxHG4fLRpHYylXZr5vlKw7o8FDJYA1twWrxvqxK7Ioic2dIVUfbaCh7lzYYeV78CrTKMK1wKwLHlOXpsmHfJnAvRD_ptd8Psh23XacnhaKvQc0HV03bw1g9d0OhqkCbTBkeiEVY3MA5du6S");'></div>
<div class="absolute bottom-3 right-3 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm cursor-pointer hover:bg-primary hover:text-white transition-colors">
                                    Xem sơ đồ 3D
                                </div>
</div>
</div>
</div>
<!-- Key Metrics -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
<div class="p-4 rounded-xl bg-white dark:bg-[#1a202c] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
<div class="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">square_foot</span>
</div>
<div>
<p class="text-[#616e89] dark:text-gray-400 text-sm font-medium">Diện tích</p>
<p class="text-[#111318] dark:text-white text-lg font-bold">1,200 m²</p>
</div>
</div>
<div class="p-4 rounded-xl bg-white dark:bg-[#1a202c] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
<div class="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">height</span>
</div>
<div>
<p class="text-[#616e89] dark:text-gray-400 text-sm font-medium">Chiều cao trần</p>
<p class="text-[#111318] dark:text-white text-lg font-bold">12m</p>
</div>
</div>
<div class="p-4 rounded-xl bg-white dark:bg-[#1a202c] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
<div class="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">weight</span>
</div>
<div>
<p class="text-[#616e89] dark:text-gray-400 text-sm font-medium">Tải trọng sàn</p>
<p class="text-[#111318] dark:text-white text-lg font-bold">5 tấn/m²</p>
</div>
</div>
<div class="p-4 rounded-xl bg-white dark:bg-[#1a202c] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2">
<div class="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">warehouse</span>
</div>
<div>
<p class="text-[#616e89] dark:text-gray-400 text-sm font-medium">Loại kho</p>
<p class="text-[#111318] dark:text-white text-lg font-bold">Kho mát</p>
</div>
</div>
</div>
<!-- Overview Text -->
<div class="bg-white dark:bg-[#1a202c] p-6 md:p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
<h3 class="text-xl font-bold text-[#111318] dark:text-white mb-4">Thông tin chi tiết</h3>
<p class="text-[#616e89] dark:text-gray-300 leading-relaxed mb-4">
                            Kho Tech-Zone A12 được thiết kế đặc biệt cho các doanh nghiệp công nghệ cao và logistics chính xác. Nằm tại vị trí chiến lược trong Khu Công Nghệ Cao Hòa Lạc, kho cung cấp khả năng tiếp cận nhanh chóng đến sân bay Nội Bài và các tuyến cao tốc huyết mạch.
                        </p>
<p class="text-[#616e89] dark:text-gray-300 leading-relaxed">
                            Hệ thống quản lý tòa nhà thông minh (BMS) tích hợp giúp duy trì điều kiện môi trường lý tưởng cho linh kiện điện tử, dược phẩm hoặc hàng hóa giá trị cao. Sàn bê tông cốt thép được xử lý tăng cứng bề mặt, chống bụi, đáp ứng tiêu chuẩn phòng sạch cơ bản.
                        </p>
</div>
<!-- Environment & Amenities Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
<!-- Environment Monitor -->
<div class="bg-white dark:bg-[#1a202c] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
<h3 class="text-lg font-bold text-[#111318] dark:text-white mb-6 flex items-center gap-2">
<span class="material-symbols-outlined text-primary">thermostat</span>
                                Môi trường kho
                            </h3>
<div class="space-y-6">
<div>
<div class="flex justify-between items-end mb-2">
<span class="text-sm font-medium text-[#616e89] dark:text-gray-400">Nhiệt độ duy trì</span>
<span class="text-xl font-bold text-[#111318] dark:text-white">20°C - 25°C</span>
</div>
<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
<div class="bg-gradient-to-r from-blue-400 to-red-400 h-2.5 rounded-full" style="width: 45%; margin-left: 25%"></div>
</div>
<p class="text-xs text-center text-gray-500 mt-1">Dải nhiệt độ lý tưởng</p>
</div>
<div>
<div class="flex justify-between items-end mb-2">
<span class="text-sm font-medium text-[#616e89] dark:text-gray-400">Độ ẩm</span>
<span class="text-xl font-bold text-[#111318] dark:text-white">40% - 60%</span>
</div>
<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
<div class="bg-blue-500 h-2.5 rounded-full" style="width: 50%"></div>
</div>
</div>
</div>
</div>
<!-- Amenities -->
<div class="bg-white dark:bg-[#1a202c] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
<h3 class="text-lg font-bold text-[#111318] dark:text-white mb-6 flex items-center gap-2">
<span class="material-symbols-outlined text-primary">handyman</span>
                                Tiện ích &amp; Hạ tầng
                            </h3>
<ul class="space-y-4">
<li class="flex items-center gap-3">
<span class="flex items-center justify-center size-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
<span class="material-symbols-outlined text-sm">check</span>
</span>
<span class="text-[#111318] dark:text-gray-200">Hệ thống PCCC Sprinkler tự động</span>
</li>
<li class="flex items-center gap-3">
<span class="flex items-center justify-center size-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
<span class="material-symbols-outlined text-sm">check</span>
</span>
<span class="text-[#111318] dark:text-gray-200">Camera an ninh CCTV 24/7</span>
</li>
<li class="flex items-center gap-3">
<span class="flex items-center justify-center size-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
<span class="material-symbols-outlined text-sm">check</span>
</span>
<span class="text-[#111318] dark:text-gray-200">Internet cáp quang tốc độ cao</span>
</li>
<li class="flex items-center gap-3">
<span class="flex items-center justify-center size-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
<span class="material-symbols-outlined text-sm">check</span>
</span>
<span class="text-[#111318] dark:text-gray-200">3 Cửa nhập hàng (Dock Levelers)</span>
</li>
<li class="flex items-center gap-3">
<span class="flex items-center justify-center size-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
<span class="material-symbols-outlined text-sm">check</span>
</span>
<span class="text-[#111318] dark:text-gray-200">Bãi đỗ xe container rộng 500m²</span>
</li>
</ul>
</div>
</div>
<!-- Map Placeholder -->
<div class="w-full h-[300px] bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden relative">
<div class="absolute inset-0 bg-cover bg-center grayscale hover:grayscale-0 transition-all duration-500" data-location="Hanoi Map view showing the surrounding industrial zone roads" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKwI-KXxzxUEd97TNP6C4tqTUJwmGvVgedOJexOd4hPKyo2eIZ12k5Dtg69u8tlic8lPLUBiToav2eNKL2Q3fYSZUC-vxyt4TERzJf3AvkIp7eqw_g1mehPnOKehjkerkHCIHnq6LErSYVFqYdQq8JQSH8_9mbZIaQ3oFp0ox1Fg_KiSUVRvi1ldTtqBdL4Vmurd4TXaAFiuqFZnfUHKtQM_mUqobqMF2aT2Rnr92efnOWAsiWtC0TPyC15gai5uFues2jK6Jn9j14');">
</div>
<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
<div class="bg-white/90 dark:bg-[#1a202c]/90 backdrop-blur px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
<span class="material-symbols-outlined text-red-500 text-3xl">location_on</span>
<div>
<p class="font-bold text-[#111318] dark:text-white">Vị trí bản đồ</p>
<p class="text-xs text-[#616e89] dark:text-gray-400">Cách cao tốc Láng - Hòa Lạc 2km</p>
</div>
</div>
</div>
</div>
</div>
<!-- Right Column: Sidebar (4 cols) -->
<div class="lg:col-span-4 space-y-6">
<!-- Pricing Card -->
<div class="sticky top-24 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a202c] shadow-lg p-6">
<div class="border-b border-dashed border-gray-200 dark:border-gray-700 pb-6 mb-6">
<p class="text-[#616e89] dark:text-gray-400 text-sm font-medium mb-1">Giá thuê đề xuất</p>
<div class="flex items-baseline gap-1">
<span class="text-3xl font-black text-primary tracking-tight">150.000.000₫</span>
<span class="text-[#616e89] dark:text-gray-400 font-medium">/ tháng</span>
</div>
<p class="text-xs text-[#616e89] dark:text-gray-400 mt-2">*Giá chưa bao gồm VAT và phí dịch vụ</p>
</div>
<div class="space-y-4">
<button class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                                Yêu cầu thuê ngay
                            </button>
<button class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-transparent border border-[#e5e7eb] dark:border-gray-600 text-[#111318] dark:text-white text-base font-bold leading-normal hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
<span class="material-symbols-outlined mr-2 text-primary">download</span>
                                Tải brochure PDF
                            </button>
</div>
<div class="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
<p class="text-sm font-medium text-[#111318] dark:text-white mb-4">Liên hệ chuyên viên tư vấn:</p>
<div class="flex items-center gap-4">
<div class="size-12 rounded-full overflow-hidden bg-gray-200">
<img alt="Portrait of professional warehouse consultant in suit" class="w-full h-full object-cover" data-alt="Portrait of professional male consultant smiling" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAL1keg8JmPAbhRTiHTa5lSJeLtvbNPchgH9CFiIh3UOCN7x7FwD04UMtOHgZvaI0PMU5hhN0Gf5ELSlksE7BGU90bt5e27Rd6kBnaYOzHdHrJPmRgxlmI3V3GsTcbNFBRXXWlk7ywX60Psg3FtGD0w1fVGUwuk24VIaC7trYjlbNhHKMXv-FdjciFQIhXnPig11R9gD3zHURbBNA9E7YTiBmYK2Xf85bzw5dyZWEhwnzVA59aIqu2mbunOUJRSw6CyEL5rDMgAqRTm"/>
</div>
<div>
<p class="text-sm font-bold text-[#111318] dark:text-white">Nguyễn Văn Minh</p>
<p class="text-xs text-[#616e89] dark:text-gray-400 mb-1">Senior Property Manager</p>
<div class="flex items-center gap-1 text-primary text-sm font-bold">
<span class="material-symbols-outlined text-sm">call</span>
                                        0912 345 678
                                    </div>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
<!-- Simple Footer -->
<footer class="bg-white dark:bg-[#1a202c] border-t border-[#e5e7eb] dark:border-gray-800 py-8 px-10 mt-10">
<div class="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
<p class="text-sm text-[#616e89] dark:text-gray-400">© 2024 SmartWarehouse Pro. All rights reserved.</p>
<div class="flex gap-6">
<a class="text-sm text-[#616e89] dark:text-gray-400 hover:text-primary" href="#">Điều khoản sử dụng</a>
<a class="text-sm text-[#616e89] dark:text-gray-400 hover:text-primary" href="#">Chính sách bảo mật</a>
</div>
</div>
</footer>
</div>
</body></html>