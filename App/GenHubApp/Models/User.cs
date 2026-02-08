using System.Text.Json.Serialization;

namespace GenHubApp.Models
{
    /// <summary>
    /// User model matching API response
    /// </summary>
    public class User
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("email_confirmed")]
        public bool EmailConfirmed { get; set; }

        [JsonPropertyName("is_verified")]
        public bool IsVerified { get; set; }

        [JsonPropertyName("two_factor_enabled")]
        public bool TwoFactorEnabled { get; set; }

        [JsonPropertyName("language")]
        public string Language { get; set; } = "vi";

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("permissions")]
        public List<string>? Permissions { get; set; }
    }

    /// <summary>
    /// Login request DTO
    /// </summary>
    public class LoginRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// 2FA login verification request
    /// </summary>
    public class TwoFactorLoginRequest
    {
        [JsonPropertyName("temp_token")]
        public string TempToken { get; set; } = string.Empty;

        [JsonPropertyName("two_factor_code")]
        public string? TwoFactorCode { get; set; }

        [JsonPropertyName("backup_code")]
        public string? BackupCode { get; set; }
    }

    /// <summary>
    /// 2FA required response data
    /// </summary>
    public class TwoFactorRequiredData
    {
        [JsonPropertyName("requires_2fa")]
        public bool Requires2FA { get; set; }

        [JsonPropertyName("temp_token")]
        public string TempToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// 2FA setup response data
    /// </summary>
    public class TwoFactorSetupData
    {
        [JsonPropertyName("secret")]
        public string Secret { get; set; } = string.Empty;

        [JsonPropertyName("qr_code_url")]
        public string QrCodeUrl { get; set; } = string.Empty;
    }

    /// <summary>
    /// 2FA setup verification response
    /// </summary>
    public class TwoFactorVerifySetupData
    {
        [JsonPropertyName("backup_codes")]
        public List<string> BackupCodes { get; set; } = new();
    }

    /// <summary>
    /// Verify access request
    /// </summary>
    public class VerifyAccessRequest
    {
        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonPropertyName("two_factor_code")]
        public string? TwoFactorCode { get; set; }

        [JsonPropertyName("backup_code")]
        public string? BackupCode { get; set; }
    }

    /// <summary>
    /// Verify access response
    /// </summary>
    public class VerifyAccessData
    {
        [JsonPropertyName("access_verification_token")]
        public string AccessVerificationToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Update profile request
    /// </summary>
    public class UpdateProfileRequest
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }
    }

    /// <summary>
    /// Change password request
    /// </summary>
    public class ChangePasswordRequest
    {
        [JsonPropertyName("current_password")]
        public string CurrentPassword { get; set; } = string.Empty;

        [JsonPropertyName("new_password")]
        public string NewPassword { get; set; } = string.Empty;

        [JsonPropertyName("confirm_password")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [JsonPropertyName("logout_all_devices")]
        public bool LogoutAllDevices { get; set; } = false;
    }

    /// <summary>
    /// Refresh token request
    /// </summary>
    public class RefreshTokenRequest
    {
        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Logout request
    /// </summary>
    public class LogoutRequest
    {
        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Profile response with roles and permissions
    /// </summary>
    public class ProfileData
    {
        [JsonPropertyName("user")]
        public User User { get; set; } = new();

        [JsonPropertyName("roles")]
        public List<RoleInfo>? Roles { get; set; }

        [JsonPropertyName("permissions")]
        public List<PermissionInfo>? Permissions { get; set; }
    }

    /// <summary>
    /// Role info
    /// </summary>
    public class RoleInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    /// <summary>
    /// Permission info
    /// </summary>
    public class PermissionInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("source")]
        public string? Source { get; set; }
    }
}
