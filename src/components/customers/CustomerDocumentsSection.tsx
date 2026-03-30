"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Upload, FileText, Trash2, ExternalLink, Paperclip } from 'lucide-react';

const CustomerDocumentsSection = ({ customerId, userId }: { customerId: string, userId: string }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchDocs();
  }, [customerId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${customerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer_documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('customer_documents').insert({
        user_id: userId,
        customer_id: customerId,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        size_bytes: file.size
      });

      if (dbError) throw dbError;

      showSuccess("Documento anexado com sucesso!");
      fetchDocs();
    } catch (err: any) {
      showError("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm("Remover este anexo permanentemente?")) return;
    try {
      await supabase.storage.from('customer_documents').remove([doc.file_path]);
      const { error } = await supabase.from('customer_documents').delete().eq('id', doc.id);
      if (error) throw error;
      
      showSuccess("Anexo removido.");
      fetchDocs();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const getPublicUrl = (path: string) => {
    return supabase.storage.from('customer_documents').getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="bg-apple-white border border-apple-border rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-8 border-b border-apple-border bg-apple-offWhite flex justify-between items-center">
        <h4 className="text-[10px] font-black text-apple-black uppercase tracking-[0.2em] flex items-center gap-2">
          <Paperclip size={16} className="text-orange-500" /> Documentos e Anexos
        </h4>
        <label className={cn(
          "cursor-pointer bg-apple-black text-white text-[9px] font-black px-5 py-2.5 rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-xl",
          uploading && "opacity-50 pointer-events-none"
        )}>
          {uploading ? <Loader2 className="animate-spin" size={12} /> : <Upload size={12} />}
          ANEXAR ARQUIVO
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-4">
             <FileText size={40} className="mx-auto text-apple-muted opacity-10 mb-4" />
             <p className="text-apple-muted text-xs font-bold italic">Nenhum documento anexado ao cadastro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-5 bg-apple-offWhite border border-apple-border rounded-3xl group hover:border-orange-500/30 transition-all">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 border border-apple-border shadow-sm group-hover:scale-105 transition-transform">
                    <FileText size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-apple-black truncate pr-4 group-hover:text-orange-600 transition-colors">{doc.name}</p>
                    <p className="text-[9px] text-apple-muted font-bold uppercase mt-1">Anexado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <a 
                    href={getPublicUrl(doc.file_path)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-3 text-apple-muted hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    onClick={() => handleDelete(doc)} 
                    className="p-3 text-apple-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default CustomerDocumentsSection;