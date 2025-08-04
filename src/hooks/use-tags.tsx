"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tag } from '@/lib/types';
import { useToast } from './use-toast';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        toast({
          title: "Erro ao buscar tags",
          description: error.message,
          variant: "destructive",
        });
        setTags([]);
      } else {
        setTags(data || []);
      }
      setLoading(false);
    };

    fetchTags();
  }, [toast]);

  return { tags, loading };
}
