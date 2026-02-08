using System.Text.Json.Serialization;

namespace GenHubApp.Models
{
    /// <summary>
    /// Generic API response model matching backend format
    /// </summary>
    public class ApiResponse<T>
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("data")]
        public T? Data { get; set; }

        [JsonPropertyName("authorization")]
        public AuthorizationData? Authorization { get; set; }

        [JsonPropertyName("errors")]
        public List<ValidationError>? Errors { get; set; }
    }

    /// <summary>
    /// Authorization data with tokens
    /// </summary>
    public class AuthorizationData
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Validation error
    /// </summary>
    public class ValidationError
    {
        [JsonPropertyName("field")]
        public string Field { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }
}
