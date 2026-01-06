export interface Property {
    id: number | string;
    title: string;
    price: number;
    currency: string;
    area: number; // m2
    type: 'Kho Mát' | 'Kho Thường' | 'Fulfillment' | 'Kho Ngoại Quan';
    address: string;
    image: string;
    lat: number;
    lng: number;
    rooms?: number; // Legacy?
    bathrooms?: number; // Legacy?
    
    // New Schema Fields
    length?: number;
    width?: number;
    ceiling_height?: number;
    max_load_capacity?: number; // Ton/m2
    electricity?: string; // 3 Phase etc
}

export const mockProperties: Property[] = [
    {
        id: 1,
        title: "Kho Mát Thủ Đức",
        price: 45000000,
        currency: "VND",
        area: 300,
        type: "Kho Mát",
        address: "Thủ Đức, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.849409,
        lng: 106.753705,
        length: 20,
        width: 15,
        ceiling_height: 12,
        max_load_capacity: 3,
        electricity: "3 Pha"
    },
    {
        id: 2,
        title: "Kho Thường Quận 7",
        price: 80000000,
        currency: "VND",
        area: 600,
        type: "Kho Thường",
        address: "Quận 7, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.732669,
        lng: 106.709760,
    },
    {
        id: 3,
        title: "Trung Tâm Fulfillment Bình Tân",
        price: 120000000,
        currency: "VND",
        area: 1200,
        type: "Fulfillment",
        address: "Bình Tân, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1595246140625-573b715e11d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.762622,
        lng: 106.602974,
    },
    {
        id: 4,
        title: "Kho Ngoại Quan Cát Lái",
        price: 200000000,
        currency: "VND",
        area: 2500,
        type: "Kho Ngoại Quan",
        address: "Cát Lái, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.771576,
        lng: 106.777372,
    },
    {
        id: 5,
        title: "Kho Bình Dương VSIP 1",
        price: 65000000,
        currency: "VND",
        area: 500,
        type: "Kho Thường",
        address: "Thuận An, Bình Dương",
        image: "https://images.unsplash.com/photo-1629814249584-bd4d53cf0e7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.925501,
        lng: 106.702958,
    },
    {
        id: 6,
        title: "Kho Long Hậu",
        price: 55000000,
        currency: "VND",
        area: 450,
        type: "Kho Mát",
        address: "Long Hậu, Long An",
        image: "https://images.unsplash.com/photo-1565610222536-ef125c59da2e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.638753,
        lng: 106.711883,
    },
    {
        id: 7,
        title: "Kho Quận 9 - Khu Công Nghệ Cao",
        price: 150000000,
        currency: "VND",
        area: 1000,
        type: "Fulfillment",
        address: "Quận 9, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.852358,
        lng: 106.797203,
    },
    {
        id: 8,
        title: "Kho Lạnh Tân Bình",
        price: 90000000,
        currency: "VND",
        area: 400,
        type: "Kho Mát",
        address: "Tân Bình, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.801648,
        lng: 106.655827,
    },
    {
        id: 9,
        title: "Kho Biên Hòa 2",
        price: 75000000,
        currency: "VND",
        area: 800,
        type: "Kho Thường",
        address: "Biên Hòa, Đồng Nai",
        image: "https://images.unsplash.com/photo-1605218457335-ee1d8d32d6fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.938561,
        lng: 106.852504,
    },
    {
        id: 10,
        title: "Kho Nhỏ Gò Vấp",
        price: 25000000,
        currency: "VND",
        area: 150,
        type: "Kho Thường",
        address: "Gò Vấp, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1589792923962-537704632910?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.835726,
        lng: 106.671374,
    },
    // Clustered properties exampl (Near Thu Duc)
    {
        id: 11,
        title: "Kho Linh Trung 2",
        price: 48000000,
        currency: "VND",
        area: 350,
        type: "Kho Mát",
        address: "Thủ Đức, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.855409,
        lng: 106.758705,
    },
     {
        id: 12,
        title: "Kho Tam Bình",
        price: 42000000,
        currency: "VND",
        area: 280,
        type: "Kho Thường",
        address: "Thủ Đức, TP. Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: 10.844409,
        lng: 106.749705,
    }
];
