const API = process.env.NEXT_PUBLIC_API_URL

export class ContactService {
    async getAllContact(access_token: string) {
        try {
            const response = await fetch(`${API}/admin/contacts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch contacts')
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch contacts", err);
        }
    }

    async getAllContactTag(access_token: string) {
        try {
            const response = await fetch(`${API}/admin/contact-tags`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch contacts')
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch contacts", err);
        }
    }
}