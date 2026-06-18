"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { syncPostHogUser, trackUserLoggedIn } from "@/lib/analytics";
import { supabase } from "./supabaseClient";

interface UserContextType {
  user: any;
  session: any;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  session: null,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const getSession = async () => {
      try {
        const { data, error } = await supabase!.auth.getSession();
        const sessionUser = data.session?.user ?? null;
        setSession(data.session);
        setUser(sessionUser);
        syncPostHogUser(sessionUser);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getSession();
    
    if (supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        const sessionUser = session?.user ?? null;
        setSession(session);
        setUser(sessionUser);
        if (sessionUser) {
          syncPostHogUser(sessionUser);
          if (event === "SIGNED_IN") {
            trackUserLoggedIn({ email_verified: Boolean(sessionUser.email_confirmed_at) });
          }
        } else {
          syncPostHogUser(null, { signedOut: event === "SIGNED_OUT" });
        }
      });
      
      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, session, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
} 