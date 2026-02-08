using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace GenHubApp.Services
{
    /// <summary>
    /// Secure storage for JWT tokens
    /// </summary>
    public static class TokenStorage
    {
        private static readonly string AppDataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "GenHubApp");

        private static readonly string TokenFilePath = Path.Combine(AppDataPath, "tokens.dat");

        private static string? _accessToken;
        private static string? _refreshToken;

        /// <summary>
        /// Current access token
        /// </summary>
        public static string? AccessToken
        {
            get => _accessToken;
            set
            {
                _accessToken = value;
                SaveTokens();
            }
        }

        /// <summary>
        /// Current refresh token
        /// </summary>
        public static string? RefreshToken
        {
            get => _refreshToken;
            set
            {
                _refreshToken = value;
                SaveTokens();
            }
        }

        /// <summary>
        /// Check if user has tokens saved
        /// </summary>
        public static bool HasTokens => !string.IsNullOrEmpty(_accessToken) && !string.IsNullOrEmpty(_refreshToken);

        /// <summary>
        /// Save both tokens
        /// </summary>
        public static void SetTokens(string accessToken, string refreshToken)
        {
            _accessToken = accessToken;
            _refreshToken = refreshToken;
            SaveTokens();
        }

        /// <summary>
        /// Clear all tokens (logout)
        /// </summary>
        public static void ClearTokens()
        {
            _accessToken = null;
            _refreshToken = null;

            try
            {
                if (File.Exists(TokenFilePath))
                {
                    File.Delete(TokenFilePath);
                }
            }
            catch
            {
                // Ignore file deletion errors
            }
        }

        /// <summary>
        /// Load tokens from storage
        /// </summary>
        public static void LoadTokens()
        {
            try
            {
                if (!File.Exists(TokenFilePath))
                {
                    return;
                }

                var encryptedData = File.ReadAllBytes(TokenFilePath);
                var decryptedData = ProtectedData.Unprotect(encryptedData, null, DataProtectionScope.CurrentUser);
                var json = Encoding.UTF8.GetString(decryptedData);

                var tokens = JsonSerializer.Deserialize<TokenData>(json);
                if (tokens != null)
                {
                    _accessToken = tokens.AccessToken;
                    _refreshToken = tokens.RefreshToken;
                }
            }
            catch
            {
                // Failed to load tokens, start fresh
                _accessToken = null;
                _refreshToken = null;
            }
        }

        /// <summary>
        /// Save tokens to encrypted file
        /// </summary>
        private static void SaveTokens()
        {
            try
            {
                // Create directory if not exists
                if (!Directory.Exists(AppDataPath))
                {
                    Directory.CreateDirectory(AppDataPath);
                }

                var tokens = new TokenData
                {
                    AccessToken = _accessToken ?? "",
                    RefreshToken = _refreshToken ?? ""
                };

                var json = JsonSerializer.Serialize(tokens);
                var data = Encoding.UTF8.GetBytes(json);
                var encryptedData = ProtectedData.Protect(data, null, DataProtectionScope.CurrentUser);

                File.WriteAllBytes(TokenFilePath, encryptedData);
            }
            catch
            {
                // Ignore save errors
            }
        }

        private class TokenData
        {
            public string AccessToken { get; set; } = "";
            public string RefreshToken { get; set; } = "";
        }
    }
}
