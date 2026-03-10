-- Seed permission keys cho workflow nhập/xuất kho mới
-- Chạy một lần để thêm permissions vào bảng warehouse_manager_permissions
-- Lệnh: psql -d <database> -f prisma/seed-inventory-permissions.sql
-- Hoặc chạy trực tiếp trong DB tool (pgAdmin, DBeaver, etc.)

INSERT INTO warehouse_manager_permissions (id, name, key, description, is_active, created_at, is_deleted)
VALUES
  (uuid_generate_v4(), 'Kiểm đếm nhập kho', 'warehouse-manager.inventory.inbound.receive', 'Thực hiện kiểm đếm hàng khi nhập kho', true, NOW(), false),
  (uuid_generate_v4(), 'Cất hàng nhập kho', 'warehouse-manager.inventory.inbound.putaway', 'Thực hiện cất hàng lên kệ', true, NOW(), false),
  (uuid_generate_v4(), 'Nhặt hàng xuất kho', 'warehouse-manager.inventory.outbound.pick', 'Thực hiện nhặt hàng theo phiếu', true, NOW(), false),
  (uuid_generate_v4(), 'Kiểm tra xuất kho', 'warehouse-manager.inventory.outbound.check', 'Kiểm tra hàng trước khi xuất', true, NOW(), false),
  (uuid_generate_v4(), 'Hoàn tất xuất kho', 'warehouse-manager.inventory.outbound.ship', 'Bàn giao và hoàn tất xuất kho', true, NOW(), false)
ON CONFLICT (key) DO NOTHING;
