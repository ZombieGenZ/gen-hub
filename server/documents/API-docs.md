| STT | Module | Method | Path | Success | Test | Integration |
| :---: | --- | :---: | --- | :---: | :---: | :---: |
| 1 | Health | GET | / | ❎ | ❎ | ❎ |
| 2 | Health | GET | /health | ❎ | ❎ | ❎ |
| 3 | Config | GET | /config | ❎ | ❎ | ❎ |
| 4 | Config | PATCH | /config | ❎ | ❎ | ❎ |
| 5 | Config | POST | /config/reset | ❎ | ❎ | ❎ |
| 6 | Config | POST | /config/reload | ❎ | ❎ | ❎ |
| 7 | Auth | POST | /auth/register | ❎ | ❎ | ❎ |
| 8 | Auth | POST | /auth/login | ❎ | ❎ | ❎ |
| 9 | Auth | POST | /auth/login/database-panel | ❎ | ❎ | ❎ |
| 10 | Auth | POST | /auth/login/feature-flag-panel | ❎ | ❎ | ❎ |
| 11 | Auth | POST | /auth/login/resources-panel | ❎ | ❎ | ❎ |
| 12 | Auth | POST | /auth/refresh | ❎ | ❎ | ❎ |
| 13 | Auth | POST | /auth/logout | ❎ | ❎ | ❎ |
| 14 | Auth | POST | /auth/logout-all | ❎ | ❎ | ❎ |
| 15 | Auth | POST | /auth/verify-email | ❎ | ❎ | ❎ |
| 16 | Auth | POST | /auth/resend-verification | ❎ | ❎ | ❎ |
| 17 | Auth | POST | /auth/verify-access | ❎ | ❎ | ❎ |
| 18 | Auth | POST | /auth/forgot-password | ❎ | ❎ | ❎ |
| 19 | Auth | POST | /auth/verify-forgot-password-token | ❎ | ❎ | ❎ |
| 20 | Auth | POST | /auth/reset-password | ❎ | ❎ | ❎ |
| 21 | Account | GET | /account/profile | ❎ | ❎ | ❎ |
| 22 | Account | PATCH | /account/profile | ❎ | ❎ | ❎ |
| 23 | Account | POST | /account/change-password | ❎ | ❎ | ❎ |
| 24 | Two-Factor Authentication | POST | /2fa/setup | ❎ | ❎ | ❎ |
| 25 | Two-Factor Authentication | POST | /2fa/verify-setup | ❎ | ❎ | ❎ |
| 26 | Two-Factor Authentication | POST | /2fa/disable | ❎ | ❎ | ❎ |
| 27 | Two-Factor Authentication | POST | /2fa/verify-login | ❎ | ❎ | ❎ |
| 28 | Two-Factor Authentication | POST | /2fa/regenerate-backup-codes | ❎ | ❎ | ❎ |
| 29 | Provinces | GET | /provinces | ❎ | ❎ | ❎ |
| 30 | Provinces | GET | /provinces/{id} | ❎ | ❎ | ❎ |
| 31 | Wards | GET | /wards | ❎ | ❎ | ❎ |
| 32 | Wards | GET | /wards/{id} | ❎ | ❎ | ❎ |
| 33 | Amenities | POST | /amenities | ❎ | ❎ | ❎ |
| 34 | Amenities | GET | /amenities | ❎ | ❎ | ❎ |
| 35 | Amenities | GET | /amenities/{id} | ❎ | ❎ | ❎ |
| 36 | Amenities | PUT | /amenities/{id} | ❎ | ❎ | ❎ |
| 37 | Amenities | DELETE | /amenities/{id} | ❎ | ❎ | ❎ |
| 38 | Amenities | DELETE | /amenities/delete/many | ❎ | ❎ | ❎ |
| 39 | Addons | POST | /addons | ❎ | ❎ | ❎ |
| 40 | Addons | GET | /addons | ❎ | ❎ | ❎ |
| 41 | Addons | GET | /addons/active | ❎ | ❎ | ❎ |
| 42 | Addons | GET | /addons/{id} | ❎ | ❎ | ❎ |
| 43 | Addons | PUT | /addons/{id} | ❎ | ❎ | ❎ |
| 44 | Addons | DELETE | /addons/{id} | ❎ | ❎ | ❎ |
| 45 | Addons | DELETE | /addons/delete/many | ❎ | ❎ | ❎ |
| 46 | Insurances | POST | /insurances | ❎ | ❎ | ❎ |
| 47 | Insurances | GET | /insurances | ❎ | ❎ | ❎ |
| 48 | Insurances | GET | /insurances/active | ❎ | ❎ | ❎ |
| 49 | Insurances | GET | /insurances/{id} | ❎ | ❎ | ❎ |
| 50 | Insurances | PUT | /insurances/{id} | ❎ | ❎ | ❎ |
| 51 | Insurances | DELETE | /insurances/{id} | ❎ | ❎ | ❎ |
| 52 | Insurances | DELETE | /insurances/delete/many | ❎ | ❎ | ❎ |
| 53 | Coupons | POST | /coupons | ❎ | ❎ | ❎ |
| 47 | Coupons | GET | /coupons | ❎ | ❎ | ❎ |
| 48 | Coupons | GET | /coupons/{id} | ❎ | ❎ | ❎ |
| 49 | Coupons | PUT | /coupons/{id} | ❎ | ❎ | ❎ |
| 50 | Coupons | DELETE | /coupons/{id} | ❎ | ❎ | ❎ |
| 51 | Coupons | DELETE | /coupons/delete/many | ❎ | ❎ | ❎ |
| 52 | Public Coupons | GET | /public/coupons | ❎ | ❎ | ❎ |
| 53 | Public Coupons | GET | /public/coupons/saved | ❎ | ❎ | ❎ |
| 54 | Public Coupons | POST | /public/coupons/applicable | ❎ | ❎ | ❎ |
| 55 | Public Coupons | POST | /public/coupons/validate | ❎ | ❎ | ❎ |
| 56 | Public Coupons | POST | /public/coupons/{id}/save | ❎ | ❎ | ❎ |
| 57 | Public Coupons | DELETE | /public/coupons/{id}/save | ❎ | ❎ | ❎ |
| 58 | Coupon Schedules | POST | /coupon-schedules | ❎ | ❎ | ❎ |
| 59 | Coupon Schedules | GET | /coupon-schedules | ❎ | ❎ | ❎ |
| 60 | Coupon Schedules | GET | /coupon-schedules/{id} | ❎ | ❎ | ❎ |
| 61 | Coupon Schedules | PUT | /coupon-schedules/{id} | ❎ | ❎ | ❎ |
| 62 | Coupon Schedules | DELETE | /coupon-schedules/{id} | ❎ | ❎ | ❎ |
| 63 | Coupon Schedules | DELETE | /coupon-schedules/delete/many | ❎ | ❎ | ❎ |
| 64 | Rental Duration Tiers | POST | /rental-duration-tiers | ❎ | ❎ | ❎ |
| 65 | Rental Duration Tiers | GET | /rental-duration-tiers | ❎ | ❎ | ❎ |
| 66 | Rental Duration Tiers | GET | /rental-duration-tiers/active | ❎ | ❎ | ❎ |
| 67 | Rental Duration Tiers | GET | /rental-duration-tiers/{id} | ❎ | ❎ | ❎ |
| 68 | Rental Duration Tiers | PUT | /rental-duration-tiers/{id} | ❎ | ❎ | ❎ |
| 69 | Rental Duration Tiers | DELETE | /rental-duration-tiers/{id} | ❎ | ❎ | ❎ |
| 70 | Rental Duration Tiers | DELETE | /rental-duration-tiers/delete/many | ❎ | ❎ | ❎ |
| 71 | Warehouse Templates | POST | /warehouse-templates | ❎ | ❎ | ❎ |
| 72 | Warehouse Templates | GET | /warehouse-templates | ❎ | ❎ | ❎ |
| 73 | Warehouse Templates | GET | /warehouse-templates/{id} | ❎ | ❎ | ❎ |
| 74 | Warehouse Templates | PUT | /warehouse-templates/{id} | ❎ | ❎ | ❎ |
| 75 | Warehouse Templates | DELETE | /warehouse-templates/{id} | ❎ | ❎ | ❎ |
| 76 | Warehouse Templates | DELETE | /warehouse-templates/delete/many | ❎ | ❎ | ❎ |
| 77 | Warehouse Templates | PUT | /warehouse-templates/{id}/layout | ❎ | ❎ | ❎ |
| 78 | Warehouse Templates | POST | /warehouse-templates/{id}/images | ❎ | ❎ | ❎ |
| 79 | Warehouse Templates | GET | /warehouse-templates/{id}/images | ❎ | ❎ | ❎ |
| 80 | Warehouse Templates | DELETE | /warehouse-templates/{id}/images/{imageId} | ❎ | ❎ | ❎ |
| 81 | Warehouse Templates | DELETE | /warehouse-templates/{id}/images/delete/many | ❎ | ❎ | ❎ |
| 82 | Warehouse Templates | PUT | /warehouse-templates/{id}/images/reorder | ❎ | ❎ | ❎ |
| 83 | Row Templates | POST | /warehouse-templates/{warehouseTemplateId}/rows | ❎ | ❎ | ❎ |
| 84 | Row Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows | ❎ | ❎ | ❎ |
| 85 | Row Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{id} | ❎ | ❎ | ❎ |
| 86 | Row Templates | PUT | /warehouse-templates/{warehouseTemplateId}/rows/{id} | ❎ | ❎ | ❎ |
| 87 | Row Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{id} | ❎ | ❎ | ❎ |
| 88 | Row Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/delete/many | ❎ | ❎ | ❎ |
| 89 | Rack Templates | POST | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks | ❎ | ❎ | ❎ |
| 90 | Rack Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks | ❎ | ❎ | ❎ |
| 91 | Rack Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{id} | ❎ | ❎ | ❎ |
| 92 | Rack Templates | PUT | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{id} | ❎ | ❎ | ❎ |
| 93 | Rack Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{id} | ❎ | ❎ | ❎ |
| 94 | Rack Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/delete/many | ❎ | ❎ | ❎ |
| 95 | Shelf Templates | POST | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves | ❎ | ❎ | ❎ |
| 96 | Shelf Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves | ❎ | ❎ | ❎ |
| 97 | Shelf Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{id} | ❎ | ❎ | ❎ |
| 98 | Shelf Templates | PUT | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{id} | ❎ | ❎ | ❎ |
| 99 | Shelf Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{id} | ❎ | ❎ | ❎ |
| 100 | Shelf Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/delete/many | ❎ | ❎ | ❎ |
| 101 | Block Templates | POST | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{shelfId}/blocks | ❎ | ❎ | ❎ |
| 102 | Block Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{shelfId}/blocks | ❎ | ❎ | ❎ |
| 103 | Block Templates | GET | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{shelfId}/blocks/{id} | ❎ | ❎ | ❎ |
| 104 | Block Templates | PUT | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{shelfId}/blocks/{id} | ❎ | ❎ | ❎ |
| 105 | Block Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{shelfId}/blocks/{id} | ❎ | ❎ | ❎ |
| 106 | Block Templates | DELETE | /warehouse-templates/{warehouseTemplateId}/rows/{rowId}/racks/{rackId}/shelves/{shelfId}/blocks/delete/many | ❎ | ❎ | ❎ |
| 107 | Organizations | POST | /organizations | ❎ | ❎ | ❎ |
| 108 | Organizations | GET | /organizations | ❎ | ❎ | ❎ |
| 109 | Organizations | GET | /organizations/{id} | ❎ | ❎ | ❎ |
| 110 | Organizations | PUT | /organizations/{id} | ❎ | ❎ | ❎ |
| 111 | Organizations | DELETE | /organizations/{id} | ❎ | ❎ | ❎ |
| 112 | Organizations | DELETE | /organizations/delete/many | ❎ | ❎ | ❎ |
| 113 | Organizations | POST | /organizations/{id}/leave | ❎ | ❎ | ❎ |
| 114 | Organizations | POST | /organizations/{id}/transfer-ownership | ❎ | ❎ | ❎ |
| 115 | Organizations | POST | /organizations/{id}/members/invite | ❎ | ❎ | ❎ |
| 116 | Organizations | DELETE | /organizations/{id}/members/{memberId}/invite | ❎ | ❎ | ❎ |
| 117 | Organizations | POST | /organizations/{id}/members/accept | ❎ | ❎ | ❎ |
| 118 | Organizations | POST | /organizations/{id}/members/reject | ❎ | ❎ | ❎ |
| 119 | Organizations | GET | /organizations/invite/verify/{token} | ❎ | ❎ | ❎ |
| 120 | Organizations | POST | /organizations/invite/accept/{token} | ❎ | ❎ | ❎ |
| 121 | Organizations | POST | /organizations/invite/reject/{token} | ❎ | ❎ | ❎ |
| 122 | Organizations | GET | /organizations/{id}/members | ❎ | ❎ | ❎ |
| 123 | Organizations | PUT | /organizations/{id}/members/{memberId}/roles | ❎ | ❎ | ❎ |
| 124 | Organizations | PUT | /organizations/{id}/members/{memberId}/permissions | ❎ | ❎ | ❎ |
| 125 | Organizations | DELETE | /organizations/{id}/members/{memberId} | ❎ | ❎ | ❎ |
| 126 | Organizations | PATCH | /organizations/{id}/members/{memberId}/display-name | ❎ | ❎ | ❎ |
| 127 | Organizations | PATCH | /organizations/{id}/me/display-name | ❎ | ❎ | ❎ |
| 130 | Organizations | GET | /organizations/{id}/permissions | ❎ | ❎ | ❎ |
| 131 | Organizations | GET | /organizations/permissions/api-key-enabled | ❎ | ❎ | ❎ |
| 132 | Organizations | POST | /organizations/{id}/update-request | ❎ | ❎ | ❎ |
| 133 | Organization Roles | POST | /organizations/{orgId}/roles | ❎ | ❎ | ❎ |
| 131 | Organization Roles | GET | /organizations/{orgId}/roles | ❎ | ❎ | ❎ |
| 132 | Organization Roles | GET | /organizations/{orgId}/roles/{roleId} | ❎ | ❎ | ❎ |
| 133 | Organization Roles | PUT | /organizations/{orgId}/roles/{roleId} | ❎ | ❎ | ❎ |
| 134 | Organization Roles | DELETE | /organizations/{orgId}/roles/{roleId} | ❎ | ❎ | ❎ |
| 135 | Organization Roles | DELETE | /organizations/{orgId}/roles/delete/many | ❎ | ❎ | ❎ |
| 136 | Organization API Keys | POST | /organizations/{orgId}/api-keys | ❎ | ❎ | ❎ |
| 137 | Organization API Keys | GET | /organizations/{orgId}/api-keys | ❎ | ❎ | ❎ |
| 138 | Organization API Keys | GET | /organizations/{orgId}/api-keys/{keyId} | ❎ | ❎ | ❎ |
| 139 | Organization API Keys | PUT | /organizations/{orgId}/api-keys/{keyId} | ❎ | ❎ | ❎ |
| 140 | Organization API Keys | DELETE | /organizations/{orgId}/api-keys/{keyId} | ❎ | ❎ | ❎ |
| 141 | Organization API Keys | POST | /organizations/{orgId}/api-keys/{keyId}/reset | ❎ | ❎ | ❎ |
| 142 | Organization API Keys | DELETE | /organizations/{orgId}/api-keys/delete/many | ❎ | ❎ | ❎ |
| 143 | API Key Verification | POST | /api-keys/verify | ❎ | ❎ | ❎ |
| 144 | API Keys | GET | /admin/api-keys | ❎ | ❎ | ❎ |
| 145 | API Keys | GET | /admin/api-keys/{id} | ❎ | ❎ | ❎ |
| 146 | API Keys | PUT | /admin/api-keys/{id} | ❎ | ❎ | ❎ |
| 147 | API Keys | DELETE | /admin/api-keys/{id} | ❎ | ❎ | ❎ |
| 148 | API Keys | DELETE | /admin/api-keys/delete/many | ❎ | ❎ | ❎ |
| 149 | Rental Contracts | POST | /rental-contracts | ❎ | ❎ | ❎ |
| 150 | Rental Contracts | GET | /rental-contracts | ❎ | ❎ | ❎ |
| 151 | Rental Contracts | GET | /rental-contracts/{id} | ❎ | ❎ | ❎ |
| 152 | Rental Contracts | PUT | /rental-contracts/{id} | ❎ | ❎ | ❎ |
| 153 | Rental Contracts | DELETE | /rental-contracts/{id} | ❎ | ❎ | ❎ |
| 154 | Rental Contracts | DELETE | /rental-contracts/delete/many | ❎ | ❎ | ❎ |
| 155 | Organization Rental Contracts | GET | /organizations/{orgId}/rental-contracts | ❎ | ❎ | ❎ |
| 156 | Organization Rental Contracts | GET | /organizations/{orgId}/rental-contracts/{id} | ❎ | ❎ | ❎ |
| 157 | Organization Rental Contracts | DELETE | /organizations/{orgId}/rental-contracts/{id} | ❎ | ❎ | ❎ |
| 158 | Organization Rental Contracts | GET | /organizations/{orgId}/rental-contracts/{id}/full | ❎ | ❎ | ❎ |
| 159 | Organization Rental Contracts | PUT | /organizations/{orgId}/rental-contracts/{id}/renew | ❎ | ❎ | ❎ |
| 160 | Organization Rental Contracts | POST | /organizations/{orgId}/rental-contracts/{id}/retry-payment | ❎ | ❎ | ❎ |
| 161 | Organization Rental Contracts | GET | /organizations/{orgId}/rental-contracts/{id}/addons | ❎ | ❎ | ❎ |
| 162 | Organization Rental Contracts | POST | /organizations/{orgId}/rental-contracts/{id}/addons | ❎ | ❎ | ❎ |
| 163 | Organization Rental Contracts | DELETE | /organizations/{orgId}/rental-contracts/{id}/addons/{addonId} | ❎ | ❎ | ❎ |
| 164 | Organization Rental Contracts | GET | /organizations/{orgId}/rental-contracts/{id}/logs | ❎ | ❎ | ❎ |
| 165 | Organization Rental Contracts | POST | /organizations/{orgId}/rental-contracts/{id}/cancel | ❎ | ❎ | ❎ |
| 166 | Organization Rental Contracts | DELETE | /organizations/{orgId}/rental-contracts/delete/many | ❎ | ❎ | ❎ |
| 167 | Organization Warehouses | GET | /organizations/{orgId}/warehouses | ❎ | ❎ | ❎ |
| 168 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id} | ❎ | ❎ | ❎ |
| 169 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id}/layout | ❎ | ❎ | ❎ |
| 170 | Organization Warehouses | PUT | /organizations/{orgId}/warehouses/{id} | ❎ | ❎ | ❎ |
| 171 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id}/racks | ❎ | ❎ | ❎ |
| 172 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id}/racks/{rackId}/shelves | ❎ | ❎ | ❎ |
| 173 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id}/racks/{rackId}/shelves/{shelfId}/blocks | ❎ | ❎ | ❎ |
| 174 | User Notifications | GET | /user-notifications | ❎ | ❎ | ❎ |
| 168 | User Notifications | GET | /user-notifications/unread-count | ❎ | ❎ | ❎ |
| 169 | User Notifications | GET | /user-notifications/user/{userId} | ❎ | ❎ | ❎ |
| 170 | User Notifications | POST | /user-notifications/send | ❎ | ❎ | ❎ |
| 171 | User Notifications | PUT | /user-notifications/{id}/read | ❎ | ❎ | ❎ |
| 172 | User Notifications | PUT | /user-notifications/read-all | ❎ | ❎ | ❎ |
| 173 | Payment | POST | /payment/webhook | ❎ | ❎ | ❎ |
| 174 | Payment | GET | /payment/{paymentCode} | ❎ | ❎ | ❎ |
| 175 | Payment | GET | /payment/callback/success | ❎ | ❎ | ❎ |
| 176 | Payment | GET | /payment/callback/cancel | ❎ | ❎ | ❎ |
| 177 | Payment Admin | GET | /admin/payments | ❎ | ❎ | ❎ |
| 178 | Organization Warehouses | GET | /organizations/{orgId}/warehouses | ❎ | ❎ | ❎ |
| 179 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id} | ❎ | ❎ | ❎ |
| 180 | Organization Warehouses | PUT | /organizations/{orgId}/warehouses/{id} | ❎ | ❎ | ❎ |
| 181 | Organization Warehouses | GET | /organizations/{orgId}/warehouses/{id}/layout | ❎ | ❎ | ❎ |
| 182 | Global Notifications | POST | /global-notifications | ❎ | ❎ | ❎ |
| 183 | Global Notifications | GET | /global-notifications | ❎ | ❎ | ❎ |
| 184 | Global Notifications | GET | /global-notifications/active | ❎ | ❎ | ❎ |
| 185 | Global Notifications | GET | /global-notifications/{id} | ❎ | ❎ | ❎ |
| 186 | Global Notifications | PUT | /global-notifications/{id} | ❎ | ❎ | ❎ |
| 187 | Global Notifications | DELETE | /global-notifications/{id} | ❎ | ❎ | ❎ |
| 188 | Global Notifications | DELETE | /global-notifications/delete/many | ❎ | ❎ | ❎ |
| 189 | Organization Notifications | POST | /organizations/{orgId}/notifications | ❎ | ❎ | ❎ |
| 190 | Organization Notifications | GET | /organizations/{orgId}/notifications | ❎ | ❎ | ❎ |
| 191 | Organization Notifications | GET | /organizations/{orgId}/notifications/{id} | ❎ | ❎ | ❎ |
| 192 | Organization Notifications | PUT | /organizations/{orgId}/notifications/{id} | ❎ | ❎ | ❎ |
| 193 | Organization Notifications | DELETE | /organizations/{orgId}/notifications/{id} | ❎ | ❎ | ❎ |
| 194 | Organization Notifications | DELETE | /organizations/{orgId}/notifications/delete/many | ❎ | ❎ | ❎ |
| 195 | Partners | POST | /organizations/{orgId}/partners | ❎ | ❎ | ❎ |
| 196 | Partners | GET | /organizations/{orgId}/partners | ❎ | ❎ | ❎ |
| 197 | Partners | GET | /organizations/{orgId}/partners/{id} | ❎ | ❎ | ❎ |
| 198 | Partners | PUT | /organizations/{orgId}/partners/{id} | ❎ | ❎ | ❎ |
| 199 | Partners | DELETE | /organizations/{orgId}/partners/{id} | ❎ | ❎ | ❎ |
| 200 | Partners | DELETE | /organizations/{orgId}/partners/delete/many | ❎ | ❎ | ❎ |
| 201 | Products | POST | /organizations/{orgId}/products | ❎ | ❎ | ❎ |
| 202 | Products | GET | /organizations/{orgId}/products | ❎ | ❎ | ❎ |
| 203 | Products | GET | /organizations/{orgId}/products/{id} | ❎ | ❎ | ❎ |
| 204 | Products | PUT | /organizations/{orgId}/products/{id} | ❎ | ❎ | ❎ |
| 205 | Products | DELETE | /organizations/{orgId}/products/{id} | ❎ | ❎ | ❎ |
| 206 | Products | DELETE | /organizations/{orgId}/products/delete/many | ❎ | ❎ | ❎ |
| 207 | Batches | POST | /organizations/{orgId}/batches | ❎ | ❎ | ❎ |
| 208 | Batches | GET | /organizations/{orgId}/products/{productId}/batches | ❎ | ❎ | ❎ |
| 209 | Batches | GET | /organizations/{orgId}/batches/{id} | ❎ | ❎ | ❎ |
| 210 | Batches | PUT | /organizations/{orgId}/batches/{id} | ❎ | ❎ | ❎ |
| 211 | Batches | DELETE | /organizations/{orgId}/batches/{id} | ❎ | ❎ | ❎ |
| 212 | Batches | DELETE | /organizations/{orgId}/batches/delete/many | ❎ | ❎ | ❎ |
| 213 | Database Panel | GET | /admin/tables | ❎ | ❎ | ❎ |
| 214 | Database Panel | GET | /admin/statistics | ❎ | ❎ | ❎ |
| 215 | Database Panel | GET | /admin/tables/{tableName}/schema | ❎ | ❎ | ❎ |
| 216 | Database Panel | GET | /admin/tables/{tableName} | ❎ | ❎ | ❎ |
| 217 | Database Panel | POST | /admin/tables/{tableName} | ❎ | ❎ | ❎ |
| 218 | Database Panel | GET | /admin/tables/{tableName}/{id} | ❎ | ❎ | ❎ |
| 219 | Database Panel | PUT | /admin/tables/{tableName}/{id} | ❎ | ❎ | ❎ |
| 220 | Database Panel | DELETE | /admin/tables/{tableName}/{id} | ❎ | ❎ | ❎ |
| 221 | Database Panel | POST | /admin/tables/{tableName}/batch | ❎ | ❎ | ❎ |
| 222 | Database Panel | DELETE | /admin/tables/{tableName}/bulk | ❎ | ❎ | ❎ |
| 223 | Database Panel | GET | /admin/diagram/schema | ❎ | ❎ | ❎ |
| 224 | Database Panel | GET | /admin/diagram/config | ❎ | ❎ | ❎ |
| 225 | Database Panel | PUT | /admin/diagram/config | ❎ | ❎ | ❎ |
| 226 | Database Panel | POST | /admin/query/execute | ❎ | ❎ | ❎ |
| 227 | Feature Flags | GET | /admin/feature-flags | ❎ | ❎ | ❎ |
| 228 | Feature Flags | GET | /admin/feature-flags/modules | ❎ | ❎ | ❎ |
| 229 | Feature Flags | GET | /admin/feature-flags/stats | ❎ | ❎ | ❎ |
| 230 | Feature Flags | GET | /admin/feature-flags/{id} | ❎ | ❎ | ❎ |
| 231 | Feature Flags | PUT | /admin/feature-flags/{id} | ❎ | ❎ | ❎ |
| 232 | Feature Flags | GET | /admin/feature-flags/{id}/logs | ❎ | ❎ | ❎ |
| 233 | Feature Flags | PUT | /admin/feature-flags/bulk/toggle | ❎ | ❎ | ❎ |
| 234 | Resources | GET | /admin/resources/overview | ❎ | ❎ | ❎ |
| 235 | Resources | GET | /admin/resources/stats | ❎ | ❎ | ❎ |
| 236 | Resources | GET | /admin/resources/service/{serviceName} | ❎ | ❎ | ❎ |
| 237 | Analytics | GET | /analytics/traffic | ❎ | ❎ | ❎ |
| 238 | Organization Update Requests | POST | /organization-update-requests | ❎ | ❎ | ❎ |
| 239 | Organization Update Requests | GET | /organization-update-requests | ❎ | ❎ | ❎ |
| 240 | Organization Update Requests | GET | /organization-update-requests/{id} | ❎ | ❎ | ❎ |
| 241 | Organization Update Requests | PATCH | /organization-update-requests/{id}/approve | ❎ | ❎ | ❎ |
| 242 | Organization Update Requests | PATCH | /organization-update-requests/{id}/reject | ❎ | ❎ | ❎ |
| 243 | Addon Types | POST | /addon-types | ❎ | ❎ | ❎ |
| 244 | Addon Types | GET | /addon-types | ❎ | ❎ | ❎ |
| 245 | Addon Types | GET | /addon-types/active | ❎ | ❎ | ❎ |
| 246 | Addon Types | GET | /addon-types/{id} | ❎ | ❎ | ❎ |
| 247 | Addon Types | PUT | /addon-types/{id} | ❎ | ❎ | ❎ |
| 248 | Addon Types | DELETE | /addon-types/{id} | ❎ | ❎ | ❎ |
| 249 | Addon Types | DELETE | /addon-types/delete/many | ❎ | ❎ | ❎ |
| 250 | FAQs | POST | /faqs | ❎ | ❎ | ❎ |
| 251 | FAQs | GET | /faqs | ❎ | ❎ | ❎ |
| 252 | FAQs | GET | /faqs/public | ❎ | ❎ | ❎ |
| 253 | FAQs | GET | /faqs/{id} | ❎ | ❎ | ❎ |
| 254 | FAQs | PUT | /faqs/{id} | ❎ | ❎ | ❎ |
| 255 | FAQs | DELETE | /faqs/{id} | ❎ | ❎ | ❎ |
| 256 | FAQs | DELETE | /faqs/delete/many | ❎ | ❎ | ❎ |
| 257 | Contact | POST | /contact | ❎ | ❎ | ❎ |
| 258 | Contact | GET | /admin/contacts | ❎ | ❎ | ❎ |
| 259 | Contact | GET | /admin/contacts/{id} | ❎ | ❎ | ❎ |
| 260 | Contact | GET | /admin/contacts/{id}/messages | ❎ | ❎ | ❎ |
| 261 | Contact | GET | /admin/contacts/{id}/staff | ❎ | ❎ | ❎ |
| 262 | Contact | POST | /admin/contacts/{id}/assign-staff | ❎ | ❎ | ❎ |
| 263 | Contact | DELETE | /admin/contacts/{id}/staff/{staffId} | ❎ | ❎ | ❎ |
| 261 | Contact | PATCH | /admin/contacts/{id} | ❎ | ❎ | ❎ |
| 262 | Contact | POST | /admin/contacts/{id}/reply | ❎ | ❎ | ❎ |
| 263 | Contact | POST | /admin/contacts/{id}/close | ❎ | ❎ | ❎ |
| 274 | Contact | DELETE | /admin/contacts/{id} | ❎ | ❎ | ❎ |
| 275 | Contact | DELETE | /admin/contacts/delete/many | ❎ | ❎ | ❎ |
| 276 | Contact Tags | POST | /admin/contact-tags | ❎ | ❎ | ❎ |
| 277 | Contact Tags | GET | /admin/contact-tags | ❎ | ❎ | ❎ |
| 278 | Contact Tags | GET | /admin/contact-tags/active | ❎ | ❎ | ❎ |
| 279 | Contact Tags | GET | /admin/contact-tags/{id} | ❎ | ❎ | ❎ |
| 280 | Contact Tags | PUT | /admin/contact-tags/{id} | ❎ | ❎ | ❎ |
| 281 | Contact Tags | DELETE | /admin/contact-tags/{id} | ❎ | ❎ | ❎ |
| 282 | Contact Tags | DELETE | /admin/contact-tags/delete/many | ❎ | ❎ | ❎ |
| 283 | Gmail Webhook | POST | /webhooks/gmail | ❎ | ❎ | ❎ |
| 284 | Gmail Webhook | POST | /webhooks/gmail/health | ❎ | ❎ | ❎ |
| 285 | Refund Requests | GET | /refund-requests | ❎ | ❎ | ❎ |
| 286 | Refund Requests | GET | /refund-requests/{id} | ❎ | ❎ | ❎ |
| 287 | Refund Requests | PATCH | /refund-requests/{id}/accept | ❎ | ❎ | ❎ |
| 288 | Refund Requests | PATCH | /refund-requests/{id}/reject | ❎ | ❎ | ❎ |
| 289 | Refund Requests | PATCH | /refund-requests/{id}/status | ❎ | ❎ | ❎ |
| 290 | Refund Requests | DELETE | /refund-requests/{id} | ❎ | ❎ | ❎ |
| 291 | Refund Requests | GET | /organizations/{orgId}/refund-requests | ❎ | ❎ | ❎ |
| 292 | Refund Requests | GET | /organizations/{orgId}/refund-requests/{id} | ❎ | ❎ | ❎ |
| 293 | Coze Plugin (Public) | GET | /public/coze-plugin/warehouse-pricing | ❎ | ❎ | ❎ |
| 294 | Coze Plugin (Public) | GET | /public/coze-plugin/check-availability | ❎ | ❎ | ❎ |
| 295 | Coze Plugin (Public) | GET | /public/coze-plugin/rental-contract-terms | ❎ | ❎ | ❎ |
| 296 | Coze Plugin (Public) | GET | /public/coze-plugin/faq | ❎ | ❎ | ❎ |
| 297 | Contact Priority | GET | /admin/contacts/priority | ❎ | ❎ | ❎ |
| 298 | Contact Normal | GET | /admin/contacts/normal | ❎ | ❎ | ❎ |
| 299 | Contact Skipped | GET | /admin/contacts/skipped | ❎ | ❎ | ❎ |
| 300 | Contact List | POST | /admin/contact-lists | ❎ | ❎ | ❎ |
| 301 | Contact List | GET | /admin/contact-lists | ❎ | ❎ | ❎ |
| 302 | Contact List | GET | /admin/contact-lists/{id} | ❎ | ❎ | ❎ |
| 303 | Contact List | PUT | /admin/contact-lists/{id} | ❎ | ❎ | ❎ |
| 304 | Contact List | DELETE | /admin/contact-lists/{id} | ❎ | ❎ | ❎ |
| 305 | Contact List | POST | /admin/contact-lists/quick-add/email | ❎ | ❎ | ❎ |
| 306 | Contact List | POST | /admin/contact-lists/quick-remove/email | ❎ | ❎ | ❎ |
| 307 | Contact List | POST | /admin/contact-lists/quick-add/domain | ❎ | ❎ | ❎ |
| 308 | Contact List | POST | /admin/contact-lists/quick-remove/domain | ❎ | ❎ | ❎ |
| 309 | Contact List | POST | /admin/contact-lists/quick-add/ip | ❎ | ❎ | ❎ |
| 310 | Contact List | POST | /admin/contact-lists/quick-remove/ip | ❎ | ❎ | ❎ |
| 311 | Contact List | POST | /admin/contact-lists/quick-add/region | ❎ | ❎ | ❎ |
| 312 | Contact List | POST | /admin/contact-lists/quick-remove/region | ❎ | ❎ | ❎ |
| 313 | Contact List | GET | /admin/contact-lists/check/email | ❎ | ❎ | ❎ |
| 314 | Contact List | GET | /admin/contact-lists/check/ip | ❎ | ❎ | ❎ |
| 315 | Contact List | GET | /admin/contact-lists/check/region | ❎ | ❎ | ❎ |
| 316 | Database Backup | POST | /admin/backups/trigger | ❎ | ❎ | ❎ |
| 317 | Database Backup | GET | /admin/backups | ❎ | ❎ | ❎ |
| 318 | Database Backup | POST | /admin/backups/{id}/download-url | ❎ | ❎ | ❎ |
| 319 | QC Management | GET | /qc-management/warehouses | ❎ | ❎ | ❎ |
| 320 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId} | ❎ | ❎ | ❎ |
| 321 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/warehouses | ❎ | ❎ | ❎ |
| 322 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/warehouses/{warehouseId} | ❎ | ❎ | ❎ |
| 323 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/rows | ❎ | ❎ | ❎ |
| 324 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/rows/{qcRowId}/rows | ❎ | ❎ | ❎ |
| 325 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/rows/{qcRowId}/rows/{rowId} | ❎ | ❎ | ❎ |
| 326 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/rows/{qcRowId}/rows/{rowId}/racks | ❎ | ❎ | ❎ |
| 327 | QC Management | GET | /qc-management/warehouses/{qcWarehouseId}/rows/{qcRowId}/rows/{rowId}/racks/{rackId} | ❎ | ❎ | ❎ |
| 328 | QC Management | GET | /qc-management/warehouses/.../racks/{rackId}/shelves | ❎ | ❎ | ❎ |
| 329 | QC Management | GET | /qc-management/warehouses/.../racks/{rackId}/shelves/{shelfId} | ❎ | ❎ | ❎ |
| 330 | QC Management | GET | /qc-management/warehouses/.../shelves/{shelfId}/blocks | ❎ | ❎ | ❎ |
| 331 | QC Management | GET | /qc-management/warehouses/.../shelves/{shelfId}/blocks/{blockId} | ❎ | ❎ | ❎ |
| 332 | QC Management | GET | /qc-management/permissions | ❎ | ❎ | ❎ |
| 333 | QC Management | POST | /qc-management/warehouses/{id}/assignments | ❎ | ❎ | ❎ |
| 334 | QC Management | DELETE | /qc-management/warehouses/assignments/{assignmentId} | ❎ | ❎ | ❎ |
| 335 | QC Management | POST | /qc-management/rows/{id}/assignments | ❎ | ❎ | ❎ |
| 336 | QC Management | DELETE | /qc-management/rows/assignments/{assignmentId} | ❎ | ❎ | ❎ |
| 337 | User Management | GET | /admin/users | ❎ | ❎ | ❎ |
| 338 | User Management | GET | /admin/users/{id} | ❎ | ❎ | ❎ |
| 339 | User Management | POST | /admin/users/{id}/ban | ❎ | ❎ | ❎ |
| 340 | User Management | POST | /admin/users/{id}/unban | ❎ | ❎ | ❎ |
| 341 | User Management | POST | /admin/users/{id}/warn | ❎ | ❎ | ❎ |
| 342 | User Management | POST | /admin/users/{id}/unwarn/{warningId} | ❎ | ❎ | ❎ |
| 343 | User Management | GET | /admin/users/{id}/warnings | ❎ | ❎ | ❎ |
| 344 | User Management | GET | /admin/users/{id}/sessions | ❎ | ❎ | ❎ |
| 345 | User Management | DELETE | /admin/users/{id}/sessions | ❎ | ❎ | ❎ |
| 346 | User Management | DELETE | /admin/users/{id}/sessions/{sessionId} | ❎ | ❎ | ❎ |
| 347 | Warning Categories | POST | /admin/warning-categories | ❎ | ❎ | ❎ |
| 348 | Warning Categories | GET | /admin/warning-categories | ❎ | ❎ | ❎ |
| 349 | Warning Categories | GET | /admin/warning-categories/all | ❎ | ❎ | ❎ |
| 350 | Warning Categories | GET | /admin/warning-categories/{id} | ❎ | ❎ | ❎ |
| 351 | Warning Categories | PUT | /admin/warning-categories/{id} | ❎ | ❎ | ❎ |
| 352 | Warning Categories | DELETE | /admin/warning-categories/{id} | ❎ | ❎ | ❎ |
| 353 | Warning Categories | DELETE | /admin/warning-categories | ❎ | ❎ | ❎ |