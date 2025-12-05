import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const AdminPasswordReset: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  const handleAdminAccess = () => {
    // In a real app, this would check against an environment variable or database
    // For now, we'll use a simple check - in production you should use a secure method
    if (adminKey === 'admin123') { // This should be replaced with a secure check
      setIsAdminMode(true);
    } else {
      showError('Invalid admin key');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // First, we need to get the user by email from the auth.users table
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        // Try alternative method to get user
        const { data: authUsers, error: authError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email);
        
        if (authError || !authUsers || authUsers.length === 0) {
          throw new Error('User not found in either profiles or users table');
        }
        
        // Update the user's password using admin privileges
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          authUsers[0].id,
          { password: newPassword }
        );
        
        if (updateError) throw updateError;
      } else if (!userData) {
        throw new Error('User not found in profiles table');
      } else {
        // Update the user's password using admin privileges
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userData.id,
          { password: newPassword }
        );
        
        if (updateError) throw updateError;
      }
      
      showSuccess('Password reset successfully!');
      // Reset form
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      showError(`Error resetting password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminMode) {
    return (
      <Card className="w-full max-w-md mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>Enter admin credentials to access password reset panel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminKey">Admin Key</Label>
              <Input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin key"
              />
            </div>
            <Button onClick={handleAdminAccess} className="w-full">
              Access Admin Panel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Admin Password Reset</CardTitle>
            <CardDescription>Reset any user's password</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAdminMode(false)}>
            Exit Admin
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This is an admin-only function. Use with caution.
          </AlertDescription>
        </Alert>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminPasswordReset;