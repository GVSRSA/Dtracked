import { supabase } from '@/integrations/supabase/client';

export const testSupabaseConnection = async () => {
  try {
    // Test the connection by fetching the Supabase version
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (error: any) {
    console.error('Supabase connection test error:', error);
    return { success: false, error: error.message };
  }
};