using GenHubApp.Services;

namespace GenHubApp
{
    /// <summary>
    /// Proxy class for ThemeService to enable XAML binding
    /// </summary>
    public static class ThemeServiceProxy
    {
        public static bool IsDarkMode => ThemeService.IsDarkMode;
    }
}
