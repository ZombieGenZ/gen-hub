using System.Windows;
using GenHubApp.Services;

namespace GenHubApp
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        protected override async void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Initialize theme
            ThemeService.Initialize();
            
            // Initialize localization
            LocalizationService.Initialize();

            // Try to restore session
            var hasSession = await AuthService.TryRestoreSessionAsync();
            
            if (hasSession)
            {
                // User has valid session, show main window
                var mainWindow = new MainWindow();
                mainWindow.Show();
                
                // Close the auth window if it's the current main window
                if (MainWindow is Auth authWindow)
                {
                    authWindow.Close();
                }
                
                MainWindow = mainWindow;
            }
        }

        protected override void OnExit(ExitEventArgs e)
        {
            base.OnExit(e);
        }
    }
}
