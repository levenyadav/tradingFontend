import { ChevronRight, User, Shield, TrendingUp, Bell, CreditCard, FileText, HelpCircle, LogOut, Check, Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMe } from '../lib/api/user';
import { brand } from '../lib/brand';
import ProfileInfo from './settings/ProfileInfo';
import Security2FA from './settings/Security2FA';
import ChangePassword from './settings/ChangePassword';
import KYCWizardNew from './settings/KYCWizardNew';
import PaymentMethods from './settings/PaymentMethods';
import AccountsManagement from './settings/AccountsManagement';
import AccountSetup from './onboarding/AccountSetup';
import ReferralProgram from './settings/ReferralProgram';

interface SettingsProps {
  onLogout: () => void;
}

export function Settings({ onLogout }: SettingsProps) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('mfapp.soundEnabled') !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        setUser(me);
        try {
          const initial = localStorage.getItem('mfapp.settingsInitialSection');
          if (initial) {
            setActiveSection(initial);
            localStorage.removeItem('mfapp.settingsInitialSection');
          }
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (activeSection) setActiveSection(null);
    };
    window.addEventListener('mfapp-settings-back' as any, handler as any);
    return () => window.removeEventListener('mfapp-settings-back' as any, handler as any);
  }, [activeSection]);

  const displayName = user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email) : '';
  const initials = user ? (`${(user.firstName?.[0] || user.email?.[0] || 'U')}${user.lastName?.[0] || ''}`.toUpperCase()) : 'U';
  const badgeText = user ? (user.role?.toUpperCase() || user.status?.toUpperCase() || 'USER') : 'USER';
  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
  const kycStatus = user?.kycStatus || 'pending';
  const kycBadge = { text: (kycStatus as string).toUpperCase(), color: kycStatus === 'verified' ? 'green' : 'gray' };
  const twoFA = user?.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled';
  const tradingPrefs = `${user?.currency || 'USD'} • ${user?.timezone || 'UTC'} • ${user?.language || 'en'}`;
  const notifications = user?.notifications || {};
  const notifEnabledCount = Object.values(notifications).filter(Boolean).length;
  const notifDesc = `${notifEnabledCount} notifications enabled`;

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile Information',
          description: displayName,
          action: () => setActiveSection('profile'),
        },
        {
          icon: Check,
          label: 'KYC Status',
          description: kycStatus,
          badge: kycBadge,
          action: () => setActiveSection('kyc'),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: Shield,
          label: 'Security & Verification',
          description: twoFA,
          action: () => setActiveSection('security'),
        },
        {
          icon: Shield,
          label: 'Change Password',
          action: () => setActiveSection('password'),
        },
      ],
    },
    {
      title: 'Trading',
      items: [
        {
          icon: TrendingUp,
          label: 'Trading Preferences',
          description: tradingPrefs,
          action: () => {},
        },
        {
          icon: TrendingUp,
          label: 'Accounts',
          description: 'Manage trading accounts',
          action: () => setActiveSection('accounts'),
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: notifDesc,
          action: () => setActiveSection('notifications'),
        },
        {
          icon: TrendingUp,
          label: 'UI Sounds',
          description: soundEnabled ? 'Enabled' : 'Disabled',
          action: () => {
            try {
              const next = !soundEnabled;
              localStorage.setItem('mfapp.soundEnabled', next ? 'true' : 'false');
              setSoundEnabled(next);
            } catch {}
          },
        },
      ],
    },
    {
      title: 'Payment',
      items: [
        {
          icon: CreditCard,
          label: 'Payment Methods',
          description: 'Manage payment methods',
          action: () => setActiveSection('payments'),
        },
      ],
    },
    {
      title: 'Rewards',
      items: [
        {
          icon: Gift,
          label: 'Refer & Earn',
          description: 'Invite friends and earn $12',
          badge: <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Earn $12</span>,
          action: () => setActiveSection('referral'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: FileText,
          label: 'Documents',
          description: 'View uploaded documents',
          action: () => {},
        },
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'FAQs, contact us',
          action: () => {},
        },
      ],
    },
  ];

  return (
    <div className="pb-20 md:pb-8">
      {activeSection === 'profile' && <ProfileInfo onBack={() => setActiveSection(null)} />}
      {activeSection === 'kyc' && <KYCWizardNew onBack={() => setActiveSection(null)} />}
      {activeSection === 'security' && <Security2FA onBack={() => setActiveSection(null)} />}
      {activeSection === 'password' && <ChangePassword onBack={() => setActiveSection(null)} />}
      {activeSection === 'payments' && <PaymentMethods onBack={() => setActiveSection(null)} />}
      {activeSection === 'referral' && <ReferralProgram onBack={() => setActiveSection(null)} />}
      {activeSection === 'accounts' && <AccountsManagement onBack={() => setActiveSection(null)} onCreateNew={() => setActiveSection('account-setup')} />}
      {activeSection === 'account-setup' && (
        <AccountSetup
          onBack={() => setActiveSection('accounts')}
          onNext={() => setActiveSection('accounts')}
          onError={(msg) => setError(msg)}
        />
      )}
      {activeSection && <></>}
      {/* Profile Header */}
      {!activeSection && (
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-white mb-1">{displayName}</h2>
            <p className="text-blue-100">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs rounded">
                {badgeText}
              </span>
              <span className="text-blue-100 text-sm">Member since {memberYear}</span>
            </div>
          </div>
        </div>
        {loading && (
          <div className="mt-3 bg-white/10 text-white rounded px-3 py-2 text-sm">Loading profile...</div>
        )}
        {error && (
          <div className="mt-3 bg-red-500/20 text-white rounded px-3 py-2 text-sm">{error}</div>
        )}
      </div>
      )}

      {/* Settings Sections */}
      {!activeSection && (
      <div className="px-4 space-y-6">
        {settingsSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-gray-900 mb-3">{section.title}</h3>
            <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIdx}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-gray-900">{item.label}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500">{item.description}</p>
                      )}
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.badge.color === 'green'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.badge.text}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="pt-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 rounded-lg p-4 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* App Info */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>{brand.name} v1.0.0</p>
          <p className="mt-1">
            <a href="#" className="text-blue-700 hover:text-blue-800">Privacy Policy</a>
            {' • '}
            <a href="#" className="text-blue-700 hover:text-blue-800">Terms of Service</a>
          </p>
        </div>
      </div>
      )}
    </div>
  );
}
