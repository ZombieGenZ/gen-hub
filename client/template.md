\<\!DOCTYPE html\>  
\<html class="light" lang="en"\>\<head\>  
\<meta charset="utf-8"/\>  
\<meta content="width=device-width, initial-scale=1.0" name="viewport"/\>  
\<title\>SmartWarehouse Pro \- Danh sách kho hàng\</title\>  
\<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900\&amp;display=swap" rel="stylesheet"/\>  
\<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/\>  
\<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"\>\</script\>  
\<script id="tailwind-config"\>  
      tailwind.config \= {  
        darkMode: "class",  
        theme: {  
          extend: {  
            colors: {  
              "primary": "\#0F766E",  
              "primary-light": "\#14B8A6",  
              "primary-dark": "\#0D5A52",  
              "sidebar-bg": "\#0f172a",   
              "background-light": "\#f1f5f9",  
              "background-dark": "\#0b1120",  
            },  
            fontFamily: {  
              "display": \["Inter", "sans-serif"\],  
              "body": \["Inter", "sans-serif"\]  
            },  
          },  
        },  
      }  
    \</script\>  
\<style\>  
        body {  
            font-family: 'Inter', sans-serif;  
        }::-webkit-scrollbar {  
            width: 6px;  
            height: 6px;  
        }  
        ::-webkit-scrollbar-track {  
            background: transparent;   
        }  
        ::-webkit-scrollbar-thumb {  
            background: \#94a3b8;   
            border-radius: 3px;  
        }  
        ::-webkit-scrollbar-thumb:hover {  
            background: \#64748b;   
        }  
    \</style\>  
