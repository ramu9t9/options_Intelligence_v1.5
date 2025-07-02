import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { BarChart3, TrendingUp } from 'lucide-react';
import { MARKET_INSTRUMENTS } from '../types/MarketTypes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface ChartViewProps {
  underlying: string;
}

export function ChartView({ underlying }: ChartViewProps) {
  const [chartType, setChartType] = useState<'oi' | 'price'>('oi');

  const selectedInstrument = MARKET_INSTRUMENTS[underlying];

  // Generate mock time series data for demonstration
  const generateMockData = () => {
    const now = new Date();
    const data = [];
    const basePrice = selectedInstrument?.underlying_price || 19500;
    
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3 * 60 * 1000); // 3-minute intervals
      data.push({
        time: time.toISOString(),
        callOI: Math.floor(Math.random() * 50000) + 100000,
        putOI: Math.floor(Math.random() * 50000) + 80000,
        price: basePrice + Math.random() * (basePrice * 0.02) - (basePrice * 0.01), // ±1% variation
      });
    }
    return data;
  };

  const mockData = generateMockData();

  const chartData = {
    labels: mockData.map(d => new Date(d.time)),
    datasets: chartType === 'oi' ? [
      {
        label: 'Call OI',
        data: mockData.map(d => d.callOI),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
      {
        label: 'Put OI',
        data: mockData.map(d => d.putOI),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
      }
    ] : [
      {
        label: `${selectedInstrument?.name || underlying} Price`,
        data: mockData.map(d => d.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      title: {
        display: true,
        text: `${selectedInstrument?.name || underlying} ${chartType === 'oi' ? 'Open Interest' : 'Price'} Trend`,
        font: {
          size: 16,
          weight: 'bold',
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: chartType === 'oi' ? 'Open Interest' : 'Price (₹)'
        },
        ticks: {
          callback: function(value: any) {
            if (chartType === 'oi') {
              return (value / 1000).toFixed(0) + 'K';
            }
            return '₹' + value.toLocaleString();
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
            Market Trends
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('oi')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                chartType === 'oi'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Open Interest
            </button>
            <button
              onClick={() => setChartType('price')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                chartType === 'price'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Price Movement
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}