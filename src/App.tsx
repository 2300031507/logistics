import { useState, useEffect } from 'react';
import { DashboardOverview } from './components/DashboardOverview';
import { ClaimsAnalysis } from './components/ClaimsAnalysis';
import { PremiumOptimization } from './components/PremiumOptimization';
import { RiskAssessment } from './components/RiskAssessment';
import { ProfitabilityForecast } from './components/ProfitabilityForecast';
import { generateSampleData, appendLatestOperationalData, AVAILABLE_REGIONS } from './lib/dataGenerator';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Database,
  RefreshCw,
  Clock3
} from 'lucide-react';

type View = 'overview' | 'claims' | 'pricing' | 'risk' | 'profitability';
type TimeWindow = 6 | 12 | 24 | 36 | 'all';

function App() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [dataInitialized, setDataInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(24);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (!dataInitialized || !autoRefreshEnabled) return;

    const timer = setInterval(() => {
      refreshOperationalData();
    }, 30000);

    return () => clearInterval(timer);
  }, [dataInitialized, autoRefreshEnabled]);

  async function initializeData() {
    setIsInitializing(true);
    const success = await generateSampleData();
    setDataInitialized(success);
    if (success) {
      setLastRefreshAt(new Date());
    }
    setIsInitializing(false);
  }

  async function refreshOperationalData() {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      const success = await appendLatestOperationalData();
      if (success) {
        setRefreshToken(prev => prev + 1);
        setLastRefreshAt(new Date());
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const navigationItems = [
    { id: 'overview' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims' as View, label: 'Claims Analysis', icon: FileText },
    { id: 'pricing' as View, label: 'Premium Optimization', icon: DollarSign },
    { id: 'risk' as View, label: 'Risk Assessment', icon: AlertTriangle },
    { id: 'profitability' as View, label: 'Profitability Forecast', icon: TrendingUp }
  ];

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing Insurance Analytics Platform</h2>
          <p className="text-gray-600">Loading sample data and preparing analytics modules...</p>
        </div>
      </div>
    );
  }

  if (!dataInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Database className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Initialization Failed</h2>
          <p className="text-gray-600 mb-4">Unable to load sample data. Please check the database connection.</p>
          <button
            onClick={initializeData}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Insurance Analytics Platform</h1>
              <p className="text-sm text-gray-600 mt-1">Predictive Profitability & Pricing Optimization Engine</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium">
                Live Data
              </div>
              <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                NIA Analytics
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="region-filter" className="text-xs font-medium text-gray-600">Region</label>
                <select
                  id="region-filter"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                >
                  <option value="All">All Regions</option>
                  {AVAILABLE_REGIONS.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="time-window" className="text-xs font-medium text-gray-600">Window</label>
                <select
                  id="time-window"
                  value={String(timeWindow)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTimeWindow(value === 'all' ? 'all' : Number(value) as 6 | 12 | 24 | 36);
                  }}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                >
                  <option value="6">Last 6 months</option>
                  <option value="12">Last 12 months</option>
                  <option value="24">Last 24 months</option>
                  <option value="36">Last 36 months</option>
                  <option value="all">All history</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={refreshOperationalData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <button
                onClick={() => setAutoRefreshEnabled(prev => !prev)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
                  autoRefreshEnabled
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <Clock3 className="w-4 h-4" />
                Auto Refresh {autoRefreshEnabled ? 'On' : 'Off'}
              </button>
              <span className="text-xs text-gray-500">
                {lastRefreshAt ? `Last refresh: ${lastRefreshAt.toLocaleTimeString()}` : 'No refresh yet'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {currentView === 'overview' && (
          <DashboardOverview regionFilter={selectedRegion} timeWindow={timeWindow} refreshKey={refreshToken} />
        )}
        {currentView === 'claims' && (
          <ClaimsAnalysis regionFilter={selectedRegion} timeWindow={timeWindow} refreshKey={refreshToken} />
        )}
        {currentView === 'pricing' && (
          <PremiumOptimization regionFilter={selectedRegion} timeWindow={timeWindow} refreshKey={refreshToken} />
        )}
        {currentView === 'risk' && (
          <RiskAssessment regionFilter={selectedRegion} timeWindow={timeWindow} refreshKey={refreshToken} />
        )}
        {currentView === 'profitability' && (
          <ProfitabilityForecast regionFilter={selectedRegion} timeWindow={timeWindow} refreshKey={refreshToken} />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-medium">National Insurance Academy (NIA) - Insurance Analytics Training Platform</p>
            <p className="mt-1 text-xs">
              Advanced predictive analytics for insurance profitability, pricing optimization, and risk assessment
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
