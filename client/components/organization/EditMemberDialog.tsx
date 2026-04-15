"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User } from "lucide-react";
import { OrganizationMember } from "@/types/organization/organization_member.type";
import { OrganizationRole } from "@/types/organization/organization_role.type";

interface EditMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: OrganizationMember | null;
    orgRoles: OrganizationRole[];
    onSubmit: (memberId: string, displayName: string, roleIds: string[]) => Promise<void>;
}

export function EditMemberDialog({
    open,
    onOpenChange,
    member,
    orgRoles,
    onSubmit,
}: EditMemberDialogProps) {
    const [displayName, setDisplayName] = useState("");
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (member) {
            setDisplayName(member.display_name ?? "");
            setSelectedRoleIds(member.roles.map((r) => r.id));
            setError(null);
        }
    }, [member]);

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

    const toggleRole = (roleId: string) => {
        setSelectedRoleIds((prev) =>
            prev.includes(roleId)
                ? prev.filter((id) => id !== roleId)
                : [...prev, roleId]
        );
    };

    const handleSubmit = async () => {
        if (!member) return;
        setLoading(true);
        setError(null);
        try {
            await onSubmit(member.id, displayName.trim(), selectedRoleIds);
            onOpenChange(false);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Cập nhật thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) setError(null);
        onOpenChange(isOpen);
    };

    if (!member) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Sửa thành viên</DialogTitle>
                    <DialogDescription>
                        Cập nhật tên hiển thị và vai trò của thành viên trong tổ chức
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-5">
                    {/* Member info */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                                {getInitials(member.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{member.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                        </div>
                    </div>

                    {/* Display name */}
                    <div className="space-y-2">
                        <Label htmlFor="display-name" className="text-sm font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            Tên hiển thị trong tổ chức
                        </Label>
                        <Input
                            id="display-name"
                            placeholder={member.user.name}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            Để trống để dùng tên tài khoản mặc định
                        </p>
                    </div>

                    {/* Roles */}
                    {orgRoles.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Vai trò</Label>
                            <div className="space-y-2 rounded-xl border border-border/50 p-3">
                                {orgRoles.map((role) => (
                                    <label
                                        key={role.id}
                                        className="flex items-start gap-3 cursor-pointer select-none group"
                                    >
                                        <Checkbox
                                            id={`role-${role.id}`}
                                            checked={selectedRoleIds.includes(role.id)}
                                            onCheckedChange={() => toggleRole(role.id)}
                                            className="mt-0.5"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                {role.name}
                                            </p>
                                            {role.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {role.description}
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-destructive" role="alert">{error}</p>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => handleClose(false)} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Lưu thay đổi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
