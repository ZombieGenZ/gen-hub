import { UpdateUserRequest, UserData } from "@/types/user/user.type"

const API = process.env.NEXT_PUBLIC_API_URL

export class UserService {
   
   // Lấy thông tin user
   async getUser(token: string) {
      try {
         const response = await fetch(`${API}/account/profile`, {
            method: 'GET',
            headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
            }
         })
         const data = await response.json()
         if(data.success) {
            return data.data as UserData
         }
      } catch (error) {
         console.error('Get user error:', error)
         throw error
      }
   } 

   // Cập nhật thông tin user
   // Mới: gửi trực tiếp các field, không bọc newInfo
   async updateUser(token: string, newInfo: UpdateUserRequest) {
   try {
      const response = await fetch(`${API}/account/profile`, {
         method: 'PATCH',
         headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
         },
         body: JSON.stringify(newInfo),
      })

      const data = await response.json()
      if (data.success) {
         return data
      } else {
         // để debug thêm nếu BE trả lỗi định dạng
         console.error('Update user failed:', data)
         throw new Error(data.message || 'Update user failed')
      }
   } catch (error) {
      console.error('Update user error:', error)
      throw error
   }
   }
   
   // Bật xác thực 2fa
   // trong class UserService ( hiện chưa hoàn thiện )
   async enableTwoFactor(token: string) {
      try {
         const response = await fetch(`${API}/account/2fa/enable`, {
            method: 'POST',
            headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
         })

         const data = await response.json()
         return data
      } catch (error) {
         console.error('Enable 2FA error:', error)
         throw error
      }
   }
}