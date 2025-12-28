import React from 'react';
import { Truck, Warehouse, BarChart3, Clock, Lock, Globe } from "lucide-react";

const services = [
    {
        icon: Warehouse,
        title: "Smart Storage",
        description: "Climate-controlled, secure, and scalable storage solutions tailored to your inventory needs."
    },
    {
        icon: Truck,
        title: "Rapid Fulfillment",
        description: "Same-day pick and pack with automated routing to ensure fastest delivery times."
    },
    {
        icon: BarChart3,
        title: "Real-time Analytics",
        description: "Track inventory, sales, and returns in real-time through our proprietary dashboard."
    },
    {
        icon: Globe,
        title: "Global Distribution",
        description: "Access our network of international centers to reach customers worldwide efficiently."
    },
    {
        icon: Clock,
        title: "24/7 Operations",
        description: "Round-the-clock operations ensure your business never stops moving."
    },
    {
        icon: Lock,
        title: "Secure Vaulting",
        description: "High-security zones for high-value merchandise with 24/7 surveillance."
    }
];

export function Services() {
    return (
        <section className="py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div className="max-w-xl">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            Comprehensive <br /> Logistics Solutions
                        </h2>
                        <p className="text-zinc-400 text-lg">
                            We combine physical infrastructure with digital intelligence to streamline your supply chain.
                        </p>
                    </div>
                    <a href="#" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-medium">
                        View all services <span aria-hidden="true">&rarr;</span>
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, index) => (
                        <div key={index} className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                <service.icon className="w-6 h-6 text-white group-hover:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
