import { useEffect, useState } from "react";
import { Copy, Gift, TrendingUp, Users, DollarSign, Check, Info } from "lucide-react";
import { getReferralStats, getReferralHistory, getMyReferralCode } from "../../lib/api/referral";
import type { ReferralStats, ReferralHistoryItem } from "../../types";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export default function ReferralProgram({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData] = await Promise.all([
        getReferralStats(),
        getReferralHistory({ limit: 50 }),
      ]);
      setStats(statsData);
      setHistory(historyData.referrals);
    } catch (e: any) {
      setError(e?.message || "Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
      qualified: { className: "bg-blue-100 text-blue-700", label: "Qualified" },
      rewarded: { className: "bg-green-100 text-green-700", label: "Rewarded" },
      rejected: { className: "bg-red-100 text-red-700", label: "Rejected" },
      expired: { className: "bg-gray-100 text-gray-700", label: "Expired" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const filteredHistory = filter === "all"
    ? history
    : history.filter(item => item.status === filter);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Refer & Earn</h3>
          <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
        </div>
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Refer & Earn</h3>
          <button onClick={onBack} className="text-gray-700 hover:text-gray-900">Back</button>
        </div>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white">
        <button onClick={onBack} className="mb-4 text-white/80 hover:text-white">← Back</button>
        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-8 h-8" />
          <h1 className="text-2xl font-semibold">Refer & Earn</h1>
        </div>
        <p className="text-white/90">Share your referral code and earn ${stats?.settings.rewardAmount || 12} for each friend who joins!</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Referral Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Referral Code</CardTitle>
            <CardDescription>Share this code with friends to earn rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-700 tracking-wider">
                  {stats?.referralCode || "Loading..."}
                </div>
              </div>
              <Button
                onClick={copyCode}
                className="bg-blue-700 hover:bg-blue-800 text-white"
                size="lg"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
            {copied && (
              <div className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                <Check className="w-4 h-4" />
                Copied to clipboard!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-500">Total Referrals</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-500">Total Earned</p>
              </div>
              <p className="text-2xl font-bold text-green-600">${stats?.totalEarnings.toFixed(2) || "0.00"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-gray-900">Share Your Code</p>
                  <p className="text-sm text-gray-600">Send your referral code to friends who want to start trading</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-gray-900">They Sign Up & Deposit</p>
                  <p className="text-sm text-gray-600">Your friend registers using your code and deposits ${stats?.settings.minDeposit || 100}+</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-gray-900">Get Rewarded</p>
                  <p className="text-sm text-gray-600">Earn ${stats?.settings.rewardAmount || 12} instantly in your wallet once they complete KYC</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Referral History</CardTitle>
            <div className="flex gap-2 flex-wrap mt-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className={filter === "all" ? "bg-blue-700" : ""}
              >
                All ({stats?.total || 0})
              </Button>
              <Button
                variant={filter === "rewarded" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("rewarded")}
                className={filter === "rewarded" ? "bg-green-600" : ""}
              >
                Rewarded ({stats?.rewarded || 0})
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("pending")}
                className={filter === "pending" ? "bg-yellow-600" : ""}
              >
                Pending ({stats?.pending || 0})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No referrals yet</p>
                <p className="text-sm">Start sharing your referral code to earn rewards!</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.referredUser.name}</div>
                            <div className="text-xs text-gray-500">{item.referredUser.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${item.status === "rewarded" ? "text-green-600" : "text-gray-600"}`}>
                            ${item.rewardAmount.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
