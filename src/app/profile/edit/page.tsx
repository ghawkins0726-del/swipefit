'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Heart } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import ProfileEditForm from '@/components/ProfileEditForm';
import Link from 'next/link';

function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('swipefit_user_id') || 'anonymous';
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [listingsCount, setListingsCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);

  useEffect(() => {
    const userId = getUserId();
    fetch(`/api/profile?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        setUser(d.user);
        setListingsCount(d.listings?.length ?? 0);
        setLikedCount(d.liked?.length ?? 0);
      });
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-pink-500 pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-white font-black text-xl">Edit Profile</h1>
        </div>

        {/* Preview card */}
        <div className="bg-white/15 backdrop-blur rounded-3xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-white">{user.name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base truncate">{user.name}</p>
            {user.bio ? (
              <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{user.bio}</p>
            ) : (
              <p className="text-white/40 text-xs mt-0.5 italic">No bio yet</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-white/80">
              <ShoppingBag size={12} />
              <span className="text-xs font-bold">{listingsCount}</span>
            </div>
            <div className="flex items-center gap-1 text-white/80">
              <Heart size={12} />
              <span className="text-xs font-bold">{likedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 py-6">
        <ProfileEditForm
          user={user}
          onSaved={updated => {
            setUser(updated);
            setTimeout(() => router.push('/profile'), 1200);
          }}
        />

        <div className="mt-6 text-center">
          <Link href="/profile" className="text-sm text-gray-400 underline underline-offset-2">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
