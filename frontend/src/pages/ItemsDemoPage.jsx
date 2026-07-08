import React from 'react';
import { Link } from 'react-router-dom';
import ItemsList from '../components/examples/ItemsList';

/**
 * Public demo page for decoupled /api/v1/items CRUD.
 * Useful when testing React on one machine and API on another over Wi-Fi.
 */
const ItemsDemoPage = () => (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-bold text-emerald-700">SmartTrack API Demo</span>
      <Link to="/login" className="text-sm text-gray-600 hover:text-emerald-700">Dashboard login</Link>
    </nav>
    <ItemsList />
  </div>
);

export default ItemsDemoPage;
