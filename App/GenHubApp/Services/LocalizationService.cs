using System.Windows;

namespace GenHubApp.Services
{
    /// <summary>
    /// Localization service for switching between Vietnamese and English
    /// </summary>
    public static class LocalizationService
    {
        private const string LanguageSettingKey = "Language";
        private static string _currentLanguage = "vi-VN";

        /// <summary>
        /// Available languages
        /// </summary>
        public static readonly string[] AvailableLanguages = { "vi-VN", "en-US" };

        /// <summary>
        /// Current language code
        /// </summary>
        public static string CurrentLanguage
        {
            get => _currentLanguage;
            set
            {
                if (_currentLanguage != value && AvailableLanguages.Contains(value))
                {
                    _currentLanguage = value;
                    ApplyLanguage();
                    SaveLanguagePreference();

                    // Update API helper language
                    Helpers.ApiHelper.DefaultLanguage = value.StartsWith("vi") ? "vi" : "en";
                }
            }
        }

        /// <summary>
        /// Is current language Vietnamese
        /// </summary>
        public static bool IsVietnamese => _currentLanguage == "vi-VN";

        /// <summary>
        /// Toggle between Vietnamese and English
        /// </summary>
        public static void ToggleLanguage()
        {
            CurrentLanguage = IsVietnamese ? "en-US" : "vi-VN";
        }

        /// <summary>
        /// Initialize language from saved preference
        /// </summary>
        public static void Initialize()
        {
            LoadLanguagePreference();
            ApplyLanguage();
        }

        /// <summary>
        /// Get localized string by key
        /// </summary>
        public static string GetString(string key)
        {
            try
            {
                var value = Application.Current.TryFindResource(key);
                return value?.ToString() ?? key;
            }
            catch
            {
                return key;
            }
        }

        /// <summary>
        /// Apply current language to application
        /// </summary>
        private static void ApplyLanguage()
        {
            var app = Application.Current;
            if (app == null) return;

            // Remove existing language dictionaries
            var toRemove = app.Resources.MergedDictionaries
                .Where(d => d.Source != null &&
                       (d.Source.ToString().Contains("vi-VN") ||
                        d.Source.ToString().Contains("en-US")))
                .ToList();

            foreach (var dict in toRemove)
            {
                app.Resources.MergedDictionaries.Remove(dict);
            }

            // Add new language dictionary
            var langPath = $"Resources/Languages/{_currentLanguage}.xaml";

            var langDict = new ResourceDictionary
            {
                Source = new Uri(langPath, UriKind.Relative)
            };

            app.Resources.MergedDictionaries.Add(langDict);
        }

        /// <summary>
        /// Save language preference to settings
        /// </summary>
        private static void SaveLanguagePreference()
        {
            try
            {
                var settings = LoadSettings();
                settings[LanguageSettingKey] = _currentLanguage;
                SaveSettings(settings);
            }
            catch
            {
                // Ignore save errors
            }
        }

        /// <summary>
        /// Load language preference from settings
        /// </summary>
        private static void LoadLanguagePreference()
        {
            try
            {
                var settings = LoadSettings();
                if (settings.TryGetValue(LanguageSettingKey, out var lang) && 
                    AvailableLanguages.Contains(lang))
                {
                    _currentLanguage = lang;
                }
            }
            catch
            {
                _currentLanguage = "vi-VN";
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
