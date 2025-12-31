"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Settings, User, LogOut, ChevronDown } from "lucide-react";
import { authStorage } from "@/services/auth/auth-storage.service";

interface UserDropdownProps {
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Default user data if not provided
  const defaultName = user?.name || "Người dùng";
  const userData = {
    name: defaultName,
    email: user?.email || "user@example.com",
    avatar: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=6366f1&color=fff`,
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleProfile = () => {
    setIsOpen(false);
    router.push("/user/profile");
  };

  const handleSettings = () => {
    setIsOpen(false);
    router.push("/user/settings");
  };

  const handleLogout = async () => {
    setIsOpen(false);
    
    // Clear auth tokens using authStorage service
    authStorage.clearTokens();

    // Call custom logout handler if provided
    if (onLogout) {
      onLogout();
    }

    // Redirect to home
    router.push("/");
    router.refresh();
  };

  const menuItems = [
    {
      icon: User,
      label: "Hồ sơ",
      onClick: handleProfile,
    },
    {
      icon: Settings,
      label: "Cài đặt",
      onClick: handleSettings,
    },
    {
      icon: LogOut,
      label: "Đăng xuất",
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <>
      {/* Backdrop blur overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div ref={dropdownRef} className="relative z-50">
        {/* Dropdown Trigger */}
        <button
          onClick={toggleDropdown}
          className="flex items-center gap-2 rounded-full p-1 transition-all duration-300 hover:bg-gray-100 hover:px-4 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {/* Avatar */}
          <div className="relative group">
            <div
              className={`
                relative h-10 w-10 overflow-hidden rounded-full border-2 border-transparent
                transition-all duration-300 ease-out
                group-hover:scale-110 group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/25
                ${isOpen ? "scale-110 border-primary shadow-lg shadow-primary/25" : ""}
              `}
            >
              <Image
                src={userData.avatar}
                alt={userData.name}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=6366f1&color=fff`;
                }}
              />
            </div>
            {/* Online status indicator */}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
          </div>

          {/* Settings gear icon */}
          <Settings
            className={`
              h-5 w-5 text-gray-500 transition-all duration-300
              hover:text-primary hover:rotate-90
              ${isOpen ? "text-primary rotate-90" : ""}
            `}
          />

          {/* Chevron indicator */}
          <ChevronDown
            className={`
              h-4 w-4 text-gray-400 transition-transform duration-300
              ${isOpen ? "rotate-180" : ""}
            `}
          />
        </button>

        {/* Dropdown Menu */}
        <div
          className={`
            absolute right-0 mt-3 w-64 origin-top-right
            transition-all duration-300 ease-out
            ${isOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
            }
          `}
        >
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            {/* User info header */}
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={userData.avatar}
                    alt={userData.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=6366f1&color=fff`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {userData.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {userData.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`
                    group flex w-full items-center gap-3 px-4 py-2.5
                    transition-all duration-200 ease-out
                    hover:bg-gray-100 hover:pl-5
                    active:scale-[0.98]
                    dark:hover:bg-gray-800
                    ${item.danger
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      : "text-gray-700 dark:text-gray-300"
                    }
                  `}
                >
                  <item.icon
                    className={`
                      h-5 w-5 transition-all duration-200
                      group-hover:scale-110
                      ${item.danger
                        ? "text-red-500 group-hover:text-red-600"
                        : "text-gray-400 group-hover:text-primary"
                      }
                    `}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-center text-xs text-gray-400">
                © 2026 GenHub
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDropdown;
