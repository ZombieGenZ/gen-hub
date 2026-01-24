import { ContactRequest, ReplyRequest, ContactTagRequest, UpdateContactTagRequest } from "@/types/contact/contact.type";

const API = process.env.NEXT_PUBLIC_API_URL

export class ContactService {

    // Lấy tất cả các contact
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
    
    // Lấy contact theo id
    async getContactById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch contact')
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch contact", err);
        }
    }

    // Lấy tất cả các tag của contact
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

    // Contact khách hàng
    async createContact(access_token: string, contact: ContactRequest) {
        try {
            const response = await fetch(`${API}/admin/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contact)
            })
            if (!response.ok) {
                throw new Error('Failed to create contact')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to create contact", error);
        }
    }

    // Phản hồi contact
    async replyContact(access_token: string, id: string, reply: ReplyRequest) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}/reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reply)
            })
            if (!response.ok) {
                throw new Error('Failed to reply contact')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to reply contact", error);
        }
    }

    // Xoá contact
    async deleteContact(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to delete contact')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to delete contact", error);
        }
    }

    // Tạo tag cho contact
    async createContactTag(access_token: string, tag: ContactTagRequest) {
        try {
            const response = await fetch(`${API}/admin/contact-tags`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tag)
            })
            if (!response.ok) {
                throw new Error('Failed to create contact tag')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to create contact tag", error);
        }
    }

    // Cập nhật tag cho contact
    async updateContactTag(access_token: string, id: string, tag: UpdateContactTagRequest) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tag)
            })
            if (!response.ok) {
                throw new Error('Failed to update contact tag')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to update contact tag", error);
        }
    }

    // Xoá tag cho contact
    async deleteContactTag(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to delete contact tag')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to delete contact tag", error);
        }
    }

    // Xoá nhiều tag cho contact
    async deleteManyContactTag(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: ids })
            })
            if (!response.ok) {
                throw new Error('Failed to delete many contact tags')
            }
            const data = await response.json()
            return data
        }
        catch(error) {
            console.error("Failed to delete many contact tags", error);
        }
    }
}