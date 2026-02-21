# Mô tả chi tiết các Service (client/services)

Tài liệu này mô tả mục đích, phương thức chính, yêu cầu xác thực và các lưu ý cho các service trong thư mục `client/services`.

---

**OrganizationService**: [gen-hub/client/services/organization/organization.service.ts](gen-hub/client/services/organization/organization.service.ts)
- Mục đích: Quản lý tổ chức (CRUD, tra cứu mã số thuế).
- Xác thực: Yêu cầu `access_token` cho các route admin; kiểm tra mã số thuế là public.
- Phương thức chính:
  - `getOrganizations(token, params)`: Lấy danh sách tổ chức với lọc & phân trang.
  - `getOrganizationById(token, id)`: Lấy chi tiết tổ chức.
  - `createOrganization(token, data)`: Tạo tổ chức mới.
  - `updateOrganization(token, id, data)`: Cập nhật tổ chức.
  - `checkTaxCodeExists(taxCode)`: Kiểm tra mã số thuế (public endpoint).
- Trả về: API trả `data` (thường chứa `items`, `total`, ...). Lưu ý xử lý lỗi khi `response.ok` false.

**OrganizationRoleService**: [gen-hub/client/services/organization/organization_role.service.ts](gen-hub/client/services/organization/organization_role.service.ts)
- Mục đích: Lấy thông tin vai trò/role trong 1 tổ chức.
- Phương thức chính: `getOrganizationRole(access_token, organization_id)`.
- Xác thực: yêu cầu `access_token`.

**OrganizationApiKeyService**: [gen-hub/client/services/organization/organization_api_key.service.ts](gen-hub/client/services/organization/organization_api_key.service.ts)
- Mục đích: Lấy API key của tổ chức.
- Phương thức chính: `getOrganizationApiKey(access_token, organization_id)`.
- Xác thực: yêu cầu `access_token`.

**AuthService**: [gen-hub/client/services/auth/auth.service.ts](gen-hub/client/services/auth/auth.service.ts)
- Mục đích: Đăng ký/đăng nhập/2FA/refresh token/logout.
- Phương thức chính: `register`, `login`, `login2fa`, `verify_password`, `logout`, `logoutAllDevices`, `getNewToken`.
- Xác thực: endpoints xử lý tạo và lưu token; `auth-storage` được dùng để lưu token.

**AuthStorageService**: [gen-hub/client/services/auth/auth-storage.service.ts](gen-hub/client/services/auth/auth-storage.service.ts)
- Mục đích: Bao bọc cơ chế lưu token, trạng thái 2FA, theme, user id.
- Phương thức chính: `getAccessToken`, `getRefreshToken`, `setTokens`, `clearTokens`, `isAuthenticated`, `getUser`.
- Lưu ý: dùng cookie helpers; `isAuthenticated` giải mã JWT để kiểm tra expiry.

**UserService**: [gen-hub/client/services/user/user.service.ts](gen-hub/client/services/user/user.service.ts)
- Mục đích: Lấy và cập nhật profile, thay đổi mật khẩu, 2FA cho user.
- Phương thức chính: `getUser(access, refresh)`, `updateUser`, `change_password`, `enableTwoFactor`, `verifySetUp`, `disableTwoFactor`, `searchUsers`.
- Xác thực: yêu cầu `access_token`. `getUser` tự try refresh khi 401.

