
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getStagnantApplications } from './db';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [stagnantCount, setStagnantCount] = useState<number>(0);
  useEffect(() => {
    getStagnantApplications().then(apps => setStagnantCount(apps.length));
  }, []);
  return (
    <div className="flex h-screen">
      <nav className="w-56 bg-gray-900 text-white flex flex-col py-6 px-4">
        <div className="mb-8 text-2xl font-bold tracking-tight">Job Tracker</div>
        <ul className="flex-1 space-y-4">
          <li><NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Dashboard</NavLink></li>
          <li><NavLink to="/applications" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Applications</NavLink></li>
          <li><NavLink to="/schedule" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Schedule</NavLink></li>
          <li><NavLink to="/analytics" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Analytics</NavLink></li>
          <li className="relative">
            <NavLink to="/stagnant" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>
              Stagnant
              {stagnantCount > 0 && (
                <span className="ml-2 inline-block bg-red-500 text-xs rounded-full px-2 py-0.5 align-middle">{stagnantCount}</span>
              )}
            </NavLink>
          </li>
        </ul>
        <div className="text-xs text-gray-400 mt-8">© {new Date().getFullYear()}</div>
      </nav>
      <main className="flex-1 bg-gray-50 p-8 overflow-auto">{children}</main>
    </div>
  );
}
