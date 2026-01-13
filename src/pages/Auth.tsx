import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile must be 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading, verifyMobile, resendOTP } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingMobile, setPendingMobile] = useState<string>('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // OTP verification state
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = loginSchema.safeParse({
        email: loginEmail,
        password: loginPassword,
      });

      if (!result.success) {
        setError(result.error.errors[0].message);
        setIsSubmitting(false);
        return;
      }

      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid credentials') || error.message.includes('Invalid login')) {
          setError('Invalid email or password');
        } else if (error.message.includes('connect to server')) {
          setError('Cannot connect to server. Please ensure the backend is running.');
        } else {
          setError(error.message || 'Login failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = signupSchema.safeParse({
        fullName: signupFullName,
        email: signupEmail,
        mobile: signupMobile,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });

      if (!result.success) {
        setError(result.error.errors[0].message);
        setIsSubmitting(false);
        return;
      }

      const { error, data } = await signUp(signupEmail, signupPassword, signupFullName, signupMobile);
      if (error) {
        if (error.message.includes('already exists')) {
          setError('This email or mobile is already registered. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Registration successful! Please verify your mobile number with the OTP sent.');
        setPendingMobile(signupMobile);
        setShowOTPVerification(true);
        setSignupPassword('');
        setSignupConfirmPassword('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (otp.length !== 6) {
        setError('OTP must be 6 digits');
        setIsSubmitting(false);
        return;
      }

      const { error } = await verifyMobile(pendingMobile, otp);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Mobile verified successfully! You can now sign in.');
        setShowOTPVerification(false);
        setOtp('');
        setPendingMobile('');
        setSignupFullName('');
        setSignupEmail('');
        setSignupMobile('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setError(null);
    try {
      const { error } = await resendOTP(pendingMobile);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('OTP resent successfully!');
      }
    } catch (err) {
      setError('Failed to resend OTP');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <Pill size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PharmaNP</h1>
          <p className="text-muted-foreground mt-1">Nepal Pharmacy Management System</p>
        </div>

        <Card className="pharmacy-card-elevated">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription>Sign in to manage your pharmacy</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 border-success bg-success/10">
                  <AlertDescription className="text-success">{success}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@pharmacy.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="input-pharmacy"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="input-pharmacy"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full btn-pharmacy-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {showOTPVerification ? (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input-pharmacy text-center text-2xl tracking-widest"
                        maxLength={6}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        OTP sent to {pendingMobile}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full btn-pharmacy-primary"
                      disabled={isSubmitting || otp.length !== 6}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Verify OTP
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleResendOTP}
                      disabled={isSubmitting}
                    >
                      Resend OTP
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setShowOTPVerification(false);
                        setOtp('');
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      Back to Registration
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        className="input-pharmacy"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@pharmacy.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="input-pharmacy"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-mobile">Mobile Number (10 digits)</Label>
                      <Input
                        id="signup-mobile"
                        type="tel"
                        placeholder="9841234567"
                        value={signupMobile}
                        onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="input-pharmacy"
                        required
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="input-pharmacy"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="input-pharmacy"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full btn-pharmacy-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Create Account
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Nepal DDA Compliant • VAT 13% Integrated
        </p>
      </div>
    </div>
  );
};

export default Auth;