\</head\>  
\<body class="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-white overflow-hidden flex flex-col"\>  
\<header class="h-16 flex items-center justify-between whitespace-nowrap bg-white dark:bg-slate-900 px-6 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm relative shrink-0"\>  
\<div class="flex items-center gap-6"\>  
\<div class="flex items-center gap-3"\>  
\<div class="size-9 flex items-center justify-center bg-primary text-white rounded-lg shadow-lg shadow-teal-500/30"\>  
\<span class="material-symbols-outlined text-\[22px\]"\>warehouse\</span\>  
\</div\>  
\<h2 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white"\>SmartWarehouse \<span class="text-primary font-black"\>Pro\</span\>\</h2\>  
\</div\>  
\<div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"\>\</div\>  
\<div class="hidden md:flex relative group w-80"\>  
\<div class="absolute left-3 top-1/2 \-translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>search\</span\>  
\</div\>  
\<input class="w-full h-10 bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Tìm kiếm nhanh (Ctrl \+ K)"/\>  
\<div class="absolute right-3 top-1/2 \-translate-y-1/2 flex gap-1"\>  
\<kbd class="hidden lg:inline-flex items-center h-5 px-1.5 text-\[10px\] font-medium text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm"\>⌘K\</kbd\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="flex items-center gap-5"\>  
\<div class="flex items-center gap-1"\>  
\<button class="size-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors relative"\>  
\<span class="material-symbols-outlined text-\[22px\]"\>notifications\</span\>  
\<span class="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"\>\</span\>  
\</button\>  
\<button class="size-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"\>  
\<span class="material-symbols-outlined text-\[22px\]"\>help\</span\>  
\</button\>  
\<button class="size-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"\>  
\<span class="material-symbols-outlined text-\[22px\]"\>settings\</span\>  
\</button\>  
\</div\>  
\<div class="h-8 w-px bg-slate-200 dark:bg-slate-700"\>\</div\>  
\<button class="flex items-center gap-3 group"\>  
\<div class="text-right hidden sm:block"\>  
\<p class="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors"\>Trần Minh\</p\>  
\<p class="text-\[11px\] text-slate-500 font-medium"\>Administrator\</p\>  
\</div\>  
\<div class="relative"\>  
\<div class="size-10 rounded-full bg-slate-200 p-0.5 ring-2 ring-transparent group-hover:ring-primary/20 transition-all"\>  
\<img alt="User profile" class="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAS8vmWn6d4sVaV1xh4l\_7mnns0pil3Yvseb4RiMPeAULAgyTbgCyyXZGPoYn-dFhyRlkDc8QHD9cSn7sYDWyJAF-mn5BeBEeMjco50eDTVjk450DvqYK18ZemfOF99TEi26oiWmemhflGWD5Y2qZVYy8c0xtPuxRbX0\_Zy7vfSLhGGlsNN3kq2ozu6IObsbPTeaAVDBjThiXYmJYfvcZVuNdGEj9YRsibD4JS8zPZy6DdVmiTjcaILcCenaNmLr3KIJ86qrXVKXwdY"/\>  
\</div\>  
\<div class="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"\>\</div\>  
\</div\>  
\</button\>  
\</div\>  
\</header\>  
\<div class="flex flex-1 overflow-hidden h-full"\>  
\<aside class="hidden lg:flex w-\[280px\] flex-col bg-sidebar-bg border-r border-slate-800 overflow-y-auto shrink-0 transition-all"\>  
\<div class="p-4 flex flex-col gap-6"\>  
\<div\>  
\<div class="px-3 mb-3"\>  
\<p class="text-xs font-bold text-slate-500 uppercase tracking-wider"\>Main Menu\</p\>  
\</div\>  
\<div class="flex flex-col gap-1"\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>dashboard\</span\>  
\<span class="text-sm font-medium"\>Tổng quan\</span\>  
\</a\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white shadow-lg shadow-teal-500/20 group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] fill-current"\>warehouse\</span\>  
\<span class="text-sm font-medium"\>Kho hàng\</span\>  
\<span class="ml-auto text-\[10px\] font-bold bg-white/20 px-2 py-0.5 rounded-full"\>4\</span\>  
\</a\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>inventory\_2\</span\>  
\<span class="text-sm font-medium"\>Hàng tồn kho\</span\>  
\</a\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>local\_shipping\</span\>  
\<span class="text-sm font-medium"\>Vận chuyển\</span\>  
\</a\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>bar\_chart\</span\>  
\<span class="text-sm font-medium"\>Báo cáo \&amp; Thống kê\</span\>  
\</a\>  
\</div\>  
\</div\>  
\<div class="h-px bg-slate-800 mx-3"\>\</div\>  
\<div\>  
\<div class="px-3 mb-3"\>  
\<p class="text-xs font-bold text-slate-500 uppercase tracking-wider"\>Quản trị\</p\>  
\</div\>  
\<div class="flex flex-col gap-1"\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>group\</span\>  
\<span class="text-sm font-medium"\>Nhân viên\</span\>  
\</a\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>folder\_shared\</span\>  
\<span class="text-sm font-medium"\>Tài liệu\</span\>  
\</a\>  
\<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all group" href="\#"\>  
\<span class="material-symbols-outlined text-\[20px\] group-hover:scale-110 transition-transform"\>settings\_suggest\</span\>  
\<span class="text-sm font-medium"\>Cấu hình hệ thống\</span\>  
\</a\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="mt-auto p-4 border-t border-slate-800"\>  
\<div class="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-4 text-white relative overflow-hidden group cursor-pointer"\>  
\<div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"\>  
\<span class="material-symbols-outlined text-\[64px\]"\>rocket\_launch\</span\>  
\</div\>  
\<div class="relative z-10"\>  
\<div class="flex items-center justify-between mb-2"\>  
\<span class="material-symbols-outlined text-white/90"\>workspace\_premium\</span\>  
\<span class="bg-white/20 backdrop-blur-md text-\[10px\] font-bold px-2 py-0.5 rounded text-white border border-white/10"\>PRO PLAN\</span\>  
\</div\>  
\<p class="text-sm font-bold mb-1"\>Nâng cấp gói?\</p\>  
\<p class="text-xs text-teal-100 mb-3 leading-relaxed"\>Mở khóa tính năng AI dự báo tồn kho và quản lý đa chi nhánh.\</p\>  
\<button class="w-full bg-white text-primary-dark text-xs font-bold py-2 rounded shadow hover:bg-teal-50 transition-colors"\>Xem chi tiết\</button\>  
\</div\>  
\</div\>  
\</div\>  
\</aside\>  
\<main class="flex-1 flex flex-col overflow-y-auto bg-background-light dark:bg-background-dark scroll-smooth"\>  
\<div class="p-6 md:p-8 w-full max-w-\[1600px\] mx-auto flex flex-col gap-6"\>  
\<div class="flex flex-col md:flex-row md:items-end justify-between gap-4"\>  
\<div\>  
\<nav aria-label="Breadcrumb" class="flex mb-2"\>  
\<ol class="inline-flex items-center space-x-1 md:space-x-3"\>  
\<li class="inline-flex items-center"\>  
\<a class="inline-flex items-center text-xs font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white" href="\#"\>  
\<span class="material-symbols-outlined text-\[16px\] mr-1"\>home\</span\>  
                                Trang chủ  
                                \</a\>  
