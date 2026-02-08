using GenHubApp.Helpers;
using GenHubApp.Models;

namespace GenHubApp.Services
{
    /// <summary>
    /// Authentication service
    /// </summary>
    public static class AuthService
    {
        /// <summary>
        /// Current logged in user
        /// </summary>
        public static User? CurrentUser { get; private set; }

        /// <summary>
        /// Check if user is logged in
        /// </summary>
        public static bool IsLoggedIn => CurrentUser != null && TokenStorage.HasTokens;

        /// <summary>
        /// Login to admin panel
        /// </summary>
        public static async Task<ApiResponse<object>> LoginAsync(string email, string password)
        {
            var response = await ApiHelper.PostAsync<object>(
                "/auth/login/admin-panel",
                new LoginRequest { Email = email, Password = password });

            if (response.Success && response.Authorization != null)
            {
                // Normal login success - save tokens
                TokenStorage.SetTokens(response.Authorization.AccessToken, response.Authorization.RefreshToken);

                // Try to get user data from response
                if (response.Data != null)
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(response.Data);
                    var user = System.Text.Json.JsonSerializer.Deserialize<User>(json);
                    if (user != null)
                    {
                        CurrentUser = user;
                    }
                }
            }

            return response;
        }

        /// <summary>
        /// Check if response requires 2FA
        /// </summary>
        public static bool Requires2FA(ApiResponse<object> response)
        {
            if (!response.Success || response.Data == null) return false;

            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(response.Data);
                var data = System.Text.Json.JsonSerializer.Deserialize<TwoFactorRequiredData>(json);
                return data?.Requires2FA == true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Get temp token from 2FA required response
        /// </summary>
        public static string? GetTempToken(ApiResponse<object> response)
        {
            if (response.Data == null) return null;

            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(response.Data);
                var data = System.Text.Json.JsonSerializer.Deserialize<TwoFactorRequiredData>(json);
                return data?.TempToken;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Verify 2FA and complete login
        /// </summary>
        public static async Task<ApiResponse<User>> Verify2FALoginAsync(string tempToken, string? twoFactorCode = null, string? backupCode = null)
        {
            var request = new TwoFactorLoginRequest
            {
                TempToken = tempToken,
                TwoFactorCode = twoFactorCode,
                BackupCode = backupCode
            };

            var response = await ApiHelper.PostAsync<User>("/2fa/verify-login", request);

            if (response.Success && response.Authorization != null)
            {
                TokenStorage.SetTokens(response.Authorization.AccessToken, response.Authorization.RefreshToken);

                if (response.Data != null)
                {
                    CurrentUser = response.Data;
                }
            }

            return response;
        }

        /// <summary>
        /// Logout current user
        /// </summary>
        public static async Task<bool> LogoutAsync()
        {
            if (string.IsNullOrEmpty(TokenStorage.RefreshToken))
            {
                ClearSession();
                return true;
            }

            var response = await ApiHelper.PostAsync<object>(
                "/auth/logout",
                new LogoutRequest { RefreshToken = TokenStorage.RefreshToken },
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });

            ClearSession();
            return response.Success;
        }

        /// <summary>
        /// Logout all devices
        /// </summary>
        public static async Task<bool> LogoutAllAsync()
        {
            var response = await ApiHelper.PostAsync<object>(
                "/auth/logout-all",
                null,
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });

            ClearSession();
            return response.Success;
        }

        /// <summary>
        /// Get current user profile
        /// </summary>
        public static async Task<ApiResponse<ProfileData>> GetProfileAsync()
        {
            var response = await ApiHelper.GetAsync<ProfileData>(
                "/account/profile",
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });

            if (response.Success && response.Data?.User != null)
            {
                CurrentUser = response.Data.User;
            }

