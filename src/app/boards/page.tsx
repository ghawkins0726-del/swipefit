'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Item } from '@/lib/types';

interface Collection {
  id: string; name: string; emoji: string;
  createdAt: number; itemCount: number; previewImages: string[];
}

export default function BoardsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);

  // Board detail view
  const [activeBoard, setActiveBoard] = useState<Collection | null>(null);
  const [boardItems, setBoardItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch('/api/collections').then(r => r.json()).then(d => {
      setCollections(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const openBoard = async (col: Collection) => {
    setActiveBoard(col);
    const items = await fetch(`/api/collections/${col.id}`).then(r => r.json());
    setBoardItems(Array.isArray(items) ? items : []);
  };

  const createBoard = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), emoji: '📌' }),
    });
    const col = await res.json();
    setCollections(prev => [col, ...prev]);
    setNewName('');
    setShowNew(false);
  };

  const deleteBoard = async (id: string) => {
    await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    setCollections(prev => prev.filter(c => c.id !== id));
    if (activeBoard?.id === id) setActiveBoard(null);
  };

  const removeFromBoard = async (itemId: string) => {
    if (!activeBoard) return;
    await fetch(`/api/collections/${activeBoard.id}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    setBoardItems(prev => prev.filter(i => i.id !== itemId));
    setCollections(prev => prev.map(c =>
      c.id === activeBoard.id ? { ...c, itemCount: Math.max(0, c.itemCount - 1) } : c
    ));
  };

  // Board detail view
  if (activeBoard) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="pt-14 pb-3 px-4 flex items-center gap-3 border-b border-[#EBEBEB]">
          <button onClick={() => setActiveBoard(null)} className="w-9 h-9 flex items-center justify-center">
            <ArrowLeft size={22} className="text-[#0A0A0A]" />
          </button>
          <span className="text-xl mr-1">{activeBoard.emoji}</span>
          <h1 className="font-black text-[18px] text-[#0A0A0A] flex-1">{activeBoard.name}</h1>
          <button onClick={() => deleteBoard(activeBoard.id)} className="w-9 h-9 flex items-center justify-center">
            <Trash2 size={18} className="text-[#AAAAAA]" />
          </button>
        </div>

        <div className="flex-1 pb-24">
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="text-4xl mb-3">{activeBoard.emoji}</div>
              <p className="font-bold text-[#0A0A0A]">Board is empty</p>
              <p className="text-[#AAAAAA] text-sm mt-1">Save items from the feed using the bookmark button</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px]">
              {boardItems.map(item => (
                <div key={item.id} className="relative aspect-[3/4] bg-[#F2F2F2] overflow-hidden">
                  <Link href={`/item/${item.id}`}>
                    {item.images?.[0] && (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="text-white font-black text-[12px] drop-shadow">${item.price}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => removeFromBoard(item.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="pt-14 pb-3 px-4 flex items-center justify-between border-b border-[#EBEBEB]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center">
            <ArrowLeft size={22} className="text-[#0A0A0A]" />
          </button>
          <h1 className="font-black text-[20px] text-[#0A0A0A]">My Boards</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="w-9 h-9 flex items-center justify-center bg-[#E63946] rounded-full"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* New board form */}
      {showNew && (
        <div className="px-4 py-3 border-b border-[#EBEBEB] flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createBoard()}
            placeholder="Board name..."
            className="flex-1 bg-[#F5F4F0] rounded-xl px-3 py-2.5 text-sm font-medium text-[#0A0A0A] outline-none placeholder:text-[#AAAAAA]"
          />
          <button onClick={createBoard} className="px-4 py-2.5 bg-[#E63946] rounded-xl text-white font-bold text-sm">
            Create
          </button>
          <button onClick={() => { setShowNew(false); setNewName(''); }}>
            <X size={20} className="text-[#AAAAAA]" />
          </button>
        </div>
      )}

      {/* Boards grid */}
      <div className="flex-1 pb-24 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📌</div>
            <p className="font-black text-[#0A0A0A] text-lg mb-1">No boards yet</p>
            <p className="text-[#AAAAAA] text-sm mb-6">Create a board and save items as you swipe</p>
            <button onClick={() => setShowNew(true)}
              className="bg-[#E63946] text-white px-5 py-2.5 rounded-full font-bold text-sm">
              Create board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {collections.map(col => (
              <button key={col.id} onClick={() => openBoard(col)}
                className="bg-[#F5F4F0] rounded-2xl overflow-hidden text-left active:opacity-80 transition-opacity">
                {/* Preview grid */}
                <div className="aspect-square grid grid-cols-2 gap-[1px] bg-[#E8E8E8]">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="bg-[#F5F4F0] overflow-hidden">
                      {col.previewImages[i] && (
                        <img src={col.previewImages[i]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{col.emoji}</span>
                    <span className="font-bold text-[#0A0A0A] text-[13px] truncate">{col.name}</span>
                  </div>
                  <p className="text-[#AAAAAA] text-[11px] mt-0.5">{col.itemCount} item{col.itemCount !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
