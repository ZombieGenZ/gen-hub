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
         return data
      } catch (error) {
         console.error('Get user error:', error)
         throw error
      }
   }   
}