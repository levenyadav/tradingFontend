import useOfflineStatus from '@/hooks/useOfflineStatus';

export default function NetworkStatus() {
  const online = useOfflineStatus();
  return (
    <div className="flex items-center text-xs text-gray-600">
      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${online ? 'bg-green-500' : 'bg-red-500'}`}></span>
      {online ? 'Online' : 'Offline'}
    </div>
  );
}
