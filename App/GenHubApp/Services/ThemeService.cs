using System.Windows;

namespace GenHubApp.Services
{
    /// <summary>
    /// Theme service for switching between Light and Dark mode
    /// </summary>
    public static class ThemeService
    {
        private const string ThemeSettingKey = "Theme";
        private static bool _isDarkMode = false;

        /// <summary>
        /// Current theme is dark mode
        /// </summary>
        public static bool IsDarkMode
        {
            get => _isDarkMode;
            set
            {
                if (_isDarkMode != value)
                {
                    _isDarkMode = value;
                    ApplyTheme();
                    SaveThemePreference();
                }
            }
        }

        /// <summary>
        /// Toggle between light and dark mode
        /// </summary>
        public static void ToggleTheme()
        {
            IsDarkMode = !IsDarkMode;
        }

        /// <summary>
        /// Initialize theme from saved preference
        /// </summary>
        public static void Initialize()
        {
            LoadThemePreference();
            ApplyTheme();
        }

        /// <summary>
        /// Apply current theme to application
        /// </summary>
        private static void ApplyTheme()
        {
            var app = Application.Current;
            if (app == null) return;

            // Remove existing theme dictionaries
            var toRemove = app.Resources.MergedDictionaries
                .Where(d => d.Source != null && 
                       (d.Source.ToString().Contains("LightTheme") || 
                        d.Source.ToString().Contains("DarkTheme")))
                .ToList();

            foreach (var dict in toRemove)
            {
                app.Resources.MergedDictionaries.Remove(dict);
            }

            // Add new theme dictionary
            var themePath = _isDarkMode
                ? "Resources/Themes/DarkTheme.xaml"
                : "Resources/Themes/LightTheme.xaml";

            var themeDict = new ResourceDictionary
            {
                Source = new Uri(themePath, UriKind.Relative)
            };

            app.Resources.MergedDictionaries.Add(themeDict);
        }

        /// <summary>
        /// Save theme preference to settings
        /// </summary>
        private static void SaveThemePreference()
        {
            try
            {
                var settingsPath = GetSettingsPath();
                var settings = LoadSettings();
                settings[ThemeSettingKey] = _isDarkMode ? "dark" : "light";
                SaveSettings(settings);
            }
            catch
            {
                // Ignore save errors
            }
        }

        /// <summary>
        /// Load theme preference from settings
        /// </summary>
        private static void LoadThemePreference()
        {
            try
            {
                var settings = LoadSettings();
                if (settings.TryGetValue(ThemeSettingKey, out var theme))
                {
                    _isDarkMode = theme == "dark";
                }
            }
            catch
            {
                _isDarkMode = false;
            }
        }

        private static string GetSettingsPath()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var appFolder = System.IO.Path.Combine(appData, "GenHubApp");
            if (!System.IO.Directory.Exists(appFolder))
            {
                System.IO.Directory.CreateDirectory(appFolder);
            }
            return System.IO.Path.Combine(appFolder, "settings.json");
        }

        private static Dictionary<string, string> LoadSettings()
        {
            var path = GetSettingsPath();
            if (System.IO.File.Exists(path))
            {
                var json = System.IO.File.ReadAllText(path);
                return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(json) 
                       ?? new Dictionary<string, string>();
            }
            return new Dictionary<string, string>();
        }

        private static void SaveSettings(Dictionary<string, string> settings)
        {
            var path = GetSettingsPath();
            var json = System.Text.Json.JsonSerializer.Serialize(settings);
            System.IO.File.WriteAllText(path, json);
        }
    }
}
