'use client';

import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { useCosts } from '@/hooks/useCosts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function CostDashboard() {
  const { costs, loading, error, refreshCosts } = useCosts();

  const costTrendData = costs ? {
    labels: costs.trend.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Cost',
        data: costs.trend.map(item => item.cost),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  } : null;

  const costBreakdownData = costs ? {
    labels: costs.breakdown.map(item => item.category),
    datasets: [
      {
        data: costs.breakdown.map(item => item.cost),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(163, 163, 163, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  } : null;

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#a3a3a3',
      },
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#a3a3a3',
        callback: function(value: any) {
          return '$' + value;
        },
      },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#e5e5e5',
        padding: 15,
        font: {
          size: 12,
        },
      },
    },
  },
};

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Failed to load cost data</h3>
          <p className="text-dark-muted mb-4">{error}</p>
          <button
            onClick={refreshCosts}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="mb-6">
          <div className="h-6 bg-dark-bg rounded w-32 mb-2" />
          <div className="h-4 bg-dark-bg rounded w-48" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-dark-bg rounded-lg p-4">
              <div className="h-3 bg-dark-border rounded w-20 mb-2" />
              <div className="h-8 bg-dark-border rounded w-16 mb-2" />
              <div className="h-3 bg-dark-border rounded w-12" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-dark-bg rounded" />
          <div className="h-48 bg-dark-bg rounded" />
        </div>
      </div>
    );
  }

  if (!costs) {
    return null;
  }

  return (
    <div className="glass-card p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Cost Analytics</h2>
        <p className="text-dark-muted">Track and optimize your cloud spending</p>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-sm text-dark-muted mb-1">Current Month</p>
          <p className="text-2xl font-bold">${costs.summary.currentMonth.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2">
            {parseFloat(costs.summary.changePercent) >= 0 ? (
              <ArrowUpIcon className="w-4 h-4 text-red-400" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 text-green-400" />
            )}
            <span className={`text-sm ${parseFloat(costs.summary.changePercent) >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {Math.abs(parseFloat(costs.summary.changePercent))}%
            </span>
          </div>
        </div>
        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-sm text-dark-muted mb-1">Last Month</p>
          <p className="text-2xl font-bold">${costs.summary.lastMonth.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-dark-muted">Previous period</span>
          </div>
        </div>
        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-sm text-dark-muted mb-1">Projected</p>
          <p className="text-2xl font-bold">${costs.summary.projected.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-dark-muted">End of month</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-dark-muted mb-4">Cost Trend</h3>
          <div className="h-48">
            {costTrendData && <Line data={costTrendData} options={chartOptions} />}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-dark-muted mb-4">Cost Breakdown</h3>
          <div className="h-48">
            {costBreakdownData && <Doughnut data={costBreakdownData} options={doughnutOptions} />}
          </div>
        </div>
      </div>

      {/* Top Services by Cost */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-dark-muted mb-3">Top Services by Cost</h3>
        <div className="space-y-2">
          {costs.topServices.map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-mono">{service.name}</span>
                <div className="flex-1 bg-dark-bg rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold ml-4">${service.cost}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}