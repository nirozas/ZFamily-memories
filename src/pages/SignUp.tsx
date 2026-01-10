import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { signUp, useInviteCode, validateInviteCode } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (inviteCode) {
            const { valid, error: inviteError } = await validateInviteCode(inviteCode);
            if (!valid) {
                setError(inviteError || 'Invalid invite code');
                return;
            }
        }

        setIsLoading(true);

        const { error: signUpError } = await signUp(email, password, fullName);

        if (signUpError) {
            setError(signUpError.message);
            setIsLoading(false);
            return;
        }

        // If signup successful and we have an invite code, try to use it
        if (inviteCode) {
            const { success: codeSuccess, error: codeError } = await useInviteCode(inviteCode);
            if (!codeSuccess) {
                // Account created but failed to join family
                console.error('Failed to use invite code:', codeError);
                // We still show success but maybe with a warning, or just let them fix it later in profile
            }
        }

        setSuccess(true);
        setIsLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-catalog-bg flex items-center justify-center p-6">
                <Card className="max-w-md text-center p-8 animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-serif mb-2">Check Your Email</h2>
                    <p className="text-catalog-text/70 mb-6">
                        We've sent a confirmation link to <strong>{email}</strong>.
                        Please click the link to verify your account.
                    </p>
                    <Button variant="secondary" onClick={() => navigate('/login')}>
                        Back to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-catalog-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-serif italic text-catalog-text mb-2">Join the Family</h1>
                    <p className="text-catalog-text/70 font-sans">Create your account</p>
                </div>

                {/* Signup Form */}
                <Card className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="Your name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />

                        <Input
                            label="Invite Code (Optional)"
                            type="text"
                            placeholder="Enter code to join a family"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                        />

                        <Input
                            label="Email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-catalog-text/60">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login" className="text-catalog-accent hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-catalog-text/50 mt-6 font-sans">
                    Family Heritage Catalog — A private collection of memories
                </p>
            </div>
        </div>
    );
}