            return response;
        }

        /// <summary>
        /// Update user profile
        /// </summary>
        public static async Task<ApiResponse<User>> UpdateProfileAsync(string? name = null, string? language = null)
        {
            var response = await ApiHelper.PatchAsync<User>(
                "/account/profile",
                new UpdateProfileRequest { Name = name, Language = language },
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });

            if (response.Success && response.Data != null)
            {
                CurrentUser = response.Data;
            }

            return response;
        }

        /// <summary>
        /// Change password
        /// </summary>
        public static async Task<ApiResponse<object>> ChangePasswordAsync(
            string currentPassword,
            string newPassword,
            bool logoutAllDevices = false)
        {
            return await ApiHelper.PostAsync<object>(
                "/account/change-password",
                new ChangePasswordRequest
                {
                    CurrentPassword = currentPassword,
                    NewPassword = newPassword,
                    ConfirmPassword = newPassword,
                    LogoutAllDevices = logoutAllDevices
                },
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });
        }

        /// <summary>
        /// Verify access for sensitive operations
        /// </summary>
        public static async Task<ApiResponse<VerifyAccessData>> VerifyAccessAsync(
            string? password = null,
            string? twoFactorCode = null,
            string? backupCode = null)
        {
            return await ApiHelper.PostAsync<VerifyAccessData>(
                "/auth/verify-access",
                new VerifyAccessRequest
                {
                    Password = password,
                    TwoFactorCode = twoFactorCode,
                    BackupCode = backupCode
                },
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });
        }

        /// <summary>
        /// Start 2FA setup
        /// </summary>
        public static async Task<ApiResponse<TwoFactorSetupData>> Setup2FAAsync()
        {
            return await ApiHelper.PostAsync<TwoFactorSetupData>(
                "/2fa/setup",
                null,
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });
        }

        /// <summary>
        /// Verify and enable 2FA
        /// </summary>
        public static async Task<ApiResponse<TwoFactorVerifySetupData>> Verify2FASetupAsync(string code)
        {
            return await ApiHelper.PostAsync<TwoFactorVerifySetupData>(
                "/2fa/verify-setup",
                new { two_factor_code = code },
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });
        }

        /// <summary>
        /// Disable 2FA
        /// </summary>
        public static async Task<ApiResponse<object>> Disable2FAAsync()
        {
            return await ApiHelper.PostAsync<object>(
                "/2fa/disable",
                null,
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });
        }

        /// <summary>
        /// Regenerate backup codes
        /// </summary>
        public static async Task<ApiResponse<TwoFactorVerifySetupData>> RegenerateBackupCodesAsync()
        {
            return await ApiHelper.PostAsync<TwoFactorVerifySetupData>(
                "/2fa/regenerate-backup-codes",
                null,
                new ApiHelper.ApiOptions { JwtToken = TokenStorage.AccessToken });
        }

        /// <summary>
        /// Refresh access token
        /// </summary>
        public static async Task<bool> RefreshTokenAsync()
        {
            if (string.IsNullOrEmpty(TokenStorage.RefreshToken))
            {
                return false;
            }

            var response = await ApiHelper.PostAsync<object>(
                "/auth/refresh",
                new RefreshTokenRequest { RefreshToken = TokenStorage.RefreshToken });

            if (response.Success && response.Authorization != null)
            {
                TokenStorage.SetTokens(response.Authorization.AccessToken, response.Authorization.RefreshToken);
                return true;
            }

            return false;
        }

        /// <summary>
        /// Clear local session
        /// </summary>
        private static void ClearSession()
        {
            CurrentUser = null;
            TokenStorage.ClearTokens();
        }

        /// <summary>
        /// Try to restore session from saved tokens
        /// </summary>
        public static async Task<bool> TryRestoreSessionAsync()
        {
            TokenStorage.LoadTokens();

            if (!TokenStorage.HasTokens)
            {
                return false;
            }

            // Try to get profile to validate tokens
            var response = await GetProfileAsync();

            if (!response.Success)
            {
                // Try to refresh token
                if (await RefreshTokenAsync())
                {
                    response = await GetProfileAsync();
                }
            }

            return response.Success;
        }
    }
}
