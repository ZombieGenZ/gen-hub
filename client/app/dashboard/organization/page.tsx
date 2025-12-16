"use client";

import React, { useEffect, useState } from "react";
import { OrganizationService } from "@/services/organization/organization.service";
import { Organization } from "@/types/organization/organization.type";
import { useDebounce } from "@/hooks/use-debounce";
import { DashboardHeader } from "@/components/layouts/DashboardHeader";
import { useRouter } from "next/navigation";

export default function OrganizationPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token'); // Replace with actual token logic
            const response = await new OrganizationService().getOrganizations(token!, { limit: 10 });
            if (!Array.isArray(response.items)) {
                throw new Error('Expected an array of organizations');
            }
            setOrganizations(response.items);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    return (
        <div>
            <DashboardHeader />
            {loading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}
            <ul>
                {organizations.map(org => (
                    <li key={org.id}>
                        <h3>{org.name}</h3>
                        <p>Owner: {org.owner.name} ({org.owner.email})</p>
                        <p>Active: {org.is_active ? 'Yes' : 'No'}</p>
                        <p>Created At: {new Date(org.created_at).toLocaleString()}</p>
                        <p>Updated At: {new Date(org.updated_at).toLocaleString()}</p>
                        <p>API Keys: {org._count.api_keys}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}