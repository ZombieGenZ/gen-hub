import {
    ContactQueryParams,
    ContactRequest,
    ContactTagRequest,
    ReplyRequest,
    UpdateContactDto,
    UpdateContactTagRequest,
} from "@/types/contact/contact.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class ContactService {
    private buildHeaders(accessToken: string) {
        return {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        };
    }

    private buildContactQuery(params?: ContactQueryParams) {
        const query = new URLSearchParams();

        if (params?.type) query.set("type", params.type);
        if (params?.status) query.set("status", params.status);
        if (params?.keywords) query.set("keywords", params.keywords);
        if (params?.is_priority_customer !== undefined) {
            query.set("is_priority_customer", String(params.is_priority_customer));
        }
        if (params?.is_skipped !== undefined) {
            query.set("is_skipped", String(params.is_skipped));
        }
        if (params?.offset !== undefined) query.set("offset", String(params.offset));
        if (params?.limit !== undefined) query.set("limit", String(params.limit));

        const qs = query.toString();
        return qs ? `?${qs}` : "";
    }

    async getAllContact(accessToken: string, params?: ContactQueryParams) {
        try {
            const response = await fetch(`${API}/admin/contacts${this.buildContactQuery(params)}`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch contacts");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        }
    }

    async getContactById(accessToken: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch contact");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch contact", error);
        }
    }

    async getAllContactTag(accessToken: string) {
        try {
            const response = await fetch(`${API}/admin/contact-tags`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch contact tags");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch contact tags", error);
        }
    }

    async createContact(accessToken: string, contact: ContactRequest) {
        try {
            const response = await fetch(`${API}/admin/contacts`, {
                method: "POST",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify(contact),
            });

            if (!response.ok) {
                throw new Error("Failed to create contact");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to create contact", error);
        }
    }

    async replyContact(accessToken: string, id: string, reply: ReplyRequest) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}/reply`, {
                method: "POST",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify(reply),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to reply contact: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to reply contact: ${response.status} ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to reply contact", error);
            throw error;
        }
    }

    async deleteContact(accessToken: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}`, {
                method: "DELETE",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to delete contact: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to delete contact: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to delete contact", error);
            throw error;
        }
    }

    async deleteManyContacts(accessToken: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/admin/contacts/delete/many`, {
                method: "DELETE",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to delete many contacts: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to delete many contacts: ${response.status} ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to delete many contacts", error);
            throw error;
        }
    }

    async createContactTag(accessToken: string, tag: ContactTagRequest) {
        try {
            const response = await fetch(`${API}/admin/contact-tags`, {
                method: "POST",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify(tag),
            });

            if (!response.ok) {
                throw new Error("Failed to create contact tag");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to create contact tag", error);
            throw error;
        }
    }

    async updateContactTag(accessToken: string, id: string, tag: UpdateContactTagRequest) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: "PUT",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify(tag),
            });

            if (!response.ok) {
                throw new Error("Failed to update contact tag");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to update contact tag", error);
            throw error;
        }
    }

    async deleteContactTag(accessToken: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: "DELETE",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to delete contact tag");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to delete contact tag", error);
            throw error;
        }
    }

    async deleteManyContactTag(accessToken: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/delete/many`, {
                method: "DELETE",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                throw new Error("Failed to delete many contact tags");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to delete many contact tags", error);
            throw error;
        }
    }

    async getContactMessages(accessToken: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}/messages`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch contact messages");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch contact messages", error);
        }
    }

    async updateContact(accessToken: string, id: string, updateData: UpdateContactDto) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}`, {
                method: "PATCH",
                headers: this.buildHeaders(accessToken),
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to update contact: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to update contact: ${response.status} ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to update contact", error);
            throw error;
        }
    }

    async closeContact(accessToken: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}/close`, {
                method: "POST",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to close contact: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to close contact: ${response.status} ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to close contact", error);
            throw error;
        }
    }

    async reopenContact(accessToken: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contacts/${id}/reopen`, {
                method: "POST",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to reopen contact: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to reopen contact: ${response.status} ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to reopen contact", error);
            throw error;
        }
    }

    async getPriorityContacts(accessToken: string, params?: ContactQueryParams) {
        try {
            const response = await fetch(`${API}/admin/contacts/priority${this.buildContactQuery(params)}`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch priority contacts");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch priority contacts", error);
        }
    }

    async getNormalContacts(accessToken: string, params?: ContactQueryParams) {
        try {
            const response = await fetch(`${API}/admin/contacts/normal${this.buildContactQuery(params)}`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch normal contacts");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch normal contacts", error);
        }
    }

    async getSkippedContacts(accessToken: string, params?: ContactQueryParams) {
        try {
            const response = await fetch(`${API}/admin/contacts/skipped${this.buildContactQuery(params)}`, {
                method: "GET",
                headers: this.buildHeaders(accessToken),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch skipped contacts");
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch skipped contacts", error);
        }
    }
}