\</li\>  
\<li\>  
\<div class="flex items-center"\>  
\<span class="material-symbols-outlined text-slate-400 text-\[16px\]"\>chevron\_right\</span\>  
\<span class="ml-1 text-xs font-medium text-slate-500 md:ml-2 dark:text-slate-400"\>Quản lý\</span\>  
\</div\>  
\</li\>  
\<li aria-current="page"\>  
\<div class="flex items-center"\>  
\<span class="material-symbols-outlined text-slate-400 text-\[16px\]"\>chevron\_right\</span\>  
\<span class="ml-1 text-xs font-medium text-primary md:ml-2"\>Danh sách kho\</span\>  
\</div\>  
\</li\>  
\</ol\>  
\</nav\>  
\<h1 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight"\>Quản lý kho hàng\</h1\>  
\<p class="text-slate-500 dark:text-slate-400 mt-1 text-sm"\>Quản lý tất cả các địa điểm kho và trung tâm phân phối của doanh nghiệp.\</p\>  
\</div\>  
\<div class="flex gap-3"\>  
\<button class="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all font-medium text-sm"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>download\</span\>  
\<span\>Xuất Excel\</span\>  
\</button\>  
\<button class="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg shadow-lg shadow-teal-500/30 transition-all font-medium text-sm"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>add\</span\>  
\<span\>Thêm kho mới\</span\>  
\</button\>  
\</div\>  
\</div\>  
\<div class="bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row gap-2 items-center justify-between sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80"\>  
\<div class="w-full lg:w-96 p-2"\>  
\<div class="relative group"\>  
\<span class="absolute left-3 top-1/2 \-translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined"\>search\</span\>  
\<input class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white placeholder:text-slate-500" placeholder="Tìm theo tên kho, mã kho hoặc địa chỉ..." type="text"/\>  
\</div\>  
\</div\>  
\<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto p-2"\>  
\<div class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0"\>  
\<div class="relative"\>  
\<select class="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-\[130px\]"\>  
\<option\>Khu vực: Tất cả\</option\>  
\<option\>Miền Bắc\</option\>  
\<option\>Miền Trung\</option\>  
\<option\>Miền Nam\</option\>  
\</select\>  
\<span class="material-symbols-outlined absolute right-2 top-1/2 \-translate-y-1/2 text-slate-400 pointer-events-none text-lg"\>expand\_more\</span\>  
\</div\>  
\<div class="relative"\>  
\<select class="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-\[130px\]"\>  
\<option\>Loại kho: Tất cả\</option\>  
\<option\>Kho thường\</option\>  
\<option\>Kho lạnh\</option\>  
\<option\>Kho ngoại quan\</option\>  
\</select\>  
\<span class="material-symbols-outlined absolute right-2 top-1/2 \-translate-y-1/2 text-slate-400 pointer-events-none text-lg"\>expand\_more\</span\>  
\</div\>  
\<div class="relative"\>  
\<select class="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-\[130px\]"\>  
\<option\>Trạng thái: Tất cả\</option\>  
\<option\>Hoạt động\</option\>  
\<option\>Đang bảo trì\</option\>  
\<option\>Đầy kho\</option\>  
\</select\>  
\<span class="material-symbols-outlined absolute right-2 top-1/2 \-translate-y-1/2 text-slate-400 pointer-events-none text-lg"\>expand\_more\</span\>  
\</div\>  
\</div\>  
\<div class="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block"\>\</div\>  
\<div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1"\>  
\<button class="p-1.5 rounded-md bg-white dark:bg-slate-700 shadow-sm text-primary ring-1 ring-black/5 dark:ring-white/10"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>grid\_view\</span\>  
\</button\>  
\<button class="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 transition-colors"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>view\_list\</span\>  
\</button\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"\>  
\<div class="bg-white dark:bg-slate-900 rounded-xl p-0 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/40 transition-all duration-300 group flex flex-col h-full"\>  
\<div class="p-5 flex-1"\>  
\<div class="flex justify-between items-start mb-4"\>  
\<div\>  
\<div class="flex items-center gap-2 mb-1"\>  
\<h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors"\>Kho CNC Hòa Lạc\</h3\>  
\<span class="flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-\[10px\] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/50"\>  
\<span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"\>\</span\>  
                                        Hoạt động  
                                    \</span\>  
