export interface IProvince {
  id: string;
  code: string;
  name: string;
  slug: string | null;
  type: string | null;
  is_active: boolean | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface IProvinceWithWards extends IProvince {
  wards: {
    id: string;
    code: string;
    name: string;
    slug: string | null;
    type: string | null;
  }[];
}
