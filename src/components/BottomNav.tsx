import { Home, TrendingUp, Briefcase, Wallet, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'trading', label: 'Trading', icon: Briefcase },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden max-w-md mx-auto"
      role="navigation"
      aria-label="Bottom navigation"
      style={{
        paddingBottom: 'var(--safe-bottom)',
        height: 'calc(64px + var(--safe-bottom))',
        willChange: 'transform',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className="flex justify-around items-center" style={{ height: '64px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-blue-700' : 'text-gray-500'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onKeyDown={(e) => {
                const idx = navItems.findIndex(n => n.id === item.id);
                if (e.key === 'ArrowRight') {
                  const next = navItems[(idx + 1) % navItems.length];
                  onTabChange(next.id);
                  e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                  const prev = navItems[(idx - 1 + navItems.length) % navItems.length];
                  onTabChange(prev.id);
                  e.preventDefault();
                }
              }}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
