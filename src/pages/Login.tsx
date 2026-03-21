import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Phone, User, Mail, Lock, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Login() {
    const [searchParams, setSearchParams] = useSearchParams();
    const defaultTab = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Setup state
    const [isCheckingSetup, setIsCheckingSetup] = useState(true);
    const [isSetupMode, setIsSetupMode] = useState(false);
    const [setupData, setSetupData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [setupError, setSetupError] = useState('');
    const [isSetupLoading, setIsSetupLoading] = useState(false);

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoginLoading, setIsLoginLoading] = useState(false);

    // Signup State
    const [signupData, setSignupData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [signupError, setSignupError] = useState('');
    const [isSignupLoading, setIsSignupLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const redirect = searchParams.get('redirect') || '/';

    // Check if first-time setup is needed
    useEffect(() => {
        const checkSetup = async () => {
            try {
                const response = await authApi.getSetupStatus();
                if (response.success && response.data?.setupRequired) {
                    setIsSetupMode(true);
                }
            } catch {
                // If check fails, show normal login
            } finally {
                setIsCheckingSetup(false);
            }
        };
        checkSetup();
    }, []);

    useEffect(() => {
        setActiveTab(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
    }, [searchParams]);

    const onTabChange = (value: string) => {
        setActiveTab(value);
        setSearchParams(prev => {
            prev.set('mode', value);
            return prev;
        });
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSetupError('');

        if (setupData.password !== setupData.confirmPassword) {
            setSetupError('Passwords do not match');
            return;
        }

        if (setupData.password.length < 6) {
            setSetupError('Password must be at least 6 characters');
            return;
        }

        setIsSetupLoading(true);

        try {
            const response = await authApi.setupAdmin({
                name: setupData.name,
                email: setupData.email,
                phone: setupData.phone || undefined,
                password: setupData.password,
            });

            if (response.success && response.data) {
                localStorage.setItem('auth_token', response.data.token);
                toast.success('Admin account created! Welcome to TalkItOut.');
                window.location.href = '/admin/dashboard';
            } else {
                setSetupError(response.error || 'Failed to create admin account');
            }
        } catch {
            setSetupError('An error occurred. Please try again.');
        } finally {
            setIsSetupLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoginLoading(true);

        try {
            await login({ email: loginEmail, password: loginPassword });
            navigate(redirect === '/' ? '/admin/dashboard' : redirect);
        } catch (err) {
            setLoginError('Invalid credentials. Please try again.');
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSignupError('');

        if (signupData.password !== signupData.confirmPassword) {
            setSignupError('Passwords do not match');
            return;
        }

        setIsSignupLoading(true);

        try {
            const response = await authApi.signup({
                name: signupData.name,
                email: signupData.email,
                phone: signupData.phone,
                password: signupData.password,
                role: 'customer',
            });

            if (response.success && response.data) {
                localStorage.setItem('auth_token', response.data.token);
                toast.success('Account created successfully!');
                window.location.href = redirect;
            } else {
                setSignupError(response.error || 'Failed to create account');
            }
        } catch (err) {
            setSignupError('An error occurred. Please try again.');
        } finally {
            setIsSignupLoading(false);
        }
    };

    // Loading state while checking setup status
    if (isCheckingSetup) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow flex items-center justify-center bg-secondary/30 p-4 pt-24 pb-12">
                    <Card className="w-full max-w-md shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-h-[300px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    // First-time admin setup mode
    if (isSetupMode) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow flex items-center justify-center bg-secondary/30 p-4 pt-24 pb-12">
                    <Card className="w-full max-w-md shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-h-[600px] transition-all duration-300">
                        <CardHeader className="space-y-3 text-center">
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-heading font-light tracking-wide">
                                Welcome to TalkItOut
                            </CardTitle>
                            <CardDescription className="font-body text-muted-foreground">
                                Set up your admin account to get started
                            </CardDescription>
                            <p className="text-xs text-muted-foreground/60">
                                This one-time setup creates the first administrator account
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSetup} className="space-y-4">
                                {setupError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{setupError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="setup-name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="setup-name"
                                            placeholder="Your full name"
                                            className="pl-10"
                                            value={setupData.name}
                                            onChange={(e) => setSetupData({ ...setupData, name: e.target.value })}
                                            required
                                            disabled={isSetupLoading}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="setup-email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="setup-email"
                                            type="email"
                                            placeholder="admin@yourcompany.com"
                                            className="pl-10"
                                            value={setupData.email}
                                            onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                                            required
                                            disabled={isSetupLoading}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="setup-phone">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="setup-phone"
                                            type="tel"
                                            placeholder="+91 9876543210"
                                            className="pl-10"
                                            value={setupData.phone}
                                            onChange={(e) => setSetupData({ ...setupData, phone: e.target.value })}
                                            disabled={isSetupLoading}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="setup-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="setup-password"
                                            type="password"
                                            placeholder="Create a strong password"
                                            className="pl-10"
                                            value={setupData.password}
                                            onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                                            required
                                            minLength={6}
                                            disabled={isSetupLoading}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="setup-confirm">Confirm Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="setup-confirm"
                                            type="password"
                                            placeholder="Confirm your password"
                                            className="pl-10"
                                            value={setupData.confirmPassword}
                                            onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })}
                                            required
                                            disabled={isSetupLoading}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full btn-elegant" disabled={isSetupLoading}>
                                    {isSetupLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Admin Account...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="mr-2 h-4 w-4" />
                                            Create Admin Account
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    // Normal login/signup flow
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow flex items-center justify-center bg-secondary/30 p-4 pt-24 pb-12">
                <Card className="w-full max-w-md shadow-xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-h-[600px] transition-all duration-300">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-heading font-light text-center tracking-wide">
                            Welcome to TalkItOut
                        </CardTitle>
                        <CardDescription className="text-center font-body text-muted-foreground">
                            Sign in or create an account to continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="login">Sign In</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    {loginError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{loginError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="login-email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="login-email"
                                                type="email"
                                                placeholder="Enter your email"
                                                className="pl-10"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                required
                                                disabled={isLoginLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="login-password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="login-password"
                                                type="password"
                                                placeholder="Enter your password"
                                                className="pl-10"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                required
                                                disabled={isLoginLoading}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full btn-elegant" disabled={isLoginLoading}>
                                        {isLoginLoading ? 'Signing in...' : 'Sign In'}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup">
                                <form onSubmit={handleSignup} className="space-y-4">
                                    {signupError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{signupError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-name"
                                                placeholder="John Doe"
                                                className="pl-10"
                                                value={signupData.name}
                                                onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                                                required
                                                disabled={isSignupLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-email"
                                                type="email"
                                                placeholder="john@example.com"
                                                className="pl-10"
                                                value={signupData.email}
                                                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                                required
                                                disabled={isSignupLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-phone"
                                                type="tel"
                                                placeholder="+1 (555) 000-0000"
                                                className="pl-10"
                                                value={signupData.phone}
                                                onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                                                required
                                                disabled={isSignupLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-password"
                                                type="password"
                                                placeholder="Create a password"
                                                className="pl-10"
                                                value={signupData.password}
                                                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                                                required
                                                minLength={6}
                                                disabled={isSignupLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-confirm">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-confirm"
                                                type="password"
                                                placeholder="Confirm your password"
                                                className="pl-10"
                                                value={signupData.confirmPassword}
                                                onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                                                required
                                                disabled={isSignupLoading}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full btn-elegant" disabled={isSignupLoading}>
                                        {isSignupLoading ? 'Creating account...' : 'Create Account'}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
