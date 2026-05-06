'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Shield, Camera, Loader2, Save, Key, Smartphone } from 'lucide-react';
import { UserService } from '@/services/user/user.service';
import { AuthStorageService } from '@/services/auth/auth-storage.service';

const authStorage = AuthStorageService.getInstance();

const userService = new UserService();

export default function UserSettingsPage() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Profile state
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        avatar: '',
        bio: '',
    });

    // Password state
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // 2FA state
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // Fetch user data on mount
    useEffect(() => {
        const fetchUser = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            
            try {
                setIsLoading(true);
                const userData: any = await userService.getUser(token, '');
                const user = userData.user || userData;
                setUser(user);
                setProfile({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    avatar: user.avatar || user.image || '',
                    bio: user.bio || '',
                });
                setTwoFactorEnabled(user.twoFactorEnabled || user.two_factor_enabled || false);
            } catch (error) {
                showToast('Không thể tải thông tin người dùng', "error");
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchUser();
    }, []);

    // Handle profile update
    const handleProfileUpdate = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsSaving(true);
        try {
            await userService.updateUser(token, {
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
                bio: profile.bio,
            });

            setUser({
                ...(user as any),
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
                bio: profile.bio,
            });

            showToast('Cập nhật thông tin thành công', "success");
        } catch (error) {
            showToast('Không thể cập nhật thông tin', "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        if (passwords.newPassword !== passwords.confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp', "error");
            return;
        }

        if (passwords.newPassword.length < 8) {
            showToast('Mật khẩu mới phải có ít nhất 8 ký tự', "error");
            return;
        }

        setIsSaving(true);
        try {
            await userService.change_password(token, {
                current_password: passwords.currentPassword,
                new_password: passwords.newPassword,
                confirm_password: passwords.confirmPassword,
            });

            showToast('Đổi mật khẩu thành công', "success");
            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error) {
            showToast('Không thể đổi mật khẩu', "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Handle 2FA toggle
    const handle2FAToggle = async (enabled: boolean) => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsSaving(true);
        try {
            if (enabled) {
                await userService.enableTwoFactor(token, '');
            } else {
                await userService.disableTwoFactor(token, '');
            }

            setTwoFactorEnabled(enabled);
            showToast(enabled ? 'Đã bật xác thực 2 lớp' : 'Đã tắt xác thực 2 lớp', "success");
        } catch (error) {
            showToast('Không thể cập nhật xác thực 2 lớp', "error");
            setTwoFactorEnabled(!enabled);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle avatar upload
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const token = authStorage.getAccessToken();
        if (!file || !token) return;

        setIsLoading(true);
        try {
            const result = await userService.uploadAvatar(token, file);
            setProfile({ ...profile, avatar: result.url });

            setUser({
                ...(user as any),
                image: result.url,
            });

            showToast('Tải ảnh đại diện thành công', "success");
        } catch (error) {
            showToast('Không thể tải ảnh đại diện', "error");
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = () => {
        const first = profile.firstName?.charAt(0) || '';
        const last = profile.lastName?.charAt(0) || '';
        return (first + last).toUpperCase() || 'U';
    };

    return (
        <div className="container mx-auto py-6 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Cài đặt tài khoản</h1>
                <p className="text-slate-500 mt-1">Quản lý thông tin cá nhân và bảo mật tài khoản của bạn</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Hồ sơ
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Bảo mật
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                    {/* Avatar Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Camera className="h-5 w-5 text-blue-500" />
                                Ảnh đại diện
                            </CardTitle>
                            <CardDescription>
                                Cập nhật ảnh đại diện của bạn
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={profile.avatar} />
                                    <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                                        {getInitials()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Label
                                            htmlFor="avatar-upload"
                                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            <Camera className="h-4 w-4" />
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Thay đổi ảnh'
                                            )}
                                        </Label>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarUpload}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Định dạng: JPG, PNG. Tối đa 2MB
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-green-500" />
                                Thông tin cá nhân
                            </CardTitle>
                            <CardDescription>
                                Cập nhật thông tin cơ bản của bạn
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Họ</Label>
                                    <Input
                                        id="firstName"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                        placeholder="Nhập họ"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Tên</Label>
                                    <Input
                                        id="lastName"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                        placeholder="Nhập tên"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={profile.email}
                                    disabled
                                    className="bg-slate-100"
                                />
                                <p className="text-sm text-slate-500">Email không thể thay đổi</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Số điện thoại</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>

                            <Separator />

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleProfileUpdate}
                                    disabled={isSaving}
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6">
                    {/* Password Change Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-orange-500" />
                                Đổi mật khẩu
                            </CardTitle>
                            <CardDescription>
                                Cập nhật mật khẩu để bảo vệ tài khoản của bạn
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    placeholder="Nhập mật khẩu hiện tại"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    placeholder="Nhập mật khẩu mới"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    placeholder="Nhập lại mật khẩu mới"
                                />
                            </div>

                            <Separator />

                            <div className="flex justify-end">
                                <Button
                                    onClick={handlePasswordChange}
                                    disabled={isSaving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
                                    className="flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Key className="h-4 w-4" />
                                    )}
                                    Cập nhật mật khẩu
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Two-Factor Authentication Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-purple-500" />
                                Xác thực 2 lớp (2FA)
                            </CardTitle>
                            <CardDescription>
                                Bảo vệ tài khoản của bạn bằng cách yêu cầu mã xác thực khi đăng nhập
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Trạng thái</span>
                                        <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
                                            {twoFactorEnabled ? 'Đã bật' : 'Đã tắt'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {twoFactorEnabled
                                            ? 'Tài khoản của bạn đang được bảo vệ bởi xác thực 2 lớp'
                                            : 'Bật xác thực 2 lớp để tăng cường bảo mật'}
                                    </p>
                                </div>
                                <Switch
                                    checked={twoFactorEnabled}
                                    onCheckedChange={handle2FAToggle}
                                    disabled={isSaving}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Tips Card */}
                    <Card className="bg-amber-50 border-amber-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-800">
                                <Shield className="h-5 w-5" />
                                Lời khuyên bảo mật
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-amber-700">
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold">1.</span>
                                    Sử dụng mật khẩu mạnh với ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold">2.</span>
                                    Bật xác thực 2 lớp để tăng cường bảo mật
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold">3.</span>
                                    Không chia sẻ mật khẩu với bất kỳ ai
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold">4.</span>
                                    Đăng xuất khi sử dụng thiết bị công cộng
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
