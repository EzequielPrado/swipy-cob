"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './client';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  systemRole: string;
  loading: boolean;
  activeMerchant: any | null; 
  setActiveMerchant: (merchant: any | null) => void;
  effectiveUserId: string | undefined; 
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  systemRole: 'Admin',
  loading: true,
  activeMerchant: null,
  setActiveMerchant: () => {},
  effectiveUserId: undefined,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [activeMerchant, setActiveMerchantState] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('swipy_active_merchant');
    if (saved) {
      try { setActiveMerchantState(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const setActiveMerchant = (merchant: any | null) => {
    setActiveMerchantState(merchant);
    if (merchant) localStorage.setItem('swipy_active_merchant', JSON.stringify(merchant));
    else localStorage.removeItem('swipy_active_merchant');
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, system_plans(*)')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setActiveMerchant(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('swipy_active_merchant');
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      isAdmin: profile?.is_admin || false, 
      systemRole: profile?.system_role || 'Admin',
      loading, 
      activeMerchant,
      setActiveMerchant,
      effectiveUserId: activeMerchant?.id || user?.id,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);