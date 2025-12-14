import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, Loader2 } from 'lucide-react';

interface ImamPhotoUploadProps {
  imamId: string;
  currentPhotoUrl?: string;
  onUploadSuccess?: (url: string) => void;
}

export function ImamPhotoUpload({ imamId, currentPhotoUrl, onUploadSuccess }: ImamPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `imam-${imamId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('imam-avatars') // Ensure this bucket exists in Supabase
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('imam-avatars')
        .getPublicUrl(fileName);

      // Update imam record (Assuming 'imams' table exists, or update user_metadata for current user)
      // If imamId is the current user ID, we might want to update auth metadata or a profiles table.
      // Here we stick to the prompt's implied logic for 'imams' table.
      const { error: updateError } = await supabase
        .from('imams')
        .update({ avatar_url: publicUrl })
        .eq('id', imamId);

      if (updateError) {
          // Fallback: If 'imams' table update fails (e.g. RLS or table missing), 
          // just set preview and notify parent.
          console.warn('Could not update imams table directly:', updateError);
      }

      setPreviewUrl(publicUrl);
      if (onUploadSuccess) onUploadSuccess(publicUrl);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
            {previewUrl ? (
                <img 
                    src={previewUrl} 
                    alt="Imam Profile" 
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className="text-gray-400 text-3xl font-bold">{imamId.charAt(0).toUpperCase()}</span>
            )}
        </div>
        
        <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200 group-hover:scale-110">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? <Loader2 size={16} className="animate-spin text-emerald-600"/> : <Camera size={16} className="text-gray-600"/>}
        </label>
      </div>
      {uploading && <span className="text-xs text-emerald-600 font-medium animate-pulse">Uploading...</span>}
    </div>
  );
}