"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const DatabaseTest: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (profilesError) throw profilesError;

      // Test finds table
      const { data: findsData, error: findsError } = await supabase
        .from('finds')
        .select('id')
        .limit(1);

      if (findsError) throw findsError;

      // Test routes table
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('id')
        .limit(1);

      if (routesError) throw routesError;

      showSuccess('Database connection successful! All tables are accessible.');
    } catch (error: any) {
      showError(`Database connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Database Connection Test</h3>
      <Button onClick={testConnection} disabled={loading}>
        {loading ? 'Testing...' : 'Test Database Connection'}
      </Button>
    </div>
  );
};

export default DatabaseTest;