# Agora Setup Guide cho Organization Chat

Tài liệu hướng dẫn cấu hình Agora RTC/RTM cho chức năng Video/Voice Call và Chat trong tổ chức.

## Bước 1: Đăng ký tài khoản Agora

1. Truy cập [Agora Console](https://console.agora.io)
2. Đăng ký tài khoản (email hoặc liên kết Google/GitHub)
3. Xác thực email

## Bước 2: Tạo Project

1. Đăng nhập Agora Console
2. Click **"Create a project"**
3. Điền thông tin:
   - **Project name**: GEN-HUB (hoặc tên project của bạn)
   - **Use Case**: Voice/Video Call
   - **Authentication Mode**: **Secured mode: APP ID + Token**

## Bước 3: Lấy Credentials

Sau khi tạo project, bạn sẽ nhận được:

1. **App ID**: Mã định danh ứng dụng (32 ký tự hex)
2. **App Certificate**: Mã bí mật để tạo token (32 ký tự hex)

Để lấy App Certificate:
1. Vào project vừa tạo
2. Click **Primary Certificate** > **Copy**

## Bước 4: Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Agora Configuration
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_app_certificate_here
AGORA_TOKEN_EXPIRATION_SECONDS=3600
```

## Bước 5: Test Token Generation

Sau khi cấu hình, test bằng cách gọi API:

```bash
# Get RTM Token (for chat)
curl -X GET "http://localhost:3000/api/organizations/{orgId}/chat/token/rtm" \
  -H "Authorization: Bearer {jwt_token}"

# Get RTC Token (for call)
curl -X GET "http://localhost:3000/api/organizations/{orgId}/chat/token/rtc/{callId}" \
  -H "Authorization: Bearer {jwt_token}"
```

## Pricing

Agora có gói free tier:

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Video/Audio Call** | 10,000 phút/tháng | $0.99-3.99/1000 phút |
| **RTM (Chat)** | Unlimited messages | Free |
| **Speech-to-Text** | 300 phút | $16.99/1000 phút |
| **Cloud Recording** | 10,000 phút/tháng | $1.49/1000 phút |

## Client Integration

### Web (JavaScript)

```javascript
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";

// RTM cho chat
const rtmClient = AgoraRTM.createInstance(appId);
await rtmClient.login({ uid: userId, token: rtmToken });

// RTC cho call
const rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
await rtcClient.join(appId, channelName, rtcToken, uid);
```

### React Native

```bash
npm install agora-react-native-rtm react-native-agora
```

### Flutter

```bash
flutter pub add agora_rtc_engine agora_rtm
```

## Troubleshooting

### Token expired
- Kiểm tra `AGORA_TOKEN_EXPIRATION_SECONDS`
- Default: 3600 giây (1 giờ)

### Invalid App ID
- Đảm bảo App ID đúng format (32 hex characters)
- Không có khoảng trắng

### Cannot join channel
- Verify user có permission `chat.call.join`
- Kiểm tra channel name không chứa ký tự đặc biệt
