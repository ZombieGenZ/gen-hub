using System.Windows;
using System.Windows.Controls;
using GenHubApp.Services;

namespace GenHubApp
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private bool _sidebarCollapsed = false;

        public MainWindow()
        {
            InitializeComponent();
            LoadUserInfo();
            UpdateThemeUI();
            UpdateLanguageUI();
        }

        #region User Info

        private void LoadUserInfo()
        {
            var user = AuthService.CurrentUser;
            if (user != null)
            {
                UserName.Text = user.Name;
                UserEmail.Text = user.Email;
                UserInitial.Text = !string.IsNullOrEmpty(user.Name) 
                    ? user.Name[0].ToString().ToUpper() 
                    : "U";

                // Update profile fields
                ProfileNameInput.Text = user.Name;
                ProfileEmailInput.Text = user.Email;

                // Update 2FA status
                if (user.TwoFactorEnabled)
                {
                    TwoFactorStatusText.Text = LocalizationService.GetString("TwoFactorEnabled");
                    Toggle2FAButton.Content = LocalizationService.GetString("Disable2FA");
                }
                else
                {
                    TwoFactorStatusText.Text = LocalizationService.GetString("TwoFactorDisabled");
                    Toggle2FAButton.Content = LocalizationService.GetString("Enable2FA");
                }
            }
        }

        #endregion

        #region Navigation

        private void Nav_Checked(object sender, RoutedEventArgs e)
        {
            if (sender is RadioButton rb && rb.Tag is string tag)
            {
                HideAllViews();

                switch (tag)
                {
                    case "Dashboard":
                        DashboardView.Visibility = Visibility.Visible;
                        break;
                    case "Inventory":
                        InventoryView.Visibility = Visibility.Visible;
                        break;
                    case "Products":
                        ProductsView.Visibility = Visibility.Visible;
                        break;
                    case "Profile":
                        ProfileView.Visibility = Visibility.Visible;
                        break;
                    case "Security":
                        SecurityView.Visibility = Visibility.Visible;
                        break;
                }
            }
        }

        private void HideAllViews()
        {
            DashboardView.Visibility = Visibility.Collapsed;
            InventoryView.Visibility = Visibility.Collapsed;
            ProductsView.Visibility = Visibility.Collapsed;
            ProfileView.Visibility = Visibility.Collapsed;
            SecurityView.Visibility = Visibility.Collapsed;
        }

        #endregion

        #region Sidebar

        private void CollapseSidebar_Click(object sender, RoutedEventArgs e)
        {
            _sidebarCollapsed = !_sidebarCollapsed;

            if (_sidebarCollapsed)
            {
                SidebarColumn.Width = new GridLength(72);
                CollapseIcon.Text = "▶";
                
                // Hide text elements
                AppTitle.Visibility = Visibility.Collapsed;
                MenuLabel1.Visibility = Visibility.Collapsed;
                MenuLabel2.Visibility = Visibility.Collapsed;
                NavDashboardText.Visibility = Visibility.Collapsed;
                NavInventoryText.Visibility = Visibility.Collapsed;
                NavProductsText.Visibility = Visibility.Collapsed;
                NavProfileText.Visibility = Visibility.Collapsed;
                NavSecurityText.Visibility = Visibility.Collapsed;
                SettingsPanel.Visibility = Visibility.Collapsed;
                UserInfoPanel.Visibility = Visibility.Collapsed;
            }
            else
            {
                SidebarColumn.Width = new GridLength(260);
                CollapseIcon.Text = "◀";
                
                // Show text elements
                AppTitle.Visibility = Visibility.Visible;
                MenuLabel1.Visibility = Visibility.Visible;
                MenuLabel2.Visibility = Visibility.Visible;
                NavDashboardText.Visibility = Visibility.Visible;
                NavInventoryText.Visibility = Visibility.Visible;
                NavProductsText.Visibility = Visibility.Visible;
                NavProfileText.Visibility = Visibility.Visible;
                NavSecurityText.Visibility = Visibility.Visible;
                SettingsPanel.Visibility = Visibility.Visible;
                UserInfoPanel.Visibility = Visibility.Visible;
            }
        }

        #endregion

        #region Theme & Language

        private void ThemeToggle_Checked(object sender, RoutedEventArgs e)
        {
            ThemeService.IsDarkMode = true;
            UpdateThemeUI();
        }

        private void ThemeToggle_Unchecked(object sender, RoutedEventArgs e)
        {
            ThemeService.IsDarkMode = false;
            UpdateThemeUI();
        }

        private void LanguageToggle_Click(object sender, RoutedEventArgs e)
        {
            LocalizationService.ToggleLanguage();
            UpdateLanguageUI();
            LoadUserInfo(); // Refresh 2FA status text
        }

        private void UpdateThemeUI()
        {
            ThemeToggle.IsChecked = ThemeService.IsDarkMode;
            ThemeLabel.Text = ThemeService.IsDarkMode ? "☀️" : "🌙";
        }

        private void UpdateLanguageUI()
        {
            LanguageLabel.Text = LocalizationService.IsVietnamese ? "EN" : "VI";
        }

        #endregion

        #region Profile

        private async void SaveProfile_Click(object sender, RoutedEventArgs e)
        {
            var name = ProfileNameInput.Text.Trim();
            if (string.IsNullOrEmpty(name)) return;

            var response = await AuthService.UpdateProfileAsync(name);
            
            if (response.Success)
            {
                LoadUserInfo();
                MessageBox.Show(
                    LocalizationService.GetString("ProfileUpdated"),
                    LocalizationService.GetString("Success"),
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
            else
            {
                MessageBox.Show(
                    response.Message,
                    LocalizationService.GetString("Error"),
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private async void ChangePassword_Click(object sender, RoutedEventArgs e)
        {
            var currentPassword = CurrentPasswordInput.Password;
            var newPassword = NewPasswordInput.Password;
            var confirmPassword = ConfirmPasswordInput.Password;

            if (string.IsNullOrEmpty(currentPassword) || 
                string.IsNullOrEmpty(newPassword) ||
                string.IsNullOrEmpty(confirmPassword))
            {
                return;
            }

            if (newPassword != confirmPassword)
            {
                MessageBox.Show(
                    LocalizationService.GetString("PasswordMismatch"),
                    LocalizationService.GetString("Error"),
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                return;
            }

            var response = await AuthService.ChangePasswordAsync(currentPassword, newPassword);

            if (response.Success)
            {
                CurrentPasswordInput.Clear();
                NewPasswordInput.Clear();
                ConfirmPasswordInput.Clear();
                
                MessageBox.Show(
                    LocalizationService.GetString("PasswordChanged"),
                    LocalizationService.GetString("Success"),
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
            else
            {
                MessageBox.Show(
                    response.Message,
                    LocalizationService.GetString("Error"),
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        #endregion

        #region Security / 2FA

        private async void Toggle2FA_Click(object sender, RoutedEventArgs e)
        {
            var user = AuthService.CurrentUser;
            if (user == null) return;

            if (user.TwoFactorEnabled)
            {
                // Disable 2FA - confirm first
                var result = MessageBox.Show(
                    LocalizationService.GetString("Disable2FAConfirm"),
                    LocalizationService.GetString("Warning"),
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);

                if (result == MessageBoxResult.Yes)
                {
                    var response = await AuthService.Disable2FAAsync();
                    if (response.Success)
                    {
                        user.TwoFactorEnabled = false;
                        LoadUserInfo();
                        Setup2FAPanel.Visibility = Visibility.Collapsed;
                        BackupCodesPanel.Visibility = Visibility.Collapsed;
                    }
                    else
                    {
                        MessageBox.Show(response.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
            }
            else
            {
                // Setup 2FA
                var response = await AuthService.Setup2FAAsync();
                if (response.Success && response.Data != null)
                {
                    // Show setup panel with QR code
                    Setup2FAPanel.Visibility = Visibility.Visible;
                    // In real implementation, generate and display QR code from response.Data.QrCodeUrl
                }
                else
                {
                    MessageBox.Show(response.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private async void Verify2FASetup_Click(object sender, RoutedEventArgs e)
        {
            var code = Setup2FACodeInput.Text.Trim();
            if (string.IsNullOrEmpty(code) || code.Length != 6) return;

            var response = await AuthService.Verify2FASetupAsync(code);
            
            if (response.Success && response.Data != null)
            {
                // Show backup codes
                Setup2FAPanel.Visibility = Visibility.Collapsed;
                BackupCodesPanel.Visibility = Visibility.Visible;
                BackupCodesText.Text = string.Join("\n", response.Data.BackupCodes);

                // Update user status
                if (AuthService.CurrentUser != null)
                {
                    AuthService.CurrentUser.TwoFactorEnabled = true;
                    LoadUserInfo();
                }
            }
            else
            {
                MessageBox.Show(response.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void RegenerateBackupCodes_Click(object sender, RoutedEventArgs e)
        {
            var response = await AuthService.RegenerateBackupCodesAsync();
            
            if (response.Success && response.Data != null)
            {
                BackupCodesText.Text = string.Join("\n", response.Data.BackupCodes);
            }
            else
            {
                MessageBox.Show(response.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        #endregion

        #region Logout

        private async void Logout_Click(object sender, RoutedEventArgs e)
        {
            await AuthService.LogoutAsync();
            
            // Open auth window and close this
            var authWindow = new Auth();
            authWindow.Show();
            Application.Current.MainWindow = authWindow;
            Close();
        }

        #endregion
    }
}