\</div\>  
\<p class="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1"\>  
\<span class="material-symbols-outlined text-\[14px\]"\>qr\_code\_2\</span\>  
                                    WH-HAN-001  
                                \</p\>  
\</div\>  
\<div class="relative"\>  
\<button class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>more\_vert\</span\>  
\</button\>  
\</div\>  
\</div\>  
\<div class="h-36 w-full rounded-lg bg-slate-100 dark:bg-slate-800 mb-4 bg-cover bg-center overflow-hidden relative group-hover:shadow-md transition-all" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAnDeg8XvT1v3O7LHtAesTNnLEAkOQ2q9y9E6jIN5bTXBQJM6Xl7yKhaBdzPNjAnRdttybSMzzzeEJGH4hGyunmH2DHaXUAwu6ayNzL6G8wgw4vA1NSIEjs\_KqSrAnXJwuZBNUxrAecEzy\_0RnlUIG2xAx1f4\_rClnxMHjvEJvHBwgs-LTeq9IYIS3VqY0yz2JsWYOQJk\_4Vac14B7OiRqRsgw1CCPTDg41BFH2O0qCeMc0jx3SMby5KuNGb4Y0soACrac4Kn\_k0lkr');"\>  
\<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"\>\</div\>  
\<div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white"\>  
\<div class="flex items-center gap-1.5 text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10"\>  
\<span class="material-symbols-outlined text-\[14px\] text-sky-400"\>location\_on\</span\>  
                                    Khu CNC Hòa Lạc, HN  
                                \</div\>  
