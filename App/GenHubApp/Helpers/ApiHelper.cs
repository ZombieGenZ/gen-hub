using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Web;

namespace GenHubApp.Helpers
{
    /// <summary>
    /// Static helper class for making API calls
    /// </summary>
    public static class ApiHelper
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            PropertyNameCaseInsensitive = true
        };

        // Base URL for API - can be configured
        public static string BaseUrl { get; set; } = "https://api.gen-hub.dev";
        public static string DefaultLanguage { get; set; } = "vi";

        /// <summary>
        /// API call options
        /// </summary>
        public class ApiOptions
        {
            public Dictionary<string, string>? QueryParams { get; set; }
            public Dictionary<string, string>? Headers { get; set; }
            public string? JwtToken { get; set; }
            public object? Body { get; set; }
            public bool UseFormData { get; set; } = false;
            public Dictionary<string, string>? FormData { get; set; }
            public string? AccessVerificationToken { get; set; }
        }

        /// <summary>
        /// Make an API call
        /// </summary>
        /// <typeparam name="T">Expected data type in response</typeparam>
        /// <param name="path">API endpoint path (e.g., "/auth/login")</param>
        /// <param name="method">HTTP method</param>
        /// <param name="options">Optional parameters</param>
        /// <returns>ApiResponse with typed data</returns>
        public static async Task<Models.ApiResponse<T>> CallApiAsync<T>(
            string path,
            HttpMethod method,
            ApiOptions? options = null)
        {
            try
            {
                options ??= new ApiOptions();

                // Build URL with query params
                var url = BuildUrl(path, options.QueryParams);

                // Create request
                var request = new HttpRequestMessage(method, url);

                // Add headers
                request.Headers.Add("Accept", "application/json");
                request.Headers.Add("Accept-Language", DefaultLanguage);

                // Add custom headers
                if (options.Headers != null)
                {
                    foreach (var header in options.Headers)
                    {
                        request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                    }
                }

                // Add JWT token
                if (!string.IsNullOrEmpty(options.JwtToken))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.JwtToken);
                }

                // Add Access Verification Token
                if (!string.IsNullOrEmpty(options.AccessVerificationToken))
                {
                    request.Headers.Add("X-Access-Verification-Token", options.AccessVerificationToken);
                }

                // Add body
                if (method != HttpMethod.Get && method != HttpMethod.Delete)
                {
                    if (options.UseFormData && options.FormData != null)
                    {
                        request.Content = new FormUrlEncodedContent(options.FormData);
                    }
                    else if (options.Body != null)
                    {
                        var json = JsonSerializer.Serialize(options.Body, _jsonOptions);
                        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                    }
                }

                // Send request
                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();

                // Parse response
                var apiResponse = JsonSerializer.Deserialize<Models.ApiResponse<T>>(responseContent, _jsonOptions);

                if (apiResponse == null)
                {
                    return new Models.ApiResponse<T>
                    {
                        Success = false,
                        Code = "error.parse",
                        Message = "Failed to parse API response"
                    };
                }

                return apiResponse;
            }
            catch (HttpRequestException ex)
            {
                return new Models.ApiResponse<T>
                {
                    Success = false,
                    Code = "error.network",
                    Message = $"Network error: {ex.Message}"
                };
            }
            catch (JsonException ex)
            {
                return new Models.ApiResponse<T>
                {
                    Success = false,
                    Code = "error.parse",
                    Message = $"JSON parse error: {ex.Message}"
                };
            }
            catch (Exception ex)
            {
                return new Models.ApiResponse<T>
                {
                    Success = false,
                    Code = "error.unknown",
                    Message = $"Unknown error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Shorthand for GET request
        /// </summary>
        public static Task<Models.ApiResponse<T>> GetAsync<T>(string path, ApiOptions? options = null)
            => CallApiAsync<T>(path, HttpMethod.Get, options);

        /// <summary>
        /// Shorthand for POST request
        /// </summary>
        public static Task<Models.ApiResponse<T>> PostAsync<T>(string path, object? body = null, ApiOptions? options = null)
        {
            options ??= new ApiOptions();
            options.Body = body;
            return CallApiAsync<T>(path, HttpMethod.Post, options);
        }

        /// <summary>
        /// Shorthand for PATCH request
        /// </summary>
        public static Task<Models.ApiResponse<T>> PatchAsync<T>(string path, object? body = null, ApiOptions? options = null)
        {
            options ??= new ApiOptions();
            options.Body = body;
            return CallApiAsync<T>(path, HttpMethod.Patch, options);
        }

        /// <summary>
        /// Shorthand for DELETE request
        /// </summary>
        public static Task<Models.ApiResponse<T>> DeleteAsync<T>(string path, ApiOptions? options = null)
            => CallApiAsync<T>(path, HttpMethod.Delete, options);

        /// <summary>
        /// Build URL with query parameters
        /// </summary>
        private static string BuildUrl(string path, Dictionary<string, string>? queryParams)
        {
            var baseUrl = BaseUrl.TrimEnd('/');
            var cleanPath = path.StartsWith("/") ? path : "/" + path;

            if (queryParams == null || queryParams.Count == 0)
            {
                return baseUrl + cleanPath;
            }

            var query = HttpUtility.ParseQueryString(string.Empty);
            foreach (var param in queryParams)
            {
                query[param.Key] = param.Value;
            }

            return $"{baseUrl}{cleanPath}?{query}";
        }
    }
}
