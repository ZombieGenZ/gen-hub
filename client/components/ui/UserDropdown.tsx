"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  Bars3Icon,
  ArrowLeftEndOnRectangleIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";
import { authStorage } from "@/services/auth/auth-storage.service";
import { authService } from "@/services/auth/auth.service";
import { UserService } from "@/services/user/user.service";
import { useToast } from "@/contexts/ToastContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { useProfileModal } from "@/contexts/ProfileModalContext";

interface UserDropdownProps {
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
    roles?: string[];
  };
  onLogout?: () => void;
  children?: React.ReactNode;
}

const userService = new UserService();

const UserDropdown: React.FC<UserDropdownProps> = ({ user, onLogout, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { openModal } = useProfileModal();
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use token as primary source of auth state, fallback to user prop
  const token = authStorage.getAccessToken();
  const isAuth = !!token || !!user;
  
  // Get user data from token if user prop is not available
  const [userDataFromToken, setUserDataFromToken] = useState<any>(null);
  
  useEffect(() => {
    const fetchUserData = async () => {
      const refreshToken = authStorage.getRefreshToken();
      if (token && refreshToken && !user) {
        try {
          const data = await userService.getUser(token, refreshToken);
          setUserDataFromToken(data);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      }
    };
    
    fetchUserData();
  }, [token, user]);
  
  // Default user data if not provided
  const defaultName = user?.name || userDataFromToken?.user?.name || "Người dùng";
  const userData = {
    name: defaultName,
    email: user?.email || userDataFromToken?.user?.email || "user@example.com",
    avatar: user?.avatar || userDataFromToken?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=334155&color=fff`,
  };

  const handleProfile = () => {
    setIsOpen(false);
    openModal();
  };

  const handleSettings = () => {
    setIsOpen(false);
    router.push("/user/settings");
  };

  const handleLogout = async () => {
    setIsOpen(false);

    const token = authStorage.getAccessToken();
    const refresh_token = authStorage.getRefreshToken();

    if (token && refresh_token) {
      try {
        const response = await authService.logout(token, refresh_token);
        if (response?.message) {
          showToast(response.message, 'success');
        } else {
          showToast("Đăng xuất thành công", 'success');
        }
      } catch (error) {
        console.error("Logout failed:", error);
        showToast("Đăng xuất hoàn tất", 'info');
      }
    } else {
      showToast("Đã đăng xuất", 'info');
    }

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
      icon: Squares2X2Icon,
      label: "Dashboard",
      onClick: () => {
        setIsOpen(false);
        const roles = user?.roles || userDataFromToken?.roles || [];
        // Check for ADMIN role (case-insensitive)
        if (roles.some((role: any) => typeof role === 'string' ? role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ADMINISTRATOR' : role.name.toUpperCase() === 'ADMIN' || role.name.toUpperCase() === 'ADMINISTRATOR')) {
          router.push("/dashboard/admin");
        } else {
          router.push("/dashboard/organization");
        }
      },
    },
    {
      icon: UserCircleIcon,
      label: "Profile",
      onClick: handleProfile,
    },
    {
      icon: Cog6ToothIcon,
      label: "Cài đặt",
      onClick: handleSettings,
    },
    {
      icon: ArrowRightStartOnRectangleIcon,
      label: "Đăng xuất",
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <>

      {/* Dropdown Menu - Radix UI handles portaling content automatically (usually z-50) */}
      {/* We need Content to be > z-[60]. Default z-50 is too low. We'll override. */}
      {/* Also modal={false} so our manual backdrop handles interaction/visuals */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-2 rounded-full px-2 py-1 transition-all duration-300 hover:bg-muted hover:px-4 focus:outline-none"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            {isAuth ? (
              <>
                <div className="relative group/avatar">
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
                        // Use a neutral gray background for fallback avatar to match theme better
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=334155&color=fff`;
                      }}
                    />
                  </div>
                  {/* Online status indicator - Border matches muted background of the parent pill */}
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-muted bg-green-500" />
                </div>

                {/* Chevron indicator */}
                <span className="hidden md:block max-w-[100px] truncate text-sm font-medium text-foreground">
                  {userData.name}
                </span>

                <ChevronDownIcon
                  className={`
                h-4 w-4 text-muted-foreground transition-transform duration-300
                ${isOpen ? "rotate-180" : ""}
                `}
                />
              </>
            ) : (
              <div className="p-1">
                <Bars3Icon className="h-6 w-6 text-foreground" />
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        {/* Override content z-index to be higher than our manual backdrop (z-99) */}
        <DropdownMenuContent
          className="z-[100] w-64 p-0 rounded-xl overflow-visible border-none bg-transparent shadow-none"
          align="end"
          sideOffset={8}
          onCloseAutoFocus={(e) => e.preventDefault()} // Prevent focus jump to body
        >
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl pointer-events-auto">
            {/* Navigation / Children */}
            {children && (
              <div className="py-1">
                {children}
              </div>
            )}

            {isAuth ? (
              <>
                {/* User info header */}
                <div className="border-t border-b border-border bg-muted/40 px-4 py-3">
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
                      <p className="truncate text-sm font-semibold text-foreground">
                        {userData.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
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
                            hover:bg-muted hover:pl-5
                            active:scale-[0.98]
                            ${item.danger
                          ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "text-foreground"
                        }
                        `}
                    >
                      <item.icon
                        className={`
                            h-5 w-5 transition-all duration-200
                            group-hover:scale-110
                            ${item.danger
                            ? "text-red-500 group-hover:text-red-600"
                            : "text-muted-foreground group-hover:text-primary"
                          }
                            `}
                      />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Auth Items */
              <div className="py-2 border-t border-border">
                <button
                  onClick={() => { setIsOpen(false); router.push('/login'); }}
                  className="group flex w-full items-center gap-3 px-4 py-2.5 text-foreground hover:bg-muted hover:pl-5 transition-all duration-200"
                >
                  <ArrowLeftEndOnRectangleIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">Đăng Nhập</span>
                </button>
                <button
                  onClick={() => { setIsOpen(false); router.push('/register'); }}
                  className="group flex w-full items-center gap-3 px-4 py-2.5 text-primary font-semibold hover:bg-muted hover:pl-5 transition-all duration-200"
                >
                  <UserPlusIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm">Đăng Ký</span>
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border bg-muted/40 px-4 py-2">
              <p className="text-center text-xs text-muted-foreground">
                © 2026 GenHub
              </p>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default UserDropdown;