\</div\>  
\</div\>  
\<div class="grid grid-cols-2 gap-4 mb-5"\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Diện tích\</span\>  
\<div class="flex items-baseline gap-1"\>  
\<span class="font-semibold text-slate-900 dark:text-white"\>5,000\</span\>  
\<span class="text-xs text-slate-500"\>m²\</span\>  
\</div\>  
\</div\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Loại kho\</span\>  
\<div class="flex items-center gap-1"\>  
\<span class="font-semibold text-slate-900 dark:text-white truncate"\>Công Nghệ\</span\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="mb-2"\>  
\<div class="flex justify-between text-xs mb-2 font-medium"\>  
\<span class="text-slate-500"\>Sức chứa\</span\>  
\<span class="text-primary font-bold"\>75%\</span\>  
\</div\>  
\<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700"\>  
\<div class="bg-gradient-to-r from-primary-light to-primary h-2.5 rounded-full transition-all duration-1000 ease-out" style="width: 75%"\>\</div\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="flex items-center justify-between px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 rounded-b-xl"\>  
\<div class="flex items-center gap-3"\>  
\<div class="relative"\>  
\<img alt="Manager" class="size-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWnzbzJ0mFFgG7kC2jey2qFfqtF\_RJJCz-32-NGGznoQeBlBkseuf1lNE7Wp0lnmkz5ZayFJ8RyCM4EM3rdmiCB2qtf-4fUiBEyVNV6UlXg57p8E\_h67Zyu0DTAMttgI8TeijsXshpkLgVqRl2pbpgV98\_npiRbEcaov0nk7vQ26x4poaTui1gCv918oDHA20-R7rpr9iidKsZnuQEqLT5UMh-Q1Uza-jAb84a3SDuDTup1AGGqceUzAGV3FToRu8SASqOMUvwFuB1"/\>  
\<div class="absolute \-bottom-0.5 \-right-0.5 size-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"\>\</div\>  
\</div\>  
\<div class="flex flex-col"\>  
\<span class="text-\[10px\] text-slate-400 uppercase font-bold tracking-wider"\>Quản lý\</span\>  
\<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"\>Nguyễn Văn A\</span\>  
\</div\>  
\</div\>  
\<div class="flex gap-1"\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors tooltip" title="Gửi email"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>mail\</span\>  
\</button\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>call\</span\>  
\</button\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="bg-white dark:bg-slate-900 rounded-xl p-0 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/40 transition-all duration-300 group flex flex-col h-full"\>  
\<div class="p-5 flex-1"\>  
\<div class="flex justify-between items-start mb-4"\>  
\<div\>  
\<div class="flex items-center gap-2 mb-1"\>  
\<h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors"\>Kho Tân Bình\</h3\>  
\<span class="flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-\[10px\] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-100 dark:border-amber-800/50"\>  
\<span class="material-symbols-outlined text-\[12px\]"\>build\</span\>  
                                        Bảo trì  
                                    \</span\>  
\</div\>  
\<p class="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1"\>  
\<span class="material-symbols-outlined text-\[14px\]"\>qr\_code\_2\</span\>  
                                    WH-SGN-025  
                                \</p\>  
\</div\>  
\<div class="relative"\>  
\<button class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>more\_vert\</span\>  
\</button\>  
\</div\>  
\</div\>  
\<div class="h-36 w-full rounded-lg bg-slate-100 dark:bg-slate-800 mb-4 bg-cover bg-center overflow-hidden relative group-hover:shadow-md transition-all" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAsZqDhy2hVsaaiQ0N1WU\_1Y\_cwWVKdn0avqhs4c2COuCeA\_cuhTraVmQAGeVrqs082TS2\_jZ4N\_GdIFswiEfob-xqjGEzQz1mNGFMTGRNMkTGEmeZWRQD7sBHZ2tWQF9IUbWnxKAELaeng3390opxSV3v00gjpZlELamPto3K5vtTlGXjB3k212i4CC5G93KKoA-TrYqtnaCCILNc0qW6tAwNb7ob9PLnQ1moGZtLa-TiHEPTXBYZfFN5\_q4QvSVOgtBZA--VLekB8');"\>  
\<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"\>\</div\>  
\<div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white"\>  
\<div class="flex items-center gap-1.5 text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10"\>  
\<span class="material-symbols-outlined text-\[14px\] text-amber-400"\>location\_on\</span\>  
                                    Tân Bình, TP. HCM  
                                \</div\>  