**NotificationService**: [gen-hub/client/services/notification/notification.service.ts](gen-hub/client/services/notification/notification.service.ts)
- Mục đích: Quản lý thông báo (người dùng + admin gửi thông báo).
- Phương thức chính: `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `sendNotification`, `sendBulkNotification`, `getUserNotifications`.
- Xác thực: `access_token` cho hầu hết các route.

**PublicWarehouseService**: [gen-hub/client/services/public-warehouse/public-warehouse.service.ts](gen-hub/client/services/public-warehouse/public-warehouse.service.ts)
- Mục đích: Các endpoint public để xem danh sách kho, chi tiết, ảnh (không cần auth).
- Phương thức chính: `getPublicWarehouses`, `getPublicWarehouseById`, `getWarehouseImages`.

**WarehouseTemplateService**: [gen-hub/client/services/warehouse_template/warehouse_template.service.ts](gen-hub/client/services/warehouse_template/warehouse_template.service.ts)
- Mục đích: Quản lý template kho (CRUD), rows/racks, ảnh.
- Phương thức chính: `getWarehouseTemplates`, `getWarehouseTemplateById`, `createWarehouseTemplate`, `updateWarehouseTemplate`, `deleteWarehouseTemplate`, `getWarehouseImage`, `getWarehouseRow`, ...
- Xác thực: yêu cầu `token`.

**WarehouseVisitService**: [gen-hub/client/services/warehouse-visit/warehouse-visit.service.ts](gen-hub/client/services/warehouse-visit/warehouse-visit.service.ts)
- Mục đích: Đặt lịch thăm kho, quản lý trạng thái booking.
- Phương thức chính: `createBooking`, `getBookings`, `getBookingById`, `updateStatus`, `reschedule`, `deleteBooking`.
- Return: trả `data` hoặc object chứa `data` và `total`.

**RentalContractService**: [gen-hub/client/services/rental-contract/rental-contract.service.ts](gen-hub/client/services/rental-contract/rental-contract.service.ts)
- Mục đích: Quản lý hợp đồng thuê (tạo, lấy, cập nhật, hủy, hủy nhiều).
- Phương thức chính: `getRentalContracts`, `createRentalContract`, `getRentalContractById`, `updateRentalContract`, `cancelRentalContract`, `cancelManyRentalContracts`.

**RentalDurationTierService**: [gen-hub/client/services/rental-duration-tier/rental-duration-tier.service.ts](gen-hub/client/services/rental-duration-tier/rental-duration-tier.service.ts)
- Mục đích: Quản lý các gói thời gian thuê (tiers) dùng để tính giá.
- Phương thức chính: `getAllRentalDuratuion`, `getRentalDurationTier`, `getPublicActiveTiers`, `createRentalDurationTier`, `updateRentalDurationTier`, `deleteRentalDurationTier`, `deleteMultipleRentalDurationTier`.

**AddonsService**: [gen-hub/client/services/addons/addons.service.ts](gen-hub/client/services/addons/addons.service.ts)
- Mục đích: Quản lý addon (dịch vụ bổ trợ) cho hợp đồng.
- Phương thức chính: `getAllAddons`, `getAddonById`, `getAllAddonActive`, `getPublicActiveAddons`, `createAddon`, `updateAddon`, `deleteAddon`, ...

**AddonsTypeService**: [gen-hub/client/services/addons/addonsType.service.ts](gen-hub/client/services/addons/addonsType.service.ts)
- Mục đích: Quản lý loại addon (CRUD).

**AmenitiesService**: [gen-hub/client/services/amenities/amenities.service.ts](gen-hub/client/services/amenities/amenities.service.ts)
- Mục đích: Quản lý tiện nghi kho (amenities) - CRUD, lọc, xóa nhiều.

**CategoriesService**: [gen-hub/client/services/categories/categories.service.ts](gen-hub/client/services/categories/categories.service.ts)
- Mục đích: Quản lý danh mục (categories): lấy tất cả, lấy theo id, lấy active, tạo, cập nhật.

**LocationService**: [gen-hub/client/services/location/location.service.ts](gen-hub/client/services/location/location.service.ts)
- Mục đích: Lấy danh sách tỉnh/ward, chi tiết theo id. Hữu ích cho form địa chỉ và lọc theo vùng.

**PaymentService**: [gen-hub/client/services/payment/payment.service.ts](gen-hub/client/services/payment/payment.service.ts)
- Mục đích: Tra cứu thông tin thanh toán theo mã.
- Phương thức chính: `getPaymentByCode(paymentCode)`.

**OrderService**: [gen-hub/client/services/order/order.service.ts](gen-hub/client/services/order/order.service.ts)
- Mục đích: Tạo đơn thuê, lấy đơn, hủy đơn, kiểm tra trạng thái thanh toán, lấy mã QR SePay.
- Phương thức chính: `createOrder`, `getOrderById`, `getMyOrders`, `cancelOrder`, `checkPaymentStatus`, `getSePayQRCode`.

**CouponService**: [gen-hub/client/services/coupons/coupon.service.ts](gen-hub/client/services/coupons/coupon.service.ts)
- Mục đích: Quản lý coupon: lấy danh sách, lấy theo id, coupons public, save/unsave, validate.

**PublicQuotationService**: [gen-hub/client/services/public-quotation/public-quotation.service.ts](gen-hub/client/services/public-quotation/public-quotation.service.ts)
- Mục đích: Tính báo giá công khai cho widget (Booking) dựa trên thông tin kho, addons, bảo hiểm, coupon.
- Phương thức chính: `calculateQuotation(request)` — trả về tổng chi phí, tiền cọc, khả năng thuê.

**InsuranceService**: [gen-hub/client/services/Insurance/Insurance.service.ts](gen-hub/client/services/Insurance/Insurance.service.ts)
- Mục đích: Quản lý bảo hiểm (insurances) dùng trong báo giá/đơn: lấy, tạo, cập nhật, xóa, lấy public active.

**ContactListService & ContactTagsService**: [gen-hub/client/services/contact-list/contact-list.service.ts](gen-hub/client/services/contact-list/contact-list.service.ts), [gen-hub/client/services/contact-tags/contact-tags.service.ts](gen-hub/client/services/contact-tags/contact-tags.service.ts)
- Mục đích: Quản lý contact lists và tags cho tính năng CRM/marketing nội bộ.

**ContractTemplateService**: [gen-hub/client/services/contract/contract-template.service.ts](gen-hub/client/services/contract/contract-template.service.ts)
- Mục đích: Sinh hợp đồng (PDF) từ template, điền dữ liệu hợp đồng, flatten form, trả về Blob PDF.
- Ghi chú: dùng `pdf-lib`, có hai cơ chế: điền form field nếu có, hoặc overlay text nếu không có field.

---

Ghi chú chung:
- Hầu hết service dùng `fetch` trực tiếp tới `process.env.NEXT_PUBLIC_API_URL`.
- Hầu hết endpoint admin yêu cầu header `Authorization: Bearer <token>`.
- Error handling: pattern chung là kiểm tra `response.ok` và throw Error với `errorData.message` nếu có. Một số service log lỗi rồi rethrow hoặc trả fallback.

Nếu bạn muốn, tôi có thể:
- (1) Mở rộng mô tả từng phương thức với ví dụ request/response mẫu.
- (2) Tạo checklist unit-test hoặc tiêu chí mock cho từng service.
