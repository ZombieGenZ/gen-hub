"use client";

import { useEffect, useState, useRef } from "react";
import { useNotificationWizard } from "../NotificationWizardContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    UserIcon,
    UsersIcon,
    MegaphoneIcon,
    DocumentArrowUpIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { TargetAudienceType, UserRole } from "@/types/notification/notification.type";
import { UserService } from "@/services/user/user.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { User } from "@/types/user/user.type";
import { useDebounce } from "@/hooks/use-debounce";

const userService = new UserService();

interface TargetOption {
    id: TargetAudienceType;
    label: string;
    description: string;
    icon: any;
}

const targetOptions: TargetOption[] = [
    {
        id: "individual",
        label: "Cá nhân",
        description: "Gửi cho một hoặc nhiều user cụ thể",
        icon: UserIcon,
    },
    {
        id: "role",
        label: "Theo vai trò",
        description: "Gửi cho tất cả user có vai trò nhất định",
        icon: UsersIcon,
    },
    {
        id: "broadcast",
        label: "Toàn hệ thống",
        description: "Gửi cho tất cả người dùng trong hệ thống",
        icon: MegaphoneIcon,
    },
    {
        id: "import",
        label: "Import Excel",
        description: "Upload file chứa danh sách User ID",
        icon: DocumentArrowUpIcon,
    },
];

const roleOptions: { id: UserRole; label: string }[] = [
    { id: "warehouse_owner", label: "Chủ kho" },
    { id: "staff", label: "Nhân viên" },
    { id: "customer", label: "Khách thuê" },
];