\</div\>  
\</div\>  
\<div class="grid grid-cols-2 gap-4 mb-5"\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Diện tích\</span\>  
\<div class="flex items-baseline gap-1"\>  
\<span class="font-semibold text-slate-900 dark:text-white"\>2,400\</span\>  
\<span class="text-xs text-slate-500"\>m²\</span\>  
\</div\>  
\</div\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Loại kho\</span\>  
\<div class="flex items-center gap-1"\>  
\<span class="font-semibold text-slate-900 dark:text-white truncate"\>Kho Thường\</span\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="mb-2"\>  
\<div class="flex justify-between text-xs mb-2 font-medium"\>  
\<span class="text-slate-500"\>Sức chứa\</span\>  
\<span class="text-amber-500 font-bold"\>45%\</span\>  
\</div\>  
\<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700"\>  
\<div class="bg-amber-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style="width: 45%"\>\</div\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="flex items-center justify-between px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 rounded-b-xl"\>  
\<div class="flex items-center gap-3"\>  
\<div class="relative"\>  
\<img alt="Manager" class="size-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDda0gu4XVPxWv6SJKX4OgwLXM4gaCJbWKCNS2EPxhzYT3QX5HSMQ7YVUHWjMQuzbC06hFmDmkgYY6Sonmp5yNJ1E1erMKALR7Im12ZZFSLebEo3PlSqY3Uap\_DK-GAqXghAWqSsd2Oyw0phHtBQmLiBqXGqzrlSbTxd56sMF98IjgktVfKJ5rWMsMYQItRyMr0leR2SPnuMIf6126e3Y-i-q0JpG28-mH\_ZlyFdk3BSYOsKm34NCtNsH3Tyx\_BJ7Fesv6DsLB7bOL"/\>  
\</div\>  
\<div class="flex flex-col"\>  
\<span class="text-\[10px\] text-slate-400 uppercase font-bold tracking-wider"\>Quản lý\</span\>  
\<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"\>Lê Thị B\</span\>  
\</div\>  
\</div\>  
\<div class="flex gap-1"\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>mail\</span\>  
\</button\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>call\</span\>  
\</button\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="bg-white dark:bg-slate-900 rounded-xl p-0 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/40 transition-all duration-300 group flex flex-col h-full"\>  
\<div class="p-5 flex-1"\>  
\<div class="flex justify-between items-start mb-4"\>  
\<div\>  
\<div class="flex items-center gap-2 mb-1"\>  
\<h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors"\>Kho Lạnh Đà Nẵng\</h3\>  
\<span class="flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-\[10px\] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-100 dark:border-red-800/50"\>  
\<span class="material-symbols-outlined text-\[12px\]"\>warning\</span\>  
                                        Đầy kho  
                                    \</span\>  
\</div\>  
\<p class="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1"\>  
\<span class="material-symbols-outlined text-\[14px\]"\>qr\_code\_2\</span\>  
                                    WH-DAD-003  
                                \</p\>  
\</div\>  
\<div class="relative"\>  
\<button class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>more\_vert\</span\>  
\</button\>  
\</div\>  
\</div\>  
\<div class="h-36 w-full rounded-lg bg-slate-100 dark:bg-slate-800 mb-4 bg-cover bg-center overflow-hidden relative group-hover:shadow-md transition-all" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAMXE-qD9crkjSoM-GiaRYfrOrIaWPj2CwRCw9pQIYQnYB614s8HjF6NUpplUVqZ13gJw3PB7IERsBjNDizUAK-3PHDTGPfexlDeSvw74iffTAwEmZGuskZCInLoRXmEcTV\_o2fDqEoHlj4wTuwIh0icAhKs87MO3Z8eAKZGeVaYXlxXoQ2vzv5eLRGtcyEirUZyeQQYKCdd3kLNA2-6BrjLkQn9sexMVdcyYG6m5pp\_yiWSk6utTU9fY81YBGvY4YNNqaZW4wJTU94');"\>  
\<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"\>\</div\>  
\<div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white"\>  
\<div class="flex items-center gap-1.5 text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10"\>  
\<span class="material-symbols-outlined text-\[14px\] text-red-400"\>location\_on\</span\>  
                                    Cẩm Lệ, Đà Nẵng  
                                \</div\>  
