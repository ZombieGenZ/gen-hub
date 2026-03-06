"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    UserPlus,
    Filter,
    ArrowUpDown,
    MoreVertical,
    Trash2,
    ShieldCheck,
    UserCog,
    Clock,
    XCircle,
    CheckCircle2,
} from "lucide-react";
import { AddMemberDialog } from "./AddMemberDialog";
import { OrganizationMember } from "@/types/organization/organization_member.type";
import { OrganizationRole } from "@/types/organization/organization_role.type";

interface OrgMembersTabProps {
    members: OrganizationMember[];
    orgRoles: OrganizationRole[];
    onInviteMembers: (emails: string[]) => Promise<void>;
    onRemoveMember: (memberId: string) => Promise<void>;
    onAssignRoles: (memberId: string, roleIds: string[]) => Promise<void>;
    onCancelInvite?: (memberId: string) => Promise<void>;
    /** true = System Admin view (read-only), false = Org Owner view */
    isAdminView?: boolean;
}

export function OrgMembersTab({
    members,
    orgRoles,
    onInviteMembers,
    onRemoveMember,
    onAssignRoles,
    onCancelInvite,
    isAdminView = false,
}: OrgMembersTabProps) {
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<"all" | "accepted" | "pending">("all");
    const [sortBy, setSortBy] = useState<"joined" | "name">("joined");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const filteredMembers = useMemo(() => {
        let filtered = [...members];

        // Filter by search
        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter(
                (m) =>
                    m.user.full_name.toLowerCase().includes(q) ||
                    m.user.email.toLowerCase().includes(q) ||
                    m.user.phone?.includes(q) ||
                    m.display_name?.toLowerCase().includes(q)
            );
        }

        // Filter by role
        if (filterRole) {
            filtered = filtered.filter((m) =>
                m.roles.some((r) => r.id === filterRole || r.name === filterRole)
            );
        }

        // Filter by status
        if (filterStatus === "accepted") {
            filtered = filtered.filter((m) => m.is_accepted);
        } else if (filterStatus === "pending") {
            filtered = filtered.filter((m) => !m.is_accepted);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === "joined") {
                const diff =
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                return sortDir === "asc" ? diff : -diff;
            }
            const diff = a.user.full_name.localeCompare(b.user.full_name);
            return sortDir === "asc" ? diff : -diff;
        });

        return filtered;
    }, [members, search, filterRole, filterStatus, sortBy, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
    const paginatedMembers = filteredMembers.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const acceptedCount = members.filter((m) => m.is_accepted).length;
    const pendingCount = members.filter((m) => !m.is_accepted).length;

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

    const getRoleLabel = (member: OrganizationMember) => {
        if (member.is_owner) return "Owner";
        if (member.roles.length > 0) return member.roles.map((r) => r.name).join(", ");
        return "Member";
    };

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Thành viên</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {acceptedCount} thành viên
                                {pendingCount > 0 && ` · ${pendingCount} đang chờ`}
                            </p>
                        </div>
                        {!isAdminView && (
                            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                                <UserPlus className="w-4 h-4" />
                                Mời thành viên
                            </Button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-border/30 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Status filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Filter className="w-3.5 h-3.5" />
                                    Trạng thái
                                    {filterStatus !== "all" && (
                                        <Badge variant="secondary" className="ml-1 text-[10px]">
                                            {filterStatus === "accepted" ? "Đã tham gia" : "Đang chờ"}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => { setFilterStatus("all"); setPage(1); }} className="cursor-pointer">
                                    Tất cả
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setFilterStatus("accepted"); setPage(1); }} className="cursor-pointer">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-500" />
                                    Đã tham gia
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setFilterStatus("pending"); setPage(1); }} className="cursor-pointer">
                                    <Clock className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                    Đang chờ
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Role filter */}
                        {orgRoles.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Vai trò
                                        {filterRole && (
                                            <Badge variant="secondary" className="ml-1 text-[10px]">
                                                {orgRoles.find((r) => r.id === filterRole)?.name || filterRole}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                        onClick={() => { setFilterRole(null); setPage(1); }}
                                        className="cursor-pointer"
                                    >
                                        Tất cả vai trò
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {orgRoles.map((r) => (
                                        <DropdownMenuItem
                                            key={r.id}
                                            onClick={() => { setFilterRole(r.id); setPage(1); }}
                                            className="cursor-pointer"
                                        >
                                            {r.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Sort */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    Sắp xếp
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => { setSortBy("joined"); setSortDir("desc"); }} className="cursor-pointer">
                                    Ngày tham gia ↓
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortBy("joined"); setSortDir("asc"); }} className="cursor-pointer">
                                    Ngày tham gia ↑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSortBy("name"); setSortDir("asc"); }} className="cursor-pointer">
                                    Tên A-Z
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSortBy("name"); setSortDir("desc"); }} className="cursor-pointer">
                                    Tên Z-A
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Members Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/30 border-b border-border/30">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Người dùng
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <button
                                        onClick={() => {
                                            setSortBy("joined");
                                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                                        }}
                                        className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        Ngày tham gia
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Vai trò
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {paginatedMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <p className="text-sm">Không tìm thấy thành viên nào.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                                        {getInitials(member.user.full_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {member.display_name || member.user.full_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {member.user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.is_accepted ? (
                                                <Badge variant="secondary" className="text-[10px] gap-1 bg-green-500/10 text-green-600 border-green-200">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Đã tham gia
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-200">
                                                    <Clock className="w-3 h-3" />
                                                    Đang chờ
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {new Date(member.created_at).toLocaleDateString("vi-VN", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.is_owner ? (
                                                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                    Owner
                                                </Badge>
                                            ) : !isAdminView && member.is_accepted ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors cursor-pointer">
                                                            {getRoleLabel(member)}
                                                            <ArrowUpDown className="w-3 h-3 ml-1" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-48">
                                                        {orgRoles.map((r) => {
                                                            const hasRole = member.roles.some((mr) => mr.id === r.id);
                                                            return (
                                                                <DropdownMenuItem
                                                                    key={r.id}
                                                                    onClick={() => {
                                                                        const newRoleIds = hasRole
                                                                            ? member.roles.filter((mr) => mr.id !== r.id).map((mr) => mr.id)
                                                                            : [...member.roles.map((mr) => mr.id), r.id];
                                                                        onAssignRoles(member.id, newRoleIds);
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                                                                    {r.name}
                                                                    {hasRole && (
                                                                        <span className="ml-auto text-primary text-xs">✓</span>
                                                                    )}
                                                                </DropdownMenuItem>
                                                            );
                                                        })}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    {getRoleLabel(member)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {!isAdminView && !member.is_owner && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {member.is_accepted ? (
                                                            <>
                                                                <DropdownMenuItem className="cursor-pointer">
                                                                    <UserCog className="w-3.5 h-3.5 mr-2" />
                                                                    Đổi vai trò
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => onRemoveMember(member.id)}
                                                                    className="cursor-pointer text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                                    Xóa thành viên
                                                                </DropdownMenuItem>
                                                            </>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => onCancelInvite?.(member.id)}
                                                                className="cursor-pointer text-destructive focus:text-destructive"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5 mr-2" />
                                                                Hủy lời mời
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border/30 flex items-center justify-end gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Trước
                            </button>
                            <span className="font-medium text-foreground">{page}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!isAdminView && (
                <AddMemberDialog
                    open={addDialogOpen}
                    onOpenChange={setAddDialogOpen}
                    onSubmit={onInviteMembers}
                />
            )}
        </div>
    );
}