export function TargetAudienceStep() {
    const { data, setData, setCanProceed, selectedUsers, setSelectedUsers } = useNotificationWizard();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Debounce search query to avoid too many API calls
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Validate and update canProceed
    useEffect(() => {
        let isValid = false;

        switch (data.targetType) {
            case "individual":
                isValid = selectedUsers.length > 0;
                break;
            case "role":
                isValid = data.selectedRoles.length > 0;
                break;
            case "broadcast":
                isValid = true;
                break;
            case "import":
                isValid = data.importedUserIds.length > 0;
                break;
        }

        setCanProceed(isValid);
    }, [data.targetType, selectedUsers, data.selectedRoles, data.importedUserIds, setCanProceed]);

    // Handle Search
    useEffect(() => {
        const searchUsers = async () => {
            if (!debouncedSearchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const token = authStorage.getAccessToken();
                if (token) {
                    const results = await userService.searchUsers(token, debouncedSearchQuery);
                    // Filter out already selected users
                    setSearchResults(results.filter(u => !selectedUsers.find(selected => selected.id === u.id)));
                    setShowSearchResults(true);
                }
            } catch (error) {
                console.error("Error searching users:", error);
            } finally {
                setIsSearching(false);
            }
        };

        searchUsers();
    }, [debouncedSearchQuery, selectedUsers]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelectUser = (user: User) => {
        const mappedUser = {
            id: user.id,
            full_name: user.name,
            email: user.email,
        };

        setSelectedUsers([...selectedUsers, mappedUser]);
        setData({ selectedUsers: [...data.selectedUsers, user.id] });
        setSearchQuery("");
        setShowSearchResults(false);
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
        setData({ selectedUsers: data.selectedUsers.filter((id) => id !== userId) });
    };

    const handleRoleToggle = (role: UserRole) => {
        const newRoles = data.selectedRoles.includes(role)
            ? data.selectedRoles.filter((r) => r !== role)
            : [...data.selectedRoles, role];
        setData({ selectedRoles: newRoles });
    };

    return (
        <div className="target-audience-step space-y-8">
            <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Chọn đối tượng nhận thông báo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Xác định nhóm người dùng bạn muốn gửi thông báo đến
                </p>
            </div>

            {/* Target Type Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {targetOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = data.targetType === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setData({ targetType: option.id })}
                            className={cn(
                                "group relative flex items-start gap-4 p-5 rounded-2xl text-left transition-all duration-200 border-2",
                                isSelected
                                    ? "border-[#0F766E] bg-[#0F766E]/5 shadow-md"
                                    : "border-border bg-card hover:border-[#0F766E]/50 hover:shadow-sm"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-3 rounded-xl transition-colors duration-200 shrink-0",
                                    isSelected
                                        ? "bg-[#0F766E] text-white shadow-sm"
                                        : "bg-muted text-muted-foreground group-hover:bg-[#0F766E]/10 group-hover:text-[#0F766E]"
                                )}
                            >
                                <Icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={cn(
                                    "font-semibold text-base transition-colors",
                                    isSelected ? "text-[#0F766E]" : "text-foreground"
                                )}>
                                    {option.label}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 leading-normal">
                                    {option.description}
                                </p>
                            </div>

                            {/* Checkmark for active state */}
                            {isSelected && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#0F766E]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content Area based on Selection */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm min-h-[120px] transition-all animate-in fade-in slide-in-from-bottom-2">

                {/* Individual User Search */}
                {data.targetType === "individual" && (
                    <div className="space-y-4" ref={wrapperRef}>
                        <div className="space-y-2">
                            <Label className="text-base">Tìm kiếm người dùng</Label>
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-[#0F766E] transition-colors" />
                                <Input
                                    placeholder="Nhập tên, email hoặc số điện thoại..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
                                    className="pl-12 h-12 rounded-xl border-muted bg-muted/30 focus:bg-background transition-all"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {/* Search Results Dropdown */}
                                {showSearchResults && (
                                    <div className="absolute top-full text-foreground left-0 right-0 mt-2 bg-white dark:bg-slate-950 border border-border/50 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 ring-1 ring-black/5">
                                        {isSearching && searchResults.length === 0 && (
                                            <div className="p-8 text-center text-muted-foreground text-sm">
                                                Đang tìm kiếm...
                                            </div>
                                        )}
                                        {!isSearching && searchResults.length === 0 && (
                                            <div className="p-8 text-center text-muted-foreground text-sm">
                                                Không tìm thấy người dùng nào phù hợp
                                            </div>
                                        )}
                                        <div className="p-1.5">
                                            {searchResults.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => handleSelectUser(user)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 transition-colors text-left group"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border group-hover:border-[#0F766E]/30 transition-colors">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            <UserIcon className="w-5 h-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-medium truncate group-hover:text-[#0F766E] transition-colors">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Users */}
                        {selectedUsers.length > 0 ? (
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Đã chọn ({selectedUsers.length})</Label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map((user) => (
                                        <Badge
                                            key={user.id}
                                            variant="secondary"
                                            className="pl-3 pr-1 py-1 h-8 rounded-lg bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border transition-all"
                                        >
                                            <span className="mr-1">{user.full_name}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveUser(user.id)}
                                                className="ml-1 w-5 h-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/10">
                                <span className="text-muted-foreground text-sm">Chưa chọn người nhận nào</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Role Selection */}
                {data.targetType === "role" && (
                    <div className="space-y-4">
                        <Label className="text-base">Chọn vai trò người nhận</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {roleOptions.map((role) => (
                                <label
                                    key={role.id}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm",
                                        data.selectedRoles.includes(role.id)
                                            ? "border-[#0F766E] bg-[#0F766E]/5 text-[#0F766E]"
                                            : "border-muted bg-card hover:border-[#0F766E]/30"
                                    )}
                                >
                                    <Checkbox
                                        checked={data.selectedRoles.includes(role.id)}
                                        onCheckedChange={() => handleRoleToggle(role.id)}
                                        className="data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                                    />
                                    <span className="font-medium">{role.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Broadcast Warning */}
                {data.targetType === "broadcast" && (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                            <MegaphoneIcon className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div className="max-w-md space-y-2">
                            <h4 className="text-lg font-semibold text-foreground">Gửi thông báo toàn hệ thống</h4>
                            <p className="text-muted-foreground text-sm">
                                Thông báo này sẽ được gửi đến tất cả người dùng trong hệ thống (bao gồm cả nhân viên và khách hàng).
                                Vui lòng kiểm tra kỹ nội dung trước khi gửi.
                            </p>
                        </div>
                    </div>
                )}

                {/* Import Excel */}
                {data.targetType === "import" && (
                    <div className="space-y-4">
                        <Label className="text-base">Upload danh sách người dùng</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 hover:border-[#0F766E]/50 hover:bg-[#0F766E]/5 rounded-xl p-10 text-center transition-all cursor-pointer group">
                            <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <DocumentArrowUpIcon className="w-6 h-6 text-muted-foreground group-hover:text-[#0F766E]" />
                            </div>
                            <h4 className="font-medium text-foreground mb-1">Kéo thả file Excel vào đây</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Hoặc click để chọn file từ máy tính
                            </p>
                            <Button variant="outline" className="rounded-full px-6">
                                Chọn file
                            </Button>
                            <div className="mt-6 pt-6 border-t border-border w-full max-w-xs mx-auto">
                                <p className="text-xs text-muted-foreground">
                                    File cần định dạng .xlsx hoặc .csv và chứa cột
                                    <code className="mx-1 px-1 py-0.5 bg-muted rounded font-mono text-foreground">user_id</code>
                                    hoặc <code className="mx-1 px-1 py-0.5 bg-muted rounded font-mono text-foreground">email</code>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