\</div\>  
\</div\>  
\<div class="grid grid-cols-2 gap-4 mb-5"\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Diện tích\</span\>  
\<div class="flex items-baseline gap-1"\>  
\<span class="font-semibold text-slate-900 dark:text-white"\>1,500\</span\>  
\<span class="text-xs text-slate-500"\>m²\</span\>  
\</div\>  
\</div\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Loại kho\</span\>  
\<div class="flex items-center gap-1"\>  
\<span class="material-symbols-outlined text-\[14px\] text-sky-500"\>ac\_unit\</span\>  
\<span class="font-semibold text-slate-900 dark:text-white truncate"\>Kho Lạnh\</span\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="mb-2"\>  
\<div class="flex justify-between text-xs mb-2 font-medium"\>  
\<span class="text-slate-500"\>Sức chứa\</span\>  
\<span class="text-red-500 font-bold"\>98%\</span\>  
\</div\>  
\<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700"\>  
\<div class="bg-red-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style="width: 98%"\>\</div\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="flex items-center justify-between px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 rounded-b-xl"\>  
\<div class="flex items-center gap-3"\>  
\<div class="relative"\>  
\<img alt="Manager" class="size-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCE5a8e-DBwkgbMkf5u9cYNw339zus4S1Mx3bECS9KhhiDduNutqSBQeJy29alxu1Wcw90aS0pBji4d\_M8wNNJ3PTxxhFQgdCArpKiPjJOgR57I\_SZ3p378dvipmZwFZ33Q-c0mq8CpD0XWs8KMx0mDg\_ZJle6uUi\_X0-bscdd4T0y3lNxXpLOGmUoRHNdNDpQu8uopHvqlN2O5SPVjsOeWnvNFvLEEcpvZvbl6IM6-Nvty0Uliwno6imxTjga3wQkDOC\_mX76bKlRP"/\>  
\</div\>  
\<div class="flex flex-col"\>  
\<span class="text-\[10px\] text-slate-400 uppercase font-bold tracking-wider"\>Quản lý\</span\>  
\<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"\>Phạm Văn C\</span\>  
\</div\>  
\</div\>  
\<div class="flex gap-1"\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>mail\</span\>  
\</button\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>call\</span\>  
\</button\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="bg-white dark:bg-slate-900 rounded-xl p-0 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/40 transition-all duration-300 group flex flex-col h-full"\>  
\<div class="p-5 flex-1"\>  
\<div class="flex justify-between items-start mb-4"\>  
\<div\>  
\<div class="flex items-center gap-2 mb-1"\>  
\<h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors"\>Kho Ngoại Quan VSIP\</h3\>  
\<span class="flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-\[10px\] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/50"\>  
\<span class="size-1.5 rounded-full bg-emerald-500"\>\</span\>  
                                        Hoạt động  
                                    \</span\>  
\</div\>  
\<p class="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1"\>  
\<span class="material-symbols-outlined text-\[14px\]"\>qr\_code\_2\</span\>  
                                    WH-BIN-004  
                                \</p\>  
\</div\>  
\<div class="relative"\>  
\<button class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"\>  
\<span class="material-symbols-outlined text-\[20px\]"\>more\_vert\</span\>  
\</button\>  
\</div\>  
\</div\>  
\<div class="h-36 w-full rounded-lg bg-slate-100 dark:bg-slate-800 mb-4 bg-cover bg-center overflow-hidden relative group-hover:shadow-md transition-all" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuArT1CAuQlO4C7a7RSjXwTKv2zGpl\_vEP0iwXq3BwHcuDzKdgSFYgnOAhzabUftkwxqGMzRtvwYaY01HjJj0dqX7dEv4JYzclSaXN8LtjTfgrvr6SsIdYAYfjBAEKZSN8doT8OPtidvxGB9AUvlzVQUi48eHZXMlqgcJ5nXLuKTrlJc0vP7lOAu3gt-i2yimBB36cFtS8dReZ8sz7U7p4ehdrFJ2lFZ1V5w6TqavtkiKBy2zGByp-ZmAIq9W65etEHk1AX4ctQvNPnp');"\>  
\<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"\>\</div\>  
\<div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white"\>  
\<div class="flex items-center gap-1.5 text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10"\>  
\<span class="material-symbols-outlined text-\[14px\] text-emerald-400"\>location\_on\</span\>  
                                    Thuận An, Bình Dương  
                                \</div\>  
