'use client';

import { ChevronDown, Globe, User } from 'lucide-react';

const menuItems = [
  { label: 'DASHBOARD', hasDropdown: false },
  { label: 'DOCK SCHEDULING', hasDropdown: true },
  { label: 'INBOUND', hasDropdown: true },
  { label: 'OUTBOUND', hasDropdown: true },
  { label: 'INVENTORY', hasDropdown: true },
  { label: 'BILLING', hasDropdown: true },
  { label: 'VISUALIZE', hasDropdown: true, active: true },
  { label: 'CONFIGURATION', hasDropdown: true },
];

const TopNavbar = () => {
  return (
    <nav className="bg-navbar text-navbar-foreground h-12 flex items-center justify-between px-4 shadow-lg">
      <div className="flex items-center space-x-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1 transition-colors hover:bg-navbar-hover ${
              item.active ? 'bg-navbar-hover' : ''
            }`}
          >
            {item.label}
            {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
          </button>
        ))}
        <div className="px-3 py-2 text-xs font-medium flex items-center gap-1 cursor-pointer hover:bg-navbar-hover">
          <span>Kho Brozen</span>
          <ChevronDown className="w-3 h-3" />
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-navbar-hover rounded">
          <Globe className="w-4 h-4" />
          <span>EN</span>
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-navbar-hover rounded">
          <User className="w-4 h-4" />
          <span>test</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </nav>
  );
};

export default TopNavbar;
