import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu kho 3D (demo 2 kho riêng biệt)
 * 
 * Kho 1: "Kho Thực Phẩm Mega" — lưu trữ thực phẩm, đồ uống
 * Kho 2: "Kho Điện Tử Smart" — lưu trữ thiết bị điện tử
 * 
 * Mỗi kho có layout (rows → racks → shelves → blocks) 
 * và inventory riêng biệt để demo data isolation.
 *
 * Kích hoạt bằng ENV: SEED_WAREHOUSE_3D=true
 */
export class Warehouse3DSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'Warehouse3DSeeder');
    }

    async run(): Promise<void> {
        if (process.env.SEED_WAREHOUSE_3D !== 'true') return;

        try {
            const org = await this.prisma.organization.findFirst({
                where: { is_deleted: false },
            });

            if (!org) {
                this.logger.warn('⚠️ Không tìm thấy organization. Chạy OrganizationSeeder trước.');
                return;
            }

            this.logger.log(`📦 Bắt đầu seed warehouse 3D cho org: ${org.name} (${org.id})`);

            const existingWh = await this.prisma.warehouse.findFirst({
                where: { name: 'Kho Thực Phẩm Mega', organization_id: org.id, is_deleted: false },
            });
            if (existingWh) {
                this.logger.log('⚠️ Dữ liệu demo kho 3D đã tồn tại, bỏ qua...');
                return;
            }

            const CB = 'seeder'; // created_by value

            // Tạo đơn vị tính
            const unitKg = await this.prisma.unit.upsert({
                where: { id: '00000000-0000-0000-0000-000000000001' },
                update: {},
                create: { id: '00000000-0000-0000-0000-000000000001', organization_id: org.id, name: 'Kg', description: 'Kilogram', created_by: CB } as any,
            });
            const unitBox = await this.prisma.unit.upsert({
                where: { id: '00000000-0000-0000-0000-000000000002' },
                update: {},
                create: { id: '00000000-0000-0000-0000-000000000002', organization_id: org.id, name: 'Thùng', description: 'Thùng carton', created_by: CB } as any,
            });
            const unitPiece = await this.prisma.unit.upsert({
                where: { id: '00000000-0000-0000-0000-000000000003' },
                update: {},
                create: { id: '00000000-0000-0000-0000-000000000003', organization_id: org.id, name: 'Cái', description: 'Từng cái', created_by: CB } as any,
            });

            // ═══════════════════════════════════════
            // KHO 1: Kho Thực Phẩm Mega
            // ═══════════════════════════════════════
            const wh1 = await this.prisma.warehouse.create({
                data: {
                    organization_id: org.id, name: 'Kho Thực Phẩm Mega',
                    description: 'Kho chứa thực phẩm, đồ uống, gia vị',
                    length: 20, width: 15, block_length: 1.0, block_width: 1.0,
                    ceiling_height: 6.0, is_active: true, is_deleted: false, created_by: CB,
                } as any,
            });
            this.logger.log(`✅ Kho 1 đã tạo: ${wh1.name} (${wh1.id})`);

            const createProduct = (name: string, sku: string, unitId: string) =>
                this.prisma.product.create({ data: { organization_id: org.id, name, sku, base_unit_id: unitId, created_by: CB } as any });

            const products1 = await Promise.all([
                createProduct('Gạo ST25', 'FOOD-001', unitKg.id),
                createProduct('Nước mắm Phú Quốc', 'FOOD-002', unitBox.id),
                createProduct('Mì Hảo Hảo', 'FOOD-003', unitBox.id),
                createProduct('Dầu ăn Tường An', 'FOOD-004', unitBox.id),
                createProduct('Nước ngọt Pepsi', 'FOOD-005', unitBox.id),
                createProduct('Sữa Vinamilk', 'FOOD-006', unitBox.id),
            ]);

            const batches1 = await Promise.all(products1.map((p, i) =>
                this.prisma.batch.create({
                    data: {
                        product_id: p.id, code: `BATCH-F${String(i + 1).padStart(2, '0')}`,
                        manufacturing_date: new Date('2025-01-15'),
                        expiry_date: new Date(`2025-${String(6 + i).padStart(2, '0')}-30`),
                        created_by: CB,
                    } as any,
                }),
            ));

            // Layout kho 1: 2 rows × 3 racks × 3 shelves × 2 blocks
            const blocks1: { id: string }[] = [];
            for (let r = 0; r < 2; r++) {
                const row = await this.prisma.row.create({
                    data: {
                        warehouse_id: wh1.id, name: `Dãy ${String.fromCharCode(65 + r)}`,
                        code: `R${r + 1}`, position_x: r * 5, position_y: 2,
                        is_active: true, created_by: CB,
                    } as any,
                });

                for (let rk = 0; rk < 3; rk++) {
                    const rack = await this.prisma.rack.create({
                        data: {
                            row_id: row.id, name: `Kệ ${row.code}-${rk + 1}`,
                            code: `${row.code}-RK${rk + 1}`, position_x: rk * 2,
                            dimensions_width: 1.2, dimensions_depth: 0.6, dimensions_height: 4.0,
                            is_active: true, created_by: CB,
                        } as any,
                    });

                    for (let s = 0; s < 3; s++) {
                        const shelf = await this.prisma.shelf.create({
                            data: {
                                rack_id: rack.id, name: `Tầng ${s + 1}`,
                                code: `${rack.code}-S${s + 1}`, height: 1.2,
                                is_active: true, created_by: CB,
                            } as any,
                        });

                        for (let b = 0; b < 2; b++) {
                            const block = await this.prisma.block.create({
                                data: {
                                    shelf_id: shelf.id, name: `Ô ${b + 1}`,
                                    code: `${shelf.code}-B${b + 1}`,
                                    position_x: b * 0.6, position_y: 0,
                                    dimensions_width: 0.5, dimensions_height: 1.0,
                                    max_weight_capacity: 50, is_active: true, created_by: CB,
                                } as any,
                            });
                            blocks1.push(block);
                        }
                    }
                }
            }

            // Inventory cho kho 1
            for (let i = 0; i < Math.min(products1.length, blocks1.length); i++) {
                const qty = 10 + Math.floor(Math.random() * 40);
                await this.prisma.inventory.create({
                    data: {
                        organization_id: org.id, warehouse_id: wh1.id,
                        block_id: blocks1[i].id, product_id: products1[i].id,
                        batch_id: batches1[i].id, quantity: qty,
                        quantity_on_hand: qty, quantity_allocated: 0,
                        quantity_available: qty, created_by: CB,
                    } as any,
                });
            }

            // Thêm vài items nữa
            for (let i = 0; i < 6 && i + products1.length < blocks1.length; i++) {
                const pIdx = i % products1.length;
                const qty = 5 + Math.floor(Math.random() * 25);
                await this.prisma.inventory.create({
                    data: {
                        organization_id: org.id, warehouse_id: wh1.id,
                        block_id: blocks1[products1.length + i].id,
                        product_id: products1[pIdx].id, batch_id: batches1[pIdx].id,
                        quantity: qty, quantity_on_hand: qty,
                        quantity_allocated: 0, quantity_available: qty, created_by: CB,
                    } as any,
                });
            }

            this.logger.log(`✅ Kho 1: ${blocks1.length} ô, ${products1.length + 6} inventory items`);

            // ═══════════════════════════════════════
            // KHO 2: Kho Điện Tử Smart
            // ═══════════════════════════════════════
            const wh2 = await this.prisma.warehouse.create({
                data: {
                    organization_id: org.id, name: 'Kho Điện Tử Smart',
                    description: 'Kho chứa thiết bị điện tử, phụ kiện, linh kiện',
                    length: 25, width: 20, block_length: 1.2, block_width: 1.2,
                    ceiling_height: 8.0, is_active: true, is_deleted: false, created_by: CB,
                } as any,
            });
            this.logger.log(`✅ Kho 2 đã tạo: ${wh2.name} (${wh2.id})`);

            const products2 = await Promise.all([
                createProduct('iPhone 15 Pro Max', 'ELEC-001', unitPiece.id),
                createProduct('MacBook Pro M3', 'ELEC-002', unitPiece.id),
                createProduct('Samsung Galaxy S24', 'ELEC-003', unitPiece.id),
                createProduct('Tai nghe AirPods Pro', 'ELEC-004', unitBox.id),
                createProduct('Cáp sạc USB-C', 'ELEC-005', unitBox.id),
                createProduct('Ốp lưng iPhone', 'ELEC-006', unitBox.id),
                createProduct('Bàn phím cơ Razer', 'ELEC-007', unitPiece.id),
                createProduct('Chuột Logitech MX', 'ELEC-008', unitPiece.id),
            ]);

            const batches2 = await Promise.all(products2.map((p, i) =>
                this.prisma.batch.create({
                    data: {
                        product_id: p.id, code: `BATCH-E${String(i + 1).padStart(2, '0')}`,
                        manufacturing_date: new Date('2025-02-01'),
                        expiry_date: new Date('2027-12-31'), created_by: CB,
                    } as any,
                }),
            ));

            // Layout kho 2: 3 rows × 2 racks × 4 shelves × 2 blocks
            const blocks2: { id: string }[] = [];
            for (let r = 0; r < 3; r++) {
                const row = await this.prisma.row.create({
                    data: {
                        warehouse_id: wh2.id, name: `Dãy ${String.fromCharCode(65 + r)}`,
                        code: `R${r + 1}`, position_x: r * 6, position_y: 3,
                        is_active: true, created_by: CB,
                    } as any,
                });

                for (let rk = 0; rk < 2; rk++) {
                    const rack = await this.prisma.rack.create({
                        data: {
                            row_id: row.id, name: `Kệ ${row.code}-${rk + 1}`,
                            code: `${row.code}-RK${rk + 1}`, position_x: rk * 3,
                            dimensions_width: 1.5, dimensions_depth: 0.8, dimensions_height: 5.0,
                            is_active: true, created_by: CB,
                        } as any,
                    });

                    for (let s = 0; s < 4; s++) {
                        const shelf = await this.prisma.shelf.create({
                            data: {
                                rack_id: rack.id, name: `Tầng ${s + 1}`,
                                code: `${rack.code}-S${s + 1}`, height: 1.0,
                                is_active: true, created_by: CB,
                            } as any,
                        });

                        for (let b = 0; b < 2; b++) {
                            const block = await this.prisma.block.create({
                                data: {
                                    shelf_id: shelf.id, name: `Ô ${b + 1}`,
                                    code: `${shelf.code}-B${b + 1}`,
                                    position_x: b * 0.7, position_y: 0,
                                    dimensions_width: 0.6, dimensions_height: 0.8,
                                    max_weight_capacity: 30, is_active: true, created_by: CB,
                                } as any,
                            });
                            blocks2.push(block);
                        }
                    }
                }
            }

            // Inventory cho kho 2
            for (let i = 0; i < Math.min(products2.length, blocks2.length); i++) {
                const qty = 5 + Math.floor(Math.random() * 30);
                await this.prisma.inventory.create({
                    data: {
                        organization_id: org.id, warehouse_id: wh2.id,
                        block_id: blocks2[i].id, product_id: products2[i].id,
                        batch_id: batches2[i].id, quantity: qty,
                        quantity_on_hand: qty, quantity_allocated: 0,
                        quantity_available: qty, created_by: CB,
                    } as any,
                });
            }

            for (let i = 0; i < 8 && i + products2.length < blocks2.length; i++) {
                const pIdx = i % products2.length;
                const qty = 3 + Math.floor(Math.random() * 20);
                await this.prisma.inventory.create({
                    data: {
                        organization_id: org.id, warehouse_id: wh2.id,
                        block_id: blocks2[products2.length + i].id,
                        product_id: products2[pIdx].id, batch_id: batches2[pIdx].id,
                        quantity: qty, quantity_on_hand: qty,
                        quantity_allocated: 0, quantity_available: qty, created_by: CB,
                    } as any,
                });
            }

            this.logger.log(`✅ Kho 2: ${blocks2.length} ô, ${products2.length + 8} inventory items`);
            this.logger.log(`\n═══════════════════════════════════════
✅ WAREHOUSE 3D SEED HOÀN TẤT:
   Kho 1: "${wh1.name}" (${wh1.id}) → ${blocks1.length} ô
   Kho 2: "${wh2.name}" (${wh2.id}) → ${blocks2.length} ô
   Dữ liệu hoàn toàn riêng biệt giữa 2 kho.
═══════════════════════════════════════`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warehouse 3D data: ${errorMessage}`);
            throw error;
        }
    }
}