\</div\>  
\</div\>  
\<div class="grid grid-cols-2 gap-4 mb-5"\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Diện tích\</span\>  
\<div class="flex items-baseline gap-1"\>  
\<span class="font-semibold text-slate-900 dark:text-white"\>10,000\</span\>  
\<span class="text-xs text-slate-500"\>m²\</span\>  
\</div\>  
\</div\>  
\<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800"\>  
\<span class="text-slate-500 text-xs block mb-1"\>Loại kho\</span\>  
\<div class="flex items-center gap-1"\>  
\<span class="material-symbols-outlined text-\[14px\] text-indigo-500"\>public\</span\>  
\<span class="font-semibold text-slate-900 dark:text-white truncate"\>Ngoại Quan\</span\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="mb-2"\>  
\<div class="flex justify-between text-xs mb-2 font-medium"\>  
\<span class="text-slate-500"\>Sức chứa\</span\>  
\<span class="text-emerald-500 font-bold"\>12%\</span\>  
\</div\>  
\<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700"\>  
\<div class="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style="width: 12%"\>\</div\>  
\</div\>  
\</div\>  
\</div\>  
\<div class="flex items-center justify-between px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 rounded-b-xl"\>  
\<div class="flex items-center gap-3"\>  
\<div class="relative"\>  
\<img alt="Manager" class="size-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN9YBdKKo68uGksplqr6popJ7rNGu28yJluqaSpORtHA2Dm5Grs8ciqmW5F-4W0rtygsXZe2eP4NdcyCJopKCT\_E\_kDsTVUswlYpqAZiOs8qy9sBwSnK37qNB7\_jsAF7ghng7mdYUxNvTuF9FrnVwbBVxsuaGsmWXnEaZilht0RnP9mWTSCtJD3neW7BS0HE16pJTAhi1keumqA6NLn8XR8p5bhnra3GrMz\_xF0sAkeTGK1b0d0L5ws6bXsqq872cdajSKsDFp8jol"/\>  
\</div\>  
\<div class="flex flex-col"\>  
\<span class="text-\[10px\] text-slate-400 uppercase font-bold tracking-wider"\>Quản lý\</span\>  
\<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"\>Hoàng Thị D\</span\>  
\</div\>  
\</div\>  
\<div class="flex gap-1"\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>mail\</span\>  
\</button\>  
\<button class="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"\>  
\<span class="material-symbols-outlined text-\[18px\]"\>call\</span\>  
\</button\>  
\</div\>  
\</div\>  
\</div\>  
\<button class="bg-slate-50/50 dark:bg-slate-800/20 rounded-xl p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-all flex flex-col items-center justify-center gap-4 group min-h-\[440px\]"\>  
\<div class="size-20 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:scale-110 group-hover:border-primary/30 transition-all duration-300"\>  
\<span class="material-symbols-outlined text-\[40px\]"\>add\</span\>  
\</div\>  
\<div class="text-center"\>  
\<h3 class="font-bold text-lg text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors"\>Tạo kho mới\</h3\>  
\<p class="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-\[200px\]"\>Thiết lập vị trí kho hàng mới vào hệ thống quản lý tập trung.\</p\>  
\</div\>  
\</button\>  
\</div\>  
\<div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 pb-6 pt-4 border-t border-slate-200 dark:border-slate-800"\>  
\<p class="text-sm text-slate-500"\>Hiển thị \<span class="font-bold text-slate-900 dark:text-white"\>1-4\</span\> trong số \<span class="font-bold text-slate-900 dark:text-white"\>12\</span\> kho hàng\</p\>  
\<div class="flex items-center gap-2"\>  
\<button class="px-3 py-2 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" disabled=""\>  
                        Trước  
                    \</button\>  
\<div class="flex items-center gap-1"\>  
\<button class="size-9 flex items-center justify-center rounded-lg bg-primary text-white font-bold shadow-sm shadow-teal-500/30"\>1\</button\>  
\<button class="size-9 flex items-center justify-center rounded-lg border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"\>2\</button\>  
\<button class="size-9 flex items-center justify-center rounded-lg border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"\>3\</button\>  
\<span class="px-1 text-slate-400"\>...\</span\>  
\<button class="size-9 flex items-center justify-center rounded-lg border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"\>8\</button\>  
\</div\>  
\<button class="px-3 py-2 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"\>  
                        Sau  
                    \</button\>  
\</div\>  
\</div\>  
\</div\>  
\</main\>  
\</div\>  
\</body\>\</html\>  
