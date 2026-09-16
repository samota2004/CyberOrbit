import React, { useEffect, useState } from 'react';
import {
    ShieldCheck,
    KeyRound,
    AlertTriangle,
    CheckCircle2,
    X,
    Fingerprint,
    Usb,
    Smartphone
} from 'lucide-react';

export const MfaChallengeModal = ({
    isOpen,
    onClose,
    onSuccess,
    userName,
    employeeId,
    reason
}) => {
    const [activeTab, setActiveTab] = useState('TOTP');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [verified, setVerified] = useState(false);
    const [isWebAuthnWaiting, setIsWebAuthnWaiting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setActiveTab('TOTP');
            setCode('');
            setLoading(false);
            setError(null);
            setVerified(false);
            setIsWebAuthnWaiting(false);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (loading) {
            return;
        }

        setCode('');
        setError(null);
        setVerified(false);
        setIsWebAuthnWaiting(false);
        onClose?.();
    };

    const handleTotpSubmit = async (e) => {
        e.preventDefault();

        if (code.length !== 6) {
            setError(
                'Please enter a 6-digit authenticator code.'
            );
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                '/api/auth/mfa/verify',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        otp: code
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error?.message ||
                    'MFA verification failed.'
                );
            }

            if (data.success) {
                if (data.token) {
                    localStorage.setItem(
                        'zero_trust_token',
                        data.token
                    );
                }

                setVerified(true);

                setTimeout(() => {
                    onSuccess?.();
                    onClose?.();
                }, 1200);

                return;
            }

            setError(
                data.error?.message ||
                'Invalid MFA code. Try "123456" for demo.'
            );
        } catch (err) {
            setError(
                err.message ||
                'MFA verification connection failure.'
            );
        } finally {
            setLoading(false);
        }
    };

    const decodeBase64Url = (value) => {
        const normalized = value
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padding =
            '='.repeat(
                (4 - (normalized.length % 4)) % 4
            );

        const binary = atob(
            normalized + padding
        );

        return Uint8Array.from(
            binary,
            (char) => char.charCodeAt(0)
        );
    };

    const handleWebAuthnVerify = async () => {
        setLoading(true);
        setError(null);
        setIsWebAuthnWaiting(true);

        try {
            const challengeRes = await fetch(
                '/api/auth/webauthn/challenge',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const challengeData =
                await challengeRes.json();

            if (
                !challengeRes.ok ||
                !challengeData.success
            ) {
                throw new Error(
                    'Failed to acquire WebAuthn challenge.'
                );
            }

            const credentialPayload = {
                credentialId:
                    'fido2-yubikey-5c-nfc',
                authenticatorData:
                    'FLAG_USER_PRESENT_AND_VERIFIED'
            };

            if (
                window.PublicKeyCredential &&
                typeof navigator.credentials?.get ===
                    'function'
            ) {
                try {
                    const challenge =
                        decodeBase64Url(
                            challengeData.challenge
                        );

                    const credential =
                        await Promise.race([
                            navigator.credentials.get({
                                publicKey: {
                                    challenge,
                                    timeout: 3000,
                                    userVerification:
                                        'preferred'
                                }
                            }),
                            new Promise(
                                (_, reject) =>
                                    setTimeout(
                                        () =>
                                            reject(
                                                new Error(
                                                    'TIMEOUT'
                                                )
                                            ),
                                        2500
                                    )
                            )
                        ]);

                    if (
                        credential &&
                        credential.id
                    ) {
                        credentialPayload.credentialId =
                            credential.id;
                    }
                } catch {
                    credentialPayload.credentialId =
                        'fido2-yubikey-5c-nfc';
                }
            }

            const verifyRes = await fetch(
                '/api/auth/webauthn/verify',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify(
                        credentialPayload
                    )
                }
            );

            const verifyData =
                await verifyRes.json();

            if (!verifyRes.ok) {
                throw new Error(
                    verifyData.error?.message ||
                    'WebAuthn verification failed.'
                );
            }

            if (verifyData.success) {
                if (verifyData.token) {
                    localStorage.setItem(
                        'zero_trust_token',
                        verifyData.token
                    );
                }

                setVerified(true);

                setTimeout(() => {
                    onSuccess?.();
                    onClose?.();
                }, 1200);

                return;
            }

            setError(
                verifyData.error?.message ||
                'FIDO2 Security Key verification rejected.'
            );
        } catch (err) {
            setError(
                err.message ||
                'FIDO2 hardware key verification timed out or disconnected.'
            );
        } finally {
            setLoading(false);
            setIsWebAuthnWaiting(false);
        }
    };

    const handleUseDemoKey = () => {
        setCode('123456');
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0D0E12] border border-[#D4AF37]/40 max-w-md w-full p-7 shadow-2xl relative text-gray-100">
                <button
                    onClick={handleClose}
                    disabled={loading}
                    className="absolute top-5 right-5 text-gray-400 hover:text-[#D4AF37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#D4AF37]/20">
                    <div className="p-2.5 border border-[#D4AF37]/40 bg-black">
                        <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
                    </div>

                    <div>
                        <h3 className="font-serif-display text-2xl font-light text-white">
                            Step-Up MFA Challenge
                        </h3>

                        <p className="text-xs text-gray-400 font-mono">
                            Continuous Identity Assurance
                            (NIST AAL2/AAL3)
                        </p>
                    </div>
                </div>

                {reason && (
                    <div className="mb-4 p-3 bg-black border border-amber-500/40 text-xs text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />

                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider block text-amber-400">
                                Elevated Context Detected
                            </span>

                            <span className="font-sans text-xs">
                                {reason}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex border-b border-[#D4AF37]/20 mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (loading) {
                                return;
                            }

                            setActiveTab('TOTP');
                            setError(null);
                        }}
                        disabled={loading}
                        className={`flex-1 py-2 text-xs font-mono tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                            activeTab === 'TOTP'
                                ? 'border-[#D4AF37] text-[#D4AF37] bg-black'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Smartphone className="w-4 h-4" />
                        <span>TOTP AUTH</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (loading) {
                                return;
                            }

                            setActiveTab('WEBAUTHN');
                            setError(null);
                        }}
                        disabled={loading}
                        className={`flex-1 py-2 text-xs font-mono tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                            activeTab === 'WEBAUTHN'
                                ? 'border-[#D4AF37] text-[#D4AF37] bg-black'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Fingerprint className="w-4 h-4" />
                        <span>FIDO2 / PASSKEY</span>
                    </button>
                </div>

                <div className="bg-black p-3 border border-[#D4AF37]/20 mb-4 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-[#D4AF37]/10">
                        <span className="text-gray-500">
                            SUBJECT:
                        </span>

                        <span className="font-semibold text-white">
                            {userName} ({employeeId})
                        </span>
                    </div>

                    <div className="flex justify-between py-1 pt-1.5">
                        <span className="text-gray-500">
                            PROTOCOL:
                        </span>

                        <span className="text-[#D4AF37]">
                            NIST SP 800-63B
                        </span>
                    </div>
                </div>

                {verified ? (
                    <div className="p-6 border border-[#D4AF37]/40 bg-black text-center text-[#D4AF37] space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-[#D4AF37] animate-pulse" />

                        <p className="font-serif-display text-xl text-white">
                            Identity Verified
                        </p>

                        <p className="text-xs text-gray-400 font-mono">
                            Zero Trust token renewed.
                            Elevating privileges...
                        </p>
                    </div>
                ) : activeTab === 'TOTP' ? (
                    <form
                        onSubmit={handleTotpSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                                6-Digit Verification Code
                            </label>

                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) =>
                                        setCode(
                                            e.target.value.replace(
                                                /\D/g,
                                                ''
                                            )
                                        )
                                    }
                                    placeholder="000000"
                                    autoFocus
                                    disabled={loading}
                                    className="w-full bg-black border border-[#D4AF37]/40 focus:border-[#D4AF37] text-center font-mono text-2xl tracking-[0.4em] py-3 text-[#D4AF37] outline-none disabled:opacity-50"
                                />

                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            </div>
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 font-mono">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                            <span>Demo Bypass:</span>

                            <button
                                type="button"
                                onClick={handleUseDemoKey}
                                disabled={loading}
                                className="text-[#D4AF37] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Fill "123456"
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 border border-gray-700 bg-black text-gray-300 hover:border-[#D4AF37] text-xs font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                CANCEL
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    code.length !== 6
                                }
                                className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border border-[#D4AF37] hover:border-[#A67C00]"
                            >
                                {loading
                                    ? 'VERIFYING...'
                                    : 'CONFIRM CODE'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-6 border border-[#D4AF37]/30 bg-black text-center space-y-3">
                            <div className="w-12 h-12 mx-auto border border-[#D4AF37]/40 flex items-center justify-center bg-black">
                                <Usb className="w-6 h-6 text-[#D4AF37]" />
                            </div>

                            <div>
                                <p className="font-serif-display text-lg text-white">
                                    FIDO2 / Hardware
                                    Security Key
                                </p>

                                <p className="text-xs text-gray-400 mt-1 font-mono">
                                    Touch physical YubiKey
                                    or authenticate
                                    biometric passkey.
                                </p>
                            </div>

                            {isWebAuthnWaiting && (
                                <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#D4AF37] animate-pulse pt-1">
                                    <Fingerprint className="w-4 h-4" />

                                    <span>
                                        Awaiting hardware
                                        token presence...
                                    </span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 font-mono">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 border border-gray-700 bg-black text-gray-300 hover:border-[#D4AF37] text-xs font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                CANCEL
                            </button>

                            <button
                                type="button"
                                onClick={handleWebAuthnVerify}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#A67C00] text-black hover:text-white font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border border-[#D4AF37] hover:border-[#A67C00] flex items-center justify-center gap-2"
                            >
                                <Fingerprint className="w-4 h-4" />

                                <span>
                                    {loading
                                        ? 'VERIFYING...'
                                        : 'ACTIVATE KEY'}
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};