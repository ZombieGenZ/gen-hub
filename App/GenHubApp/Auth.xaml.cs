using System.Windows;
using System.Windows.Controls;
using GenHubApp.Services;

namespace GenHubApp
{
    /// <summary>
    /// Interaction logic for Auth.xaml
    /// </summary>
    public partial class Auth : Window
    {
        private string? _tempToken;
        private bool _useBackupCode = false;

        public Auth()
        {
            InitializeComponent();
            UpdateThemeLabel();
            UpdateLanguageLabel();
        }

        #region Login

        private async void Login_Click(object sender, RoutedEventArgs e)
        {
            // Validate inputs
            var email = EmailInput.Text.Trim();
            var password = PasswordInput.Password;

            if (string.IsNullOrEmpty(email))
            {
                ShowError(LocalizationService.GetString("EmailRequired"));
                return;
            }

            if (string.IsNullOrEmpty(password))
            {
                ShowError(LocalizationService.GetString("PasswordRequired"));
                return;
            }

            // Show loading
            SetLoginLoading(true);
            HideError();

            try
            {
                var response = await AuthService.LoginAsync(email, password);

                if (AuthService.Requires2FA(response))
                {
                    // 2FA required
                    _tempToken = AuthService.GetTempToken(response);
                    Show2FAPanel();
                }
                else if (response.Success)
                {
                    // Login successful
                    OpenMainWindow();
                }
                else
                {
                    // Login failed
                    ShowError(response.Message);
                }
            }
            catch (Exception ex)
            {
                ShowError(ex.Message);
            }
            finally
            {
                SetLoginLoading(false);
            }
        }

        private void SetLoginLoading(bool loading)
        {
            LoginButton.IsEnabled = !loading;
            LoadingText.Visibility = loading ? Visibility.Visible : Visibility.Collapsed;
        }

        private void ShowError(string message)
        {
            ErrorText.Text = message;
            ErrorText.Visibility = Visibility.Visible;
        }

        private void HideError()
        {
            ErrorText.Visibility = Visibility.Collapsed;
        }

        #endregion

        #region 2FA

        private void Show2FAPanel()
        {
            LoginPanel.Visibility = Visibility.Collapsed;
            TwoFactorPanel.Visibility = Visibility.Visible;
            TwoFactorCodeInput.Focus();
        }

        private void Back2FA_Click(object sender, RoutedEventArgs e)
        {
            TwoFactorPanel.Visibility = Visibility.Collapsed;
            LoginPanel.Visibility = Visibility.Visible;
            _tempToken = null;
            _useBackupCode = false;
            TwoFactorCodeInput.Text = "";
            BackupCodeInput.Text = "";
            Hide2FAError();
            ResetBackupCodeUI();
        }

        private void UseBackupCode_Click(object sender, RoutedEventArgs e)
        {
            _useBackupCode = !_useBackupCode;

            if (_useBackupCode)
            {
                TwoFactorCodeInput.Visibility = Visibility.Collapsed;
                TwoFactorCodeLabel.Visibility = Visibility.Collapsed;
                BackupCodePanel.Visibility = Visibility.Visible;
                UseBackupCodeButton.Content = LocalizationService.GetString("TwoFactorCode");
                BackupCodeInput.Focus();
            }
            else
            {
                ResetBackupCodeUI();
            }
        }

        private void ResetBackupCodeUI()
        {
            TwoFactorCodeInput.Visibility = Visibility.Visible;
            TwoFactorCodeLabel.Visibility = Visibility.Visible;
            BackupCodePanel.Visibility = Visibility.Collapsed;
            UseBackupCodeButton.Content = LocalizationService.GetString("UseBackupCode");
        }

        private async void Verify2FA_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_tempToken))
            {
                Show2FAError("Missing temp token");
                return;
            }

            string? code = null;
            string? backupCode = null;

            if (_useBackupCode)
            {
                backupCode = BackupCodeInput.Text.Trim();
                if (string.IsNullOrEmpty(backupCode))
                {
                    Show2FAError(LocalizationService.GetString("BackupCode") + " is required");
                    return;
                }
            }
            else
            {
                code = TwoFactorCodeInput.Text.Trim();
                if (string.IsNullOrEmpty(code) || code.Length != 6)
                {
                    Show2FAError(LocalizationService.GetString("InvalidCode"));
                    return;
                }
            }

            Set2FALoading(true);
            Hide2FAError();

            try
            {
                var response = await AuthService.Verify2FALoginAsync(_tempToken, code, backupCode);

                if (response.Success)
                {
                    OpenMainWindow();
                }
                else
                {
                    Show2FAError(response.Message);
                }
            }
            catch (Exception ex)
            {
                Show2FAError(ex.Message);
            }
            finally
            {
                Set2FALoading(false);
            }
        }

        private void Set2FALoading(bool loading)
        {
            VerifyButton.IsEnabled = !loading;
            Verify2FALoadingText.Visibility = loading ? Visibility.Visible : Visibility.Collapsed;
        }

        private void Show2FAError(string message)
        {
            TwoFactorErrorText.Text = message;
            TwoFactorErrorText.Visibility = Visibility.Visible;
        }

        private void Hide2FAError()
        {
            TwoFactorErrorText.Visibility = Visibility.Collapsed;
        }

        #endregion

        #region Forgot Password

        private void ForgotPassword_Click(object sender, RoutedEventArgs e)
        {
            LoginPanel.Visibility = Visibility.Collapsed;
            ForgotPasswordPanel.Visibility = Visibility.Visible;
            ForgotPasswordEmailInput.Text = EmailInput.Text;
            ForgotPasswordEmailInput.Focus();
        }

        private void BackForgotPassword_Click(object sender, RoutedEventArgs e)
        {
            ForgotPasswordPanel.Visibility = Visibility.Collapsed;
            LoginPanel.Visibility = Visibility.Visible;
            ResetLinkSentPanel.Visibility = Visibility.Collapsed;
        }

        private void SendResetLink_Click(object sender, RoutedEventArgs e)
        {
            var email = ForgotPasswordEmailInput.Text.Trim();

            if (string.IsNullOrEmpty(email))
            {
                return;
            }

            // Demo only - just show success message
            ResetLinkSentPanel.Visibility = Visibility.Visible;
            SendResetLinkButton.IsEnabled = false;
        }

        #endregion

        #region Theme & Language

        private void ThemeToggle_Click(object sender, RoutedEventArgs e)
        {
            ThemeService.ToggleTheme();
            UpdateThemeLabel();
        }

        private void LanguageToggle_Click(object sender, RoutedEventArgs e)
        {
            LocalizationService.ToggleLanguage();
            UpdateLanguageLabel();
        }

        private void UpdateThemeLabel()
        {
            if (ThemeService.IsDarkMode)
            {
                ThemeLabel.Text = LocalizationService.GetString("LightMode");
            }
            else
            {
                ThemeLabel.Text = LocalizationService.GetString("DarkMode");
            }
        }

        private void UpdateLanguageLabel()
        {
            if (LocalizationService.IsVietnamese)
            {
                LanguageLabel.Text = "EN";
            }
            else
            {
                LanguageLabel.Text = "VI";
            }
        }

        #endregion

        #region Navigation

        private void OpenMainWindow()
        {
            var mainWindow = new MainWindow();
            mainWindow.Show();
            Application.Current.MainWindow = mainWindow;
            Close();
        }

        #endregion
    }
}